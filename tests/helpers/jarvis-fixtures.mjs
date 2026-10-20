// Shared fixtures for the Jarvis tests: the app's real table definitions, seed rows, a fake Google, and a fake Claude client.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// ---- real table definitions, read from the app's own source so Jarvis's SELECTs are checked against the true schema ----
const storeSource = ["db/owner-store.ts", "db/workflow-store.ts", "db/worker-store.ts", "db/operations-store.ts"]
  .map((file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")).join("\n");

function createStatement(table) {
  const start = storeSource.search(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(`));
  assert.ok(start >= 0, `${table} DDL not found in the app source`);
  let depth = 0;
  for (let index = storeSource.indexOf("(", start); index < storeSource.length; index += 1) {
    if (storeSource[index] === "(") depth += 1;
    if (storeSource[index] === ")" && --depth === 0) return storeSource.slice(start, index + 1);
  }
  throw new Error(`${table} DDL is not balanced`);
}

export const TABLES = ["eod_reports", "team_messages", "workflow_cases", "customer_messages", "worker_reports", "project_updates", "site_visit_reports", "site_issue_reports"];
export const ago = (hours) => new Date(Date.now() - hours * 3_600_000).toISOString();

export function createTables(d1) {
  for (const table of TABLES) d1.sqlite.exec(createStatement(table));
}

export function seed(d1) {
  const q = d1.sqlite;
  q.prepare("INSERT INTO workflow_cases (id,request_code,project_code,customer_name,customer_email,customer_phone,service,created_at,updated_at) VALUES (1,'REQ-2026-AAAA','ATP-2026-00124','Sam Customer','sam.private@example.com','0400 000 000','Kitchen',?,?)").run(ago(500), ago(500));
  const message = q.prepare("INSERT INTO customer_messages (case_id,sender,sender_label,body,kind,created_at) VALUES (1,?,?,?,?,?)");
  message.run("Customer", "Sam Customer", "I am not happy with the delay on the kitchen, please call me.", "message", ago(1));
  message.run("Admin", "Alert Tradie Pro", "ADMIN-ONLY reply that must not appear as a client comment", "message", ago(1));
  const chat = q.prepare("INSERT INTO team_messages (sender,recipient,body,sent_at) VALUES (?,?,?,?)");
  chat.run("Customer · ATP-2026-00200", "Admin", "Question about quote\nWhen can you start the bathroom?", ago(3));
  chat.run("worker@alert.test", "Admin", "PRIVATE STAFF CHAT that Jarvis must never read", ago(2));
  q.prepare("INSERT INTO eod_reports (person,role,project_code,summary,submitted_at,status) VALUES (?,?,?,?,?,?)").run("Ali Worker", "Worker", "ATP-2026-00124", "Framing finished on level one.", ago(2), "Pending");
  q.prepare("INSERT INTO eod_reports (person,role,project_code,summary,submitted_at,status) VALUES (?,?,?,?,?,?)").run("Old Timer", "Worker", "ATP-2026-00001", "Ancient report outside the window.", ago(24 * 10), "Approved");
  const worker = q.prepare("INSERT INTO worker_reports (case_id,worker_email,work_date,completed_work,next_step,issues_delays,submitted_at) VALUES (1,?,?,?,?,?,?)");
  worker.run("tiler@alert.test", "2026-10-18", "Waterproofing done", "Start tiling", "Delivery delayed by the supplier", ago(4));
  worker.run("plumber@alert.test", "2026-10-18", "Rough-in complete", "Fit fixtures", "None", ago(5));
  q.prepare("INSERT INTO project_updates (case_id,work_date,supervisor_email,internal_update,customer_update,created_at) VALUES (1,'2026-10-18','super@alert.test','Slab poured, curing for 7 days.','Slab poured.',?)").run(ago(6));
  q.prepare("INSERT INTO site_visit_reports (case_id,supervisor_email,visit_date,summary,findings,recommendations,submitted_at) VALUES (1,'super@alert.test','2026-10-17','Site walk completed','Minor crack in retaining wall','Engineer to inspect',?)").run(ago(7));
  q.prepare("INSERT INTO site_issue_reports (case_id,project_code,site_location,affected_trade,issue_type,severity,summary,reporter_email,reporter_name,status,reported_at,updated_at) VALUES (1,'ATP-2026-00124','Rear yard','Plumber','Safety','High','Unsafe trench left open overnight','super@alert.test','Sue Supervisor','reported',?,?)").run(ago(8), ago(8));
}

// ---- a fake Google (OAuth token + Gmail) ----------------------------------------------------------------------------------
export const b64u = (text) => Buffer.from(text, "utf8").toString("base64url");
export const decodeB64u = (text) => Buffer.from(text, "base64url").toString("utf8");

export function gmailMessage({
  id = "msg00001", threadId = "thr00001", from = "Jo Client <jo@example.com>", replyTo = "", subject = "Roof leak",
  body = "Hi, the roof is leaking again after last night's rain. Can someone come out urgently?",
  labels = ["INBOX"], messageIdHeader = "<orig-1@mail.example.com>", references = "", hoursAgo = 1,
} = {}) {
  const headers = [{ name: "From", value: from }, { name: "To", value: "info@alert.test" }, { name: "Subject", value: subject }, { name: "Message-ID", value: messageIdHeader }];
  if (replyTo) headers.push({ name: "Reply-To", value: replyTo });
  if (references) headers.push({ name: "References", value: references });
  return {
    id, threadId, labelIds: labels, snippet: body.slice(0, 100), internalDate: String(Date.now() - hoursAgo * 3_600_000),
    payload: {
      mimeType: "multipart/alternative", headers,
      parts: [
        { mimeType: "text/plain", body: { data: b64u(body) } },
        { mimeType: "text/html", body: { data: b64u(`<p>${body}</p>`) } },
      ],
    },
  };
}

export const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export function googleMock({ messages = { msg00001: gmailMessage() }, sendStatus = 200 } = {}) {
  const calls = [];
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fetchImpl = async (url, init = {}) => {
    const href = String(url);
    const method = init.method ?? "GET";
    calls.push({ href, method, body: init.body ? String(init.body) : "", authorization: init.headers?.authorization ?? "" });
    if (href.startsWith("https://oauth2.googleapis.com/token")) return json({ access_token: "access-123" });
    if (href === SEND_URL) return sendStatus === 200 ? json({ id: "sent00001", threadId: "thr00001" }) : json({ error: { message: "denied" } }, sendStatus);
    if (/\/users\/me\/messages\?/.test(href)) return json({ messages: Object.keys(messages).map((id) => ({ id })) });
    const one = href.match(/\/users\/me\/messages\/([A-Za-z0-9_-]+)/);
    if (one && messages[one[1]]) return json(messages[one[1]]);
    return json({ error: "not found" }, 404);
  };
  return { calls, fetchImpl };
}

export const accountsJson = (canReply = true) => JSON.stringify([{ label: "info@alert.test", refreshToken: "refresh-token", canReply }]);
export const baseConfig = (extra = {}) => ({ clientId: "client-id", clientSecret: "client-secret", accounts: accountsJson(true), company: "Alert Construction", ...extra });

// ---- a fake Claude client -----------------------------------------------------------------------------------------------
export function fakeAi(responder) {
  const calls = [];
  const client = { beta: { messages: { create: async (params) => { calls.push(structuredClone(params)); return responder(params, calls.length); } } } };
  return { calls, client };
}

export const aiReply = (data, extra = {}) => ({
  stop_reason: "end_turn", model: "claude-opus-5-5", usage: { input_tokens: 111, output_tokens: 22 },
  content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify(data) }], ...extra,
});

export const ROOF_THREAD_ID = "email:info@alert.test:msg00001";
