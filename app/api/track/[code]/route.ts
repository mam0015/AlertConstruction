import { getTrackingRecord } from "../../../../db/request-store";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const record = await getTrackingRecord(decodeURIComponent(code)).catch(() => null);
  if (!record) return Response.json({ error: "Project reference not found." }, { status: 404 });
  return Response.json(record, { headers: { "Cache-Control": "no-store" } });
}

