"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "./BrandLogo";

const services = [
  {
    title: "Kitchen Renovations",
    brand: "Alert Construction",
    description: "Modern kitchens designed around the way you live.",
    image: "/images/service-kitchen.webp",
  },
  {
    title: "Bathroom Renovations",
    brand: "Alert Construction",
    description: "Practical, refined bathrooms built to last.",
    image: "/images/service-bathroom.webp",
  },
  {
    title: "Home Renovations",
    brand: "Alert Construction",
    description: "Improve comfort, function and value throughout your home.",
    image: "/images/service-renovation.webp",
  },
  {
    title: "Home Extensions",
    brand: "Alert Construction",
    description: "More space, better flow and a stronger connection to home.",
    image: "/images/service-extension.webp",
  },
  {
    title: "New Homes",
    brand: "Alert Construction",
    description: "Quality new homes tailored to your site and lifestyle.",
    image: "/images/service-new-home.webp",
  },
  {
    title: "Building Inspections",
    brand: "Alert Construction",
    description: "Clear, practical reports backed by building experience.",
    image: "/images/service-inspection.webp",
  },
  {
    title: "Maintenance & Repairs",
    brand: "Alert Construction",
    description: "Reliable help to keep your property in good condition.",
    image: "/images/service-maintenance.webp",
  },
  {
    title: "Engineering Services",
    brand: "Alert Engineers",
    description: "Structural engineering, assessments, reports and advice.",
    image: "/images/service-engineering.webp",
  },
];

const brands = [
  {
    name: "Alert Construction",
    kind: "construction" as const,
    description: "Renovations, extensions, new homes, inspections and construction.",
  },
  {
    name: "Alert Engineers",
    kind: "engineers" as const,
    description: "Structural engineering, assessments, reports and technical advice.",
  },
  {
    name: "Alert Tradie Pro",
    kind: "tradie" as const,
    description: "Request services, share files and track your project online.",
  },
];

type PortalType = "customer" | "team" | null;
type InfoPanel = "privacy" | "terms" | "support" | null;
type Theme = "light" | "dark";
type CustomerAccessMethod = "code" | "email" | "phone";
type CustomerProjectMatch = { requestCode: string; service: string; suburb: string; updatedAt: string };

async function readApiResult<T>(response: Response) {
  const body = await response.text();
  if (!body) return {} as T;
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(response.ok ? "The server returned an unreadable response." : "The service is temporarily unavailable. Please try again.");
  }
}

