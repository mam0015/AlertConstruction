"use client";
import { FormEvent, useState } from "react";
import { CalendarPlus, Check, ClipboardPlus, MessageSquarePlus, SpellCheck, Wallet } from "lucide-react";
import styles from "./jarvis.module.css";
import type { ActionState, Item, ProjectChoice, ProofreadSummary, ProposedAction, TeamMember } from "./jarvis-types";

export const stamp = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const dayStamp = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "long", day: "numeric", month: "long" });
const dayLabel = (day: string) => { const date = new Date(`${day}T12:00:00`); return Number.isNaN(date.getTime()) ? day : dayStamp.format(date); };
export const when = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? iso : stamp.format(date); };

// The glowing ring in the header. Pure CSS; stops turning for people who asked their device for less motion.
export function Reactor({ online }: { online: boolean }) {
  return <span className={`${styles.reactor} ${online ? styles.reactorOn : ""}`} aria-hidden="true"><i /><i /><b /></span>;
}

export function ProofreadReport({ report, label = "Proofread 3×" }: { report: ProofreadSummary; label?: string }) {
  const kind = report.method === "ai" ? "by the AI" : report.method === "mixed" ? "by the AI and the basic checker" : "by the basic checker (no AI)";
  return <div className={styles.proof} role="group" aria-label={label}>
    <p className={styles.proofHead}><SpellCheck size={14} strokeWidth={1.75} aria-hidden="true" /><b>{label}</b><span>{report.clean ? "clean" : report.totalFixes > 0 ? "fixed on the last pass" : "some corrections were held back"} · {report.totalFixes} {report.totalFixes === 1 ? "fix" : "fixes"} · {kind}</span></p>
    <ol>
      {report.passes.map((pass) => <li key={pass.n}>
        <span className={styles.proofName}><Check size={12} strokeWidth={2.5} aria-hidden="true" />Pass {pass.n} · {pass.name}</span>
        <span className={styles.proofFixes}>{pass.fixes.length ? pass.fixes.slice(0, 6).map((fix, index) => <code key={index}>{fix.was} → {fix.now}</code>) : <em>nothing to fix</em>}</span>
        {pass.note && <small>{pass.note}</small>}
      </li>)}
    </ol>
    {report.note && <small className={styles.proofNote}>{report.note}</small>}
  </div>;
}

const TYPE_ICON = { send_message: MessageSquarePlus, add_calendar: CalendarPlus, create_task: ClipboardPlus, add_finance: Wallet } as const;
const TYPE_TEXT = { send_message: "Message", add_calendar: "Calendar", create_task: "Task", add_finance: "Money" } as const;
const DO_TEXT = { send_message: "Send message", add_calendar: "Add to calendar", create_task: "Give task", add_finance: "Record it" } as const;
const dollars = (cents: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);

