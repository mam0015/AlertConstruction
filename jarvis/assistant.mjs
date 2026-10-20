// "Ask Jarvis": the Owner types an instruction, Jarvis answers, suggests next steps, and — when an email is open —
// drafts a reply. The Owner's text is the only instruction source; records are data (see ai.mjs).
// Nothing here sends mail: a draft is returned for the Owner to read, edit and send (see sendOwnerReply below).

import { abandonSend, beginSend, finishSend, noteAsk } from "./audit.mjs";
import { aiEnabled, askAi, createAiClient, chooseRecords, DEFAULT_MODEL, friendlyAiError } from "./ai.mjs";
import { suggestForItem } from "./advisor.mjs";
import { clip, searchItems } from "./briefing.mjs";
import { runJarvis } from "./jarvis.mjs";
import { boundedInteger, JarvisAccessError, LIMITS } from "./policy.mjs";
import { MAX_REPLY_CHARS, previewReply, sendReply } from "./reply.mjs";
import { parseAccounts } from "./sources/company-email.mjs";
import { clipText, firstName, sha256Hex } from "./text.mjs";

const MESSAGE_ID = /^[A-Za-z0-9_-]{6,64}$/;

export function parseAskInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new JarvisAccessError("Send the question as JSON.", 400);
  const message = clipText(body.message, 2000);
  if (!message) throw new JarvisAccessError("Tell Jarvis what you need.", 400);
  const history = (Array.isArray(body.history) ? body.history : []).slice(-8)
    .filter((turn) => turn && (turn.role === "owner" || turn.role === "jarvis") && typeof turn.content === "string")
    .map((turn) => ({ role: turn.role, content: clipText(turn.content, 2000) }))
    .filter((turn) => turn.content);
  let focus = null;
  if (body.focus !== undefined && body.focus !== null) {
    const mailbox = typeof body.focus?.mailbox === "string" ? body.focus.mailbox.slice(0, 200) : "";
    const messageId = typeof body.focus?.messageId === "string" ? body.focus.messageId : "";
    if (!mailbox || !MESSAGE_ID.test(messageId)) throw new JarvisAccessError("That email could not be found.", 400);
    focus = { mailbox, messageId };
  }
  return { message, history, focus, hours: boundedInteger(body.hours, LIMITS.defaultHours, 1, LIMITS.maxHours, "hours") };
}

export function templateReply({ fromName, text, ownerName, company }) {
  const first = firstName(fromName);
  const signature = ownerName ? `${ownerName}\n${company}` : company;
  return clipText(`Hi${first ? ` ${first}` : ""},\n\n${text.trim()}\n\nKind regards,\n${signature}`, MAX_REPLY_CHARS);
}

function suggestionsFor(items, max = 6) {
  const out = [];
  for (const item of items) {
    const [first] = suggestForItem(item);
    if (first) out.push({ title: clip(item.title, 140), why: first.text, action: first.action, itemId: item.id });
    if (out.length >= max) break;
  }
  return out;
}

// What Jarvis can do without AI: format the Owner's own words into a reply, or point at the matching records.
function rulesAnswer({ message, items, preview, owner, company, notice }) {
  if (preview) {
    return {
      reply: `${notice ? `${notice} ` : "Smart mode is off. "}I have put your words into a reply. Please read it, change anything you want, then press Send.`,
      suggestions: [],
      draft: { body: templateReply({ fromName: preview.toName || preview.original.from?.name, text: message, ownerName: owner.name, company }), note: "Written from your exact words — nothing was added." },
    };
  }
  const matches = searchItems(items, message);
  const chosen = (matches.length ? matches : items.filter((item) => item.urgent)).slice(0, 6);
  const lines = chosen.map((item) => `• ${item.title}${item.who ? ` — ${item.who.replace(/<[^>]*>/g, "").trim()}` : ""}`);
  return {
    reply: chosen.length
      ? `${notice ? `${notice} ` : "Smart mode is off, so I searched your records. "}${matches.length ? "These match" : "These need your attention"}:\n${lines.join("\n")}`
      : `${notice ? `${notice} ` : "Smart mode is off. "}I found nothing matching in this period.`,
    suggestions: suggestionsFor(chosen),
    draft: null,
  };
}

