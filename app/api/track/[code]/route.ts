import { getTrackingRecord } from "../../../../db/request-store";
import { clientAddress, sha256Hex, throttleHit, throttleRefund, tooManyRequests } from "../../../../db/throttle";

const WINDOW = 30 * 60 * 1000;

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  // Counted before it is looked up (one atomic statement); a right reference gives its slot back, so only wrong guesses use up the allowance.
  const key = await sha256Hex(`legacy-track|${clientAddress(request)}`);
  const slot = await throttleHit(key, 12, WINDOW);
  if (!slot.allowed) return tooManyRequests("Too many reference attempts. Try again later.", slot.retryAfterSeconds);
  let decoded = "";
  try { decoded = decodeURIComponent(code); } catch { /* a malformed escape is simply an unknown reference */ }
  const record = decoded ? await getTrackingRecord(decoded).catch(() => null) : null;
  if (!record) return Response.json({ error: "Project reference not found." }, { status: 404 });
  await throttleRefund(key);
  return Response.json(record, { headers: { "Cache-Control": "no-store" } });
}
