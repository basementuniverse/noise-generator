# Game Component: Noise Generator

Generate noise, waveforms, and other interesting signals for games and visual effects.

## Installation

```bash
npm install @basementuniverse/noise-generator
```

## How to use

The library has two parts: a **compiler** that turns a saved graph document into a portable compiled program, and a **runner** that evaluates that program step-by-step.

### 1. Compile a graph

Use the visual editor to build a graph, then save it as a JSON file (a *graph document*). Pass that document to `compile()`:

```ts
import { compile, CompileError } from '@basementuniverse/noise-generator';
import graphDocument from './my-graph.json';

let program;
try {
  program = compile(graphDocument);
} catch (e) {
  if (e instanceof CompileError) {
    console.error('Invalid graph:', e.message);
  }
}
```

`compile()` returns a `CompiledProgram` — a plain, JSON-serialisable object. You can save it to disk and load it later; there is no need to recompile on every run.

### 2. Run the compiled program

Create a `NoiseGeneratorRunner` from the compiled program and call `sample()` each frame (or tick):

```ts
import { NoiseGeneratorRunner } from '@basementuniverse/noise-generator';

const runner = new NoiseGeneratorRunner(program);

// In your game loop:
const { outputs } = runner.sample();
console.log(outputs); // e.g. { "result": 0.42 }
```

#### Passing input parameters

If your graph has `input-parameter-*` nodes you can supply values each sample:

```ts
const { outputs } = runner.sample({ frequency: 2.0, amplitude: 0.5 });
```

Missing keys fall back to the default value configured on the node.

#### Overriding time and random sources

Pass a `RuntimeServices` object to control the clock or RNG:

```ts
const { outputs } = runner.sample(
  { frequency: 2.0 },
  {
    time:   () => myEngine.elapsedSeconds,
    random: () => mySeededRng(),
  }
);
```

#### Resetting state

Call `reset()` to rewind all stateful nodes (tick counters, buffers, sequences) to their initial values:

```ts
runner.reset();
```

#### Output values

`sample()` returns a `SampleResult` whose `outputs` map contains one entry per `output-parameter-*` node, keyed by the parameter's configured key. Values are either a `number` or a `Vec4` (`{ x, y, z, w }`).
