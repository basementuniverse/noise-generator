// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------

/** A 4-component vector value. Corresponds to XYZW / RGBA in the editor. */
export type Vec4 = { x: number; y: number; z: number; w: number };

/** All runtime values are either a scalar number or a Vec4. */
export type RuntimeValue = number | Vec4;

/** The kind of value carried on a port or parameter. */
export type ValueType = 'number' | 'vector';

// ---------------------------------------------------------------------------
// Raw graph document (shape as saved from the editor, e.g. noisy-sine.json)
// ---------------------------------------------------------------------------

export interface GraphDocument {
  version: number;
  type: string;
  graph: {
    nodes: GraphDocumentNode[];
    edges: GraphDocumentEdge[];
  };
  /** Editor layout information – ignored by the compiler. */
  layout?: unknown;
}

export interface GraphDocumentNode {
  id: string;
  label?: string;
  ports: GraphDocumentPort[];
  data: GraphDocumentNodeData;
  /** Editor-only fields (position, size, theme, etc.) are silently ignored. */
  [key: string]: unknown;
}

export interface GraphDocumentNodeData {
  type: string;
  configuration?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GraphDocumentPort {
  id: string;
  label?: string;
  type: 'input' | 'output';
  side?: string;
  data?: { type?: string };
  /** Editor-only theme fields are ignored. */
  [key: string]: unknown;
}

export interface GraphDocumentEdge {
  a: { nodeId: string; portId: string };
  b: { nodeId: string; portId: string };
  data?: { value?: unknown };
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Compiled program (JSON-friendly intermediate representation)
// ---------------------------------------------------------------------------

/**
 * Describes where a node input port's value comes from.
 *
 * - `constant` – the port has no incoming edge; use a literal default value.
 * - `ref`      – the port is wired to an upstream node's output port.
 */
export type InstructionOperand =
  | { kind: 'constant'; value: RuntimeValue }
  | { kind: 'ref'; nodeId: string; portId: string };

/** A single node evaluation step in topological execution order. */
export interface Instruction {
  /** The originating node id. Used for state / observer lookup. */
  nodeId: string;
  /** Node type identifier, e.g. 'add', 'perlin', 'output-parameter-number'. */
  op: string;
  /** Maps each input port id to its resolved operand source. */
  portInputs: Record<string, InstructionOperand>;
  /**
   * Static per-node configuration baked in at compile time.
   * Examples: comparator, swizzle pattern, buffer length, input-param key.
   */
  config: Record<string, unknown>;
}

/**
 * Describes the initial mutable state for a stateful node.
 * All values here must be JSON-serialisable.
 * Non-serialisable state (e.g. noise instances) is managed separately
 * inside the runner.
 */
export interface NodeStateDescriptor {
  op: string;
  initialState: Record<string, unknown>;
}

/** Describes a user-configurable named input to the compiled program. */
export interface InputParameter {
  /** The key used to supply a value via SampleInputs at evaluation time. */
  key: string;
  nodeId: string;
  valueType: ValueType;
  defaultValue: RuntimeValue;
}

/** Describes a named output produced by the compiled program. */
export interface OutputParameter {
  /** The key under which the value appears in SampleResult.outputs. */
  key: string;
  nodeId: string;
  valueType: ValueType;
}

export interface CompiledProgram {
  /** Schema version – currently always 1. */
  version: 1;
  /** Named input parameters (from input-parameter-* nodes). */
  inputs: InputParameter[];
  /** Named output parameters (from output-parameter-* nodes). */
  outputs: OutputParameter[];
  /** Instruction list in topological (execution) order. */
  instructions: Instruction[];
  /** Per-node initial state descriptors for stateful nodes. */
  nodeStateDescriptors: Record<string, NodeStateDescriptor>;
}

// ---------------------------------------------------------------------------
// Runner types
// ---------------------------------------------------------------------------

export interface RuntimeServices {
  /**
   * Override the clock used by `time`, `square-wave`, `triangle-wave`, and
   * `sawtooth-wave` nodes. Should return elapsed seconds.
   * Defaults to `Date.now() / 1000`.
   */
  time?: () => number;
  /**
   * Override the random-number source used by `random` nodes.
   * Should return a value in [0, 1).
   * Defaults to `Math.random`.
   */
  random?: () => number;
}

/** Named input values supplied to a single sample evaluation. */
export type SampleInputs = Record<string, RuntimeValue>;

export interface SampleResult {
  /**
   * Values produced by output-parameter nodes, keyed by the parameter's
   * configured key (or node label / id as fallback).
   */
  outputs: Record<string, RuntimeValue>;
}
