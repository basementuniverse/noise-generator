# Available Node Types

This document lists all node types supported by the compiler and runner.

## Node Categories

### Utility Nodes

#### `constant-number`
Outputs a constant scalar value.

#### `constant-vector`
Outputs a constant Vec4 value.

#### `input-parameter-number`
Named scalar input parameter. Values supplied via `sample(inputs)`.
- **Configuration**: `key: string`, `defaultValue: number`
- **Outputs**: `value: number`

#### `input-parameter-vector`
Named vector input parameter. Values supplied via `sample(inputs)`.
- **Configuration**: `key: string`, `defaultValue: Vec4`
- **Outputs**: `value: Vec4`

#### `output-parameter-number`
Named scalar output. Appears in `SampleResult.outputs`.
- **Configuration**: `key: string`
- **Inputs**: `value: number`
- **Outputs**: `value: number`

#### `output-parameter-vector`
Named vector output. Appears in `SampleResult.outputs`.
- **Configuration**: `key: string`
- **Inputs**: `value: Vec4`
- **Outputs**: `value: Vec4`

#### `clamp`
Clamps a value between min and max.
- **Inputs**: `input: number`, `min: number`, `max: number`
- **Outputs**: `result: number`

#### `lerp`
Linear interpolation between two values.
- **Inputs**: `a: number`, `b: number`, `t: number`
- **Outputs**: `result: number`

#### `remap`
Remaps a value from one range to another.
- **Inputs**: `input: number`, `a1: number`, `a2: number`, `b1: number`, `b2: number`
- **Outputs**: `result: number`

#### `threshold`
Comparator node. Outputs 0 or 1 based on comparison.
- **Configuration**: `comparator: string` (e.g., "<", "<=", ">", ">=", "==", "!=")
- **Inputs**: `input: number`, `compare: number`
- **Outputs**: `result: number`

#### `gate-number`
Passes through input when control > 0, otherwise outputs 0.
- **Inputs**: `input: number`, `control: number`
- **Outputs**: `result: number`

#### `gate-vector`
Passes through input when control > 0, otherwise outputs zero vector.
- **Inputs**: `input: Vec4`, `control: number`
- **Outputs**: `result: Vec4`

#### `band`
Quantizes input into discrete bands.
- **Inputs**: `input: number`, `bands: number`
- **Outputs**: `result: number`

#### `switch`
Stateful toggle. Switches state when input crosses threshold.
- **Inputs**: `input: number`
- **Outputs**: `result: number` (0 or 1)
- **State**: `on: boolean`

#### `buffer`
One-frame delay. Outputs previous frame's input.
- **Inputs**: `input: number`
- **Outputs**: `result: number`
- **State**: `buffer: number`

### Vector Nodes

#### `vectorize`
Creates a Vec4 from four scalar components.
- **Inputs**: `x: number`, `y: number`, `z: number`, `w: number`
- **Outputs**: `result: Vec4`

#### `components`
Extracts scalar components from a Vec4.
- **Inputs**: `input: Vec4`
- **Outputs**: `x: number`, `y: number`, `z: number`, `w: number`

#### `swizzle`
Reorders/duplicates vector components.
- **Configuration**: `pattern: string` (e.g., "xyzw", "wzyx", "xxxx")
- **Inputs**: `input: Vec4`
- **Outputs**: `result: Vec4`

#### `normalize`
Normalizes a vector to unit length.
- **Inputs**: `input: Vec4`
- **Outputs**: `result: Vec4`

#### `dot-product`
Computes dot product of vector with itself (magnitude squared).
- **Inputs**: `input: Vec4`
- **Outputs**: `result: number`

#### `cross-product`
Computes cross product of two vectors (3D, w ignored).
- **Inputs**: `a: Vec4`, `b: Vec4`
- **Outputs**: `result: Vec4`

#### `offset`
Adds an offset vector to input.
- **Inputs**: `input: Vec4`, `offset: Vec4`
- **Outputs**: `result: Vec4`

#### `scale`
Scales a vector by a scalar.
- **Inputs**: `input: Vec4`, `scale: number`
- **Outputs**: `result: Vec4`

### Math Nodes

#### `add`
Adds two numbers.
- **Inputs**: `a: number`, `b: number`
- **Outputs**: `result: number`

