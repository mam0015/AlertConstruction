type WorkerEnv = typeof import("cloudflare:workers").env;

export async function runtimeBindings(): Promise<WorkerEnv> {
  const scope = globalThis as typeof globalThis & { __ATP_TEST_BINDINGS__?: WorkerEnv };
  if (scope.__ATP_TEST_BINDINGS__) return scope.__ATP_TEST_BINDINGS__;
  const { env } = await import("cloudflare:workers");
  return env;
}

