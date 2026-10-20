// Company email — READING, through the Gmail API.
//
// This file only reads: it asks Gmail for message headers and Google's short snippet, and it refuses to call anything
// except GET .../users/me/messages[/id]. Sending a reply is a separate, Owner-triggered step in reply.mjs.
//
// Each company mailbox is connected once by whoever owns that mailbox (see jarvis/scripts/gmail-authorize.mjs). Read-only
// by default; the owner can additionally allow replies for a mailbox ("canReply": true).
//
// Secrets (Cloudflare Worker secrets, never in GitHub):
//   JARVIS_GMAIL_CLIENT_ID, JARVIS_GMAIL_CLIENT_SECRET   – the Google OAuth client used to authorise
//   JARVIS_GMAIL_ACCOUNTS                                – JSON: [{"label":"info@company.com.au","refreshToken":"…","canReply":true}]

import { makeItem } from "../briefing.mjs";
import { JarvisAccessError } from "../policy.mjs";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me/";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SOURCE = "company_email";
const MAX_ACCOUNTS = 5;
const BATCH = 10;

export function parseAccounts(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : [])
      .filter((account) => account && typeof account.label === "string" && typeof account.refreshToken === "string" && account.label && account.refreshToken)
      .slice(0, MAX_ACCOUNTS)
      .map((account) => ({ label: account.label.trim(), refreshToken: account.refreshToken.trim(), canReply: account.canReply === true }));
  } catch {
    return [];
  }
}

export function emailConfigured(config) {
  return Boolean(config?.clientId && config?.clientSecret && parseAccounts(config?.accounts).length > 0);
}

export async function accessTokenFor(fetchImpl, config, account) {
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: account.refreshToken, grant_type: "refresh_token" }),
  });
  if (response.status === 400 || response.status === 401) {
    throw new JarvisAccessError("Google no longer accepts the saved login for this mailbox. Reconnect it (see jarvis/README.md).", 502);
  }
  if (!response.ok) throw new Error(`token ${response.status}`);
  const body = await response.json();
  if (!body?.access_token) throw new Error("no access token");
  return body.access_token;
}

// The only Gmail call Jarvis can make: GET messages or one message.
export async function gmailGet(fetchImpl, accessToken, path, params = {}) {
  if (!/^messages(\/[A-Za-z0-9_-]+)?$/.test(path)) throw new JarvisAccessError("Jarvis may only read messages.", 500);
  const url = new URL(GMAIL_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    for (const entry of Array.isArray(value) ? value : [value]) url.searchParams.append(key, String(entry));
  }
  const response = await fetchImpl(url.toString(), { method: "GET", headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`gmail ${response.status}`);
  return response.json();
}

function decodeEntities(text) {
  return String(text ?? "").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function header(message, name) {
  return message?.payload?.headers?.find((entry) => entry.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function toItem(account, message) {
  const sent = Array.isArray(message.labelIds) && message.labelIds.includes("SENT");
  const at = new Date(Number(message.internalDate) || Date.now()).toISOString();
  return makeItem({
    id: `email:${account.label}:${message.id}`,
    source: SOURCE,
    kind: sent ? "email_sent" : "email_received",
    at,
    title: header(message, "Subject") || "(no subject)",
    who: sent ? `To: ${header(message, "To")}` : header(message, "From"),
    mailbox: account.label,
    body: decodeEntities(message.snippet),
    email: { mailbox: account.label, messageId: message.id, threadId: message.threadId, canReply: account.canReply },
  });
}

async function readAccount(fetchImpl, config, account, sinceMs, limit) {
  const accessToken = await accessTokenFor(fetchImpl, config, account);
  const list = await gmailGet(fetchImpl, accessToken, "messages", {
    maxResults: limit,
    q: `after:${Math.floor(sinceMs / 1000)} -in:spam -in:trash -in:drafts`,
  });
  const ids = (list.messages ?? []).map((message) => message.id).filter(Boolean).slice(0, limit);
  const items = [];
  for (let index = 0; index < ids.length; index += BATCH) {
    const batch = await Promise.allSettled(ids.slice(index, index + BATCH).map((id) =>
      gmailGet(fetchImpl, accessToken, `messages/${id}`, { format: "metadata", metadataHeaders: ["From", "To", "Subject"] })));
    for (const result of batch) if (result.status === "fulfilled") items.push(toItem(account, result.value));
  }
  return items;
}

export async function readCompanyEmail({ config, sinceMs, limit, fetchImpl }) {
  const accounts = parseAccounts(config?.accounts);
  if (!config?.clientId || !config?.clientSecret || accounts.length === 0) {
    return { status: "not_connected", items: [], accounts: [] };
  }
  const settled = await Promise.allSettled(accounts.map((account) => readAccount(fetchImpl, config, account, sinceMs, limit)));
  const items = [];
  const report = accounts.map((account, index) => {
    const result = settled[index];
    if (result.status === "fulfilled") {
      items.push(...result.value);
      return { label: account.label, status: "ok", count: result.value.length, canReply: account.canReply };
    }
    return { label: account.label, status: "error", count: 0, canReply: account.canReply };
  });
  const failed = report.filter((entry) => entry.status === "error").length;
  return { status: failed === report.length ? "error" : failed > 0 ? "partial" : "ok", items, accounts: report };
}