// What Jarvis has prepared. Nothing in this card has happened yet: it happens when the Owner presses the button.
export function ActionCard({ action, state, onRun, onDismiss }: { action: ProposedAction; state: ActionState; onRun: () => void; onDismiss: () => void }) {
  const Icon = TYPE_ICON[action.type];
  return <div className={`${styles.action} ${state.phase === "done" ? styles.actionDone : ""} ${state.phase === "failed" ? styles.actionFailed : ""}`} data-phase={state.phase}>
    <div className={styles.actionHead}><Icon size={15} strokeWidth={1.75} aria-hidden="true" /><b>{TYPE_TEXT[action.type]}</b><span dir="auto">{action.type === "add_finance" ? action.projectName : action.personName}</span></div>
    <p className={styles.actionSummary} dir="auto">{action.summary}</p>
    {action.type === "add_finance" && <dl className={styles.moneyCard}>
      <div><dt>{action.financeType === "Income" ? "Income" : "Expense"}</dt><dd className={action.financeType === "Income" ? styles.moneyIn : styles.moneyOut}>{dollars(action.amountCents ?? 0)}</dd></div>
      <div><dt>Category</dt><dd dir="auto">{action.category}</dd></div>
      <div><dt>Project</dt><dd dir="auto">{action.projectCode === "Business / General" ? "Business / General" : `${action.projectName} · ${action.projectCode}`}</dd></div>
      <div><dt>Date</dt><dd>{action.entryDate}</dd></div>
      {action.text && <div><dt>Note</dt><dd dir="auto">{action.text}</dd></div>}
    </dl>}
    {action.type === "send_message" && <blockquote dir="auto">{action.text}</blockquote>}
    {action.type === "create_task" && <blockquote dir="auto"><b>{action.title}</b><br />{action.text}</blockquote>}
    {action.type === "add_calendar" && (action.text || action.projectCode) && <blockquote dir="auto">{[action.text, action.projectCode && `Project ${action.projectCode}`].filter(Boolean).join(" · ")}</blockquote>}
    {state.phase === "ready" && <div className={styles.actionButtons}>
      <button className={styles.ask} type="button" onClick={onRun}>{DO_TEXT[action.type]}</button>
      <button className={styles.ghostText} type="button" onClick={onDismiss}>Dismiss</button>
    </div>}
    {state.phase === "doing" && <p className={styles.noteSoft} role="status">{action.type === "send_message" ? "Proofreading 3× and sending…" : "Doing it…"}</p>}
    {state.phase === "done" && <p className={styles.success} role="status"><Check size={14} strokeWidth={2.5} aria-hidden="true" /> Done. {state.message}</p>}
    {state.phase === "failed" && <div role="alert"><p className={styles.error}>{state.message}</p><div className={styles.actionButtons}><button className={styles.ask} type="button" onClick={onRun}>Try again</button><button className={styles.ghostText} type="button" onClick={onDismiss}>Dismiss</button></div></div>}
    {state.phase === "dismissed" && <p className={styles.noteSoft}>Dismissed. Nothing was done.</p>}
    {state.proofread && <ProofreadReport report={state.proofread} />}
  </div>;
}

export function PlansList({ plans, range }: { plans: Item[]; range: { from: string; to: string } }) {
  if (plans.length === 0) return <p className={styles.hint}>Nothing is planned from {range.from} to {range.to}.</p>;
  const days = new Map<string, Item[]>();
  for (const plan of plans) {
    const day = plan.at.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), plan]);
  }
  return <div className={styles.plans}>
    {[...days].map(([day, list]) => <section key={day}>
      <h4>{dayLabel(day)}</h4>
      <ul>{list.map((plan) => <li key={plan.id}><time>{plan.title.match(/\d{2}:\d{2}/)?.[0] ?? "all day"}</time><span dir="auto"><b>{plan.title.replace(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})? — /, "")}</b>{plan.who ? ` · ${plan.who}` : ""}{plan.project ? ` · ${plan.project}` : ""}</span></li>)}</ul>
    </section>)}
  </div>;
}

type Kind = ProposedAction["type"];

