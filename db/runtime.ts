type WorkerEnv = typeof import("cloudflare:workers").env;

export async function runtimeBindings(): Promise<WorkerEnv> {
  const scope = globalThis as typeof globalThis & { __ATP_TEST_BINDINGS__?: WorkerEnv };
  if (scope.__ATP_TEST_BINDINGS__) return scope.__ATP_TEST_BINDINGS__;
  const { env } = await import("cloudflare:workers");
  return env;
}


// Creating tables and seeding rows ("ensure…") only has to happen once per database in a running Worker; doing it on every request
// cost several database round trips each time (and Cloudflare counts every one against the per-request limit).
export function memoizePerDatabase(init: () => Promise<void>) {
  const finished = new WeakMap<object, Promise<void>>();
  return async () => {
    const env = await runtimeBindings();
    const key = (env.DB ?? scopeKey) as object;
    let pending = finished.get(key);
    if (!pending) {
      pending = init().catch((error) => { finished.delete(key); throw error; });
      finished.set(key, pending);
    }
    await pending;
  };
}
const scopeKey = {};
