"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CalendarDays, DollarSign, FolderKanban, ListChecks, Mail, MessageCircle, MessagesSquare, Mic, RefreshCw, Search, Send, ShieldCheck, SpellCheck, Square, Terminal, Users, UserCheck, Volume2, type LucideIcon } from "lucide-react";
import styles from "./jarvis.module.css";
import { ActionCard, Composer, PlansList, ProofreadReport, Reactor, when } from "./JarvisParts";
import VoiceBar from "./VoiceBar";
import { useVoice, type VoiceApi } from "./useVoice";
import { joinSpoken, newsScript, plansScript } from "./voice.mjs";
import type { ActionState, Advice, AiSuggestion, BrainCheck, BrainId, BrainMode, Draft, Focus, Item, Pending, ProofreadSummary, ProposedAction, Request, Result, Scope, Turn } from "./jarvis-types";

const SOURCES: { id: Scope; label: string; icon: LucideIcon }[] = [
  { id: "company_email", label: "Email", icon: Mail },
  { id: "team_messages", label: "Team messages", icon: MessagesSquare },
  { id: "employee_updates", label: "Reports", icon: Users },
  { id: "client_comments", label: "Clients", icon: MessageCircle },
  { id: "work", label: "Requests & projects", icon: FolderKanban },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "finance", label: "Money", icon: DollarSign },
  { id: "people", label: "Team access", icon: UserCheck },
];
const WINDOWS = [{ hours: 24, label: "Last 24 hours" }, { hours: 72, label: "Last 3 days" }, { hours: 168, label: "Last 7 days" }, { hours: 720, label: "Last 30 days" }];
const STATUS_TEXT: Record<string, string> = { ok: "online", partial: "partly", empty: "empty", not_connected: "not connected", error: "error" };
const KIND_TEXT: Record<string, string> = {
  email_received: "Email received", email_sent: "Email sent", end_of_day: "End of day", worker_report: "Worker report",
  supervisor_update: "Supervisor update", site_visit: "Site visit", site_issue: "Site issue", customer_message: "Client comment", tracking_message: "Client comment",
  message_to_owner: "To you", message_from_owner: "From you", team_channel: "Team channel", team_message: "Team message",
  new_request: "New request", case_event: "Update", project: "Project", change_proposal: "Change proposal", inspection: "Inspection",
  task: "Task", worker_task: "Worker task", follow_up: "Follow-up", finance_entry: "Money", project_balance: "Balance", access_request: "Access",
};
const ACTION_TEXT: Record<string, string> = { reply_email: "Reply", call: "Call", check_with_team: "Check with team", review: "Review", schedule: "Schedule", wait: "Wait", other: "Other" };
const QUICK = [
  { label: "News", prompt: "What's the news?" },
  { label: "Coming up", prompt: "What is coming up?" },
  { label: "Open tasks", prompt: "What tasks are open?" },
  { label: "Money", prompt: "How is the money?" },
  { label: "Do first today", prompt: "What should I do first today?" },
  { label: "Complaints", prompt: "Any complaints I need to handle?" },
];
const sourceLabel = (id: Scope) => SOURCES.find((source) => source.id === id)?.label ?? (id === "schedule" ? "Schedule" : id);
const todayInMelbourne = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const BRAIN_KEY = "jarvis.brain";
const MODE_KEY = "jarvis.mode";
const BRAIN_NOTE: Record<BrainId, string> = {
  jarvis1: "Claude, Anthropic's cloud AI. The smartest choice. Your question and the records it needs (names, subjects and short previews; email addresses and phone numbers removed) are sent to Anthropic to write the answer.",
  jarvis2: "OpenJarvis, an open-source AI that runs on your own computer or server. Your records go only to your own server, not to Anthropic. How well it writes depends on the model you load there.",
};

