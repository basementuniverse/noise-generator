import type {
  CompiledProgram,
  GraphDocument,
  GraphDocumentEdge,
  GraphDocumentNode,
  InputParameter,
  Instruction,
  InstructionOperand,
  NodeStateDescriptor,
  OutputParameter,
  RuntimeValue,
  ValueType,
  Vec4,
} from './types';

// ---------------------------------------------------------------------------
// Compile-time constants
// ---------------------------------------------------------------------------

const COMPILED_PROGRAM_VERSION = 1 as const;

const DEFAULT_VEC4: Vec4 = { x: 0, y: 0, z: 0, w: 0 };

// ---------------------------------------------------------------------------
// Default values for unconnected input ports, per node type.
// These mirror the `?? fallback` patterns in the editor's node evaluators.
// ---------------------------------------------------------------------------

type PortDefaults = Record<string, RuntimeValue>;

function vec(): Vec4 {
  return { ...DEFAULT_VEC4 };
}

const NODE_PORT_DEFAULTS: Record<string, PortDefaults> = {
  'constant-number': {},
  'constant-vector': {},
  'input-parameter-number': {},
  'input-parameter-vector': {},
  'output-parameter-number': { value: 0 },
  'output-parameter-vector': { value: vec() },
  add: { a: 0, b: 0 },
  subtract: { a: 0, b: 0 },
  multiply: { a: 0, b: 0 },
  divide: { a: 0, b: 1 },
  modulo: { a: 0, b: 1 },
  power: { a: 0, b: 0 },
  absolute: { input: 0 },
  floor: { input: 0 },
  ceiling: { input: 0 },
  clamp: { input: 0, min: 0, max: 1 },
  lerp: { a: 0, b: 0, t: 0 },
  remap: { input: 0, a1: 0, a2: 1, b1: 0, b2: 1 },
  band: { input: 0, bands: 4 },
  threshold: { input: 0, compare: 0 },
  'gate-number': { input: 0, control: 0 },
  'gate-vector': { input: vec(), control: 0 },
  switch: { input: 0 },
  sine: { input: 0 },
  cosine: { input: 0 },
  tangent: { input: 0 },
  atan2: { y: 0, x: 1 },
  vectorize: { x: 0, y: 0, z: 0, w: 0 },
  components: { input: vec() },
  swizzle: { input: vec() },
  normalize: { input: vec() },
  'dot-product': { input: vec() },
  'cross-product': { a: vec(), b: vec() },
  offset: { input: vec(), offset: vec() },
  scale: { input: vec(), scale: 1 },
  time: {},
  tick: {},
  random: {},
  'square-wave': { frequency: 1, amplitude: 1, dutyCycle: 0.5 },
  'triangle-wave': { frequency: 1, amplitude: 1 },
  'sawtooth-wave': { frequency: 1, amplitude: 1 },
  perlin: { seed: 0, x: 0, y: 0, z: 0 },
  'fractal-perlin': {
    seed: 0,
    x: 0,
    y: 0,
    z: 0,
    octaves: 1,
    persistence: 0.5,
    lacunarity: 2,
  },
  sequence: { rate: 1 },
  buffer: { input: 0 },
  dial: { input: 0 },
  chart: { input: 0 },
  colour: { input: vec() },
};

const KNOWN_NODE_TYPES = new Set(Object.keys(NODE_PORT_DEFAULTS));

// ---------------------------------------------------------------------------
// Topological sort  (Kahn's algorithm)
// ---------------------------------------------------------------------------

/**
 * Returns node IDs in topological (execution) order, or `null` when the
 * graph contains a cycle.
 */
