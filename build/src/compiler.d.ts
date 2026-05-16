import type { CompiledProgram, GraphDocument } from './types';
export declare class CompileError extends Error {
    constructor(message: string);
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
export declare function compile(document: GraphDocument): CompiledProgram;
