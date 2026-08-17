import { useEffect, useMemo, useState } from "react";
import styles from "./notification-bell.module.css";
import { appBase } from "./router";

type Item = {
  id: number;
  title: string;
  body: string;
  status: "Unread" | "Read" | "Actioned" | "Archived";
  action_url?: string;
  created_at: string;
};

export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) { setAvailable(false); return; }
      const result = await response.json() as { data?: Item[] };
      setItems(result.data ?? []);
      setAvailable(true);
    } catch { setAvailable(false); }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const unread = useMemo(() => items.filter((item) => item.status === "Unread").length, [items]);

  async function mark(item: Item, status: "Read" | "Actioned") {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    });
    if (response.ok) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
      if (status === "Actioned" && item.action_url) {
        const target = item.action_url.startsWith("/") ? `${appBase}${item.action_url.replace(/^\/+/, "")}` : item.action_url;
        window.location.assign(target);
      }
    }
  }

  if (!available) return null;
  return <div className={styles.wrap}>
    <button className={styles.bell} type="button" onClick={() => setOpen((value) => !value)} aria-label={`${unread} unread notifications`}>
      <span aria-hidden="true">●</span>
      {unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}
    </button>
    {open && <section className={styles.panel}>
      <header><div><span>ATP ACTION CENTRE</span><h2>Notifications</h2></div><button type="button" onClick={() => setOpen(false)}>×</button></header>
      <div className={styles.list}>
        {items.length ? items.map((item) => <article className={item.status === "Unread" ? styles.unread : ""} key={item.id}>
          <div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}<small>{new Date(item.created_at).toLocaleString("en-AU")}</small></div>
          <div className={styles.actions}>
            {item.status === "Unread" && <button type="button" onClick={() => void mark(item, "Read")}>Mark read</button>}
            {item.action_url && item.status !== "Actioned" && <button type="button" onClick={() => void mark(item, "Actioned")}>Open</button>}
          </div>
        </article>) : <p className={styles.empty}>No notification needs your attention.</p>}
      </div>
    </section>}
  </div>;
}
