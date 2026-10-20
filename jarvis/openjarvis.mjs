// Jarvis 2: the same Jarvis, with OpenJarvis (https://github.com/open-jarvis/OpenJarvis) as its brain.
//
// OpenJarvis is a local-first AI framework the Owner runs on their own computer or server. Its `jarvis serve` command starts an
// OpenAI-style API (POST /v1/chat/completions). This file is only a translator: it presents that API with the same small interface the
// Claude client has (client.beta.messages.create), so every other part of Jarvis — what it may read, how the Owner's words become a draft
// or a prepared action, the three proofreading passes, the checks before anything is sent — is exactly the same for both brains.
//
// What OpenJarvis's server accepts (from its source): model, messages, temperature, max_tokens, stream, tools. It does not take a JSON
// schema, so the schema is written into the instructions and the answer is read back as text and checked here exactly as Claude's is.
// No `tools` are ever sent. Its own server should run the "simple" agent (no tools); brainCheck() says so if it does not.

import { AiError } from "./ai.mjs";

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_TOKENS = 4_000;

export function isLocalHost(hostname) {
  return /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?)$/i.test(hostname);
}

// Everything comes from private Worker secrets. Plain http is allowed only for localhost; anything on the internet must be https,
// because the records Jarvis sends travel to this address.
export function parseOpenJarvis(config) {
  const raw = String(config?.openJarvis?.url ?? "").trim();
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalHost(url.hostname))) return null;
  const base = `${url.origin}${url.pathname.replace(/\/+$/, "").replace(/\/v1$/, "")}`;
  return {
    base,
    apiKey: String(config.openJarvis.apiKey ?? "").trim(),
    model: String(config.openJarvis.model ?? "").trim(),
    accessId: String(config.openJarvis.accessId ?? "").trim(),
    accessSecret: String(config.openJarvis.accessSecret ?? "").trim(),
  };
}

export function openJarvisConfigured(config) {
  return parseOpenJarvis(config) !== null;
}

function headersFor(target) {
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (target.apiKey) headers.authorization = `Bearer ${target.apiKey}`;
  // Cloudflare Access service token, for a server that is exposed through a Cloudflare Tunnel.
  if (target.accessId && target.accessSecret) {
    headers["cf-access-client-id"] = target.accessId;
    headers["cf-access-client-secret"] = target.accessSecret;
  }
  return headers;
}

function problem(message, status = 503) {
  const error = new AiError(message, status);
  error.brain = "jarvis2";
  return error;
}

async function call(target, fetchImpl, path, init = {}) {
  let response;
  try {
    response = await fetchImpl(`${target.base}${path}`, { ...init, headers: { ...headersFor(target), ...(init.headers ?? {}) }, signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw problem(error?.name === "TimeoutError" || error?.name === "AbortError" ? "Jarvis 2 took too long to answer." : "Jarvis 2 could not be reached.", 504);
  }
  return response;
}

// ---------- Reading the answer ----------

// Small local models often wrap JSON in prose, markdown fences or <think> blocks. This finds the first complete {...} object.
export function extractJson(text) {
  // Bounded work: a hostile or broken answer full of unbalanced braces cannot make this loop quadratic.
  const cleaned = String(text ?? "").slice(0, 40_000).replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "");
  let tries = 0;
  for (let start = cleaned.indexOf("{"); start !== -1 && tries < 60; start = cleaned.indexOf("{", start + 1), tries += 1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const char = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') inString = true;
      else if (char === "{") depth += 1;
      else if (char === "}" && --depth === 0) {
        try {
          const value = JSON.parse(cleaned.slice(start, index + 1));
          if (value && typeof value === "object" && !Array.isArray(value)) return value;
        } catch {
          // not valid JSON from this "{": try the next one
        }
        break;
      }
    }
  }
  return null;
}

// A tiny example of the answer, built from the schema, so a small model sees the exact shape.
export function skeleton(schema) {
  if (!schema || typeof schema !== "object") return null;
  if (Array.isArray(schema.anyOf)) return skeleton(schema.anyOf.find((option) => option.type === "null") ?? schema.anyOf[0]);
  if (schema.type === "object") return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, value]) => [key, skeleton(value)]));
  if (schema.type === "array") return [];
  if (schema.type === "null") return null;
  if (schema.enum) return schema.enum[0];
  if (schema.type === "string") return "";
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "boolean") return false;
  return null;
}

function schemaInstructions(schema) {
  return `\n\nOUTPUT FORMAT — IMPORTANT\nReply with ONE JSON object and nothing else: no markdown, no code fences, no text before or after it. Every key in the example must be present. It must follow this JSON Schema:\n${JSON.stringify(schema)}\nExample of the shape (fill it in; keep empty arrays or null where you have nothing):\n${JSON.stringify(skeleton(schema))}`;
}

// ---------- The Claude-shaped client ----------