export async function askJarvis({ db, config, fetchImpl, ai, owner, input, now = Date.now() }) {
  const company = config.company || "Alert Construction";
  await noteAsk(db, owner.email, now);

  const accounts = parseAccounts(config.accounts);
  let preview = null;
  let account = null;
  let openProblem = "";
  if (input.focus) {
    account = accounts.find((entry) => entry.label === input.focus.mailbox) ?? null;
    if (!account) throw new JarvisAccessError("That mailbox is not connected to Jarvis.", 404);
    try {
      preview = await previewReply({ config, account, fetchImpl, messageId: input.focus.messageId });
    } catch (error) {
      if (error instanceof JarvisAccessError) openProblem = error.message;
      else {
        console.error("Jarvis could not open the email:", error instanceof Error ? error.message : error);
        openProblem = "I could not open that email just now.";
      }
    }
  }

  const briefing = await runJarvis({ db, config, fetchImpl, params: { hours: String(input.hours), limit: "100" }, now });
  const focusId = input.focus ? `email:${input.focus.mailbox}:${input.focus.messageId}` : "";
  const items = briefing.items.filter((item) => item.id !== focusId);

  let outcome = null;
  let notice = openProblem;
  if (aiEnabled(config) && !openProblem) {
    const records = chooseRecords(items);
    try {
      const answer = await askAi({
        client: ai?.client ?? createAiClient(config),
        model: config.model || DEFAULT_MODEL,
        ownerName: owner.name, company,
        message: input.message, history: input.history, records, hours: input.hours,
        focus: preview ? { mailbox: account.label, fromName: preview.toName || preview.original.from?.name || "", subject: preview.original.subject, text: preview.original.text } : null,
        itemIds: new Set([...records.map((item) => item.id), ...(focusId ? [focusId] : [])]),
        useFallbacks: config.aiFallbacks !== "off",
      });
      if (answer.refused) notice = "The AI declined this request.";
      else outcome = { mode: "ai", ...answer.result, usage: answer.usage, model: answer.model };
    } catch (error) {
      console.error("Jarvis AI request failed:", error instanceof Error ? error.message : error);
      notice = friendlyAiError(error);
    }
  }
  if (!outcome) outcome = { mode: "rules", ...rulesAnswer({ message: input.message, items, preview, owner, company, notice: aiEnabled(config) || openProblem ? notice : "" }) };

  if (outcome.draftDropped) {
    outcome.reply = `${outcome.reply}\n\n(To draft a reply, open the email in Jarvis and press "Reply with Jarvis" first.)`.trim();
  }
  const draft = outcome.draft && preview ? {
    mailbox: account.label,
    messageId: input.focus.messageId,
    to: preview.to,
    toName: preview.toName,
    subject: preview.subject,
    body: outcome.draft.body,
    note: outcome.draft.note,
    canSend: account.canReply,
  } : null;
  return {
    mode: outcome.mode,
    reply: outcome.reply || "I have nothing to add.",
    suggestions: outcome.suggestions,
    draft,
    notice: outcome.mode === "rules" ? notice : "",
    usage: outcome.usage ?? null,
    model: outcome.model ?? "",
  };
}

// Runs only when the Owner presses Send on a draft. The recipient is derived from the original email (reply.mjs).
export async function sendOwnerReply({ db, config, fetchImpl, owner, input, now = Date.now() }) {
  if (!input || typeof input !== "object" || input.confirm !== true) throw new JarvisAccessError("Confirm before sending.", 400);
  const mailbox = typeof input.mailbox === "string" ? input.mailbox : "";
  const messageId = typeof input.messageId === "string" ? input.messageId : "";
  if (!MESSAGE_ID.test(messageId)) throw new JarvisAccessError("That email could not be found.", 400);
  const account = parseAccounts(config.accounts).find((entry) => entry.label === mailbox);
  if (!account) throw new JarvisAccessError("That mailbox is not connected to Jarvis.", 404);
  if (!account.canReply) throw new JarvisAccessError("This mailbox is connected read-only. Reconnect it with --allow-replies to let Jarvis send replies.", 403);
  const body = clipText(input.body, MAX_REPLY_CHARS);
  if (body.length < 2) throw new JarvisAccessError("The reply is empty.", 400);

  let claim = 0;
  let sent;
  try {
    sent = await sendReply({
      config, account, fetchImpl, messageId, body,
      beforeSend: async ({ to, subject }) => {
        claim = await beginSend(db, { ownerEmail: owner.email, mailbox, messageId, recipient: to, subject, bodySha256: await sha256Hex(body), bodyChars: body.length }, now);
      },
    });
  } catch (error) {
    // A clean failure frees the claim so the Owner can retry; if Google never answered, the reply may have gone out, so the
    // claim stays (it stops blocking after a few minutes) and the Owner is told to check the Sent folder.
    if (claim && !error?.uncertain) await abandonSend(db, claim).catch(() => undefined);
    throw error;
  }
  // The email is out. Whatever happens to the bookkeeping from here on must not turn this into a reported failure.
  await finishSend(db, claim, sent.sentId).catch((error) => console.error("Jarvis could not record a sent reply:", error instanceof Error ? error.message : error));
  return { ok: true, mailbox, to: sent.to, subject: sent.subject, sentId: sent.sentId };
}
