import type { CompiledProgram, RuntimeServices, SampleInputs, SampleResult } from './types';
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
export declare class NoiseGeneratorRunner {
    private readonly program;
    /** Serialisable per-node mutable state (tick counters, buffers, …). */
    private nodeState;
    /**
     * Non-serialisable noise instances, keyed by nodeId.
     * Created lazily on first evaluation of each perlin / fractal-perlin node.
     */
    private noiseInstances;
    constructor(program: CompiledProgram);
    /**
     * Resets all stateful nodes (tick counters, buffers, sequence positions, etc.)
     * to their initial values and clears any cached noise instances.
     *
     * Call this when you want to replay a signal from the beginning.
     */
    reset(): void;
    /**
     * Evaluates the compiled program for one step and returns named outputs.
     *
     * @param inputs  Named input values. Keys must match the `key` configured on
     *                `input-parameter-*` nodes. Missing keys fall back to each
     *                parameter's compiled-in default value.
     * @param services  Optional overrides for time and random sources.
     */
    sample(inputs?: SampleInputs, services?: RuntimeServices): SampleResult;
    private initState;
    private getState;
    private execute;
}