// params.system / params.messages as Claude takes them; params.output_config.format.schema asks for JSON. Returns what Claude's client returns.
export function createOpenJarvisClient(config, { fetchImpl = globalThis.fetch } = {}) {
  const target = parseOpenJarvis(config);
  if (!target) throw problem("Jarvis 2 is not connected. Set the OpenJarvis address (see docs/JARVIS2-OPENJARVIS.md).");
  let model = target.model;

  async function pickModel() {
    if (model) return model;
    const response = await call(target, fetchImpl, "/v1/models", { method: "GET" });
    if (!response.ok) throw problem(response.status === 401 || response.status === 403 ? "Jarvis 2 refused the key. Check JARVIS_OPENJARVIS_API_KEY." : "Jarvis 2 did not list its models. Set JARVIS_OPENJARVIS_MODEL.", response.status);
    const list = await response.json().catch(() => null);
    model = String(list?.data?.[0]?.id ?? "");
    if (!model) throw problem("Jarvis 2 has no model loaded. Pull one (jarvis model pull) or set JARVIS_OPENJARVIS_MODEL.");
    return model;
  }

  async function chat(messages, maxTokens) {
    const body = { model: await pickModel(), messages, temperature: 0.2, max_tokens: Math.min(MAX_TOKENS, maxTokens), stream: false };
    const response = await call(target, fetchImpl, "/v1/chat/completions", { method: "POST", body: JSON.stringify(body) });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw problem("Jarvis 2 refused the key. Check JARVIS_OPENJARVIS_API_KEY.", response.status);
      throw problem("Jarvis 2 could not answer just now.", response.status === 429 ? 429 : 503);
    }
    const data = await response.json().catch(() => null);
    const choice = data?.choices?.[0];
    return { text: typeof choice?.message?.content === "string" ? choice.message.content : "", finish: choice?.finish_reason ?? "stop", usage: data?.usage ?? {}, model: String(data?.model ?? model) };
  }

  return {
    beta: {
      messages: {
        async create(params) {
          const schema = params?.output_config?.format?.schema;
          const messages = [
            { role: "system", content: `${String(params.system ?? "")}${schema ? schemaInstructions(schema) : ""}` },
            ...(params.messages ?? []).map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: typeof message.content === "string" ? message.content : "" })),
          ];
          let result = await chat(messages, Number(params.max_tokens) || MAX_TOKENS);
          if (result.finish === "length") return respond({ ...result, stop: "max_tokens", text: result.text });
          if (schema) {
            let data = extractJson(result.text);
            if (!data) {
              // One more try: small models usually fix this when told plainly.
              result = await chat([...messages, { role: "assistant", content: result.text.slice(0, 4000) }, { role: "user", content: "That was not a valid JSON object. Reply again with ONLY the JSON object described in the instructions." }], Number(params.max_tokens) || MAX_TOKENS);
              data = extractJson(result.text);
            }
            if (!data) throw problem("Jarvis 2 answered in an unexpected format. Try again, or pick a larger model.");
            return respond({ ...result, stop: "end_turn", text: JSON.stringify(data) });
          }
          return respond({ ...result, stop: "end_turn" });
        },
      },
    },
  };
}

function respond({ text, stop, usage, model }) {
  return {
    stop_reason: stop, model,
    usage: { input_tokens: Number(usage?.prompt_tokens ?? 0), output_tokens: Number(usage?.completion_tokens ?? 0) },
    content: [{ type: "text", text }],
  };
}

// ---------- "Test connection" ----------

// Says in plain words whether Jarvis 2 can be reached and is set up safely. Reads only; sends no company data.
export async function checkOpenJarvis(config, { fetchImpl = globalThis.fetch } = {}) {
  const target = parseOpenJarvis(config);
  if (!target) return { ok: false, message: "Not connected: the OpenJarvis address is missing, or it is not https (plain http works only for localhost).", warnings: [] };
  const started = Date.now();
  const warnings = [];
  try {
    const health = await call(target, fetchImpl, "/health", { method: "GET", signal: AbortSignal.timeout(10_000) });
    if (!health.ok) return { ok: false, message: health.status === 503 ? "Jarvis 2 is running but its model engine (for example Ollama) is not." : `Jarvis 2 answered with an error (${health.status}).`, warnings };
    let model = target.model;
    let agent = "";
    const models = await call(target, fetchImpl, "/v1/models", { method: "GET", signal: AbortSignal.timeout(10_000) });
    if (models.status === 401 || models.status === 403) return { ok: false, message: "Jarvis 2 refused the key. Check JARVIS_OPENJARVIS_API_KEY (it must equal OPENJARVIS_API_KEY on that server).", warnings };
    if (models.ok) {
      const list = await models.json().catch(() => null);
      const ids = (list?.data ?? []).map((entry) => String(entry?.id ?? "")).filter(Boolean);
      if (!model) model = ids[0] ?? "";
      else if (ids.length && !ids.includes(model)) warnings.push(`The model “${model}” is not in the list that server offers (${ids.slice(0, 4).join(", ")}). Check JARVIS_OPENJARVIS_MODEL.`);
    }
    const info = await call(target, fetchImpl, "/v1/info", { method: "GET", signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (info?.ok) {
      const details = await info.json().catch(() => null);
      agent = String(details?.agent ?? "");
      if (agent && !/^(simple|none)$/i.test(agent)) warnings.push(`That server runs the “${agent}” agent, which can use tools such as web search. Set  agent = "simple"  under [server] in its config so Jarvis 2 only writes text.`);
    }
    if (!model) warnings.push("No model is loaded on that server. Pull one, or set JARVIS_OPENJARVIS_MODEL.");
    return { ok: true, message: `Jarvis 2 answered in ${Date.now() - started} ms.`, model, agent, warnings };
  } catch (error) {
    return { ok: false, message: error instanceof AiError ? error.message : "Jarvis 2 could not be reached.", warnings };
  }
}
