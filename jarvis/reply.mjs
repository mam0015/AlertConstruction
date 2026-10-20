// Email replies — the ONLY place Jarvis can write anything.
//
// Jarvis never sends on its own. This code runs only when the Owner presses Send on a draft, and even then:
//  * it can only REPLY to a message that exists in a connected mailbox. The recipient is taken from that message
//    (Reply-To, else From); neither the Owner's browser, nor the AI, nor a customer's text can pick another address.
//  * the mailbox must have been connected with permission to send (canReply). Google enforces the same limit.
//  * the only write call it can make is  POST …/users/me/messages/send.

import { JarvisAccessError } from "./policy.mjs";
import { accessTokenFor, gmailGet } from "./sources/company-email.mjs";
import { clipText, oneLine } from "./text.mjs";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const ADDRESS = /^[^\s<>@,;"]+@[^\s<>@,;"']+\.[^\s<>@,;"']{2,}$/; // an apostrophe is valid in the local part (o'neil@…)
const NO_REPLY = /^(?:no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster)@/i;
export const MAX_ORIGINAL_CHARS = 4000;
export const MAX_REPLY_CHARS = 5000;

function decodeBase64Url(data) {
  try {
    const normal = String(data ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normal.padEnd(Math.ceil(normal.length / 4) * 4, "="));
    return new TextDecoder("utf-8").decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
  } catch {
    return "";
  }
}

