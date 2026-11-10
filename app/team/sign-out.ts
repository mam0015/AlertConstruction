// Every staff "Sign out" button goes through this. Sign-out only counts as done when the server confirms it ("" comes back and the
// caller leaves the page). Otherwise the reason comes back for the screen to show; the person is still signed in on this device, so
// pressing Sign out again finishes the job. Nobody walks away from a shared computer believing they signed out when they did not.
export async function requestSignOut(endpoint: "/api/admin/logout" | "/api/owner/logout"): Promise<string> {
  try {
    const response = await fetch(endpoint, { method: "POST" });
    if (response.ok) return "";
    const result = await response.json().catch(() => ({})) as { error?: string };
    return result.error ?? "Sign-out could not be completed. Please try again.";
  } catch {
    return "Sign-out could not reach the server. Check the connection and try again.";
  }
}