// Works without the AI: the Owner fills in a few fields and gets the same confirm-card Jarvis would have made.
export function Composer({ team, projects = [], today, onPropose }: { team: TeamMember[]; projects?: ProjectChoice[]; today: string; onPropose: (action: ProposedAction) => void }) {
  const [kind, setKind] = useState<Kind>("send_message");
  const [financeType, setFinanceType] = useState<"Income" | "Outcome">("Outcome");
  const [category, setCategory] = useState("Materials");
  const [amount, setAmount] = useState("");
  const [project, setProject] = useState("");
  const [person, setPerson] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("Normal");
  const choices = kind === "add_calendar" ? team : team.filter((member) => member.role !== "Owner");
  const chosen = choices.find((member) => member.email === person) ?? choices[0];

  function submitMoney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isInteger(cents) || cents < 1) return;
    const code = project || projects[0]?.code || "Business / General";
    const picked = projects.find((entry) => entry.code === code);
    const name = picked ? (picked.name || picked.customer || picked.code) : "the business in general";
    onPropose({
      id: crypto.randomUUID(), type: "add_finance", personEmail: "", personName: "", personRole: "", title: category, text: text.trim(), dates: [date || today], startTime: "", projectCode: code, priority: "Normal",
      financeType, category: category.trim(), amountCents: cents, entryDate: date || today, projectName: name,
      summary: `Record ${financeType === "Income" ? "income" : "an expense"} of ${dollars(cents)} (${category.trim()}) for ${name}${picked ? ` (${code})` : ""}, dated ${date || today}.`,
    });
    setText(""); setAmount("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (kind === "add_finance") { submitMoney(event); return; }
    event.preventDefault();
    if (!chosen) return;
    const base = { id: crypto.randomUUID(), type: kind, personEmail: chosen.email, personName: chosen.name, personRole: chosen.role, title: "", text: text.trim(), dates: [] as string[], startTime: "", projectCode: "", priority: "Normal" };
    let action: ProposedAction;
    if (kind === "send_message") action = { ...base, summary: `Send an in-app message to ${chosen.name}.` };
    else if (kind === "create_task") action = { ...base, title: title.trim(), priority, summary: `Give ${chosen.name} a ${priority.toLowerCase()}-priority task: ${title.trim()}.` };
    else action = { ...base, title: title.trim(), dates: [date], startTime: time, summary: `Add “${title.trim()}” to the calendar of ${chosen.name} on ${date}${time ? ` at ${time}` : ""}.` };
    onPropose(action);
    setText(""); setTitle("");
  }

  const ready = kind === "add_finance" ? Number(amount) > 0 && category.trim().length > 0 : Boolean(chosen) && (kind === "send_message" ? text.trim().length > 1 : kind === "create_task" ? title.trim() && text.trim() : title.trim() && date);
  return <form className={styles.composer} onSubmit={submit} aria-label="Prepare an action by hand">
    <div className={styles.composerKinds} role="tablist" aria-label="What to prepare">
      {(Object.keys(TYPE_TEXT) as Kind[]).map((id) => <button key={id} type="button" role="tab" aria-selected={kind === id} className={kind === id ? styles.activeTab : ""} onClick={() => { setKind(id); setPerson(""); }}>{TYPE_TEXT[id]}</button>)}
    </div>
    <div className={styles.composerGrid}>
      {kind === "add_finance" ? <>
        <label>Project<select value={project || projects[0]?.code || "Business / General"} onChange={(event) => setProject(event.target.value)}>{projects.map((entry) => <option key={entry.code} value={entry.code}>{entry.name || entry.customer} · {entry.code}</option>)}<option value="Business / General">Business / General</option></select></label>
        <label>Type<select value={financeType} onChange={(event) => setFinanceType(event.target.value as "Income" | "Outcome")}><option value="Outcome">Expense (money out)</option><option value="Income">Income (money in)</option></select></label>
        <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} placeholder="Materials" /></label>
        <label>Amount (AUD)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="320.00" /></label>
        <label>Date<input type="date" value={date || today} onChange={(event) => setDate(event.target.value)} /></label>
      </> : <label>Who<select value={chosen?.email ?? ""} onChange={(event) => setPerson(event.target.value)} disabled={choices.length === 0}>{choices.map((member) => <option key={member.email} value={member.email}>{member.name}</option>)}</select></label>}
      {kind !== "send_message" && kind !== "add_finance" && <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder={kind === "add_calendar" ? "Tiling starts" : "Order grout"} /></label>}
      {kind === "add_calendar" && <label>Date<input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} /></label>}
      {kind === "add_calendar" && <label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>}
      {kind === "create_task" && <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option>Normal</option><option>High</option><option>Urgent</option></select></label>}
    </div>
    <label className={styles.composerText}>{kind === "send_message" ? "Message" : kind === "create_task" ? "Instructions" : kind === "add_finance" ? "Note (optional)" : "Notes (optional)"}
      <textarea dir="auto" value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={kind === "send_message" ? 2000 : kind === "add_finance" ? 500 : 1000} />
    </label>
    {kind !== "add_finance" && choices.length === 0 && <p className={styles.noteSoft}>No approved team members yet.</p>}
    <button className={styles.ask} type="submit" disabled={!ready}>Prepare it</button>
    <small className={styles.noteSoft}>Nothing happens yet — you confirm on the card that appears.</small>
  </form>;
}
