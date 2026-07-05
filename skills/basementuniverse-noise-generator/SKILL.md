---
name: basementuniverse-noise-generator
description: >
  Use this skill when working with @basementuniverse/noise-generator - a library for generating noise, waveforms, and signals for games and visual effects. The library compiles visual graph documents into executable programs and provides a runner for real-time evaluation. Use when implementing procedural audio/visual effects, dynamic game parameters, noise-based animations, or any time-varying signals built from node graphs.
---

# Basement Universe Noise Generator

Use this skill when working with `@basementuniverse/noise-generator`.

## Overview

This library provides a **compiler** and **runner** system for generating noise, waveforms, and complex time-varying signals from visual node graphs. The workflow is:

1. Build a graph using the visual editor (or load an existing graph document)
2. **Compile** the graph document into a `CompiledProgram`
3. **Run** the program using `NoiseGeneratorRunner` to sample values each frame/tick

## Core Concepts

### Two-Phase Architecture

- **Compile-time**: Transforms a graph document (JSON) into a portable, optimized `CompiledProgram`. This only needs to happen once and the result is JSON-serializable for storage.
- **Runtime**: A `NoiseGeneratorRunner` evaluates the compiled program step-by-step, maintaining mutable state (tick counters, buffers, noise instances).

### Graph Documents

Graph documents are JSON files created by the visual editor with:
- **Nodes**: Processing units (math ops, generators, parameters)
- **Edges**: Connections between node ports carrying values
- **Configuration**: Per-node settings (frequencies, seeds, keys, etc.)

### Value Types

All runtime values are either:
- `number` - scalar floating-point values
- `Vec4` - 4-component vectors `{ x, y, z, w }` (also usable as RGBA)

## Typical Usage Pattern

```typescript
import { compile, NoiseGeneratorRunner } from '@basementuniverse/noise-generator';
import graphDocument from './my-graph.json';

// Compile once (can be cached/saved)
const program = compile(graphDocument);

// Create runner instance
const runner = new NoiseGeneratorRunner(program);

// In game loop
function update() {
  const { outputs } = runner.sample(
    { frequency: 2.0, amplitude: 0.5 },  // input parameters
    { time: () => game.elapsedTime }      // runtime services
  );

  // Use outputs
  entity.brightness = outputs.result;
}
```

## Key Classes and Functions

### `compile(document: GraphDocument): CompiledProgram`

Compiles a graph document into an executable program. Validates node types, detects cycles, and converts to topologically-sorted instructions.

**Throws**: `CompileError` for invalid graphs (cycles, unknown nodes, duplicate parameter keys, broken edges)

### `NoiseGeneratorRunner`

Evaluates compiled programs step-by-step.

**Constructor**: `new NoiseGeneratorRunner(program: CompiledProgram)`

**Methods**:
- `sample(inputs?, services?): SampleResult` - Evaluate one step
- `reset(): void` - Reset all stateful nodes to initial values

### Input/Output Parameters

- **Input parameters**: Named values passed to the runner via `sample(inputs)`
  - Defined by `input-parameter-number` and `input-parameter-vector` nodes
  - Each has a `key` and `defaultValue`
  - Missing keys fall back to defaults

- **Output parameters**: Named values returned in `SampleResult.outputs`
  - Defined by `output-parameter-number` and `output-parameter-vector` nodes
  - Each has a `key` that appears in the outputs map

### Runtime Services

Override time and random sources:

```typescript
const { outputs } = runner.sample(
  {},
  {
    time: () => myEngine.elapsedSeconds,
    random: () => mySeededRNG()
  }
);
```

## When to Use This Library

- Implementing procedurally-generated sound effects or music parameters
- Creating time-varying visual effects (flickering lights, particle turbulence)
- Building dynamic game difficulty curves
- Generating terrain heightmaps or noise-based textures
- Any scenario requiring complex signal processing from composable nodes

## Important Considerations

- **Compiled programs are immutable** - one program can be shared across multiple runner instances
- **Each runner owns its own state** - separate runners maintain independent tick counters, buffers, etc.
- **Editor is not part of the runtime** - the editor creates graph documents, but the library only compiles and runs them
- **Node types are fixed** - all node types must be known at compile time
- **Topological execution** - nodes execute in dependency order, cycles are rejected

## Error Handling

```typescript
import { CompileError } from '@basementuniverse/noise-generator';

try {
  const program = compile(graphDocument);
} catch (e) {
  if (e instanceof CompileError) {
    console.error('Invalid graph:', e.message);
    // Handle compilation errors (cycles, unknown nodes, etc.)
  }
}
```

## References

- Public API surface: [references/api.md](references/api.md)
- Type reference: [references/types.md](references/types.md)
- Available node types: [references/nodes.md](references/nodes.md)
