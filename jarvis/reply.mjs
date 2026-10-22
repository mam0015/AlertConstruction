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
const ADDRESS = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/; // ASCII only (no homograph/invisible characters)
const NO_REPLY = /^(?:no[-_.]?reply|do[-_.]?not[-_.]?reply|mailer-daemon|postmaster|bounces?|notifications?|automated|auto[-_.]?reply)(?:[-_.+][^@]*)?@/i;
export const MAX_ORIGINAL_CHARS = 4000;
const MAX_RAW_CHARS = 60_000;
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
  return String(html ?? "").slice(0, MAX_RAW_CHARS)
    .replace(/<!--[\s\S]{0,5000}?-->/g, " ")
    .replace(/<(style|script|head)\b[^>]{0,500}>[\s\S]{0,20000}?<\/\1\s*>/gi, " ")
    .replace(/<[^<>]{0,2000}>/g, (tag) => (/^<\s*(?:br|\/\s*(?:p|div|li|tr|h[1-6]))\b/i.test(tag) ? "\n" : " "))
    // Numeric entities (&#64; or &#x40;, which can hide an @ or digits from address and phone detection) and the common spaces.
    .replace(/&#(?:x([0-9a-f]{1,6})|(\d{1,7}));/gi, (_, hex, dec) => {
      const code = hex ? Number.parseInt(hex, 16) : Number(dec);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : " ";
    })
    .replace(/&(?:nbsp|thinsp|ensp|emsp|zwnj|zwj);/gi, " ").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/[ \t]{2,}/g, " ");
}


export function extractText(payload) {
  const plain = findPart(payload, "text/plain");
  const plainText = plain ? decodeBase64Url(plain.body.data) : "";
  const html = findPart(payload, "text/html");
  const htmlText = html ? htmlToText(decodeBase64Url(html.body.data)) : "";
  // "Your email client cannot display this message" in the plain part, the real message in the HTML part: use the HTML text.
  if (plain && htmlText && plainText.trim().length < 200 && htmlText.trim().length > plainText.trim().length * 2) return htmlText;
  return plain ? plainText : htmlText;
}

// Drops the quoted history a mail client adds, but only when it really is history, and never hands the AI nothing for a non-empty message.
export function stripQuotedHistory(text) {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const isHeader = (line) => /^\s*On .{5,200} wrote:\s*$/i.test(line) || /^\s*-{2,}\s*Original Message\s*-{2,}/i.test(line);
  const isQuote = (line) => /^\s*>/.test(line);
  const at = lines.findIndex(isHeader);
  let kept = lines;                                                    // no quote header: the '>' lines may be the sender's own, keep them
  if (at !== -1) {
    const above = lines.slice(0, at).filter((line) => !isQuote(line));
    kept = above.join("").trim() ? above                               // top-posting: the new text is above the header
      : lines.slice(at + 1).filter((line) => !isQuote(line));          // bottom-posting: the new text is below the quoted block
  }
  return kept.join("\n").trim() || String(text ?? "").trim();
}

function headerOf(message, name) {
  return message?.payload?.headers?.find((entry) => entry.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// First mailbox of an address header, parsed the way RFC 5322 does: quoted display names and (comments) are skipped, so a name can never
// smuggle in an address. Non-ASCII / unbalanced / group headers are refused rather than guessed.
export function parseAddress(value) {
  const text = oneLine(value);
  let name = "";            // display-name text outside <>, quotes unwrapped, comments dropped
  let local = "";           // text collected as a bare addr-spec when there is no <...>
  let addr = null;
  let inQuote = false, depth = 0, inAngle = false, angle = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuote) {
      if (ch === "\\" && i + 1 < text.length) {
        if (inAngle) angle += text[i + 1];
        else { name += text[i + 1]; local += text[i + 1]; }
        i += 1;
      }
      else if (ch === '"') { inQuote = false; }
      else if (inAngle) angle += ch; else { name += ch; local += ch; }
      continue;
    }
    if (depth > 0) { if (ch === "\\") i += 1; else if (ch === "(") depth += 1; else if (ch === ")") depth -= 1; continue; }
    if (ch === '"') { inQuote = true; continue; }
    if (ch === "(") { depth = 1; continue; }
    if (inAngle) { if (ch === ">") { addr = angle.trim(); if (/</.test(text.slice(i + 1).replace(/"(?:[^"\\]|\\.)*"/g, "").split(/[,;]/)[0])) return null; break; } angle += ch; continue; }
    if (ch === "<") { inAngle = true; continue; }
    if (ch === "," || ch === ";") break;           // first mailbox only; a group (":") is refused below
    if (/\s/.test(ch) && ADDRESS.test(local)) break;     // 'jo@x.com Bcc: ...' -> the bare address ends at the first space
    if (ch === ":") return null;                        // group syntax: refuse rather than guess
    name += ch; local += ch;
  }
  if (inQuote || depth > 0 || (inAngle && addr === null)) return null;   // unbalanced header: refuse rather than guess
  const address = addr ?? local.replace(/\s+/g, "");
  return ADDRESS.test(address) ? { name: addr === null ? "" : name.replace(/\s+/g, " ").trim().slice(0, 120), address: address.toLowerCase() } : null;
}

// Mail that is not from a person: auto-replies, bounces, mailing lists, bulk. Replying to these posts to a list or feeds a loop.
export function automatedReason(message) {
  const h = (name) => headerOf(message, name).trim().toLowerCase();
  if (h("auto-submitted") && h("auto-submitted") !== "no") return "it is an automatic message";
  if (/^(?:bulk|list|junk|auto_reply)\b/.test(h("precedence"))) return "it is bulk or mailing-list mail";
  if (h("list-id") || h("list-unsubscribe")) return "it comes from a mailing list or newsletter";
  if (h("x-auto-response-suppress") || h("x-autoreply") || h("x-autorespond")) return "it is an automatic message";
  if (/^<\s*>$/.test(h("return-path"))) return "it has an empty return path (a bounce or notification)";
  return "";
}

// Did the receiving server (Gmail) authenticate the From address? "unknown" when the header is missing.
export function authResult(message) {
  const value = headerOf(message, "Authentication-Results").toLowerCase();
  if (!value) return "unknown";
  const dmarc = value.match(/\bdmarc=(\w+)/)?.[1];
  if (dmarc) return dmarc === "pass" ? "pass" : "fail";
  return /\bdkim=pass\b/.test(value) || /\bspf=pass\b/.test(value) ? "pass" : "fail";
}

const domainOf = (address) => String(address).split("@")[1]?.split(".").slice(-2).join(".") ?? "";

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
      automated: automatedReason(message),
      auth: authResult(message),
      text: clipText(stripQuotedHistory(extractText(message.payload)), MAX_ORIGINAL_CHARS),
      textCut: stripQuotedHistory(extractText(message.payload)).length > MAX_ORIGINAL_CHARS,
    },
  };
}

