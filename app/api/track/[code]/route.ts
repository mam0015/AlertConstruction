import { getTrackingRecord } from "../../../../db/request-store";
import { clientAddress, sha256Hex, throttleExceeded, throttleHit, tooManyRequests } from "../../../../db/throttle";

const WINDOW = 30 * 60 * 1000;

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const key = await sha256Hex(`legacy-track|${clientAddress(request)}`);
  const limit = await throttleExceeded(key, 12, WINDOW);
  if (limit.exceeded) return tooManyRequests("Too many reference attempts. Try again later.", limit.retryAfterSeconds);
  let decoded = "";
  try { decoded = decodeURIComponent(code); } catch { /* a malformed escape is simply an unknown reference */ }
  const record = decoded ? await getTrackingRecord(decoded).catch(() => null) : null;
  if (!record) {
    await throttleHit(key, 12, WINDOW);
    return Response.json({ error: "Project reference not found." }, { status: 404 });
  }
  return Response.json(record, { headers: { "Cache-Control": "no-store" } });
}
