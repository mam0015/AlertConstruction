import type { ReactNode } from "react";
import SiteFooter from "./SiteFooter";
import SiteHeader, { type NavKey } from "./SiteHeader";
import "./site-pages.css";

// The frame of every content page: skip link, company strip and navigation, a dark title band, the page, and the footer.
export default function PageShell({ active, kicker, title, lead, actions, children }: { active: NavKey; kicker: string; title: string; lead: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#content">Skip to the content</a>
      <SiteHeader active={active} />
      <main id="content" className="pg">
        <section className="pg-hero">
          <div className="pg-wrap">
            <p className="pg-kicker">{kicker}</p>
            <h1>{title}</h1>
            <p className="pg-lead">{lead}</p>
            {actions ? <div className="pg-actions">{actions}</div> : null}
          </div>
        </section>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
