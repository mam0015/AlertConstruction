"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Mail, MessageCircle, RefreshCw, Search, Send, Users, type LucideIcon } from "lucide-react";
import styles from "./jarvis.module.css";

type Scope = "company_email" | "employee_updates" | "client_comments";
type SourceReport = { status: string; count: number; mailboxes?: { label: string; status: string; count: number; canReply?: boolean }[] };
type Advice = { action: string; text: string };
type EmailRef = { mailbox: string; messageId: string; threadId: string; canReply: boolean };
type Item = { id: string; source: Scope; kind: string; at: string; title: string; who: string; project: string; mailbox: string; preview: string; flags: string[]; urgent: boolean; email: EmailRef | null; suggestions: Advice[] };
type Attention = Pick<Item, "id" | "source" | "kind" | "at" | "title" | "who" | "project" | "flags">;
type Topic = { key: string; title: string; count: number; lastAt: string; urgent: boolean; flags: string[]; suggestions: Advice[] };
type SentLog = { at: string; mailbox: string; recipient: string; subject: string; chars: number; sentId: string };
type Result = {
  generatedAt: string;
  sources: Partial<Record<Scope, SourceReport>>;
  briefing: { headline: string; counts: { total: number; urgent: number }; attention: Attention[]; employees: { name: string; count: number }[]; clients: { name: string; count: number }[]; topics: Topic[] };
  items: Item[];
  capabilities: { ai: boolean; model: string; replyMailboxes: string[] };
  sent: SentLog[];
};
type AiSuggestion = { title: string; why: string; action: string; itemId: string };
type DraftWarning = { kind: string; text: string };
type Draft = {
  mailbox: string; messageId: string; to: string; toName: string; subject: string; body: string; note: string; canSend: boolean;
  from?: string; replyTo?: string; crossDomain?: boolean; automatedReason?: string; auth?: string; warnings?: DraftWarning[]; otherRecordsWithheld?: number;
};
type Turn = { role: "owner" | "jarvis"; content: string; suggestions?: AiSuggestion[]; notice?: string; mode?: string };
type Focus = { mailbox: string; messageId: string; title: string; who: string };
type Request = { hours: number; source: Scope | "all"; q: string; nonce: number };

const SOURCES: { id: Scope; label: string; icon: LucideIcon }[] = [
  { id: "company_email", label: "Company email", icon: Mail },
  { id: "employee_updates", label: "Employee updates", icon: Users },
  { id: "client_comments", label: "Client comments", icon: MessageCircle },
];
const WINDOWS = [{ hours: 24, label: "Last 24 hours" }, { hours: 72, label: "Last 3 days" }, { hours: 168, label: "Last 7 days" }, { hours: 720, label: "Last 30 days" }];
const STATUS_TEXT: Record<string, string> = { ok: "Connected", partial: "Partly available", empty: "Nothing recorded yet", not_connected: "Not connected", error: "Could not read" };
const KIND_TEXT: Record<string, string> = {
  email_received: "Email received", email_sent: "Email sent", end_of_day: "End of day", worker_report: "Worker report",
  supervisor_update: "Supervisor update", site_visit: "Site visit", site_issue: "Site issue", customer_message: "Client comment", tracking_message: "Client comment",
};
const ACTION_TEXT: Record<string, string> = { reply_email: "Reply", call: "Call", check_with_team: "Check with team", review: "Review", schedule: "Schedule", wait: "Wait", other: "Other" };
const QUICK = ["What should I do first today?", "Any complaints I need to handle?", "Summarise what my team did", "What are clients asking for?"];
const stamp = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const when = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? iso : stamp.format(date); };
const sourceLabel = (id: Scope) => SOURCES.find((source) => source.id === id)?.label ?? id;

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(response.status === 401 ? "Your Owner session has ended. Please sign in again." : body.error ?? "Jarvis could not do that.");
  return body;
}

function AdviceList({ advice }: { advice: Advice[] }) {
  if (advice.length === 0) return null;
  return <ul className={styles.advice} aria-label="Suggested next steps">{advice.map((entry) => <li key={entry.text}><i>{ACTION_TEXT[entry.action] ?? "Do"}</i>{entry.text}</li>)}</ul>;
}