// The reply goes to Reply-To (else From) of the original — nowhere else.
export function recipientOf(original, mailbox) {
  const target = original.replyTo ?? original.from;
  if (!target) throw new JarvisAccessError("This email has no sender address to reply to.", 422);
  if (original.sent || target.address === String(mailbox).toLowerCase()) throw new JarvisAccessError("That message came from your own mailbox, so there is nobody to reply to.", 422);
  if (NO_REPLY.test(target.address)) throw new JarvisAccessError("This sender does not accept replies.", 422);
  const crossDomain = Boolean(original.replyTo && original.from && domainOf(original.replyTo.address) !== domainOf(original.from.address));
  return { ...target, source: original.replyTo ? "reply-to" : "from", crossDomain };
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
  const ascii = (value, max) => oneLine(value, max).replace(/[^\x20-\x7e]/g, ""); // raw headers must be ASCII (btoa would throw on anything else)
  if (messageIdHeader) {
    headers.push(`In-Reply-To: ${ascii(messageIdHeader, 300)}`);
    const refs = ascii(`${references} ${messageIdHeader}`, 4000);
    headers.push(`References: ${refs.length > 900 ? refs.slice(refs.indexOf("<", refs.length - 900)) : refs}`); // keep the NEWEST ids, never cut the one we answer
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
  return {
    original, to: target.address, toName: target.name, subject: replySubject(original.subject),
    from: original.from?.address ?? "", replyTo: original.replyTo?.address ?? "", crossDomain: target.crossDomain,
    automated: original.automated, auth: original.auth,
  };
}

// For "ask Jarvis": the email is ALWAYS readable (so questions about it work); only the reply part can be refused.
export async function readForAsk({ config, account, fetchImpl, messageId }) {
  const { original } = await loadOriginal({ config, account, fetchImpl, messageId });
  try {
    const target = recipientOf(original, account.label);
    return { original, replyProblem: "", preview: {
      original, to: target.address, toName: target.name, subject: replySubject(original.subject),
      from: original.from?.address ?? "", replyTo: original.replyTo?.address ?? "", crossDomain: target.crossDomain, automated: original.automated, auth: original.auth,
    } };
  } catch (error) {
    if (error instanceof JarvisAccessError) return { original, replyProblem: error.message, preview: null };
    throw error;
  }
}

// beforeSend({ to, subject }) runs after the recipient is known and before anything is sent — the caller uses it to claim the
// "send once" log entry, and it may throw to stop the send.
export async function sendReply({ config, account, fetchImpl, messageId, body, beforeSend, allow = {} }) {
  if (!account.canReply) {
    throw new JarvisAccessError("This mailbox is connected read-only. Reconnect it with --allow-replies to let Jarvis send replies.", 403);
  }
  const text = clipText(body, MAX_REPLY_CHARS);
  if (text.length < 2) throw new JarvisAccessError("The reply is empty.", 400);

  const { original, token } = await loadOriginal({ config, account, fetchImpl, messageId });
  const target = recipientOf(original, account.label);
  if (target.crossDomain && allow.replyTo !== true) {
    throw new JarvisAccessError(`This email asks for replies to ${target.address}, which is not the address it came from (${original.from?.address}). Tick “send to the Reply-To address” to confirm.`, 409);
  }
  if (original.automated && allow.automated !== true) {
    throw new JarvisAccessError(`Replies to this email are blocked because ${original.automated}. Tick “reply anyway” to confirm.`, 409);
  }
  const to = target.address;
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
    if (response.status >= 500) {
      // A server error does not prove nothing was sent (Google may have accepted the message before failing), so treat it like no answer.
      const unsure = new JarvisAccessError("Google had a problem while sending, so I cannot be sure the reply was not sent. Check the mailbox's Sent folder before trying again.", 502);
      unsure.uncertain = true;
      throw unsure;
    }
    throw new Error(`gmail send ${response.status}`);
  }
  const sent = await response.json().catch(() => ({}));
  return { to, subject, sentId: String(sent.id ?? ""), threadId: String(sent.threadId ?? original.threadId), body: text };
}
