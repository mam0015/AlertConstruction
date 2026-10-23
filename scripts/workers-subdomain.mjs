// Makes sure the Cloudflare account has a workers.dev name (the "<name>" in https://alert-tradie-pro.<name>.workers.dev).
// A brand-new account has none, and wrangler cannot ask for one in a non-interactive run. A name that already exists is NEVER changed.
// Returns "exists" | "registered" | "no-name" | "invalid-name" | "refused" | "unknown"; the token is never printed.

export async function ensureWorkersSubdomain({ accountId, token, name = "", fetchFn = globalThis.fetch, log = console.log }) {
  const api = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const wanted = String(name ?? "").trim().toLowerCase();
  try {
    const current = await fetchFn(api, { headers });
    const body = await current.json().catch(() => null);
    if (current.ok && body?.success && body.result?.subdomain) {
      log(`The workers.dev name of this account is "${body.result.subdomain}". It is left as it is.`);
      return "exists";
    }
    const absent = current.status === 404 || (current.ok && body?.success && !body.result?.subdomain);
    if (!absent) {
      log("Could not check the workers.dev name of this account. Continuing; wrangler will say if one is needed.");
      return "unknown";
    }
    if (!wanted) {
      log("This account has no workers.dev name yet, and none is set in cloudflare.resources.json (workersSubdomain).");
      return "no-name";
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(wanted)) {
      log(`The workers.dev name "${wanted}" is not allowed (use lowercase letters, digits and "-", not starting or ending with "-").`);
      return "invalid-name";
    }
    const put = await fetchFn(api, { method: "PUT", headers, body: JSON.stringify({ subdomain: wanted }) });
    const result = await put.json().catch(() => null);
    if (put.ok && result?.success) {
      log(`Registered the workers.dev name "${wanted}" for this account. The app will be at https://alert-tradie-pro.${wanted}.workers.dev`);
      return "registered";
    }
    const why = (result?.errors ?? []).map((error) => error?.message).filter(Boolean).join("; ") || `HTTP ${put.status}`;
    log(`Cloudflare did not register the workers.dev name "${wanted}": ${why}. A name already taken by someone else, or a token without "Workers Scripts: Edit", are the usual reasons.`);
    return "refused";
  } catch {
    log("Could not reach Cloudflare to check the workers.dev name. Continuing.");
    return "unknown";
  }
}
