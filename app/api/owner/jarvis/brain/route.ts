import { checkOpenJarvis } from "../../../../../jarvis/openjarvis.mjs";
import { fail, headers, jarvisConfig, networkFetch, notAllowed, requireOwner } from "../../../../../jarvis/server";

// "Test connection" for Jarvis 2 (OpenJarvis). Owner session only. It asks the OpenJarvis server whether it is alive, which model it has and
// which agent it runs; it sends none of the company's data and changes nothing.
export async function POST(request: Request) {
  const gate = await requireOwner(request, { write: true });
  if (!gate.owner) return gate.response;
  try {
    return Response.json(await checkOpenJarvis(jarvisConfig(), { fetchImpl: networkFetch() }), { headers });
  } catch (error) {
    return fail(error, "Jarvis could not test the connection.");
  }
}

export const GET = notAllowed("POST");
export const PUT = notAllowed("POST");
export const PATCH = notAllowed("POST");
export const DELETE = notAllowed("POST");