function topologicalSort(
  nodes: GraphDocumentNode[],
  edges: GraphDocumentEdge[]
): string[] | null {
  const nodeIds = nodes.map(n => n.id);
  const inDegree = new Map<string, number>(nodeIds.map(id => [id, 0]));
  const successors = new Map<string, string[]>(nodeIds.map(id => [id, []]));

  for (const edge of edges) {
    const from = edge.a.nodeId;
    const to = edge.b.nodeId;
    if (!inDegree.has(from) || !inDegree.has(to)) continue;
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    successors.get(from)!.push(to);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of successors.get(current) ?? []) {
      const newDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  return sorted.length === nodeIds.length ? sorted : null;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function getNodeType(node: GraphDocumentNode): string {
  return typeof node.data?.type === 'string' ? node.data.type : '';
}

function getConfig(node: GraphDocumentNode): Record<string, unknown> {
  return (node.data?.configuration as Record<string, unknown>) ?? {};
}

function inferValueType(nodeType: string): ValueType {
  return nodeType.includes('vector') ? 'vector' : 'number';
}

function inferDefaultValue(nodeType: string): RuntimeValue {
  return nodeType.includes('vector') ? vec() : 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class CompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompileError';
  }
}

/**
 * Compiles a saved graph document into a `CompiledProgram` suitable for
 * evaluation by a `NoiseGeneratorRunner`.
 *
 * Editor-only fields (positions, sizes, themes, etc.) are silently ignored.
 *
 * @throws {CompileError} on invalid input (unknown node types, cycles,
 *   duplicate parameter keys, broken edges, etc.)
 */
export function compile(document: GraphDocument): CompiledProgram {
  if (document.type !== 'graph-document') {
    throw new CompileError(
      `Unexpected document type: "${document.type}". Expected "graph-document".`
    );
  }

  const { nodes, edges } = document.graph;

  // 1. Validate that all node types are known --------------------------------
  for (const node of nodes) {
    const type = getNodeType(node);
    if (!KNOWN_NODE_TYPES.has(type)) {
      throw new CompileError(
        `Unknown node type "${type}" on node id ${node.id}. ` +
          `If this is a new node type, add it to NODE_PORT_DEFAULTS in compiler.ts.`
      );
    }
  }

  // 2. Validate edges reference existing nodes/ports -------------------------
  const nodeMap = new Map<string, GraphDocumentNode>(nodes.map(n => [n.id, n]));

  for (const edge of edges) {
    if (!nodeMap.has(edge.a.nodeId)) {
      throw new CompileError(
        `Edge references unknown source node: ${edge.a.nodeId}`
      );
    }
    if (!nodeMap.has(edge.b.nodeId)) {
      throw new CompileError(
        `Edge references unknown target node: ${edge.b.nodeId}`
      );
    }

    const srcNode = nodeMap.get(edge.a.nodeId)!;
    const dstNode = nodeMap.get(edge.b.nodeId)!;

    const srcPort = srcNode.ports.find(p => p.id === edge.a.portId);
    if (!srcPort) {
      throw new CompileError(
        `Edge references unknown source port "${edge.a.portId}" on node ${edge.a.nodeId}`
      );
    }
    if (srcPort.type !== 'output') {
      throw new CompileError(
        `Edge source port "${edge.a.portId}" on node ${edge.a.nodeId} is not an output port`
      );
    }

    const dstPort = dstNode.ports.find(p => p.id === edge.b.portId);
    if (!dstPort) {
      throw new CompileError(
        `Edge references unknown target port "${edge.b.portId}" on node ${edge.b.nodeId}`
      );
    }
    if (dstPort.type !== 'input') {
      throw new CompileError(
        `Edge target port "${edge.b.portId}" on node ${edge.b.nodeId} is not an input port`
      );
    }
  }

  // 3. Topological sort ------------------------------------------------------
  const sortedIds = topologicalSort(nodes, edges);
  if (sortedIds === null) {
    throw new CompileError(
      'Graph contains a cycle and cannot be compiled. ' +
        'Check for circular node connections.'
    );
  }

  // 4. Build edge lookup: (toNodeId, toPortId) → (fromNodeId, fromPortId) ---
  type EdgeSource = { fromNodeId: string; fromPortId: string };
  const edgeLookup = new Map<string, EdgeSource>();

  for (const edge of edges) {
    const key = `${edge.b.nodeId}:${edge.b.portId}`;
    // Last edge wins if multiple edges target the same port (shouldn't happen
    // in a valid graph, but we handle it gracefully).
    edgeLookup.set(key, {
      fromNodeId: edge.a.nodeId,
      fromPortId: edge.a.portId,
    });
  }

  // 4b. Reroute edges that pass through debug nodes (dial, chart, colour) ----
  // These nodes are purely for visualization in the editor and are skipped
  // during compilation. We reroute any edges that pass through them.
  const DEBUG_NODE_TYPES = new Set(['dial', 'chart', 'colour']);
  const debugNodeIds = new Set<string>();

  for (const node of nodes) {
    if (DEBUG_NODE_TYPES.has(getNodeType(node))) {
      debugNodeIds.add(node.id);
    }
  }

  for (const debugNodeId of debugNodeIds) {
    const inputKey = `${debugNodeId}:input`;
    const outputKey = `${debugNodeId}:output`;

    const inputSource = edgeLookup.get(inputKey);

    // Find all edges that use this debug node's output as their source
    const keysToUpdate: string[] = [];
    for (const [key, source] of edgeLookup.entries()) {
      if (source.fromNodeId === debugNodeId && source.fromPortId === 'output') {
        keysToUpdate.push(key);
      }
    }

    // Reroute those edges to come from the debug node's input source
    for (const key of keysToUpdate) {
      if (inputSource) {
        // Debug node has an input connection – pass it through
        edgeLookup.set(key, inputSource);
      } else {
        // Debug node has no input connection – no value to pass through
        edgeLookup.delete(key);
      }
    }
  }

  // 5. Collect named input / output parameters -------------------------------
  const inputs: InputParameter[] = [];
  const outputs: OutputParameter[] = [];
  const seenInputKeys = new Set<string>();
  const seenOutputKeys = new Set<string>();

  for (const node of nodes) {
    const type = getNodeType(node);
    const config = getConfig(node);

    if (
      type === 'input-parameter-number' ||
      type === 'input-parameter-vector'
    ) {
      const rawKey = typeof config.key === 'string' ? config.key.trim() : '';
      const key = rawKey !== '' ? rawKey : node.id;

      if (seenInputKeys.has(key)) {
        throw new CompileError(
          `Duplicate input parameter key "${key}". ` +
            `Each input-parameter node must have a unique key.`
        );
      }
      seenInputKeys.add(key);

      const valueType = inferValueType(type);
      const defaultValue: RuntimeValue =
        config.value !== undefined
          ? (config.value as RuntimeValue)
          : inferDefaultValue(type);

      inputs.push({ key, nodeId: node.id, valueType, defaultValue });
    }

    if (
      type === 'output-parameter-number' ||
      type === 'output-parameter-vector'
    ) {
      const rawKey =
        typeof config.key === 'string' && config.key.trim() !== ''
          ? config.key.trim()
          : typeof node.label === 'string' && node.label.trim() !== ''
            ? node.label.trim()
            : node.id;

      if (seenOutputKeys.has(rawKey)) {
        throw new CompileError(
          `Duplicate output parameter key "${rawKey}". ` +
            `Each output-parameter node must have a unique label or key.`
        );
      }
      seenOutputKeys.add(rawKey);

      const valueType = inferValueType(type);
      outputs.push({ key: rawKey, nodeId: node.id, valueType });
    }
  }

  // 5b. Validate that the graph has at least one output parameter -----------
  if (outputs.length === 0) {
    throw new CompileError(
      'Graph must have at least one output-parameter-number or output-parameter-vector node. ' +
        'A graph with no outputs cannot produce any values.'
    );
  }

  // 6. Build instructions in topological order -------------------------------
  const instructions: Instruction[] = [];
  const nodeStateDescriptors: Record<string, NodeStateDescriptor> = {};

  const inputParamByNodeId = new Map<string, InputParameter>(
    inputs.map(ip => [ip.nodeId, ip])
  );
  const outputParamByNodeId = new Map<string, OutputParameter>(
    outputs.map(op => [op.nodeId, op])
  );

  for (const nodeId of sortedIds) {
    // Skip debug nodes (dial, chart, colour) – they don't produce runtime output
    if (debugNodeIds.has(nodeId)) {
      continue;
    }

    const node = nodeMap.get(nodeId)!;
    const type = getNodeType(node);
    const config = getConfig(node);
    const portDefaults = NODE_PORT_DEFAULTS[type] ?? {};

    // Resolve each input port to an InstructionOperand --------------------
    const portInputs: Record<string, InstructionOperand> = {};

    for (const port of node.ports) {
      if (port.type !== 'input') continue;

      const src = edgeLookup.get(`${nodeId}:${port.id}`);
      if (src) {
        portInputs[port.id] = {
          kind: 'ref',
          nodeId: src.fromNodeId,
          portId: src.fromPortId,
        };
      } else {
        const def = portDefaults[port.id];
        portInputs[port.id] = {
          kind: 'constant',
          value: def !== undefined ? def : 0,
        };
      }
    }

    // Build static per-instruction config ----------------------------------
    let instrConfig: Record<string, unknown> = {};

    switch (type) {
      case 'constant-number':
        instrConfig = {
          value: typeof config.value === 'number' ? config.value : 0,
        };
        break;

      case 'constant-vector':
        instrConfig = { value: config.value ?? vec() };
        break;

      case 'input-parameter-number':
      case 'input-parameter-vector': {
        const ip = inputParamByNodeId.get(nodeId)!;
        instrConfig = { key: ip.key, defaultValue: ip.defaultValue };
        break;
      }

      case 'output-parameter-number':
      case 'output-parameter-vector': {
        const op = outputParamByNodeId.get(nodeId)!;
        instrConfig = { key: op.key };
        break;
      }

      case 'threshold':
        instrConfig = {
          comparator:
            typeof config.comparator === 'string' ? config.comparator : '>',
        };
        break;

      case 'swizzle':
        instrConfig = {
          pattern: typeof config.pattern === 'string' ? config.pattern : 'xyzw',
        };
        break;

      case 'buffer':
        instrConfig = {
          length:
            typeof config.length === 'number'
              ? Math.max(1, Math.floor(config.length))
              : 16,
          mode: typeof config.mode === 'string' ? config.mode : 'delay',
        };
        break;

      case 'chart':
        instrConfig = {
          maxSize:
            typeof config.maxSize === 'number'
              ? Math.max(1, Math.floor(config.maxSize))
              : 64,
          yMin: typeof config.yMin === 'number' ? config.yMin : -1,
          yMax: typeof config.yMax === 'number' ? config.yMax : 1,
        };
        break;

      case 'sequence':
        instrConfig = {
          sequence:
            typeof config.sequence === 'string' ? config.sequence : '0,1,2,3',
        };
        break;

      default:
        break;
    }

    instructions.push({ nodeId, op: type, portInputs, config: instrConfig });

    // Emit state descriptors for nodes with mutable per-instance state -----
    switch (type) {
      case 'tick':
        nodeStateDescriptors[nodeId] = {
          op: type,
          initialState: { tickCount: 0 },
        };
        break;

      case 'sequence':
        nodeStateDescriptors[nodeId] = {
          op: type,
          initialState: { sequenceIndex: 0, sequenceTick: 0 },
        };
        break;

      case 'buffer': {
        const len = instrConfig.length as number;
        nodeStateDescriptors[nodeId] = {
          op: type,
          initialState: {
            buffer: new Array<number>(len).fill(0),
            writeIndex: 0,
            readIndex: 0,
            filledCount: 0,
            phase: 'recording',
          },
        };
        break;
      }

      case 'chart':
        nodeStateDescriptors[nodeId] = {
          op: type,
          initialState: { values: [] as number[] },
        };
        break;

      // Noise instances are non-serialisable; the runner manages them
      // in a separate Map keyed by nodeId.
      // No state descriptor is needed here.

      default:
        break;
    }
  }

  return {
    version: COMPILED_PROGRAM_VERSION,
    inputs,
    outputs,
    instructions,
    nodeStateDescriptors,
  };
}
