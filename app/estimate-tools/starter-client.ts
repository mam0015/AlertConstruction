// The previous prices (Owner/Admin only, from the server) that can be offered as a starting point. They are only ever put into the unsaved
// edit boxes: the person looks them over and presses Save prices.
export async function fetchStarterPrices(): Promise<Record<string, number>> {
  const response = await fetch("/api/estimate/starter", { cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { prices?: Record<string, number>; error?: string };
  if (!response.ok || !body.prices) throw new Error(body.error ?? "The previous prices could not be loaded.");
  return body.prices;
}

// Keys that have no saved price and no unsaved edit yet, as text for the edit boxes.
export function unfilled(starter: Record<string, number>, saved: Record<string, number>, draft: Record<string, string>, only: (key: string) => boolean) {
  return Object.fromEntries(Object.entries(starter).filter(([key]) => only(key) && typeof saved[key] !== "number" && !(key in draft)).map(([key, dollars]) => [key, dollars.toFixed(2)]));
}
