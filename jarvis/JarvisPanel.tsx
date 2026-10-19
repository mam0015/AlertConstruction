"use client";
import { FormEvent, useEffect, useState } from "react";
import { Bot, Mail, MessageCircle, RefreshCw, Search, Users, type LucideIcon } from "lucide-react";
import styles from "./jarvis.module.css";

type Scope = "company_email" | "employee_updates" | "client_comments";
type SourceReport = { status: string; count: number; mailboxes?: { label: string; status: string; count: number }[] };
type Item = { id: string; source: Scope; kind: string; at: string; title: string; who: string; project: string; mailbox: string; preview: string; flags: string[]; urgent: boolean };
type Attention = Pick<Item, "id" | "source" | "kind" | "at" | "title" | "who" | "project" | "flags">;
type Result = {
  generatedAt: string;
  sources: Partial<Record<Scope, SourceReport>>;
  briefing: { headline: string; counts: { total: number; urgent: number }; attention: Attention[]; employees: { name: string; count: number }[]; clients: { name: string; count: number }[] };
  items: Item[];
};

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
const stamp = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const when = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? iso : stamp.format(date); };
const sourceLabel = (id: Scope) => SOURCES.find((source) => source.id === id)?.label ?? id;

type Request = { hours: number; source: Scope | "all"; q: string; nonce: number };

export default function JarvisPanel({ preview = false }: { preview?: boolean }) {
  const [request, setRequest] = useState<Request>({ hours: 72, source: "all", q: "", nonce: 0 });
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update({ q: query.trim() });
  }

  const emailOff = data?.sources.company_email?.status === "not_connected";

  return <section className={styles.jarvis}>
    <header className={styles.intro}>
      <span className={styles.badge}><Bot size={16} strokeWidth={1.75} />Read-only</span>
      <p>Jarvis reads three things for you — <b>company email</b>, <b>employee updates</b> and <b>client comments</b> — and nothing else. It cannot send, change or delete anything, and only the Owner can open it.</p>
    </header>

    <form className={styles.controls} onSubmit={ask}>
      <label className={styles.search}><Search size={15} strokeWidth={1.75} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask Jarvis: e.g. leak, refund, Sam, ATP-2026-00124" maxLength={120} /></label>
      <button className={styles.ask} type="submit">Ask</button>
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
          return <article key={id}><span>{label}</span><strong>{STATUS_TEXT[report.status] ?? report.status}</strong><small>{report.count} {report.count === 1 ? "item" : "items"}{report.mailboxes?.length ? ` · ${report.mailboxes.length} ${report.mailboxes.length === 1 ? "mailbox" : "mailboxes"}` : ""}</small></article>;
        })}
      </div>

      {emailOff && <p className={styles.note}>Company email is not connected yet. Each mailbox is connected once with Google’s read-only permission — see <code>jarvis/README.md</code>.</p>}

      <article className={styles.briefing}>
        <h2>{data.briefing.headline}</h2>
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
        </li>)}
        {data.items.length === 0 && <li className={styles.empty}>{request.q ? `Nothing matches “${request.q}” in this period.` : "Nothing new in this period."}</li>}
      </ul>
    </>}
    {loading && !data && <p className={styles.note}>Jarvis is reading your company records…</p>}
  </section>;
}
