"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BrandLogo from "../BrandLogo";
import { PRODUCT_NAME } from "./site-content";

export type NavKey = "home" | "about" | "services" | "why" | "support";
type Theme = "light" | "dark";
const THEME_KEY = "alert-tradie-pro-theme";

// The main navigation (desktop bar and phone menu). The home page passes the two sign-in callbacks (its sign-in windows live on that page); every other page leaves them out and the buttons send the visitor to the home page, which opens them.
export default function SiteHeader({ active, onCustomerSignIn, onTeamSignIn }: { active: NavKey | null; onCustomerSignIn?: () => void; onTeamSignIn?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [menuTop, setMenuTop] = useState(68);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let saved: string | null = null;
      try { saved = window.localStorage.getItem(THEME_KEY); } catch { /* storage unavailable (private mode) */ }
      const initial: Theme = saved === "dark" || saved === "light" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(initial);
      document.documentElement.dataset.theme = initial;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    // The open menu starts exactly where the header ends.
    const place = () => setMenuTop(Math.max(0, Math.round(headerRef.current?.getBoundingClientRect().bottom ?? 68)));
    place();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("resize", place); document.body.style.overflow = previous; };
  }, [menuOpen]);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem(THEME_KEY, next); } catch { /* not remembered */ }
  }

  const close = () => setMenuOpen(false);
  const current = (key: NavKey) => (active === key ? "page" : undefined);
  const customer = onCustomerSignIn
    ? <button type="button" onClick={() => { close(); onCustomerSignIn(); }}>Customer Sign In</button>
    : <Link href="/#customer-sign-in" onClick={close}>Customer Sign In</Link>;
  const team = onTeamSignIn
    ? <button type="button" onClick={() => { close(); onTeamSignIn(); }}>Team Sign In</button>
    : <Link href="/#team-sign-in" onClick={close}>Team Sign In</Link>;

  return (
    <>
      <header className="site-header" ref={headerRef}>
        <Link className="header-brand" href="/" aria-label={`${PRODUCT_NAME} home`}>
          <BrandLogo kind="tradie" tone="dark" className="header-logo" />
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link className={active === "home" ? "active" : ""} href="/" aria-current={current("home")}>Home</Link>
          <Link className={active === "about" ? "active" : ""} href="/about" aria-current={current("about")}>About Us</Link>
          <Link className={active === "services" ? "active" : ""} href="/services" aria-current={current("services")}>Services</Link>
          <Link className={active === "why" ? "active" : ""} href="/why-us" aria-current={current("why")}>Why Us</Link>
          {customer}
          {team}
          <Link className={active === "support" ? "active" : ""} href="/support" aria-current={current("support")}>Support</Link>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
          </button>
          <Link className="header-cta" href="/#request">Request a Job</Link>
        </nav>

        <button className={`menu-button ${menuOpen ? "is-open" : ""}`} type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <span />
          <span />
          <span />
        </button>
      </header>

      {menuOpen && (
        <div className="mobile-menu" aria-label="Mobile navigation" style={{ top: menuTop, height: `calc(100dvh - ${menuTop}px)` }}>
          <Link href="/" onClick={close}>Home</Link>
          <Link href="/about" onClick={close}>About Us</Link>
          <Link href="/services" onClick={close}>Services</Link>
          <Link href="/why-us" onClick={close}>Why Us</Link>
          {customer}
          {team}
          <Link href="/support" onClick={close}>Support</Link>
          <button type="button" onClick={toggleTheme}>{theme === "light" ? "Dark mode" : "Light mode"}</button>
          <Link className="mobile-cta" href="/#request" onClick={close}>Request a Job</Link>
        </div>
      )}
    </>
  );
}