function findPart(part, mimeType) {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

export function htmlToText(html) {
  return String(html ?? "")
    .replace(/<(?:style|script|head)[\s\S]*?<\/(?:style|script|head)>/gi, " ")
    .replace(/<\s*br\s*\/?>|<\/\s*(?:p|div|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ");
}

export function extractText(payload) {
  const plain = findPart(payload, "text/plain");
  if (plain) return decodeBase64Url(plain.body.data);
  const html = findPart(payload, "text/html");
  return html ? htmlToText(decodeBase64Url(html.body.data)) : "";
}

// Drops the quoted history a mail client adds below a reply, so the AI sees only what the sender just wrote.
export function stripQuotedHistory(text) {
  const kept = [];
  for (const line of String(text ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*On .{5,200} wrote:\s*$/i.test(line) || /^\s*-{2,}\s*Original Message\s*-{2,}/i.test(line)) break;
    if (/^\s*>/.test(line)) continue;
    kept.push(line);
  }
  return kept.join("\n");
}

function headerOf(message, name) {
  return message?.payload?.headers?.find((entry) => entry.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// First address of a header value: '"Doe, Jane" <jane@x.com>' -> { name, address }. Returns null if it is not a clean address.
export function parseAddress(value) {
  const text = oneLine(value);
  const angle = text.match(/^(.*?)<\s*([^<>\s,;]+@[^<>\s,;]+)\s*>/);
  let name = "";
  let address = "";
  if (angle) {
    name = angle[1].replace(/^["'\s]+|["'\s]+$/g, "");
    address = angle[2];
  } else {
    address = text.match(/([^<>\s,;"]+@[^<>\s,;"']+)/)?.[1] ?? "";
  }
  return ADDRESS.test(address) ? { name: name.slice(0, 120), address: address.toLowerCase() } : null;
}

export async function loadOriginal({ config, account, fetchImpl, messageId, token }) {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(String(messageId ?? ""))) throw new JarvisAccessError("That email could not be found.", 404);
  const accessToken = token ?? await accessTokenFor(fetchImpl, config, account);
  const message = await gmailGet(fetchImpl, accessToken, `messages/${messageId}`, { format: "full" });
  // The access token is returned beside the message, never inside it, so it can't end up in a response by accident.
  return {
    token: accessToken,
    original: {
      messageId: message.id,
      threadId: message.threadId ?? "",
      from: parseAddress(headerOf(message, "From")),
      replyTo: parseAddress(headerOf(message, "Reply-To")),
      subject: oneLine(headerOf(message, "Subject"), 200),
      messageIdHeader: oneLine(headerOf(message, "Message-ID"), 300),
      references: oneLine(headerOf(message, "References"), 600),
      sent: Array.isArray(message.labelIds) && message.labelIds.includes("SENT"),
      text: clipText(stripQuotedHistory(extractText(message.payload)), MAX_ORIGINAL_CHARS),
    },
  };
}

// The reply goes to Reply-To (else From) of the original — nowhere else.
export function recipientOf(original, mailbox) {
  const target = original.replyTo ?? original.from;
  if (!target) throw new JarvisAccessError("This email has no sender address to reply to.", 422);
  if (original.sent || target.address === String(mailbox).toLowerCase()) throw new JarvisAccessError("That message came from your own mailbox, so there is nobody to reply to.", 422);
  if (NO_REPLY.test(target.address)) throw new JarvisAccessError("This sender does not accept replies.", 422);
  return target;
}

export function replySubject(subject) {
  const base = oneLine(subject, 200) || "(no subject)";
  return /^re\s*:/i.test(base) ? base : `Re: ${base}`;
}

function encodeSubject(subject) {
  if (/^[\x20-\x7e]*$/.test(subject)) return subject;
  const words = [];
  let chunk = "";
  let bytes = 0;
  const flush = () => {
    if (chunk) words.push(`=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(chunk)))}?=`);
    chunk = "";
    bytes = 0;
  };
  for (const character of subject) {
    const size = new TextEncoder().encode(character).length;
    if (bytes + size > 30) flush();
    chunk += character;
    bytes += size;
  }
  flush();
  return words.join("\r\n ");
}

function base64Lines(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return (btoa(binary).match(/.{1,76}/g) ?? []).join("\r\n");
}

export function buildReplyMime({ mailbox, to, subject, body, messageIdHeader, references }) {
  const headers = [];
  if (ADDRESS.test(String(mailbox))) headers.push(`From: ${oneLine(mailbox)}`);
  headers.push(`To: ${oneLine(to)}`, `Subject: ${encodeSubject(oneLine(subject, 200))}`);
  if (messageIdHeader) {
    headers.push(`In-Reply-To: ${oneLine(messageIdHeader, 300)}`);
    headers.push(`References: ${oneLine(`${references} ${messageIdHeader}`, 900)}`);
  }
  headers.push("MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64");
  return `${headers.join("\r\n")}\r\n\r\n${base64Lines(String(body).replace(/\r?\n/g, "\r\n"))}\r\n`;
}

function base64Url(text) {
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Everything the Owner needs to check before pressing Send: who it goes to and what the subject is.
export async function previewReply({ config, account, fetchImpl, messageId }) {
  const { original } = await loadOriginal({ config, account, fetchImpl, messageId });
  const target = recipientOf(original, account.label);
  return { original, to: target.address, toName: target.name, subject: replySubject(original.subject) };
}

// beforeSend({ to, subject }) runs after the recipient is known and before anything is sent — the caller uses it to claim the
// "send once" log entry, and it may throw to stop the send.
export async function sendReply({ config, account, fetchImpl, messageId, body, beforeSend }) {
  if (!account.canReply) {
    throw new JarvisAccessError("This mailbox is connected read-only. Reconnect it with --allow-replies to let Jarvis send replies.", 403);
  }
  const text = clipText(body, MAX_REPLY_CHARS);
  if (text.length < 2) throw new JarvisAccessError("The reply is empty.", 400);

  const { original, token } = await loadOriginal({ config, account, fetchImpl, messageId });
  const to = recipientOf(original, account.label).address;
  const subject = replySubject(original.subject);
  if (beforeSend) await beforeSend({ to, subject });
  const raw = base64Url(buildReplyMime({
    mailbox: account.label, to, subject, body: text,
    messageIdHeader: original.messageIdHeader, references: original.references,
  }));
  let response;
  try {
    response = await fetchImpl(GMAIL_SEND_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ raw, ...(original.threadId ? { threadId: original.threadId } : {}) }),
    });
  } catch {
    // No answer from Google: the reply may or may not have gone out, so the caller must not treat it as a clean failure.
    const unsure = new JarvisAccessError("I could not confirm that the reply was sent. Check the mailbox's Sent folder before trying again.", 502);
    unsure.uncertain = true;
    throw unsure;
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const reason = String(detail?.error?.errors?.[0]?.reason ?? detail?.error?.status ?? "");
    if (response.status === 429 || /ratelimit|dailylimit|quota/i.test(reason)) {
      throw new JarvisAccessError("Google's sending limit has been reached for this mailbox. Please try again later.", 429);
    }
    if (response.status === 401 || response.status === 403) {
      throw new JarvisAccessError("Google refused to send from this mailbox. Reconnect it with --allow-replies.", 403);
    }
    throw new Error(`gmail send ${response.status}`);
  }
  const sent = await response.json().catch(() => ({}));
  return { to, subject, sentId: String(sent.id ?? ""), threadId: String(sent.threadId ?? original.threadId), body: text };
}
