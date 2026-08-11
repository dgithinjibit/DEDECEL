/*
  Minimal ambient types for snarkjs (the package ships no TypeScript declarations).
  We only use groth16.fullProve and groth16.verify, so we declare just those.
*/
declare module 'snarkjs' {
  export namespace groth16 {
    function fullProve(
      input: Record<string, unknown>,
      wasmPath: string,
      zkeyPath: string
    ): Promise<{ proof: unknown; publicSignals: string[] }>;

    function verify(
      vkey: object,
      publicSignals: string[],
      proof: object
    ): Promise<boolean>;
  }
}
