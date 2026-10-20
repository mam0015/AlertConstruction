// Jarvis has two brains and the Owner picks which one answers:
//   Jarvis 1  Claude, Anthropic's cloud AI (needs the JARVIS_ANTHROPIC_API_KEY secret)
//   Jarvis 2  OpenJarvis, an open-source AI the Owner runs on their own computer or server (needs JARVIS_OPENJARVIS_URL)
// Only the brain differs. What Jarvis may read, how drafts and actions are checked, the three proofreading passes and every
// "Owner presses the button" rule are the same code for both, so Jarvis 2 can do exactly what Jarvis 1 can.

import { aiEnabled, createAiClient, DEFAULT_MODEL } from "./ai.mjs";
import { createOpenJarvisClient, openJarvisConfigured } from "./openjarvis.mjs";

export const BRAIN_IDS = Object.freeze(["jarvis1", "jarvis2"]);

export function describeBrains(config) {
  const claude = aiEnabled(config);
  return [
    { id: "jarvis1", name: "Jarvis 1", engine: "Claude", where: "Anthropic's cloud", available: claude, model: claude ? config.model || DEFAULT_MODEL : "" },
    { id: "jarvis2", name: "Jarvis 2", engine: "OpenJarvis", where: "your own server", available: openJarvisConfigured(config), model: String(config?.openJarvis?.model ?? "") },
  ];
}

export function parseBrain(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || !BRAIN_IDS.includes(value)) return null;
  return value;
}

// The Owner's choice wins. With no choice, Jarvis 1 answers if it is connected, otherwise Jarvis 2, otherwise basic (rules) mode.
// A chosen brain that is not connected is never swapped for the other one: Jarvis says so and uses basic mode.
/**
 * @param {any} config
 * @param {string} [requested]
 * @param {{ testClient?: any, fetchImpl?: typeof fetch }} [options]
 * @returns {{ id: string, name: string, engine: string, enabled: boolean, client: any, model: string, fallbacks: boolean }}
 */
export function resolveBrain(config, requested = "", { testClient = null, fetchImpl = globalThis.fetch } = {}) {
  const brains = describeBrains(config);
  const id = BRAIN_IDS.includes(requested) ? requested : brains.find((brain) => brain.available)?.id ?? "jarvis1";
  const info = brains.find((brain) => brain.id === id);
  if (!info.available) return { id, name: info.name, engine: info.engine, enabled: false, client: null, model: "", fallbacks: false };
  if (id === "jarvis1") return { id, name: info.name, engine: info.engine, enabled: true, client: testClient ?? createAiClient(config), model: info.model, fallbacks: config.aiFallbacks !== "off" };
  return { id, name: info.name, engine: info.engine, enabled: true, client: createOpenJarvisClient(config, { fetchImpl }), model: info.model, fallbacks: false };
}

export const notConnectedText = (brain) => `${brain.name} (${brain.engine}) is not connected yet, so I used basic mode.`;
