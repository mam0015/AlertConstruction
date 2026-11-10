import { signOutEveryIdentity } from "../../../sign-out-route";

// Owner "Sign out": ends every identity this browser presents (see app/sign-out-route.ts), so a staff session left on the same
// computer is not left signed in behind the Owner.
export async function POST(request: Request) {
  return signOutEveryIdentity(request);
}