export default function JarvisPanel({ preview = false }: { preview?: boolean }) {
  const [request, setRequest] = useState<Request>({ hours: 72, source: "all", q: "", nonce: 0 });
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [focus, setFocus] = useState<Focus | null>(null);
  const [asking, setAsking] = useState(false);
  const [chatError, setChatError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentNotice, setSentNotice] = useState("");
  // What the Owner has to tick before Send: only shown when the draft needs it.
  const [confirmReplyTo, setConfirmReplyTo] = useState(false);
  const [confirmAutomated, setConfirmAutomated] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [useOther, setUseOther] = useState(false);
  const sendingRef = useRef(false);
  const chatRef = useRef<HTMLElement>(null);

  // Every change the Owner makes (filter, search, refresh) starts a new read; the effect below only fetches.
  const update = (patch: Partial<Request>) => {
    setLoading(true);
    setRequest((current) => ({ ...current, ...patch, nonce: current.nonce + 1 }));
  };

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ hours: String(request.hours) });
    if (request.source !== "all") params.set("scopes", request.source);
    if (request.q) params.set("q", request.q);
    fetch(`/api/owner/jarvis?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as Result & { error?: string };
        if (!response.ok) throw new Error(response.status === 401 ? "Your Owner session has ended. Please sign in again." : body.error ?? "Jarvis could not load.");
        return body;
      })
      .then((body) => { if (!controller.signal.aborted) { setData(body); setError(""); } })
      .catch((problem) => { if (!controller.signal.aborted) setError(problem instanceof Error ? problem.message : "Jarvis could not load."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update({ q: query.trim() });
  }

  function replyWith(item: Item) {
    if (!item.email) return;
    setFocus({ mailbox: item.email.mailbox, messageId: item.email.messageId, title: item.title, who: item.who.replace(/<[^>]*>/g, "").trim() });
    setDraft(null);
    setConfirming(false);
    setSentNotice("");
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function ask(message: string) {
    const instruction = message.trim();
    if (!instruction || asking) return;
    setAsking(true);
    setChatError("");
    setSentNotice("");
    const history = turns.slice(-6).map((turn) => ({ role: turn.role, content: turn.content }));
    setTurns((current) => [...current, { role: "owner", content: instruction }]);
    setText("");
    try {
      const answer = await postJson<{ mode: string; reply: string; suggestions: AiSuggestion[]; draft: Draft | null; notice: string }>("/api/owner/jarvis/ask", {
        message: instruction, history, hours: request.hours,
        // The draft being edited goes along, so "make it shorter" or "also mention Friday" changes THAT text instead of starting again.
        ...(draft && draftBody.trim() ? { currentDraft: draftBody } : {}),
        ...(focus ? { focus: { mailbox: focus.mailbox, messageId: focus.messageId }, useOtherRecords: useOther } : {}),
      });
      setTurns((current) => [...current, { role: "jarvis", content: answer.reply, suggestions: answer.suggestions, notice: answer.notice, mode: answer.mode }]);
      if (answer.draft) { setDraft(answer.draft); setDraftBody(answer.draft.body); setConfirming(false); setConfirmReplyTo(false); setConfirmAutomated(false); setConfirmChecked(false); }
    } catch (problem) {
      // Nothing is lost when the call fails (session ended, too many questions…): the instruction goes back into the box.
      setTurns((current) => current.slice(0, -1));
      setText((current) => current || instruction);
      setChatError(problem instanceof Error ? problem.message : "Jarvis could not answer.");
    } finally {
      setAsking(false);
    }
  }

  async function sendDraft() {
    // A ref (not state) so a double click or a held-down Enter key cannot start a second send before the first re-renders.
    if (!draft || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setChatError("");
    try {
      const result = await postJson<{ to: string; subject: string }>("/api/owner/jarvis/send", {
        mailbox: draft.mailbox, messageId: draft.messageId, body: draftBody, to: draft.to, confirm: true,
        confirmReplyTo: confirmReplyTo || undefined, confirmAutomated: confirmAutomated || undefined,
      });
      setSentNotice(`Sent to ${result.to}: “${result.subject}”.`);
      setDraft(null);
      setConfirming(false);
      setFocus(null);
      update({});
    } catch (problem) {
      setChatError(problem instanceof Error ? problem.message : "Jarvis could not send that reply. Nothing was sent.");
      setConfirming(false);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const needsReplyTo = Boolean(draft?.crossDomain);
  const needsAutomated = Boolean(draft?.automatedReason);
  const needsChecked = (draft?.warnings?.length ?? 0) > 0;
  const readyToSend = (!needsReplyTo || confirmReplyTo) && (!needsAutomated || confirmAutomated) && (!needsChecked || confirmChecked);
  const emailOff = data?.sources.company_email?.status === "not_connected";
  const aiOn = data?.capabilities.ai ?? false;

  return <section className={styles.jarvis}>
    <header className={styles.intro}>
      <span className={styles.badge}><Bot size={16} strokeWidth={1.75} />Only obeys you</span>
      <p>Jarvis reads your <b>company email</b>, <b>employee updates</b> and <b>client comments</b>, suggests what to do, and drafts email replies from what <b>you</b> tell it. It takes instructions from nobody else, and it <b>never sends anything until you press Send</b> — and then only back to the person who wrote the email.</p>
    </header>

    <article className={styles.chat} ref={chatRef} aria-label="Tell Jarvis what to do">
      <div className={styles.chatHead}>
        <h2>Tell Jarvis what to do</h2>
        <span className={aiOn ? styles.modeOn : styles.modeOff}>{aiOn ? "Smart mode (AI)" : "Simple mode"}</span>
      </div>
      {data && !aiOn && <p className={styles.note}>Simple mode: Jarvis suggests next steps with fixed rules and puts <b>your own words</b> into a tidy reply. Add the <code>JARVIS_ANTHROPIC_API_KEY</code> secret to turn on Smart mode (it can write replies from a short instruction, in any language). See <code>jarvis/README.md</code>.</p>}
      {data && aiOn && <p className={styles.noteSoft}>Smart mode sends the question and the records it needs (names, subjects and short previews; email addresses and phone numbers are removed) to Anthropic to write the answer.</p>}

      {focus && <div className={styles.focusChip}>
        <span>Replying to <b>{focus.title}</b>{focus.who ? ` — ${focus.who}` : ""}</span>
        <button type="button" onClick={() => { setFocus(null); setDraft(null); }} aria-label="Stop replying to this email">×</button>
      </div>}

      <div className={styles.turns} aria-live="polite">
        {turns.length === 0 && <p className={styles.hint}>{focus ? "Say what the reply should say, in your own words (any language). Jarvis will draft it for you to check." : "Ask a question, or open an email below with “Reply with Jarvis”."}</p>}
        {turns.map((turn, index) => <div key={index} className={turn.role === "owner" ? styles.turnOwner : styles.turnJarvis}>
          <b>{turn.role === "owner" ? "You" : "Jarvis"}</b>
          <p dir="auto">{turn.content}</p>
          {turn.notice && <small className={styles.turnNotice}>{turn.notice}</small>}
          {turn.suggestions && turn.suggestions.length > 0 && <ul className={styles.advice} aria-label="Suggested next steps">{turn.suggestions.map((entry, position) => <li key={position}><i>{ACTION_TEXT[entry.action] ?? "Do"}</i><span><b>{entry.title}</b>{entry.why ? ` — ${entry.why}` : ""}</span></li>)}</ul>}
        </div>)}
        {asking && <div className={styles.turnJarvis}><b>Jarvis</b><p className={styles.hint}>Thinking…</p></div>}
      </div>

      {draft && <div className={styles.draft}>
        <h3>Draft reply — check it, change anything, then send</h3>
        <dl><dt>To</dt><dd dir="auto">{draft.toName ? `${draft.toName} <${draft.to}>` : draft.to}</dd><dt>From</dt><dd>{draft.mailbox}</dd><dt>Subject</dt><dd dir="auto">{draft.subject}</dd></dl>
        {draft.note && <p className={styles.noteSoft}>Jarvis says: {draft.note}</p>}
        {typeof draft.otherRecordsWithheld === "number" && draft.otherRecordsWithheld > 0 && <p className={styles.noteSoft}>Jarvis kept {draft.otherRecordsWithheld} unrelated record{draft.otherRecordsWithheld === 1 ? "" : "s"} (other clients, staff reports, other emails) out of this draft.</p>}
        {needsReplyTo && <div className={styles.warnBox} role="group" aria-label="Reply address differs from the sender">
          <p><b>Not the sender’s address.</b> This email came from <b>{draft.from}</b>{draft.auth === "fail" ? " (its sender check FAILED, so the From address may be forged)" : ""}, but asks for replies to <b>{draft.replyTo}</b>. This draft goes to <b>{draft.to}</b>.</p>
          <label><input type="checkbox" checked={confirmReplyTo} onChange={(event) => setConfirmReplyTo(event.target.checked)} /> I know — send it to {draft.replyTo}</label>
        </div>}
        {needsAutomated && <div className={styles.warnBox} role="group" aria-label="Automatic mail">
          <p><b>This may not be a person.</b> Jarvis normally does not reply because {draft.automatedReason}.</p>
          <label><input type="checkbox" checked={confirmAutomated} onChange={(event) => setConfirmAutomated(event.target.checked)} /> Reply anyway</label>
        </div>}
        {needsChecked && <div className={styles.warnBox} role="group" aria-label="Details to check">
          <p><b>Check these before sending:</b></p>
          <ul>{draft.warnings!.map((warning, position) => <li key={position}>{warning.text}</li>)}</ul>
          <label><input type="checkbox" checked={confirmChecked} onChange={(event) => setConfirmChecked(event.target.checked)} /> I checked these details</label>
        </div>}
        <textarea dir="auto" value={draftBody} disabled={sending} onChange={(event) => { setDraftBody(event.target.value); setConfirming(false); }} rows={9} maxLength={5000} aria-label="Reply text" />
        {draftBody.length >= 4900 && <p className={styles.noteSoft}>{5000 - draftBody.length} characters left — longer text is cut off.</p>}
        <div className={styles.draftActions}>
          {!draft.canSend && <span className={styles.noteSoft}>This mailbox is connected read-only, so Jarvis can’t send. Copy the text into your mail app, or reconnect it with <code>--allow-replies</code>.</span>}
          {draft.canSend && !confirming && <button className={styles.ask} type="button" disabled={sending || draftBody.trim().length < 2 || !readyToSend} onClick={() => setConfirming(true)}><Send size={14} strokeWidth={2} />Send reply</button>}
          {draft.canSend && confirming && <div className={styles.confirmRow} role="alertdialog" aria-label="Confirm sending" aria-describedby="jarvis-confirm-text">
            <span id="jarvis-confirm-text" className={styles.confirmText}>Send this to <b>{draft.to}</b> now?</span>
            <button className={styles.ask} type="button" disabled={sending} onClick={() => void sendDraft()}>{sending ? "Sending…" : "Yes, send it"}</button>
            <button className={styles.ghostText} type="button" onClick={() => setConfirming(false)} autoFocus>Not yet</button>
          </div>}
          <button className={styles.ghostText} type="button" onClick={() => { setDraft(null); setConfirming(false); }}>Discard</button>
        </div>
      </div>}
      {sentNotice && <p className={styles.success} role="status">{sentNotice}</p>}
      {chatError && <p className={styles.error} role="alert">{chatError}</p>}

      {focus && <label className={styles.checkRow}><input type="checkbox" checked={useOther} onChange={(event) => setUseOther(event.target.checked)} /> Let Jarvis also use other records (clients’ comments, staff reports, other emails) for this reply. Off by default, so nothing unrelated can end up in the email.</label>}
      <form className={styles.chatForm} onSubmit={(event) => { event.preventDefault(); void ask(text); }}>
        <textarea dir="auto" value={text} onChange={(event) => setText(event.target.value)} rows={2} maxLength={2000} disabled={asking}
          placeholder={focus ? "What should the reply say? e.g. “We’ll come Thursday 9am, sorry for the delay”" : "Tell Jarvis what you need…"}
          aria-label="Your instruction to Jarvis"
          onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void ask(text); } }} />
        <button className={styles.ask} type="submit" disabled={asking || !text.trim()}><Send size={14} strokeWidth={2} />Ask</button>
      </form>
      {!focus && turns.length === 0 && <div className={styles.quick}>{QUICK.map((prompt) => <button key={prompt} type="button" onClick={() => void ask(prompt)} disabled={asking}>{prompt}</button>)}</div>}
    </article>

    <form className={styles.controls} onSubmit={search}>
      <label className={styles.search}><Search size={15} strokeWidth={1.75} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the records: leak, refund, Sam, ATP-2026-00124" maxLength={120} /></label>
      <button className={styles.ask} type="submit">Search</button>
      {request.q && <button className={styles.ghost} type="button" onClick={() => { setQuery(""); update({ q: "" }); }}>Clear</button>}
      <select value={request.hours} onChange={(event) => update({ hours: Number(event.target.value) })} aria-label="Time window">{WINDOWS.map((window) => <option key={window.hours} value={window.hours}>{window.label}</option>)}</select>
      <button className={styles.ghost} type="button" onClick={() => update({})} disabled={loading} aria-label="Refresh"><RefreshCw size={15} strokeWidth={1.75} className={loading ? styles.spin : ""} /></button>
    </form>

    <nav className={styles.tabs} aria-label="Source">
      <button className={request.source === "all" ? styles.activeTab : ""} onClick={() => update({ source: "all" })}>Everything</button>
      {SOURCES.map(({ id, label, icon: Icon }) => <button key={id} className={request.source === id ? styles.activeTab : ""} onClick={() => update({ source: id })}><Icon size={14} strokeWidth={1.75} />{label}{data?.sources[id] ? <i>{data.sources[id]!.count}</i> : null}</button>)}
    </nav>

    {preview && <p className={styles.note}>Design preview — Jarvis shows live records once you are signed in as Owner.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}

    {data && <>
      <div className={styles.status}>
        {SOURCES.filter(({ id }) => data.sources[id]).map(({ id, label }) => {
          const report = data.sources[id]!;
          const replies = report.mailboxes?.filter((mailbox) => mailbox.canReply).length ?? 0;
          return <article key={id}><span>{label}</span><strong>{STATUS_TEXT[report.status] ?? report.status}</strong><small>{report.count} {report.count === 1 ? "item" : "items"}{report.mailboxes?.length ? ` · ${report.mailboxes.length} ${report.mailboxes.length === 1 ? "mailbox" : "mailboxes"}${replies ? ` (${replies} can reply)` : " (read-only)"}` : ""}</small></article>;
        })}
      </div>

      {emailOff && <p className={styles.note}>Company email is not connected yet. Each mailbox is connected once with Google’s permission — see <code>jarvis/README.md</code>.</p>}

      <article className={styles.briefing}>
        <h2>{data.briefing.headline}</h2>
        {data.briefing.topics.length > 0 && <>
          <h3>Topics and what to do about them</h3>
          <ul className={styles.topics}>{data.briefing.topics.map((topic) => <li key={topic.key} className={topic.urgent ? styles.urgentTopic : ""}>
            <div className={styles.topicHead}><b>{topic.title}</b><span>{topic.count} {topic.count === 1 ? "item" : "items"} · {when(topic.lastAt)}</span></div>
            {topic.flags.length > 0 && <div className={styles.flags}>{topic.flags.map((flag) => <i key={flag}>{flag.replaceAll("_", " ")}</i>)}</div>}
            <AdviceList advice={topic.suggestions} />
          </li>)}</ul>
        </>}
        {data.briefing.attention.length > 0 && <>
          <h3>Needs your attention</h3>
          <ul>{data.briefing.attention.map((item) => <li key={item.id}><b>{item.title}</b><span>{sourceLabel(item.source)}{item.who ? ` · ${item.who}` : ""}{item.project ? ` · ${item.project}` : ""} · {when(item.at)}</span><em>{item.flags.map((flag) => flag.replaceAll("_", " ")).join(" · ")}</em></li>)}</ul>
        </>}
        {(data.briefing.employees.length > 0 || data.briefing.clients.length > 0) && <div className={styles.people}>
          {data.briefing.employees.length > 0 && <div><h3>Employees reporting</h3><p>{data.briefing.employees.map((person) => `${person.name} (${person.count})`).join(", ")}</p></div>}
          {data.briefing.clients.length > 0 && <div><h3>Clients commenting</h3><p>{data.briefing.clients.map((person) => `${person.name} (${person.count})`).join(", ")}</p></div>}
        </div>}
      </article>

      <ul className={styles.feed}>
        {data.items.map((item) => <li key={item.id} className={item.urgent ? styles.urgent : ""}>
          <div className={styles.meta}><span className={styles.tag}>{KIND_TEXT[item.kind] ?? item.kind}</span><time dateTime={item.at}>{when(item.at)}</time></div>
          <h4>{item.title}</h4>
          <p className={styles.who}>{[item.who, item.project, item.mailbox].filter(Boolean).join(" · ")}</p>
          {item.preview && <p className={styles.preview}>{item.preview}</p>}
          {item.flags.length > 0 && <div className={styles.flags}>{item.flags.map((flag) => <i key={flag}>{flag.replaceAll("_", " ")}</i>)}</div>}
          <AdviceList advice={item.suggestions} />
          {item.kind === "email_received" && item.email && <button className={styles.replyButton} type="button" onClick={() => replyWith(item)}><Mail size={14} strokeWidth={1.75} />Reply with Jarvis{item.email.canReply ? "" : " (draft only)"}</button>}
        </li>)}
        {data.items.length === 0 && <li className={styles.empty}>{request.q ? `Nothing matches “${request.q}” in this period.` : "Nothing new in this period."}</li>}
      </ul>

      {data.sent.length > 0 && <article className={styles.sentLog}>
        <h3>Replies Jarvis has sent for you</h3>
        <ul>{data.sent.map((entry) => <li key={`${entry.sentId}-${entry.at}`}><b>{entry.subject}</b><span>to {entry.recipient} · from {entry.mailbox} · {when(entry.at)}</span></li>)}</ul>
      </article>}
    </>}
    {loading && !data && <p className={styles.note}>Jarvis is reading your company records…</p>}
  </section>;
}
