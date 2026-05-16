import { Noise } from 'noisejs';
import type {
  CompiledProgram,
  Instruction,
  InstructionOperand,
  RuntimeServices,
  RuntimeValue,
  SampleInputs,
  SampleResult,
  Vec4,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return (value as unknown[]).map(deepClone) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value as object)) {
    out[k] = deepClone((value as Record<string, unknown>)[k]);
  }
  return out as T;
}

function resolveOperand(
  operand: InstructionOperand,
  registers: Map<string, RuntimeValue>
): RuntimeValue {
  if (operand.kind === 'constant') {
    return operand.value;
  }
  return registers.get(`${operand.nodeId}:${operand.portId}`) ?? 0;
}

// ---------------------------------------------------------------------------
// NoiseGeneratorRunner
// ---------------------------------------------------------------------------

/**
 * Evaluates a `CompiledProgram` one step at a time via `sample()`.
 *
 * A single `CompiledProgram` is immutable and can be shared across multiple
 * runner instances (e.g. one per game entity). Each runner owns its own
 * mutable state (tick counters, buffers, noise instances, etc.).
 *
 * @example
 * ```ts
 * const program = compile(graphDocument);
 * const runner  = new NoiseGeneratorRunner(program);
 *
 * // In your game loop:
 * const { outputs } = runner.sample({ frequency: 2.0 }, { time: () => elapsed });
 * ```
 */
export class NoiseGeneratorRunner {
  private readonly program: CompiledProgram;

  /** Serialisable per-node mutable state (tick counters, buffers, …). */
  private nodeState: Map<string, Record<string, unknown>>;

  /**
   * Non-serialisable noise instances, keyed by nodeId.
   * Created lazily on first evaluation of each perlin / fractal-perlin node.
   */
  private noiseInstances: Map<string, Noise>;