const MODE_NOTE: Record<BrainMode, string> = {
  online: "Online: the AI brain answers. Jarvis writes, proofreads and prepares things like a person would.",
  offline: "Offline: nothing is sent to any AI and the device's own voice is used. Jarvis answers with its built-in rules only: it finds, lists and sorts your records, but does not write or reason like the AI.",
};
const DIFFERENCES: { what: string; one: string; two: string }[] = [
  { what: "Where it thinks", one: "Anthropic's cloud (online)", two: "Your own computer or server (private)" },
  { what: "Needs", one: "Internet + an Anthropic key (paid by use)", two: "OpenJarvis running on your side (no per-answer fee)" },
  { what: "Your records", one: "Names, subjects and short previews go to Anthropic", two: "Go only to your own server" },
  { what: "How well it writes", one: "The strongest", two: "Depends on the model you load" },
  { what: "Offline mode", one: "AI off, basic rules, nothing leaves", two: "AI off, basic rules, nothing leaves" },
];

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
  const [checking, setChecking] = useState(false);
  const [sentNotice, setSentNotice] = useState("");
  const [report, setReport] = useState<ProofreadSummary | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const [showComposer, setShowComposer] = useState(false);
  // A command Jarvis asked a question about ("Which Ali?", "What should the task be?"): kept here and sent back with the Owner's next sentence.
  const [pendingCommand, setPendingCommand] = useState<Pending | null>(null);
  // Which brain the Owner picked (remembered on this device). Empty = the default: Jarvis 1 if connected, else Jarvis 2, else basic mode.
  const [chosen, setChosen] = useState<BrainId | "">("");
  // Online / Offline for each brain (remembered on this device). Offline = no AI call at all.
  const [modes, setModes] = useState<Record<BrainId, BrainMode>>({ jarvis1: "online", jarvis2: "online" });
  const [testing, setTesting] = useState(false);
  const [brainCheck, setBrainCheck] = useState<BrainCheck | null>(null);
  // What the Owner has to tick before Send: only shown when the draft needs it.
  const [confirmReplyTo, setConfirmReplyTo] = useState(false);
  const [confirmAutomated, setConfirmAutomated] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [useOther, setUseOther] = useState(false);
  const sendingRef = useRef(false);
  const runningRef = useRef(new Set<string>());
  const chatRef = useRef<HTMLElement>(null);
  const focusKey = useRef("");
  const voice = useVoice();
  // The microphone finishes seconds after it was pressed; these keep the latest versions for that moment.
  const latest = useRef<{ ask: (message: string) => Promise<void>; voice: VoiceApi; asking: boolean; text: string } | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BRAIN_KEY);
      if (saved === "jarvis1" || saved === "jarvis2") setChosen(saved);
      const savedModes = JSON.parse(window.localStorage.getItem(MODE_KEY) ?? "{}") as Partial<Record<BrainId, string>>;
      setModes({ jarvis1: savedModes.jarvis1 === "offline" ? "offline" : "online", jarvis2: savedModes.jarvis2 === "offline" ? "offline" : "online" });
    } catch { /* private mode: the choice just is not remembered */ }
  }, []);

  function chooseMode(id: BrainId, mode: BrainMode) {
    const next = { ...modes, [id]: mode };
    setModes(next);
    try { window.localStorage.setItem(MODE_KEY, JSON.stringify(next)); } catch { /* not remembered */ }
  }

  function chooseBrain(id: BrainId) {
    setChosen(id);
    setBrainCheck(null);
    try { window.localStorage.setItem(BRAIN_KEY, id); } catch { /* not remembered */ }
  }

  async function testBrain() {
    if (testing) return;
    setTesting(true);
    setBrainCheck(null);
    try {
      setBrainCheck(await postJson<BrainCheck>("/api/owner/jarvis/brain", { brain: active?.id ?? "jarvis2" }));
    } catch (problem) {
      setBrainCheck({ ok: false, message: problem instanceof Error ? problem.message : "Jarvis could not test the connection.", warnings: [] });
    } finally {
      setTesting(false);
    }
  }

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
    setUseOther(false); // "use other records" is off for every new email, as the screen says
    setDraft(null);
    setConfirming(false);
    setSentNotice("");
    setReport(null);
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function ask(message: string) {
    const instruction = message.trim();
    if (!instruction || asking) return;
    setAsking(true);
    setChatError("");
    setSentNotice("");
    // Which email (if any) this question is about: an answer that arrives after the Owner moved on to another email must not land on that one.
    const askedAbout = focus ? `${focus.mailbox}:${focus.messageId}` : "";
    const history = turns.slice(-6).map((turn) => ({ role: turn.role, content: turn.content }));
    setTurns((current) => [...current, { role: "owner", content: instruction }]);
    setText("");
    try {
      const answer = await postJson<{ mode: string; reply: string; suggestions: AiSuggestion[]; draft: Draft | null; actions: ProposedAction[]; notice: string; pending?: Pending | null; brain: { name: string; engine: string } | null }>("/api/owner/jarvis/ask", {
        message: instruction, history, hours: request.hours, ...brainFields,
        ...(pendingCommand && !focus ? { pending: pendingCommand } : {}),
        // The draft being edited goes along, so "make it shorter" or "also mention Friday" changes THAT text instead of starting again.
        ...(draft && draftBody.trim() ? { currentDraft: draftBody } : {}),
        ...(focus ? { focus: { mailbox: focus.mailbox, messageId: focus.messageId }, useOtherRecords: useOther } : {}),
      });
      setPendingCommand(answer.pending ?? null);
      setTurns((current) => [...current, { role: "jarvis", content: answer.reply, suggestions: answer.suggestions, notice: answer.notice, mode: answer.mode, actions: answer.actions, brainName: answer.brain ? `${answer.brain.name} · ${answer.brain.engine}` : offline ? "offline mode" : "basic mode" }]);
      // The new answer is turn number turns.length + 1 (the Owner's own line was added just before it).
      if (latest.current?.voice.prefs.speakAnswers) latest.current.voice.speak(`turn-${turns.length + 1}`, answer.reply);
      setActionStates((current) => ({ ...current, ...Object.fromEntries((answer.actions ?? []).map((action) => [action.id, { phase: "ready" } as ActionState])) }));
      const stale = focusKey.current !== askedAbout;
      if (answer.draft && stale) setChatError("A reply was drafted for a different email than the one open now, so it was not shown. Open the email again and ask again.");
      else if (answer.draft) { setDraft(answer.draft); setDraftBody(answer.draft.body); setConfirming(false); setConfirmReplyTo(false); setConfirmAutomated(false); setConfirmChecked(false); setReport(answer.draft.proofread ?? null); }
    } catch (problem) {
      // Nothing is lost when the call fails (session ended, too many questions…): the instruction goes back into the box.
      setTurns((current) => current.slice(0, -1));
      setText((current) => current || instruction);
      setChatError(problem instanceof Error ? problem.message : "Jarvis could not answer.");
    } finally {
      setAsking(false);
    }
  }

  function propose(action: ProposedAction) {
    setTurns((current) => [...current, { role: "jarvis", content: "Prepared by hand. Check it, then press the button.", actions: [action] }]);
    setActionStates((current) => ({ ...current, [action.id]: { phase: "ready" } }));
  }

  async function runAction(action: ProposedAction) {
    if (runningRef.current.has(action.id)) return;
    runningRef.current.add(action.id);
    setActionStates((current) => ({ ...current, [action.id]: { phase: "doing" } }));
    try {
      const result = await postJson<{ summary: string; proofread: ProofreadSummary | null }>("/api/owner/jarvis/act", {
        id: action.id, confirm: true, ...brainFields,
        action: { type: action.type, person: action.personEmail, title: action.title, text: action.text, dates: action.dates, startTime: action.startTime, projectCode: action.projectCode, priority: action.priority, financeType: action.financeType, category: action.category, amountCents: action.amountCents, entryDate: action.entryDate },
      });
      setActionStates((current) => ({ ...current, [action.id]: { phase: "done", message: result.summary, proofread: result.proofread } }));
      update({});
    } catch (problem) {
      setActionStates((current) => ({ ...current, [action.id]: { phase: "failed", message: problem instanceof Error ? problem.message : "Jarvis could not do that." } }));
    } finally {
      runningRef.current.delete(action.id);
    }
  }

  async function checkDraft() {
    if (!draft || checking || draftBody.trim().length < 2) return;
    setChecking(true);
    setChatError("");
    try {
      const result = await postJson<ProofreadSummary & { text: string }>("/api/owner/jarvis/proofread", { text: draftBody, ...brainFields });
      setDraftBody(result.text);
      setReport(result);
      setConfirming(false);
    } catch (problem) {
      setChatError(problem instanceof Error ? problem.message : "Jarvis could not check that.");
    } finally {
      setChecking(false);
    }
  }

  async function sendDraft() {
    // A ref (not state) so a double click or a held-down Enter key cannot start a second send before the first re-renders.
    if (!draft || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setChatError("");
    try {
      const result = await postJson<{ to: string; subject: string; proofread: ProofreadSummary | null }>("/api/owner/jarvis/send", {
        mailbox: draft.mailbox, messageId: draft.messageId, body: draftBody, to: draft.to, confirm: true, ...brainFields,
        confirmReplyTo: confirmReplyTo || undefined, confirmAutomated: confirmAutomated || undefined,
      });
      setSentNotice(`Sent to ${result.to}: “${result.subject}”.`);
      setReport(result.proofread);
      setDraft(null);
      setConfirming(false);
      setFocus(null);
      setUseOther(false);
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
  const brains = data?.capabilities.brains ?? [];
  // The brain that will answer: the Owner's pick, or the default (first connected one).
  const active = brains.find((brain) => brain.id === chosen) ?? brains.find((brain) => brain.available) ?? brains[0];
  const brainId: BrainId | "" = chosen || "";
  const mode: BrainMode = modes[active?.id ?? "jarvis1"];
  const offline = mode === "offline";
  const brainFields = { ...(brainId ? { brain: brainId } : {}), ...(offline ? { mode: "offline" } : {}) };
  const aiOn = Boolean(active?.available) && !offline;
  const online = Object.values(data?.sources ?? {}).filter((entry) => entry?.status === "ok").length;
  const total = Object.keys(data?.sources ?? {}).length;
  const lastJarvis = turns.map((turn, index) => (turn.role === "jarvis" ? index : -1)).filter((index) => index >= 0).at(-1);

  const { setOffline } = voice;
  useEffect(() => { setOffline(offline); }, [offline, setOffline]);
  useEffect(() => { latest.current = { ask, voice, asking, text }; focusKey.current = focus ? `${focus.mailbox}:${focus.messageId}` : ""; });

  function talk() {
    if (voice.listening) { voice.stopListening(); return; }
    voice.listen((said) => {
      if (!latest.current) return;
      const { ask: run, voice: current, asking: busy, text: typed } = latest.current;
      // "Run as soon as I stop talking" runs what the box would hold (what is already typed, then what was said), exactly as the screen shows it.
      // If Jarvis is still busy with an earlier question, the words go into the box instead of being lost.
      if (current.prefs.autoRun && !busy) void run(joinSpoken(typed, said));
      else setText((existing) => joinSpoken(existing, said));
    });
  }
  const readAloud = (id: string, script: string) => (voice.speakingId === id ? voice.stopReading() : voice.speak(id, script));

  return <section className={styles.jarvis}>
    <header className={styles.hud}>
      <Reactor online={Boolean(data)} />
      <div className={styles.hudTitle}>
        <h1>JARVIS<span>{" // owner console"}</span></h1>
        <p><ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />Takes orders from you only. Nothing leaves until you press the button.</p>
      </div>
      <span className={aiOn ? styles.modeOn : styles.modeOff} title={aiOn ? `${active?.name} (${active?.engine}) is answering` : offline ? "Offline mode: nothing is sent to any AI" : "Basic mode: fixed rules, no AI"}>
        <i aria-hidden="true" />{aiOn ? `online · ${active?.name.toLowerCase()}` : offline ? `offline · ${active?.name.toLowerCase()}` : "offline · basic"}
      </span>
    </header>
    <p className={styles.boot} aria-live="polite">
      <span>&gt;</span> link secured · <b>{data ? `${online}/${total || 9}` : "…"}</b> sources online · reads the whole app, never passwords or keys · tells you the news <b>only when you ask</b>
    </p>

    {brains.length > 0 && <section className={styles.brains} aria-label="Choose which Jarvis answers">
      <div className={styles.brainPick} role="radiogroup" aria-label="Which Jarvis answers">
        {brains.map((brain) => <button key={brain.id} type="button" role="radio" aria-checked={active?.id === brain.id} className={`${styles.brainOption} ${active?.id === brain.id ? styles.brainActive : ""}`} onClick={() => chooseBrain(brain.id)}>
          <span className={styles.brainName}><i className={brain.available ? styles.ledOn : styles.ledOff} aria-hidden="true" />{brain.name}<small>{brain.engine}</small></span>
          <span className={styles.brainState}>{brain.available ? `connected${brain.model ? ` · ${brain.model}` : ""}` : "not connected"}</span>
        </button>)}
      </div>
      {active && <div className={styles.brainInfo}>
        <div className={styles.modeRow}>
          <span className={styles.modeLabel}>{active.name} · {active.kind}</span>
          <div className={styles.modePick} role="radiogroup" aria-label={`${active.name} mode`}>
            {(["online", "offline"] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={mode === value} className={`${styles.modeOption} ${mode === value ? styles.modeActive : ""}`} onClick={() => chooseMode(active.id, value)}>{value === "online" ? "Online" : "Offline"}</button>)}
          </div>
        </div>
        <p className={styles.noteSoft} role="status">{MODE_NOTE[mode]}</p>
        <p>{BRAIN_NOTE[active.id]} <b>Either one can do everything: read the whole app, give you the news, write and proofread, prepare messages, calendar entries and tasks.</b></p>
        <details className={styles.diff}>
          <summary>Jarvis 1 or Jarvis 2? What is different</summary>
          <table>
            <thead><tr><th scope="col" /><th scope="col">Jarvis 1 · Claude</th><th scope="col">Jarvis 2 · OpenJarvis</th></tr></thead>
            <tbody>{DIFFERENCES.map((row) => <tr key={row.what}><th scope="row">{row.what}</th><td>{row.one}</td><td>{row.two}</td></tr>)}</tbody>
          </table>
        </details>
        {!active.available && active.id === "jarvis2" && <p className={styles.noteSoft}>Jarvis 2 is not connected yet. Run OpenJarvis on your own computer or server, then add the <code>JARVIS_OPENJARVIS_URL</code> secret (setup: <code>docs/JARVIS2-OPENJARVIS.md</code>). Until then Jarvis answers in basic mode.</p>}
        {!active.available && active.id === "jarvis1" && <p className={styles.noteSoft}>Jarvis 1 is not connected yet. Add the <code>JARVIS_ANTHROPIC_API_KEY</code> secret (setup: <code>jarvis/README.md</code>).</p>}
        {(active.id === "jarvis1" || active.available) && <div className={styles.brainTest}>
          <button className={styles.ghost} type="button" onClick={() => void testBrain()} disabled={testing}>{testing ? "Testing…" : "Test connection"}</button>
          {brainCheck && <p className={brainCheck.ok ? styles.success : styles.error} role="status">{brainCheck.message}{brainCheck.ok && brainCheck.model ? ` Model: ${brainCheck.model}.` : ""}</p>}
          {brainCheck?.warnings.map((warning) => <p key={warning} className={styles.warnBox} role="status">{warning}</p>)}
        </div>}
      </div>}
    </section>}

    <article className={styles.chat} ref={chatRef} aria-label="Tell Jarvis what to do">
      <div className={styles.chatHead}>
        <h2><Terminal size={15} strokeWidth={1.75} aria-hidden="true" />Command line</h2>
        <button className={styles.ghostText} type="button" aria-expanded={showComposer} onClick={() => setShowComposer((value) => !value)}>{showComposer ? "Hide" : "Prepare by hand"}</button>
      </div>
      <VoiceBar voice={voice} offline={offline} hasNews={Boolean(data?.items.length)} hasPlans={Boolean(data?.plans.length)}
        onReadNews={() => readAloud("news", newsScript(data?.items ?? [], { lang: voice.prefs.lang }))}
        onReadPlans={() => readAloud("plans", plansScript(data?.plans ?? [], { lang: voice.prefs.lang }))} />
      {data && !aiOn && <p className={styles.note}>Basic mode works without any AI. Say it in one sentence and Jarvis prepares it for your button: <b>“set a task for Ali: check the tiles”</b>, <b>“tell Ben to be on site at 7”</b>, <b>“put the inspection in Sue’s calendar on Friday at 1pm”</b>, <b>“enter an expense of $320 for tiles on ATP-2026-00124”</b>. It also reads tasks, money and projects (<b>“what tasks does Ali have?”</b>, <b>“how is the money?”</b>), gives the news and what is coming up, and puts your own words into a tidy email reply. Connect Jarvis 1 or Jarvis 2 for open-ended advice and any wording.</p>}
      {showComposer && data && <Composer team={data.team ?? []} projects={data.projects ?? []} today={todayInMelbourne()} onPropose={propose} />}
      {pendingCommand && !focus && <div className={styles.pendingChip} role="status"><span>Jarvis is waiting for your answer to finish that. Type it below, or cancel.</span><button type="button" aria-label="Cancel that command" onClick={() => setPendingCommand(null)}>×</button></div>}

      {focus && <div className={styles.focusChip}>
        <span>Replying to <b>{focus.title}</b>{focus.who ? ` — ${focus.who}` : ""}</span>
        <button type="button" onClick={() => { setFocus(null); setDraft(null); setUseOther(false); }} aria-label="Stop replying to this email">×</button>
      </div>}

      <div className={styles.turns} aria-live="polite">
        {turns.length === 0 && <p className={styles.hint}>{focus ? "Say what the reply should say, in your own words (any language). Jarvis drafts it, you check it." : "Try “What’s the news?”, “Set a task for Ali: check the tiles”, “Enter an expense of $320 for tiles on ATP-2026-00124”, or “What tasks are open?”. Persian works too."}</p>}
        {turns.map((turn, index) => <div key={index} className={`${turn.role === "owner" ? styles.turnOwner : styles.turnJarvis} ${index === lastJarvis ? styles.turnLatest : ""}`}>
          <div className={styles.turnHead}>
            <b>{turn.role === "owner" ? "you" : "jarvis"}{turn.brainName ? <small className={styles.turnBrain}> · {turn.brainName}</small> : null}</b>
            {voice.canSpeak && <button className={styles.listenButton} type="button" aria-pressed={voice.speakingId === `turn-${index}`}
              aria-label={`Read this ${turn.role === "owner" ? "message" : "answer"} aloud`}
              onClick={() => readAloud(`turn-${index}`, turn.content)}>{voice.speakingId === `turn-${index}` ? <Square size={12} strokeWidth={2} aria-hidden="true" /> : <Volume2 size={13} strokeWidth={1.75} aria-hidden="true" />}</button>}
          </div>
          <p dir="auto">{turn.content}</p>
          {turn.notice && <small className={styles.turnNotice}>{turn.notice}</small>}
          {turn.suggestions && turn.suggestions.length > 0 && <ul className={styles.advice} aria-label="Suggested next steps">{turn.suggestions.map((entry, position) => <li key={position}><i>{ACTION_TEXT[entry.action] ?? "Do"}</i><span><b>{entry.title}</b>{entry.why ? ` — ${entry.why}` : ""}</span></li>)}</ul>}
          {turn.actions && turn.actions.length > 0 && <div className={styles.actions}>{turn.actions.map((action) => <ActionCard key={action.id} action={action} state={actionStates[action.id] ?? { phase: "ready" }}
            onRun={() => void runAction(action)} onDismiss={() => setActionStates((current) => ({ ...current, [action.id]: { phase: "dismissed" } }))} />)}</div>}
        </div>)}
        {asking && <div className={styles.turnJarvis}><div className={styles.turnHead}><b>jarvis</b></div><p className={styles.thinking}>working<span aria-hidden="true">.</span><span aria-hidden="true">.</span><span aria-hidden="true">.</span></p></div>}
      </div>

      {draft && <div className={styles.draft}>
        <h3>Draft reply — check it, change anything, then send</h3>
        <dl><dt>To</dt><dd dir="auto">{draft.toName ? `${draft.toName} <${draft.to}>` : draft.to}</dd><dt>From</dt><dd>{draft.mailbox}</dd><dt>Subject</dt><dd dir="auto">{draft.subject}</dd></dl>
        {draft.note && <p className={styles.noteSoft}>Jarvis says: {draft.note}</p>}
        {typeof draft.otherRecordsWithheld === "number" && draft.otherRecordsWithheld > 0 && <p className={styles.noteSoft}>Jarvis kept {draft.otherRecordsWithheld} other record{draft.otherRecordsWithheld === 1 ? "" : "s"} (other clients, staff reports, other emails) out of this draft.</p>}
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
        <textarea dir="auto" value={draftBody} disabled={sending} onChange={(event) => { setDraftBody(event.target.value); setConfirming(false); setReport(null); }} rows={9} maxLength={5000} aria-label="Reply text" />
        {draftBody.length >= 4900 && <p className={styles.noteSoft}>{5000 - draftBody.length} characters left — longer text is cut off.</p>}
        {report && <ProofreadReport report={report} label="Proofread 3× — before sending" />}
        <div className={styles.draftActions}>
          {!draft.canSend && <span className={styles.noteSoft}>This mailbox is connected read-only, so Jarvis can’t send. Copy the text into your mail app, or reconnect it with <code>--allow-replies</code>.</span>}
          <button className={styles.ghost} type="button" disabled={checking || sending || draftBody.trim().length < 2} onClick={() => void checkDraft()}><SpellCheck size={14} strokeWidth={1.75} aria-hidden="true" />{checking ? "Checking 3×…" : "Check 3×"}</button>
          {draft.canSend && !confirming && <button className={styles.ask} type="button" disabled={sending || draftBody.trim().length < 2 || !readyToSend} onClick={() => setConfirming(true)}><Send size={14} strokeWidth={2} aria-hidden="true" />Proofread 3× &amp; send</button>}
          {draft.canSend && confirming && <div className={styles.confirmRow} role="alertdialog" aria-label="Confirm sending" aria-describedby="jarvis-confirm-text">
            <span id="jarvis-confirm-text" className={styles.confirmText}>Jarvis proofreads this 3 times, then sends it to <b>{draft.to}</b>. Go?</span>
            <button className={styles.ask} type="button" disabled={sending} onClick={() => void sendDraft()}>{sending ? "Proofreading & sending…" : "Yes, send it"}</button>
            <button className={styles.ghostText} type="button" onClick={() => setConfirming(false)} autoFocus>Not yet</button>
          </div>}
          <button className={styles.ghostText} type="button" onClick={() => { setDraft(null); setConfirming(false); setReport(null); }}>Discard</button>
        </div>
      </div>}
      {sentNotice && <p className={styles.success} role="status">{sentNotice}</p>}
      {!draft && report && sentNotice && <ProofreadReport report={report} label="Proofread 3× — what was checked before it went" />}
      {chatError && <p className={styles.error} role="alert">{chatError}</p>}

      {focus && <label className={styles.checkRow}><input type="checkbox" checked={useOther} onChange={(event) => setUseOther(event.target.checked)} /> Let Jarvis also use other records (clients’ comments, staff reports, other emails) for this reply. Off by default, so nothing unrelated can end up in the email.</label>}
      {voice.listening && <p className={styles.listening} role="status"><i aria-hidden="true" />Listening in {voice.listenLang === "fa" ? "Persian" : "English"}… <span dir="auto">{voice.prefs.autoRun && text ? `${text} ` : ""}{voice.heard}</span></p>}
      <form className={styles.chatForm} onSubmit={(event) => { event.preventDefault(); void ask(text); }}>
        <label className={styles.prompt} htmlFor="jarvis-input"><span aria-hidden="true">owner@alert:~$</span><span className={styles.srOnly}>Your instruction to Jarvis</span></label>
        <textarea id="jarvis-input" dir="auto" value={text} onChange={(event) => setText(event.target.value)} rows={2} maxLength={2000} readOnly={asking} aria-busy={asking}
          placeholder={focus ? "What should the reply say? e.g. “We’ll come Thursday 9am, sorry for the delay”" : "Tell Jarvis what you need…"}
          onKeyDown={(event) => {
            // On a computer Enter runs the command (Shift+Enter adds a line). On a phone Enter is a new line, so long instructions are easy to write; Run sends.
            const keyboard = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
            if (event.key === "Enter" && !event.nativeEvent.isComposing && ((keyboard && !event.shiftKey) || event.metaKey || event.ctrlKey)) { event.preventDefault(); void ask(text); }
          }} />
        <div className={styles.runButtons}>
          <button className={`${styles.micButton} ${voice.listening ? styles.micOn : ""}`} type="button" onClick={talk} disabled={!voice.canListen || (asking && !voice.listening)} aria-pressed={voice.listening}
            aria-label="Talk to Jarvis" title={voice.canListen ? `Talk to Jarvis in ${voice.prefs.lang === "fa" ? "Persian" : "English"}. Press again to stop.` : "Voice typing is not available in this browser"}>
            {voice.listening ? <Square size={15} strokeWidth={2} aria-hidden="true" /> : <Mic size={16} strokeWidth={1.75} aria-hidden="true" />}
          </button>
          <button className={styles.ask} type="submit" disabled={asking || !text.trim()}><Send size={14} strokeWidth={2} aria-hidden="true" />Run</button>
        </div>
      </form>
      {!focus && <div className={styles.quick}>{QUICK.map((entry) => <button key={entry.label} type="button" onClick={() => void ask(entry.prompt)} disabled={asking}>{entry.label}</button>)}</div>}
    </article>

    {preview && <p className={styles.note}>Design preview — Jarvis shows live records once you are signed in as Owner.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}

    {data && <>
      <div className={styles.status} role="list" aria-label="Sources Jarvis can read">
        {SOURCES.filter(({ id }) => data.sources[id]).map(({ id, label, icon: Icon }) => {
          const entry = data.sources[id]!;
          const replies = entry.mailboxes?.filter((mailbox) => mailbox.canReply).length ?? 0;
          return <article key={id} role="listitem" data-state={entry.status}>
            <span><Icon size={13} strokeWidth={1.75} aria-hidden="true" />{label}</span>
            <strong><i aria-hidden="true" />{STATUS_TEXT[entry.status] ?? entry.status}</strong>
            <small>{entry.count} {entry.count === 1 ? "item" : "items"}{entry.mailboxes?.length ? ` · ${entry.mailboxes.length} ${entry.mailboxes.length === 1 ? "mailbox" : "mailboxes"}${replies ? ` (${replies} can reply)` : " (read-only)"}` : ""}</small>
          </article>;
        })}
        {data.sources.schedule && <article role="listitem" data-state={data.sources.schedule.status}>
          <span><CalendarDays size={13} strokeWidth={1.75} aria-hidden="true" />Calendar</span>
          <strong><i aria-hidden="true" />{STATUS_TEXT[data.sources.schedule.status] ?? data.sources.schedule.status}</strong>
          <small>{data.sources.schedule.count} planned</small>
        </article>}
      </div>
      {emailOff && <p className={styles.note}>Company email is not connected yet. Each mailbox is connected once with Google’s permission — see <code>jarvis/README.md</code>. Everything else in the app is already readable.</p>}

      <article className={styles.panelBox} aria-label="Coming up">
        <h2><CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" />Coming up <small>{data.briefing.plans.from} → {data.briefing.plans.to}</small></h2>
        <PlansList plans={data.plans.slice(0, 20)} range={data.briefing.plans} />
      </article>

      <form className={styles.controls} onSubmit={search}>
        <label className={styles.search}><Search size={15} strokeWidth={1.75} aria-hidden="true" /><span className={styles.srOnly}>Search the records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the records: leak, refund, Sam, ATP-2026-00124" maxLength={120} /></label>
        <button className={styles.ask} type="submit">Search</button>
        {request.q && <button className={styles.ghost} type="button" onClick={() => { setQuery(""); update({ q: "" }); }}>Clear</button>}
        <select value={request.hours} onChange={(event) => update({ hours: Number(event.target.value) })} aria-label="Time window">{WINDOWS.map((window) => <option key={window.hours} value={window.hours}>{window.label}</option>)}</select>
        <button className={styles.ghost} type="button" onClick={() => update({})} disabled={loading} aria-label="Refresh"><RefreshCw size={15} strokeWidth={1.75} className={loading ? styles.spin : ""} /></button>
      </form>

      <nav className={styles.tabs} aria-label="Source">
        <button className={request.source === "all" ? styles.activeTab : ""} onClick={() => update({ source: "all" })}>Everything</button>
        {SOURCES.map(({ id, label, icon: Icon }) => <button key={id} className={request.source === id ? styles.activeTab : ""} onClick={() => update({ source: id })}><Icon size={14} strokeWidth={1.75} aria-hidden="true" />{label}{data.sources[id] ? <i>{data.sources[id]!.count}</i> : null}</button>)}
      </nav>

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
        {(data.briefing.employees.length > 0 || data.briefing.clients.length > 0 || data.briefing.team?.length > 0) && <div className={styles.people}>
          {data.briefing.team?.length > 0 && <div><h3>Team messaging you</h3><p>{data.briefing.team.map((person) => `${person.name} (${person.count})`).join(", ")}</p></div>}
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
          {item.kind === "email_received" && item.email && <button className={styles.replyButton} type="button" onClick={() => replyWith(item)}><Mail size={14} strokeWidth={1.75} aria-hidden="true" />Reply with Jarvis{item.email.canReply ? "" : " (draft only)"}</button>}
          {item.kind === "message_to_owner" && <button className={styles.replyButton} type="button" onClick={() => { setText(`Reply to ${item.who}: `); chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><MessagesSquare size={14} strokeWidth={1.75} aria-hidden="true" />Answer in the app</button>}
        </li>)}
        {data.items.length === 0 && <li className={styles.empty}>{request.q ? `Nothing matches “${request.q}” in this period.` : "Nothing new in this period."}</li>}
      </ul>

      {(data.sent.length > 0 || data.actionsDone?.length > 0) && <article className={styles.sentLog}>
        <h3>Done for you</h3>
        <ul>
          {data.actionsDone?.map((entry) => <li key={`${entry.at}-${entry.title}-${entry.recipient}`}><b>{entry.type.replaceAll("_", " ")}{entry.title ? ` — ${entry.title}` : ""}</b><span>for {entry.recipient} · {when(entry.at)}</span></li>)}
          {data.sent.map((entry) => <li key={`${entry.sentId}-${entry.at}`}><b>{entry.subject}</b><span>email to {entry.recipient} · from {entry.mailbox} · {when(entry.at)}</span></li>)}
        </ul>
      </article>}
    </>}
    {loading && !data && <p className={styles.note}>Jarvis is reading the company records…</p>}
  </section>;
}
