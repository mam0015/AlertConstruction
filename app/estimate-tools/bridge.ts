import type { UsePayload } from "./EstimateTools";

// Hands priced lines from the Estimate tools to the Estimator's quote calculator. If the calculator is open it takes them at once; if no job is
// open for pricing yet, they wait here and the calculator picks them up when it opens. Nothing leaves the browser.
const EVENT = "atp:estimate-lines";
let waiting: UsePayload | null = null;

export function publishEstimateLines(payload: UsePayload) {
  waiting = payload;
  window.dispatchEvent(new CustomEvent<UsePayload>(EVENT, { detail: payload }));
}

export function takeEstimateLines(): UsePayload | null {
  const payload = waiting;
  waiting = null;
  return payload;
}

export function onEstimateLines(handler: (payload: UsePayload) => void) {
  const listener = (event: Event) => { takeEstimateLines(); handler((event as CustomEvent<UsePayload>).detail); };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
