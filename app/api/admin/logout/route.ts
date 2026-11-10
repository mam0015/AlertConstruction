import { signOutEveryIdentity } from "../../../sign-out-route";

// Staff "Sign out": ends every identity this browser presents (see app/sign-out-route.ts).
export async function POST(request: Request) {
  return signOutEveryIdentity(request);
}
