# Type Reference

Complete TypeScript type definitions for `@basementuniverse/noise-generator`.

## Runtime Value Types

### `Vec4`

A 4-component vector value. Used for XYZW coordinates or RGBA colors.

```typescript
type Vec4 = {
  x: number;
  y: number;
  z: number;
  w: number;
};
```

### `RuntimeValue`

All runtime values are either a scalar number or a Vec4.

```typescript
type RuntimeValue = number | Vec4;
```

### `ValueType`

The kind of value carried on a port or parameter.

```typescript
type ValueType = 'number' | 'vector';
```

## Graph Document Types

Types describing the raw graph structure as saved from the editor.

### `GraphDocument`

The root document structure.

```typescript
interface GraphDocument {
  version: number;
  type: string;  // Always "graph-document"
  graph: {
    nodes: GraphDocumentNode[];
    edges: GraphDocumentEdge[];
  };
  layout?: unknown;  // Editor-only, ignored by compiler
}
```

### `GraphDocumentNode`

A single node in the graph.

```typescript
interface GraphDocumentNode {
  id: string;
  label?: string;
  ports: GraphDocumentPort[];
  data: GraphDocumentNodeData;
  // Editor-only fields (position, size, theme) are ignored
  [key: string]: unknown;
}
```

### `GraphDocumentNodeData`

Node type and configuration.

```typescript
interface GraphDocumentNodeData {
  type: string;  // e.g., "add", "perlin", "output-parameter-number"
  configuration?: Record<string, unknown>;
  [key: string]: unknown;
}
```

### `GraphDocumentPort`

A port on a node (input or output).

```typescript
interface GraphDocumentPort {
  id: string;
  label?: string;
  type: 'input' | 'output';
  side?: string;
  data?: { type?: string };  // Value type hint
  [key: string]: unknown;  // Editor-only fields ignored
}
```

### `GraphDocumentEdge`

A connection between two ports.

```typescript
interface GraphDocumentEdge {
  a: { nodeId: string; portId: string };
  b: { nodeId: string; portId: string };
  data?: { value?: unknown };
  [key: string]: unknown;
}
```

## Compiled Program Types

Types describing the compiled intermediate representation.

### `CompiledProgram`

The compiled program ready for execution.

```typescript
interface CompiledProgram {
  version: 1;  // Schema version
  inputs: InputParameter[];
  outputs: OutputParameter[];
  instructions: Instruction[];
  nodeStateDescriptors: Record<string, NodeStateDescriptor>;
}
```

### `Instruction`

A single node evaluation step in topological execution order.

```typescript
interface Instruction {
  nodeId: string;           // Originating node id
  op: string;               // Node type (e.g., "add", "perlin")
  portInputs: Record<string, InstructionOperand>;  // Input sources
  config: Record<string, unknown>;  // Static configuration
}
```

### `InstructionOperand`

Describes where an input port's value comes from.

```typescript
type InstructionOperand =
  | { kind: 'constant'; value: RuntimeValue }  // Unconnected port
  | { kind: 'ref'; nodeId: string; portId: string };  // Wired port
```

### `NodeStateDescriptor`

Initial mutable state for a stateful node.

```typescript
interface NodeStateDescriptor {
  op: string;
  initialState: Record<string, unknown>;  // Must be JSON-serializable
}
```

**Note**: Non-serializable state (e.g., noise instances) is managed separately inside the runner.

### `InputParameter`

A user-configurable named input.

```typescript
interface InputParameter {
  key: string;           // Key used in SampleInputs
  nodeId: string;
  valueType: ValueType;
  defaultValue: RuntimeValue;
}
```

### `OutputParameter`

A named output produced by the program.

```typescript
interface OutputParameter {
  key: string;      // Key in SampleResult.outputs
  nodeId: string;
  valueType: ValueType;
}
```

## Runner Types

Types used when evaluating the compiled program.

### `RuntimeServices`

Optional overrides for system services.

```typescript
interface RuntimeServices {
  /**
   * Override the clock used by time and wave nodes.
   * Should return elapsed seconds.
   * Defaults to Date.now() / 1000.
   */
  time?: () => number;

  /**
   * Override the random source used by random nodes.
   * Should return a value in [0, 1).
   * Defaults to Math.random.
   */
  random?: () => number;
}
```

### `SampleInputs`

Named input values supplied to a single sample evaluation.

```typescript
type SampleInputs = Record<string, RuntimeValue>;
```

**Example**:
```typescript
const inputs: SampleInputs = {
  frequency: 2.0,
  amplitude: 0.5,
  color: { x: 1, y: 0, z: 0, w: 1 }  // Red
};
```

### `SampleResult`

Result from evaluating the program.

```typescript
interface SampleResult {
  outputs: Record<string, RuntimeValue>;
}
```

The `outputs` map contains one entry per `output-parameter-*` node, keyed by the parameter's configured key (or node label/id as fallback).

**Example**:
```typescript
const result = runner.sample();
console.log(result.outputs.brightness);  // number
console.log(result.outputs.color);       // Vec4
```
