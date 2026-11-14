"use client";

// Every customer conversation, read-only, for the Manager (the Owner's right hand). Owner and Admin reply from the project board.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../team/hub/team-hub.module.css";

type Conversation = {
  id: number;
  projectCode: string;
  customerName: string;
  service: string;
  suburb: string;
  statusLabel: string;
  customerStatus: { title: string } | null;
  messages: Array<{ id: number; sender: "Admin" | "Customer"; senderLabel: string; body: string; kind: string; createdAt: string }>;
};

function when(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export default function CustomerConversations() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [open, setOpen] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();
  // Only the most recent read is shown (an older answer arriving late never replaces a newer one), and once access is refused everything
  // already shown is cleared and nothing that arrives afterwards is shown again; the page then re-checks the sign-in.
  const latest = useRef(0);
  const refused = useRef(false);

  useEffect(() => {
    let active = true;
    const load = () => {
      const mine = ++latest.current;
      return fetch("/api/workflow/conversations", { cache: "no-store" })
        .then(async (response) => ({ response, result: await response.json().catch(() => ({})) as { data?: Conversation[]; error?: string } }))
        .then(({ response, result }) => {
          if (!active || refused.current) return;
          if (response.status === 401 || response.status === 403) {
            refused.current = true;
            setItems([]); setOpen(0);
            setError(result.error ?? "Your access to customer conversations has ended.");
            router.refresh();
            return;
          }
          if (mine !== latest.current) return;
          if (!response.ok || !result.data) { setError(result.error ?? "Customer conversations could not be loaded."); return; }
          setError(""); setItems(result.data);
        })
        .catch(() => { if (active && !refused.current && mine === latest.current) setError("Customer conversations could not be loaded."); });
    };
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && !refused.current) void load(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [router]);

  const withMessages = (items ?? []).filter((item) => item.messages.length > 0);
  const shown = withMessages.find((item) => item.id === open) ?? withMessages[0];

  return <section className={styles.panel} aria-label="Customer conversations">
    <h2>Customer conversations ({withMessages.length})</h2>
    <p className={styles.muted}>Read-only: every message between customers and the Owner or Admin, kept in full. Owner and Admin reply from the project board.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {items === null && !error && <p className={styles.muted}>Loading…</p>}
    {items !== null && withMessages.length === 0 && <p className={styles.muted}>No customer has exchanged messages yet.</p>}
    {withMessages.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
      <div style={{ display: "grid", gap: 8, alignContent: "start", flex: "1 1 220px", maxWidth: 340 }}>
        {withMessages.map((item) => <button type="button" key={item.id} className={`${styles.btn} ${shown?.id === item.id ? styles.btnPrimary : ""}`} style={{ display: "block", textAlign: "left", width: "100%" }} aria-pressed={shown?.id === item.id} onClick={() => setOpen(item.id)}>
          <strong style={{ display: "block" }}>{item.customerName}</strong><small>{item.projectCode || "New request"} · {item.service} · {item.messages.length} messages</small>
        </button>)}
      </div>
      {shown && <div style={{ flex: "3 1 320px", minWidth: 0 }}>
        <p className={styles.muted}>{shown.projectCode || "New request"} · {shown.service} · {shown.suburb}{shown.statusLabel ? ` · Stage: ${shown.statusLabel}` : ""}{shown.customerStatus ? ` · Customer sees: ${shown.customerStatus.title}` : ""}</p>
        {shown.messages.map((message) => <article className={styles.entry} key={message.id}>
          <strong>{message.sender === "Customer" ? shown.customerName : message.senderLabel === "Owner" ? "Owner" : "Admin"}{message.kind === "document_request" ? " · documents requested" : ""}</strong>
          <small>{when(message.createdAt)}</small>
          <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0" }}>{message.body}</p>
        </article>)}
      </div>}
    </div>}
  </section>;
}
