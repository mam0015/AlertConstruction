// Jarvis's own small log table. It records two things and nothing else:
//   * every reply Jarvis sent on the Owner's say-so (who it went to, the subject, a hash and length of the text — the
//     text itself already sits in the mailbox's Sent folder), so the Owner can always see what went out;
//   * a timestamp per question asked, used only to stop a runaway loop from running up AI costs.
// Writing here never touches company data: it is a separate table that only Jarvis uses.

import { JarvisAccessError } from "./policy.mjs";

export const LIMITS = Object.freeze({ sendsPerHour: 20, sendsPerDay: 60, asksPer10Minutes: 40 });

export async function ensureLog(d1) {
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS jarvis_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      kind TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      mailbox TEXT NOT NULL DEFAULT '',
      original_message_id TEXT NOT NULL DEFAULT '',
      recipient TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      body_sha256 TEXT NOT NULL DEFAULT '',
      body_chars INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ok',
      sent_message_id TEXT NOT NULL DEFAULT ''
    )`),
    // The same reply (same mailbox, same email, same text) can only be in flight or sent once — double clicks can't double-send.
    d1.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS jarvis_log_send_once ON jarvis_log (mailbox, original_message_id, body_sha256)
      WHERE kind = 'send' AND status IN ('sending','sent')`),
    d1.prepare("CREATE INDEX IF NOT EXISTS jarvis_log_kind_at ON jarvis_log (kind, at)"),
  ]);
}

async function count(d1, kind, sinceISO) {
  const row = await d1.prepare("SELECT COUNT(*) AS total FROM jarvis_log WHERE kind = ? AND at >= ? AND status IN ('ok','sending','sent')").bind(kind, sinceISO).first();
  return Number(row?.total ?? 0);
}

// Records one question and refuses if there have been too many lately.
export async function noteAsk(d1, ownerEmail, now = Date.now()) {
  await ensureLog(d1);
  if (await count(d1, "ask", new Date(now - 10 * 60_000).toISOString()) >= LIMITS.asksPer10Minutes) {
    throw new JarvisAccessError("That is a lot of questions in a short time. Please wait a few minutes.", 429);
  }
  await d1.prepare("INSERT INTO jarvis_log (at, kind, owner_email) VALUES (?, 'ask', ?)").bind(new Date(now).toISOString(), ownerEmail).run();
  await d1.prepare("DELETE FROM jarvis_log WHERE kind = 'ask' AND at < ?").bind(new Date(now - 2 * 86_400_000).toISOString()).run();
}

// Claims the right to send this exact reply. Throws if it was already sent (or is being sent), or if limits are hit.
export async function beginSend(d1, { ownerEmail, mailbox, messageId, recipient, subject, bodySha256, bodyChars }, now = Date.now()) {
  await ensureLog(d1);
  if (await count(d1, "send", new Date(now - 3_600_000).toISOString()) >= LIMITS.sendsPerHour) {
    throw new JarvisAccessError(`Jarvis has already sent ${LIMITS.sendsPerHour} replies in the last hour. Please wait before sending more.`, 429);
  }
  if (await count(d1, "send", new Date(now - 86_400_000).toISOString()) >= LIMITS.sendsPerDay) {
    throw new JarvisAccessError(`Jarvis has already sent ${LIMITS.sendsPerDay} replies in the last 24 hours.`, 429);
  }
  try {
    const result = await d1.prepare(`INSERT INTO jarvis_log
      (at, kind, owner_email, mailbox, original_message_id, recipient, subject, body_sha256, body_chars, status)
      VALUES (?, 'send', ?, ?, ?, ?, ?, ?, ?, 'sending')`)
      .bind(new Date(now).toISOString(), ownerEmail, mailbox, messageId, recipient, subject, bodySha256, bodyChars).run();
    return Number(result?.meta?.last_row_id ?? 0);
  } catch (error) {
    if (/unique/i.test(error instanceof Error ? error.message : String(error))) {
      throw new JarvisAccessError("This exact reply has already been sent (or is being sent).", 409);
    }
    throw error;
  }
}

export async function finishSend(d1, id, sentMessageId) {
  await d1.prepare("UPDATE jarvis_log SET status = 'sent', sent_message_id = ? WHERE id = ?").bind(sentMessageId, id).run();
}

// The send failed, so the Owner may try again.
export async function abandonSend(d1, id) {
  await d1.prepare("UPDATE jarvis_log SET status = 'failed' WHERE id = ?").bind(id).run();
}

export async function recentSends(d1, limit = 10) {
  try {
    const result = await d1.prepare(`SELECT at, mailbox, recipient, subject, body_chars AS chars, sent_message_id AS sentId
      FROM jarvis_log WHERE kind = 'send' AND status = 'sent' ORDER BY id DESC LIMIT ?`).bind(limit).all();
    return result?.results ?? [];
  } catch (error) {
    if (/no such table/i.test(error instanceof Error ? error.message : String(error))) return [];
    throw error;
  }
}