  constructor(program: CompiledProgram) {
    this.program = program;
    this.nodeState = new Map();
    this.noiseInstances = new Map();
    this.initState();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Resets all stateful nodes (tick counters, buffers, sequence positions, etc.)
   * to their initial values and clears any cached noise instances.
   *
   * Call this when you want to replay a signal from the beginning.
   */
  reset(): void {
    this.noiseInstances.clear();
    this.initState();
  }

  /**
   * Evaluates the compiled program for one step and returns named outputs.
   *
   * @param inputs  Named input values. Keys must match the `key` configured on
   *                `input-parameter-*` nodes. Missing keys fall back to each
   *                parameter's compiled-in default value.
   * @param services  Optional overrides for time and random sources.
   */
  sample(inputs: SampleInputs = {}, services?: RuntimeServices): SampleResult {
    const getTime = services?.time ?? (() => Date.now() / 1000);
    const getRandom = services?.random ?? (() => Math.random());

    const registers = new Map<string, RuntimeValue>();
    const result: SampleResult = { outputs: {} };

    for (const instr of this.program.instructions) {
      this.execute(instr, inputs, registers, result, getTime, getRandom);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private initState(): void {
    this.nodeState.clear();
    for (const [nodeId, descriptor] of Object.entries(
      this.program.nodeStateDescriptors
    )) {
      this.nodeState.set(nodeId, deepClone(descriptor.initialState));
    }
  }

  private getState(nodeId: string): Record<string, unknown> {
    let state = this.nodeState.get(nodeId);
    if (!state) {
      state = {};
      this.nodeState.set(nodeId, state);
    }
    return state;
  }

  private execute(
    instr: Instruction,
    sampleInputs: SampleInputs,
    registers: Map<string, RuntimeValue>,
    sampleResult: SampleResult,
    getTime: () => number,
    getRandom: () => number
  ): void {
    const { nodeId, op, portInputs, config } = instr;

    /** Resolve an input port by portId to its current RuntimeValue. */
    const read = (portId: string): RuntimeValue => {
      const operand = portInputs[portId];
      return operand ? resolveOperand(operand, registers) : 0;
    };

    /** Write a value to an output port register. */
    const write = (portId: string, value: RuntimeValue): void => {
      registers.set(`${nodeId}:${portId}`, value);
    };

    switch (op) {
      // -----------------------------------------------------------------------
      // Input parameters – look up from caller-supplied inputs
      // -----------------------------------------------------------------------

      case 'input-parameter-number': {
        const key = config.key as string;
        const def = config.defaultValue as number;
        write(
          'value',
          key in sampleInputs ? (sampleInputs[key] as number) : def
        );
        break;
      }

      case 'input-parameter-vector': {
        const key = config.key as string;
        const def = config.defaultValue as Vec4;
        write('value', key in sampleInputs ? (sampleInputs[key] as Vec4) : def);
        break;
      }

      // -----------------------------------------------------------------------
      // Output parameters – capture value into result.outputs
      // -----------------------------------------------------------------------

      case 'output-parameter-number': {
        const value = read('value') as number;
        write('value', value);
        sampleResult.outputs[config.key as string] = value;
        break;
      }

      case 'output-parameter-vector': {
        const value = read('value') as Vec4;
        write('value', value);
        sampleResult.outputs[config.key as string] = value;
        break;
      }

      // -----------------------------------------------------------------------
      // Constants
      // -----------------------------------------------------------------------

      case 'constant-number':
        write('value', config.value as number);
        break;

      case 'constant-vector':
        write('value', config.value as Vec4);
        break;

      // -----------------------------------------------------------------------
      // Arithmetic
      // -----------------------------------------------------------------------

      case 'add':
        write('output', (read('a') as number) + (read('b') as number));
        break;

      case 'subtract':
        write('output', (read('a') as number) - (read('b') as number));
        break;

      case 'multiply':
        write('output', (read('a') as number) * (read('b') as number));
        break;

      case 'divide':
        write('output', (read('a') as number) / (read('b') as number));
        break;

      case 'modulo':
        write('output', (read('a') as number) % (read('b') as number));
        break;

      case 'power':
        write('output', Math.pow(read('a') as number, read('b') as number));
        break;

      case 'absolute':
        write('output', Math.abs(read('input') as number));
        break;

      case 'floor':
        write('output', Math.floor(read('input') as number));
        break;

      case 'ceiling':
        write('output', Math.ceil(read('input') as number));
        break;

      // -----------------------------------------------------------------------
      // Interpolation / range
      // -----------------------------------------------------------------------

      case 'clamp': {
        const v = read('input') as number;
        const lo = read('min') as number;
        const hi = read('max') as number;
        write('output', Math.min(Math.max(v, lo), hi));
        break;
      }

      case 'lerp': {
        const a = read('a') as number;
        const b = read('b') as number;
        const t = read('t') as number;
        write('output', a + (b - a) * t);
        break;
      }

      case 'remap': {
        const input = read('input') as number;
        const a1 = read('a1') as number;
        const a2 = read('a2') as number;
        const b1 = read('b1') as number;
        const b2 = read('b2') as number;
        const denom = a2 - a1;
        write(
          'output',
          denom === 0 ? b1 : b1 + ((input - a1) / denom) * (b2 - b1)
        );
        break;
      }

      case 'band': {
        const bands = Math.round(read('bands') as number);
        if (bands <= 0) {
          write('output', 0);
          break;
        }
        const step = 1 / bands;
        write('output', Math.round((read('input') as number) / step) * step);
        break;
      }

      // -----------------------------------------------------------------------
      // Logic / routing
      // -----------------------------------------------------------------------

      case 'threshold': {
        const input = read('input') as number;
        const compare = read('compare') as number;
        const cmp = config.comparator as string;
        let out = 0;
        if (cmp === '>') out = input > compare ? 1 : 0;
        else if (cmp === '>=') out = input >= compare ? 1 : 0;
        else if (cmp === '<') out = input < compare ? 1 : 0;
        else if (cmp === '<=') out = input <= compare ? 1 : 0;
        else if (cmp === '==') out = input === compare ? 1 : 0;
        else if (cmp === '!=') out = input !== compare ? 1 : 0;
        write('output', out);
        break;
      }

      case 'gate-number':
        write(
          'output',
          (read('control') as number) > 0 ? (read('input') as number) : 0
        );
        break;

      case 'gate-vector':
        write(
          'output',
          (read('control') as number) > 0
            ? (read('input') as Vec4)
            : { x: 0, y: 0, z: 0, w: 0 }
        );
        break;

      case 'switch': {
        const sel = Math.round(read('input') as number);
        write('output1', sel === 1 ? 1 : 0);
        write('output2', sel === 2 ? 1 : 0);
        write('output3', sel === 3 ? 1 : 0);
        write('output4', sel === 4 ? 1 : 0);
        break;
      }

      // -----------------------------------------------------------------------
      // Trigonometry
      // -----------------------------------------------------------------------

      case 'sine':
        write('output', Math.sin(read('input') as number));
        break;

      case 'cosine':
        write('output', Math.cos(read('input') as number));
        break;

      case 'tangent':
        write('output', Math.tan(read('input') as number));
        break;

      case 'atan2':
        write('output', Math.atan2(read('y') as number, read('x') as number));
        break;

      // -----------------------------------------------------------------------
      // Vector operations
      // -----------------------------------------------------------------------

      case 'vectorize':
        write('output', {
          x: read('x') as number,
          y: read('y') as number,
          z: read('z') as number,
          w: read('w') as number,
        });
        break;

      case 'components': {
        const v = read('input') as Vec4;
        write('x', v.x);
        write('y', v.y);
        write('z', v.z);
        write('w', v.w);
        break;
      }

      case 'swizzle': {
        const v = read('input') as Vec4;
        const pattern = (config.pattern as string) || 'xyzw';
        const axes = ['x', 'y', 'z', 'w'] as const;
        const out: Vec4 = { x: 0, y: 0, z: 0, w: 0 };
        for (let i = 0; i < 4; i++) {
          const src = (pattern[i] ?? 'x') as keyof Vec4;
          out[axes[i]] = v[src] ?? 0;
        }
        write('output', out);
        break;
      }

      case 'normalize': {
        const v = read('input') as Vec4;
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z + v.w * v.w);
        write(
          'output',
          len > 0
            ? { x: v.x / len, y: v.y / len, z: v.z / len, w: v.w / len }
            : { x: 0, y: 0, z: 0, w: 0 }
        );
        break;
      }

      // Note: the editor's dot-product node computes v·v (squared magnitude),
      // not a two-vector dot product. This matches editor behaviour.
      case 'dot-product': {
        const v = read('input') as Vec4;
        write('output', v.x * v.x + v.y * v.y + v.z * v.z + v.w * v.w);
        break;
      }

      case 'cross-product': {
        const a = read('a') as Vec4;
        const b = read('b') as Vec4;
        write('output', {
          x: a.y * b.z - a.z * b.y,
          y: a.z * b.x - a.x * b.z,
          z: a.x * b.y - a.y * b.x,
          w: 0,
        });
        break;
      }

      case 'offset': {
        const v = read('input') as Vec4;
        const o = read('offset') as Vec4;
        write('output', {
          x: v.x + o.x,
          y: v.y + o.y,
          z: v.z + o.z,
          w: v.w + o.w,
        });
        break;
      }

      case 'scale': {
        const v = read('input') as Vec4;
        const s = read('scale') as number;
        write('output', { x: v.x * s, y: v.y * s, z: v.z * s, w: v.w * s });
        break;
      }

      // -----------------------------------------------------------------------
      // Host-driven (time / waveforms)
      // -----------------------------------------------------------------------

      case 'time':
        write('output', getTime());
        break;

      case 'square-wave': {
        const freq = read('frequency') as number;
        const amp = read('amplitude') as number;
        const duty = Math.min(1, Math.max(0, read('dutyCycle') as number));
        const phase = (((getTime() * freq) % 1) + 1) % 1;
        write('output', phase < duty ? amp : -amp);
        break;
      }

      case 'triangle-wave': {
        const freq = read('frequency') as number;
        const amp = read('amplitude') as number;
        const phase = (((getTime() * freq) % 1) + 1) % 1;
        write('output', amp * (1 - 4 * Math.abs(phase - 0.5)));
        break;
      }

      case 'sawtooth-wave': {
        const freq = read('frequency') as number;
        const amp = read('amplitude') as number;
        const phase = (((getTime() * freq) % 1) + 1) % 1;
        write('output', amp * (2 * phase - 1));
        break;
      }

      // -----------------------------------------------------------------------
      // Random
      // -----------------------------------------------------------------------

      case 'random':
        write('output', getRandom());
        break;

      // -----------------------------------------------------------------------
      // Stateful – tick
      // -----------------------------------------------------------------------

      case 'tick': {
        const state = this.getState(nodeId);
        const count = ((state.tickCount as number) ?? 0) + 1;
        state.tickCount = count;
        write('output', count);
        break;
      }

      // -----------------------------------------------------------------------
      // Stateful – sequence
      // -----------------------------------------------------------------------

      case 'sequence': {
        const state = this.getState(nodeId);
        const seqText = (config.sequence as string) ?? '';
        const sequence = seqText
          .split(',')
          .map(p => Number(p.trim()))
          .filter(v => Number.isFinite(v));

        if (sequence.length === 0) {
          write('output', 0);
          break;
        }

        const rate = Math.max(1, Math.round(read('rate') as number));
        const index = (state.sequenceIndex as number) % sequence.length;
        const out = sequence[index] ?? 0;

        let tick = (state.sequenceTick as number) + 1;
        let next = index;
        if (tick >= rate) {
          tick = 0;
          next = (index + 1) % sequence.length;
        }
        state.sequenceTick = tick;
        state.sequenceIndex = next;

        write('output', out);
        break;
      }

      // -----------------------------------------------------------------------
      // Stateful – buffer
      // -----------------------------------------------------------------------

      case 'buffer': {
        const length = config.length as number;
        const mode = config.mode as string;
        const input = read('input') as number;
        const state = this.getState(nodeId);

        // Re-initialise if length changed (e.g. config updated at runtime).
        if (
          !Array.isArray(state.buffer) ||
          (state.buffer as number[]).length !== length
        ) {
          state.buffer = new Array<number>(length).fill(0);
          state.writeIndex = 0;
          state.readIndex = 0;
          state.filledCount = 0;
          state.phase = 'recording';
        }

        const buf = state.buffer as number[];
        let output = 0;

        if (mode === 'delay') {
          output = buf[state.readIndex as number] ?? 0;
          buf[state.writeIndex as number] = input;
          state.writeIndex = ((state.writeIndex as number) + 1) % length;
          state.readIndex = ((state.readIndex as number) + 1) % length;
        } else if (mode === 'capture-loop') {
          if (state.phase === 'recording') {
            buf[state.writeIndex as number] = input;
            state.writeIndex = ((state.writeIndex as number) + 1) % length;

            let filled = state.filledCount as number;
            if (filled < length) filled++;
            state.filledCount = filled;
            if (filled >= length) state.phase = 'playing';

            output = 0;
          } else {
            output = buf[state.readIndex as number] ?? 0;
            state.readIndex = ((state.readIndex as number) + 1) % length;
          }
        }

        write('output', output);
        break;
      }

      // -----------------------------------------------------------------------
      // Noise – Perlin
      // -----------------------------------------------------------------------

      case 'perlin': {
        // Create noise instance once on first use (matching editor behaviour).
        if (!this.noiseInstances.has(nodeId)) {
          this.noiseInstances.set(nodeId, new Noise(read('seed') as number));
        }
        const noise = this.noiseInstances.get(nodeId)!;
        write(
          'output',
          noise.perlin3(
            read('x') as number,
            read('y') as number,
            read('z') as number
          )
        );
        break;
      }

      // -----------------------------------------------------------------------
      // Noise – Fractal Perlin (fBm)
      // -----------------------------------------------------------------------

      case 'fractal-perlin': {
        if (!this.noiseInstances.has(nodeId)) {
          this.noiseInstances.set(nodeId, new Noise(read('seed') as number));
        }
        const noise = this.noiseInstances.get(nodeId)!;
        const octaves = Math.max(1, Math.floor(read('octaves') as number));
        const persistence = read('persistence') as number;
        const lacunarity = read('lacunarity') as number;
        const x = read('x') as number;
        const y = read('y') as number;
        const z = read('z') as number;

        let amplitude = 1;
        let frequency = 1;
        let out = 0;
        for (let i = 0; i < octaves; i++) {
          out +=
            amplitude *
            noise.perlin3(x * frequency, y * frequency, z * frequency);
          amplitude *= persistence;
          frequency *= lacunarity;
        }
        write('output', out);
        break;
      }

      // Unknown / future ops are silently skipped.
      default:
        break;
    }
  }
}