export default function Home() {
  const router = useRouter();
  const [comparison, setComparison] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portal, setPortal] = useState<PortalType>(null);
  const [infoPanel, setInfoPanel] = useState<InfoPanel>(null);
  const [selectedService, setSelectedService] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [requestError, setRequestError] = useState("");
  const [requestUploadWarning, setRequestUploadWarning] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [trackingCode, setTrackingCode] = useState("");
  const [customerAccessMethod, setCustomerAccessMethod] = useState<CustomerAccessMethod>("code");
  const [customerContact, setCustomerContact] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [customerSuccess, setCustomerSuccess] = useState("");
  const [customerMatches, setCustomerMatches] = useState<CustomerProjectMatch[]>([]);
  const [customerBusy, setCustomerBusy] = useState(false);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamPassword, setTeamPassword] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedTheme = window.localStorage.getItem("alert-tradie-pro-theme");
      const initialTheme: Theme = savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.dataset.theme = initialTheme;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const openTeamLogin = () => {
      if (window.location.hash === "#team-sign-in") setPortal("team");
    };
    openTeamLogin();
    window.addEventListener("hashchange", openTeamLogin);
    return () => window.removeEventListener("hashchange", openTeamLogin);
  }, []);

  useEffect(() => {
    let frame = 0;

    const updateComparison = () => {
      frame = 0;
      const hero = heroRef.current;
      if (!hero) return;

      const headerOffset = window.innerWidth <= 860 ? 68 : 74;
      const rect = hero.getBoundingClientRect();
      const travel = Math.max(1, hero.offsetHeight - (window.innerHeight - headerOffset));
      const progress = Math.min(1, Math.max(0, (headerOffset - rect.top) / travel));
      setComparison(Math.round(progress * 1000) / 10);
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateComparison);
    };

    updateComparison();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPortal(null);
        setInfoPanel(null);
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = portal || infoPanel || menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [portal, infoPanel, menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestForm = event.currentTarget;
    setRequestBusy(true);
    setRequestError("");
    setRequestUploadWarning("");
    const form = new FormData(requestForm);
    const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length > 5) {
      setRequestError("Choose no more than five files.");
      setRequestBusy(false);
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setRequestError("Each photo or PDF must be 5 MB or smaller.");
      setRequestBusy(false);
      return;
    }
    const payload = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
    try {
      const response = await fetch("/api/workflow/public", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await readApiResult<{ data?: { caseId: number; code: string }; error?: string }>(response);
      if (!response.ok || !result.data) throw new Error(result.error ?? "Your request could not be submitted.");

      const uploads = [] as Array<Promise<{ ok: boolean; fileName: string }>>;
      for (const file of files) {
        const upload = new FormData();
        upload.set("caseId", String(result.data.caseId));
        upload.set("code", result.data.code);
        upload.set("file", file);
        uploads.push(fetch("/api/workflow/public/files", { method: "POST", body: upload })
          .then(async (uploadResponse) => ({ ok: uploadResponse.ok, fileName: file.name }))
          .catch(() => ({ ok: false, fileName: file.name })));
      }
      const uploadResults = await Promise.all(uploads);
      const failedUploads = uploadResults.filter((item) => !item.ok).map((item) => item.fileName);
      setTrackingCode(result.data.code);
      setSubmitted(result.data.code);
      if (failedUploads.length) setRequestUploadWarning(`Your request was saved, but ${failedUploads.length} file${failedUploads.length === 1 ? "" : "s"} could not be uploaded. Please quote your reference when contacting support.`);
      requestForm.reset();
      setSelectedService("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Your request could not be submitted.";
      setRequestError(message === "The string did not match the expected pattern." ? "The service could not read that request. Please check the details and try again." : message);
    } finally {
      setRequestBusy(false);
    }
  }

  async function handleTracking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomerError("");
    setCustomerSuccess("");
    const normalised = trackingCode.trim().toUpperCase().replace(/\/+|\s+/g, "-");
    if (!/^REQ-\d{4}-[A-F0-9]{32}$/.test(normalised)) {
      setCustomerError("Enter the complete private reference issued with your request.");
      return;
    }
    setCustomerBusy(true);
    try {
      const response = await fetch(`/api/workflow/public?code=${encodeURIComponent(normalised)}`, { cache: "no-store" });
      const result = await readApiResult<{ data?: unknown; error?: string }>(response);
      if (!response.ok || !result.data) throw new Error(result.error ?? "We could not find that project reference.");
      router.push(`/track/${encodeURIComponent(normalised)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Project access is temporarily unavailable.";
      setCustomerError(message === "The string did not match the expected pattern." ? "The service could not read that reference. Please check it and try again." : message);
    } finally {
      setCustomerBusy(false);
    }
  }

  async function handleCustomerContactAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (customerAccessMethod === "code") return;
    setCustomerError("");
    setCustomerSuccess("");
    setCustomerMatches([]);
    setCustomerBusy(true);
    try {
      const response = await fetch("/api/workflow/public/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: customerAccessMethod, contact: customerContact }),
      });
      const result = await readApiResult<{ projects?: CustomerProjectMatch[]; error?: string }>(response);
      if (!response.ok || !result.projects?.length) throw new Error(result.error ?? "No project matches those details.");
      if (result.projects.length === 1) {
        router.push(`/track/${encodeURIComponent(result.projects[0].requestCode)}`);
        return;
      }
      setCustomerMatches(result.projects);
      setCustomerSuccess(`${result.projects.length} projects found. Choose the project you want to open.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Project recovery is temporarily unavailable.";
      setCustomerError(message === "The string did not match the expected pattern." ? "The service could not read those details. Please check them and try again." : message);
    } finally {
      setCustomerBusy(false);
    }
  }

  function chooseCustomerAccess(method: CustomerAccessMethod) {
    setCustomerAccessMethod(method);
    setCustomerError("");
    setCustomerSuccess("");
    setCustomerMatches([]);
  }

  async function handleTeamSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setTeamBusy(true); setTeamError("");
    try { const response=await fetch("/api/team/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:teamEmail,password:teamPassword,teamCode})}); const result=await readApiResult<{error?:string;redirect?:string}>(response); if(!response.ok)throw new Error(result.error??"Sign-in failed."); router.push(result.redirect??"/team/pending"); router.refresh(); }
    catch(error){const message=error instanceof Error?error.message:"Sign-in failed.";setTeamError(message==="The string did not match the expected pattern."?"Sign-in is temporarily unavailable. Please try again.":message)} finally{setTeamBusy(false)}
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("alert-tradie-pro-theme", nextTheme);
  }

  function chooseService(service: string) {
    setSelectedService(service);
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main>
      <header className="site-header">
        <a className="header-brand" href="#home" aria-label="Alert Tradie Pro home">
          <BrandLogo kind="tradie" tone="dark" className="header-logo" />
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <a className="active" href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#services">Services</a>
          <button type="button" onClick={() => setPortal("customer")}>Customer Sign In</button>
          <button type="button" onClick={() => setPortal("team")}>Team Sign In</button>
          <a href="#support">Support</a>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
          </button>
          <a className="header-cta" href="#request">Request a Job</a>
        </nav>

        <button
          className={`menu-button ${menuOpen ? "is-open" : ""}`}
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {menuOpen && (
        <div className="mobile-menu" aria-label="Mobile navigation">
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#about" onClick={closeMenu}>About Us</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <button type="button" onClick={() => { closeMenu(); setPortal("customer"); }}>Customer Sign In</button>
          <button type="button" onClick={() => { closeMenu(); setPortal("team"); }}>Team Sign In</button>
          <a href="#support" onClick={closeMenu}>Support</a>
          <a className="mobile-cta" href="#request" onClick={closeMenu}>Request a Job</a>
        </div>
      )}

      <section className="hero" id="home" ref={heroRef}>
        <div className="comparison-scene" aria-label="Construction project before and after comparison">
          <img
            className="comparison-image construction-image"
            src="/images/hero-construction.webp"
            alt="Two-storey Australian home during construction"
          />
          <div
            className="complete-layer"
            style={{ clipPath: `inset(0 ${100 - comparison}% 0 0)` }}
          >
            <img
              className="comparison-image"
              src="/images/hero-complete.webp"
              alt="The same two-storey Australian home after completion"
            />
          </div>
          <div className="hero-shade" />

          <div className="hero-copy">
            <p className="eyebrow">Construction · Renovation · Engineering</p>
            <h1>Request, Track<br />and Manage<br />Your Project Online</h1>
            <p className="hero-summary">
              Request construction or engineering services, upload your documents
              and follow every customer-visible update through one secure portal.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#request">Request a Job</a>
              <button className="button button-secondary" type="button" onClick={() => setPortal("customer")}>
                Customer Sign In
              </button>
            </div>
          </div>

          <div className="comparison-line" style={{ left: `${comparison}%` }} aria-hidden="true">
            <span className="comparison-handle">‹›</span>
          </div>
          <div className="hero-status hero-status-left"><i /> Structure in progress</div>
          <div className="hero-status hero-status-right"><i /> Project complete</div>
          <div className={`scroll-cue ${comparison > 96 ? "is-complete" : ""}`} aria-hidden="true">
            <span>{comparison > 96 ? "Continue to explore" : "Scroll to complete the project"}</span>
            <i>↓</i>
          </div>
        </div>
      </section>

      <section className="brands-section section" id="about">
        <div className="section-heading compact-heading">
          <p className="section-kicker">One connected customer experience</p>
          <h2>Three connected brands. One clear process.</h2>
          <p>
            Alert Construction and Alert Engineers deliver the work. Alert Tradie Pro keeps your
            request, documents and updates organised from first enquiry to final handover.
          </p>
        </div>
        <div className="brand-grid">
          {brands.map((brand, index) => (
            <article className={`brand-card ${index === 2 ? "brand-card-tradie" : ""}`} key={brand.name}>
              <span className="card-index">0{index + 1}</span>
              <div className="brand-logo-wrap">
                <BrandLogo kind={brand.kind} />
              </div>
              <p>{brand.description}</p>
              <a href={index === 2 ? "#request" : "#services"}>
                {index === 2 ? "Request and track" : "Explore services"} <span>→</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section section" id="services">
        <div className="section-heading">
          <p className="section-kicker">Our services</p>
          <h2>Services for every stage of your project</h2>
          <p>Choose the service you need. We will review your request and organise the right next step.</p>
        </div>
        <div className="services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <div className="service-image">
                <img src={service.image} alt={service.title} loading="lazy" />
              </div>
              <div className="service-card-copy">
                <small>{service.brand}</small>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <button className="service-request-link" type="button" onClick={() => chooseService(service.title)}>
                  Request this service <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="request-section" id="request">
        <div className="request-inner">
          <div className="request-intro">
            <p className="section-kicker light">Start your request</p>
            <h2>Tell us about<br />your job.</h2>
            <p>
              Share the project details and our team will review your request,
              contact you and organise the next step.
            </p>
            <ol className="process-list">
              <li><span>1</span><div><strong>Submit your request</strong><small>Project details, timing and documents</small></div></li>
              <li><span>2</span><div><strong>We review the details</strong><small>Construction or engineering team assigned</small></div></li>
              <li><span>3</span><div><strong>Track your progress</strong><small>Use your unique ATP reference code</small></div></li>
            </ol>
          </div>

          <form className="request-form" onSubmit={handleRequest}>
            <div className="form-title-row">
              <div>
                <p>Customer request</p>
                <h3>Request a Job</h3>
              </div>
              <span>Secure enquiry</span>
            </div>

            <div className="form-grid">
              <label>
                <span>Service required</span>
                <select name="service" required value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>
                  <option value="" disabled>Select a service</option>
                  {services.map((service) => <option key={service.title} value={service.title}>{service.title}</option>)}
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                <span>Full name</span>
                <input name="name" autoComplete="name" placeholder="Your full name" required />
              </label>
              <label>
                <span>Phone</span>
                <input name="phone" type="tel" autoComplete="tel" placeholder="04XX XXX XXX" required />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" placeholder="name@email.com" required />
              </label>
              <label>
                <span>Project location</span>
                <input name="location" autoComplete="street-address" placeholder="Address or suburb" required />
              </label>
              <label>
                <span>Preferred timeframe</span>
                <select name="timeframe" required defaultValue="">
                  <option value="" disabled>Select a timeframe</option>
                  <option>As soon as possible</option>
                  <option>Within 1–3 months</option>
                  <option>Within 3–6 months</option>
                  <option>6+ months / planning ahead</option>
                </select>
              </label>
              <label>
                <span>Estimated budget</span>
                <select name="budget" required defaultValue="">
                  <option value="" disabled>Select a budget range</option>
                  <option>Under $25,000</option>
                  <option>$25,000–$75,000</option>
                  <option>$75,000–$150,000</option>
                  <option>$150,000–$300,000</option>
                  <option>$300,000+</option>
                  <option>Not sure yet</option>
                </select>
              </label>
              <label>
                <span>Material preference</span>
                <select name="material" required defaultValue="">
                  <option value="" disabled>Select a finish level</option>
                  <option>Economical</option>
                  <option>Standard</option>
                  <option>Premium</option>
                  <option>Luxury</option>
                  <option>Not sure yet</option>
                </select>
              </label>
            </div>

            {selectedService === "Other" && (
              <label className="full-field other-service-field">
                <span>Describe the service you need</span>
                <textarea
                  name="otherService"
                  rows={4}
                  minLength={30}
                  placeholder="Please explain the type of project, what you need help with and the result you are looking for..."
                  required
                />
                <small>Please provide enough detail for our team to route your request correctly.</small>
              </label>
            )}

            <label className="full-field">
              <span>Project details</span>
              <textarea name="details" rows={4} placeholder="Tell us what you would like to build, renovate, repair or assess..." required />
            </label>

            <label className="upload-field">
              <input type="file" name="files" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" multiple />
              <span className="upload-icon">＋</span>
              <strong>Add photos, plans or documents</strong>
              <small>Up to 5 files · JPG, PNG, WebP or PDF · 5 MB each</small>
            </label>

            <label className="terms-consent">
              <input type="checkbox" name="termsAccepted" required />
              <span>I have read and accept the <button type="button" onClick={() => setInfoPanel("privacy")}>Privacy Notice</button> and <button type="button" onClick={() => setInfoPanel("terms")}>Request Terms</button>. I understand this request is not a building contract or fixed price.</span>
            </label>

            <button className="submit-button" type="submit" disabled={requestBusy}>{requestBusy ? "Saving your request…" : "Submit Request"} <span>→</span></button>

            {submitted && (
              <div className="preview-notice" role="status">
                <strong>Request received · {submitted}</strong>
                <span>Keep this reference to follow Admin review, Site Visit, estimate and approved project updates.</span>
              </div>
            )}
            {requestUploadWarning && <div className="preview-notice warning-notice" role="alert"><strong>Request saved with an upload warning</strong><span>{requestUploadWarning}</span></div>}
            {requestError && <div className="preview-notice" role="alert"><strong>Request not submitted</strong><span>{requestError}</span></div>}
          </form>
        </div>
      </section>

      <section className="benefits" aria-label="Portal benefits">
        <div><span>✓</span><strong>Secure uploads</strong><small>Customer documents protected</small></div>
        <div><span>↻</span><strong>Clear progress tracking</strong><small>Customer-visible updates only</small></div>
        <div><span>▤</span><strong>Quotes and documents</strong><small>Everything kept with the project</small></div>
        <div><span>◌</span><strong>Direct communication</strong><small>A clear connection to our team</small></div>
      </section>

      <footer id="support">
        <div className="footer-main">
          <div className="footer-brand">
            <BrandLogo kind="construction" tone="dark" className="footer-lockup" />
            <a href="https://alertconstruction.com.au">alertconstruction.com.au</a>
          </div>
          <div className="footer-brand">
            <BrandLogo kind="engineers" tone="dark" className="footer-lockup" />
            <a href="https://alertengineers.com.au">alertengineers.com.au</a>
          </div>
          <div className="footer-brand">
            <BrandLogo kind="tradie" tone="dark" className="footer-lockup" />
            <small>Powered by Alert Construction</small>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Alert Tradie Pro</span>
          <div>
            <button type="button" onClick={() => setInfoPanel("privacy")}>Privacy</button>
            <button type="button" onClick={() => setInfoPanel("terms")}>Terms &amp; Conditions</button>
            <button type="button" onClick={() => setInfoPanel("support")}>Support</button>
            <a href="#request">Report an Issue</a>
          </div>
        </div>
      </footer>

      {portal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPortal(null)}>
          <section
            className={`portal-modal ${portal === "team" ? "team-access-modal" : "customer-access-modal"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" aria-label="Close sign in" onClick={() => setPortal(null)}>×</button>
            <div className="modal-logo-pair">
              <BrandLogo kind="tradie" className="modal-lockup" />
            </div>
            {portal === "customer" ? (
              <div className="customer-access-layout">
                <div className="customer-access-intro">
                  <span className="access-badge">PRIVATE PROJECT ACCESS</span>
                  <p className="section-kicker">Customer portal</p>
                  <h2 id={dialogTitleId}>Your project.<br />One private reference.</h2>
                  <p>Open the live record created for your request. You will only see information, documents and updates approved for customer viewing.</p>
                  <div className="customer-access-points" aria-label="Customer portal protections">
                    <span><i>✓</i> No public project search</span>
                    <span><i>✓</i> Internal team notes stay private</span>
                    <span><i>✓</i> Approved updates only</span>
                  </div>
                </div>
                <form className="customer-login-form" onSubmit={customerAccessMethod === "code" ? handleTracking : handleCustomerContactAccess}>
                  <header>
                    <span>CUSTOMER SIGN IN</span>
                    <strong>Open your project record</strong>
                    <small>Use your project code, or enter the exact email or phone saved when the request was created.</small>
                  </header>
                  <div className="customer-access-methods" role="tablist" aria-label="Customer sign-in method">
                    <button type="button" role="tab" aria-selected={customerAccessMethod === "code"} onClick={() => chooseCustomerAccess("code")}>Project code</button>
                    <button type="button" role="tab" aria-selected={customerAccessMethod === "email"} onClick={() => chooseCustomerAccess("email")}>Email</button>
                    <button type="button" role="tab" aria-selected={customerAccessMethod === "phone"} onClick={() => chooseCustomerAccess("phone")}>Phone</button>
                  </div>
                  {customerAccessMethod === "code" ? (
                    <label>
                      <span>Private request reference</span>
                      <div className="customer-reference-input">
                        <i aria-hidden="true">ATP</i>
                        <input
                          value={trackingCode}
                          onChange={(event) => { setTrackingCode(event.target.value.toUpperCase()); setCustomerError(""); }}
                          placeholder="REQ-2026-…"
                          autoCapitalize="characters"
                          autoComplete="off"
                          spellCheck={false}
                          autoFocus
                          required
                        />
                      </div>
                    </label>
                  ) : (
                    <label>
                      <span>{customerAccessMethod === "email" ? "Email saved with your request" : "Phone saved with your request"}</span>
                      <div className="customer-reference-input customer-contact-input">
                        <i aria-hidden="true">{customerAccessMethod === "email" ? "@" : "+61"}</i>
                        <input
                          type={customerAccessMethod === "email" ? "email" : "tel"}
                          value={customerContact}
                          onChange={(event) => { setCustomerContact(event.target.value); setCustomerError(""); setCustomerSuccess(""); setCustomerMatches([]); }}
                          placeholder={customerAccessMethod === "email" ? "name@email.com" : "04XX XXX XXX"}
                          autoComplete={customerAccessMethod === "email" ? "email" : "tel"}
                          autoFocus
                          required
                        />
                      </div>
                    </label>
                  )}
                  {customerError && <p className="form-error" role="alert">{customerError}</p>}
                  {customerSuccess && <p className="customer-access-success" role="status">✓ {customerSuccess}</p>}
                  {customerMatches.length > 1 && (
                    <div className="customer-project-matches" aria-label="Matching projects">
                      {customerMatches.map((project) => (
                        <button key={project.requestCode} type="button" onClick={() => router.push(`/track/${encodeURIComponent(project.requestCode)}`)}>
                          <span><strong>{project.service || "Project request"}</strong><small>{project.suburb || "Location not specified"}</small></span>
                          <i>Open →</i>
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="submit" className="customer-access-submit" disabled={customerBusy}>{customerBusy ? "Checking your details…" : customerAccessMethod === "code" ? "Open project securely" : "Find my project"} <span>→</span></button>
                  <p className="customer-access-footnote">{customerAccessMethod === "code" ? "Never share this reference publicly." : "No verification message is sent. The details must exactly match the email or phone saved with your request."}</p>
                  <button type="button" className="customer-help-link" onClick={() => { setPortal(null); document.getElementById("request")?.scrollIntoView({ behavior: "smooth" }); }}>I need a new project request</button>
                </form>
              </div>
            ) : (
              <div className="team-access-layout">
                <div className="team-access-intro">
                  <span className="access-badge">ONE SECURE ENTRY</span>
                  <p className="section-kicker">Owner &amp; team workspace</p>
                  <h2 id={dialogTitleId}>Sign in to your<br/>company workspace.</h2>
                  <p>One form recognises the account. Owner uses email and password only. A new team member also enters the company Team Code.</p>
                  <div className="access-flow">
                    <div><span>01</span><p><strong>Enter details</strong>Email, password and—when joining—the Team Code.</p></div>
                    <div><span>02</span><p><strong>Owner approval</strong>New members wait while Owner assigns their position.</p></div>
                    <div><span>03</span><p><strong>Saved access</strong>Approved members return with the same email and password.</p></div>
                  </div>
                </div>
                <form className="team-login-form" onSubmit={handleTeamSignIn}>
                  <header>
                    <span>WORKSPACE ACCESS</span>
                    <strong>Owner &amp; Team Sign In</strong>
                    <small>There is no separate Owner button.</small>
                  </header>
                  <label>
                    <span>Email / username</span>
                    <div className="access-input"><i>01</i><input type="email" autoComplete="username" value={teamEmail} onChange={e=>setTeamEmail(e.target.value)} placeholder="name@email.com" autoFocus required /></div>
                  </label>
                  <label>
                    <span>Password</span>
                    <div className="access-input"><i>02</i><input type="password" autoComplete="current-password" value={teamPassword} onChange={e=>setTeamPassword(e.target.value)} placeholder="Enter your password" required /></div>
                  </label>
                  <label>
                    <span>Team Code <small>New team requests only</small></span>
                    <div className="access-input"><i>03</i><input type="text" autoComplete="off" value={teamCode} onChange={e=>setTeamCode(e.target.value.toUpperCase())} placeholder="Owner leaves this blank" /></div>
                  </label>
                  {teamError && <p className="form-error" role="alert">{teamError}</p>}
                  <button type="submit" className="team-access-submit" disabled={teamBusy}>{teamBusy?"Checking your account…":"Continue securely"} <span>→</span></button>
                  <p className="team-access-footnote">New team members go to Waiting Approval. Approved roles are saved and can be changed later by Owner.</p>
                </form>
              </div>
            )}
          </section>
        </div>
      )}

      {infoPanel && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setInfoPanel(null)}>
          <section
            className="portal-modal info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setInfoPanel(null)}>×</button>
            <div className="modal-logo-pair">
              <BrandLogo kind="tradie" className="modal-lockup" />
            </div>

            {infoPanel === "privacy" && (
              <>
                <p className="section-kicker">Privacy</p>
                <h2 id={dialogTitleId}>Your information matters.</h2>
                <div className="info-copy">
                  <p><strong>What we collect.</strong> We collect the contact details, project location, scope, timing, budget range and files you choose to provide so we can review, route and manage your enquiry. Please do not upload identity documents, payment-card details or unrelated sensitive information.</p>
                  <p><strong>How we use it.</strong> We use the information to contact you, assess the proposed work, prepare estimates or contracts, coordinate the appropriate Alert Construction or Alert Engineers team, and provide approved project updates. We do not sell customer information.</p>
                  <p><strong>Who can see it.</strong> Access is limited by role. Owners and authorised Admin staff can access customer records needed for management; Site Supervisors and Workers receive only information needed for assigned work. Internal notes and private finance are not published to the customer portal.</p>
                  <p><strong>Storage and security.</strong> Production records must be stored in the protected database and object storage, not in public GitHub files or browser storage. We use server-side authentication, access controls, audit records and retention controls. No online service can promise zero risk, but we take reasonable technical and organisational steps to prevent misuse, loss and unauthorised access or disclosure.</p>
                  <p><strong>Access, correction and retention.</strong> Use the secure support form to request access or correction. We retain personal information only while needed for the enquiry, project, legal or dispute-resolution purposes, then delete or de-identify it where permitted.</p>
                  <p><strong>Privacy incidents.</strong> Suspected incidents are assessed and, where the Notifiable Data Breaches scheme applies, affected people and the OAIC are notified when legally required.</p>
                </div>
              </>
            )}

            {infoPanel === "terms" && (
              <>
                <p className="section-kicker">Terms &amp; Conditions</p>
                <h2 id={dialogTitleId}>Using Alert Tradie Pro.</h2>
                <div className="info-copy">
                  <p><strong>1. Enquiry only.</strong> Submitting a request does not create a building contract, guarantee availability, confirm a fixed price or authorise work. A separate written estimate, scope and—where required—a compliant Victorian domestic building contract must be accepted before work begins.</p>
                  <p><strong>2. Accurate information.</strong> You must provide accurate, lawful and reasonably complete project information and may upload only files you are entitled to share. Missing or inaccurate information can change the scope, price and timing.</p>
                  <p><strong>3. Estimates, selections and variations.</strong> An estimate is based on the stated scope, assumptions and allowances. If you request additional work or select an item that costs more than the stated allowance, the additional amount may be charged only through the applicable contract and Victorian variation process. We will identify the change, price effect and time effect in writing and obtain approval where the law or contract requires it. Vague or undisclosed price increases are not authorised by this website term.</p>
                  <p><strong>4. Site conditions and allowances.</strong> Latent conditions, permit requirements, engineering findings, unavailable materials and other matters outside the confirmed scope may require a written variation or revised proposal. Prime-cost and provisional-sum items must be reconciled as the signed contract and law require.</p>
                  <p><strong>5. Invoices.</strong> Unless the signed contract states another lawful due date, an invoice is due 14 calendar days after issue. If it remains unpaid, we may issue a written notice, suspend work where the contract and law permit, recover agreed lawful costs or interest, and terminate only after the notice and termination requirements in the signed contract and applicable law have been satisfied. Non-payment does not create an automatic cancellation right.</p>
                  <p><strong>6. Timing and access.</strong> Customer-visible dates are forecasts unless expressly confirmed in the signed contract. Weather, approvals, safety, access, latent conditions, materials and trade availability can affect timing. You must provide safe and reasonable site access when agreed.</p>
                  <p><strong>7. Quality, defects and handover.</strong> Completion passes through Site Supervisor quality inspection, Admin review and Owner completion approval. Defects and incomplete items should be recorded through the project channel so they can be assessed and rectified under the contract and applicable statutory warranties.</p>
                  <p><strong>8. Consumer rights.</strong> Nothing in these terms excludes rights or guarantees that cannot lawfully be excluded, including rights under Australian Consumer Law and Victorian building law. The signed project contract prevails over these request terms for project-specific work.</p>
                  <p><strong>9. Legal review.</strong> These request terms are an operational draft for Victoria and must be reviewed against the company’s registration, insurance, services and chosen contract by a Victorian construction lawyer before production launch.</p>
                </div>
              </>
            )}

            {infoPanel === "support" && (
              <>
                <p className="section-kicker">Support</p>
                <h2 id={dialogTitleId}>How the app works.</h2>
                <div className="support-steps">
                  <div><span>1</span><p><strong>Request a job</strong>Choose a service, add your project details and attach any useful photos or plans.</p></div>
                  <div><span>2</span><p><strong>Receive your ATP code</strong>After the live system accepts the request, you receive a unique code such as ATP/123456.</p></div>
                  <div><span>3</span><p><strong>Track the project</strong>Use Customer Sign In to view approved status updates, scheduled work and customer documents.</p></div>
                </div>
                <a className="support-email-button" href="#request" onClick={() => setInfoPanel(null)}>Open secure support form</a>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