#### `subtract`
Subtracts b from a.
- **Inputs**: `a: number`, `b: number`
- **Outputs**: `result: number`

#### `multiply`
Multiplies two numbers.
- **Inputs**: `a: number`, `b: number`
- **Outputs**: `result: number`

#### `divide`
Divides a by b.
- **Inputs**: `a: number`, `b: number`
- **Outputs**: `result: number`

#### `modulo`
Computes a modulo b.
- **Inputs**: `a: number`, `b: number`
- **Outputs**: `result: number`

#### `power`
Raises a to the power of b.
- **Inputs**: `a: number`, `b: number`
- **Outputs**: `result: number`

#### `absolute`
Absolute value.
- **Inputs**: `input: number`
- **Outputs**: `result: number`

#### `floor`
Rounds down to nearest integer.
- **Inputs**: `input: number`
- **Outputs**: `result: number`

#### `ceiling`
Rounds up to nearest integer.
- **Inputs**: `input: number`
- **Outputs**: `result: number`

#### `sine`
Computes sin(input).
- **Inputs**: `input: number`
- **Outputs**: `result: number`

#### `cosine`
Computes cos(input).
- **Inputs**: `input: number`
- **Outputs**: `result: number`

#### `tangent`
Computes tan(input).
- **Inputs**: `input: number`
- **Outputs**: `result: number`

#### `atan2`
Computes atan2(y, x).
- **Inputs**: `y: number`, `x: number`
- **Outputs**: `result: number`

### Generator Nodes

#### `time`
Outputs current elapsed time in seconds.
- **Outputs**: `result: number`
- Uses `RuntimeServices.time` (defaults to `Date.now() / 1000`)

#### `tick`
Outputs frame/tick counter (increments each sample).
- **Outputs**: `result: number`
- **State**: `tick: number`

#### `random`
Outputs a random value in [0, 1).
- **Outputs**: `result: number`
- Uses `RuntimeServices.random` (defaults to `Math.random`)

#### `perlin`
2D/3D Perlin noise.
- **Configuration**: `seed: number`
- **Inputs**: `seed: number`, `x: number`, `y: number`, `z: number`
- **Outputs**: `result: number`
- **State**: Noise instance (non-serializable)

#### `fractal-perlin`
Fractal/octave Perlin noise.
- **Configuration**: `seed: number`, `octaves: number`, `persistence: number`, `lacunarity: number`
- **Inputs**: `seed: number`, `x: number`, `y: number`, `z: number`, `octaves: number`, `persistence: number`, `lacunarity: number`
- **Outputs**: `result: number`
- **State**: Noise instance (non-serializable)

#### `square-wave`
Generates a square wave signal.
- **Inputs**: `frequency: number`, `amplitude: number`, `dutyCycle: number`
- **Outputs**: `result: number`

#### `triangle-wave`
Generates a triangle wave signal.
- **Inputs**: `frequency: number`, `amplitude: number`
- **Outputs**: `result: number`

#### `sawtooth-wave`
Generates a sawtooth wave signal.
- **Inputs**: `frequency: number`, `amplitude: number`
- **Outputs**: `result: number`

#### `sequence`
Outputs values from a configured sequence at a given rate.
- **Configuration**: `values: number[]`, `rate: number`
- **Inputs**: `rate: number`
- **Outputs**: `result: number`
- **State**: `index: number`, `accumulator: number`

### Debug Nodes

These nodes are intended for visual debugging in the editor and have no runtime side effects.

#### `dial`
Displays a value on a dial visualization.
- **Inputs**: `input: number`
- **Outputs**: `result: number` (pass-through)

#### `chart`
Displays a value on a time-series chart.
- **Inputs**: `input: number`
- **Outputs**: `result: number` (pass-through)

#### `colour`
Displays a Vec4 as a color swatch.
- **Inputs**: `input: Vec4`
- **Outputs**: `result: Vec4` (pass-through)

## Port Defaults

All input ports have default values when not connected:

- Most numeric inputs: `0`
- Division/modulo denominators: `1`
- Max values in clamp: `1`
- Duty cycle: `0.5`
- Vector inputs: `{ x: 0, y: 0, z: 0, w: 0 }`

See `NODE_PORT_DEFAULTS` in `compiler.ts` for the complete mapping.
