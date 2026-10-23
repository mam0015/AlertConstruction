// Finds the real Cloudflare API token inside whatever was pasted into the CLOUDFLARE_API_TOKEN secret.
// People often paste the token with a line break, the account id, or the test command Cloudflare shows under the token.
// Every plausible piece is tried against Cloudflare itself, and only the one Cloudflare accepts is used.

// Pieces that could be a token: letters, digits, "_" and "-", 30+ characters. The account id (32 hex) is never a token.
export function tokenCandidates(raw, accountId = "") {
  const seen = new Set();
  const pieces = String(raw ?? "").split(/[\s"'`,;\\]+/).map((part) => part.replace(/^Bearer$/i, "")).filter(Boolean);
  for (const piece of pieces) {
    if (/^[A-Za-z0-9_-]{30,}$/.test(piece) && piece !== accountId && !/^[0-9a-f]{32}$/i.test(piece)) seen.add(piece);
  }
  // Newer tokens start with cfut_ / cfat_ / cfk_; those, then the usual 40-character form, are tried first.
  const rank = (piece) => (/^cf[a-z]{1,3}_/.test(piece) ? 0 : piece.length === 40 ? 1 : 2);
  return [...seen].sort((a, b) => rank(a) - rank(b));
}

async function accepted(fetchFn, url, token) {
  const response = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status >= 500) throw new Error("Cloudflare is not answering properly right now");
  const body = await response.json().catch(() => null);
  return Boolean(response.ok && body?.success === true);
}

// Resolves { token, checked, verified }. verified is true (Cloudflare accepted it), false (Cloudflare refused every piece) or null (Cloudflare
// could not be reached, so nothing was learned and the first piece is used as it is). The token is never printed here.
export async function pickWorkingToken(raw, accountId, fetchFn = globalThis.fetch) {
  const candidates = tokenCandidates(raw, accountId);
  if (!candidates.length) return { token: String(raw ?? "").trim().split(/\s+/)[0] ?? "", checked: 0, verified: false };
  let reached = false;
  for (const token of candidates) {
    const urls = ["https://api.cloudflare.com/client/v4/user/tokens/verify"];
    if (accountId) urls.push(`https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`);
    for (const url of urls) {
      try {
        if (await accepted(fetchFn, url, token)) return { token, checked: candidates.length, verified: true };
        reached = true;
      } catch {
        // Not reachable right now: learn nothing from this piece.
      }
    }
  }
  return { token: candidates[0], checked: candidates.length, verified: reached ? false : null };
}
