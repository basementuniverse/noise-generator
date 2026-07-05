# Public API Reference

This document describes the complete public API surface exported by `@basementuniverse/noise-generator`.

## Exports from `index.ts`

### Functions

#### `compile(document: GraphDocument): CompiledProgram`

Compiles a graph document into an executable program.

**Parameters**:
- `document: GraphDocument` - A graph document loaded from JSON (typically from the visual editor)

**Returns**: `CompiledProgram` - A compiled, JSON-serializable program ready for execution

**Throws**: `CompileError` - When the graph is invalid (contains cycles, unknown node types, duplicate parameter keys, broken edges, etc.)

**Example**:
```typescript
import { compile } from '@basementuniverse/noise-generator';
import graphDoc from './my-graph.json';

const program = compile(graphDoc);
```

### Classes

#### `CompileError`

Error thrown during compilation when the graph document is invalid.

**Constructor**: `new CompileError(message: string)`

**Extends**: `Error`

**Properties**:
- `name: string` - Always `"CompileError"`
- `message: string` - Description of the compilation error

**Example**:
```typescript
import { CompileError } from '@basementuniverse/noise-generator';

try {
  const program = compile(graphDocument);
} catch (e) {
  if (e instanceof CompileError) {
    console.error('Compilation failed:', e.message);
  }
}
```

#### `NoiseGeneratorRunner`

Evaluates a compiled program step-by-step, maintaining mutable state.

**Constructor**: `new NoiseGeneratorRunner(program: CompiledProgram)`

Creates a new runner instance with fresh state. Multiple runners can share the same compiled program.

**Methods**:

##### `sample(inputs?: SampleInputs, services?: RuntimeServices): SampleResult`

Evaluates the program for one step and returns named outputs.

**Parameters**:
- `inputs?: SampleInputs` - Named input values (object mapping keys to `number | Vec4`). Missing keys fall back to default values defined in the graph.
- `services?: RuntimeServices` - Optional overrides for time and random sources

**Returns**: `SampleResult` - Object containing an `outputs` map with results from all output-parameter nodes

**Example**:
```typescript
const runner = new NoiseGeneratorRunner(program);

// Provide input parameters
const result = runner.sample({
  frequency: 2.0,
  amplitude: 0.5
});

console.log(result.outputs.brightness); // e.g. 0.42

// With custom time/random
const result2 = runner.sample(
  { frequency: 1.0 },
  {
    time: () => gameEngine.elapsedSeconds,
    random: () => seededRng.next()
  }
);
```

##### `reset(): void`

Resets all stateful nodes (tick counters, buffers, sequence positions, noise instances) to their initial values.

Call this when you want to replay a signal from the beginning.

**Example**:
```typescript
runner.reset();
// Runner state is now back to initialization
```

### Type Exports

All types are exported for use in TypeScript projects:

#### Core Types
- `CompiledProgram` - The compiled program output
- `GraphDocument` - Input graph document structure
- `RuntimeServices` - Service overrides (time, random)
- `SampleInputs` - Input parameter values
- `SampleResult` - Output from sample()
- `RuntimeValue` - Union of `number | Vec4`
- `ValueType` - Literal `'number' | 'vector'`
- `Vec4` - 4-component vector `{ x, y, z, w }`

#### Graph Document Types
- `GraphDocumentNode` - Node definition in graph
- `GraphDocumentEdge` - Edge definition in graph
- `GraphDocumentPort` - Port definition on node
- `GraphDocumentNodeData` - Node data (type, configuration)

#### Compiled Program Types
- `Instruction` - Single execution step
- `InstructionOperand` - Source of an input value
- `NodeStateDescriptor` - Initial state for stateful nodes
- `InputParameter` - Named input definition
- `OutputParameter` - Named output definition

See [types.md](types.md) for detailed type definitions.
