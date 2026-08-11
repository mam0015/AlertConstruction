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

const supportEmail = "MAMOBINI@gmail.com";

export default function Home() {
  const router = useRouter();
  const [comparison, setComparison] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portal, setPortal] = useState<PortalType>(null);
  const [infoPanel, setInfoPanel] = useState<InfoPanel>(null);
  const [selectedService, setSelectedService] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [trackingCode, setTrackingCode] = useState("ATP-2026-00124");
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

  function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function handleTracking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalised = trackingCode.trim().toUpperCase().replace(/\/+|\s+/g, "-");
    if (!normalised) return;
    router.push(`/track/${encodeURIComponent(normalised)}`);
  }

  async function handleTeamSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setTeamBusy(true); setTeamError("");
    try { const response=await fetch("/api/team/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:teamEmail,password:teamPassword,teamCode})}); const result=await response.json() as {error?:string;redirect?:string}; if(!response.ok)throw new Error(result.error??"Sign-in failed."); router.push(result.redirect??"/admin"); router.refresh(); }
    catch(error){setTeamError(error instanceof Error?error.message:"Sign-in failed.")} finally{setTeamBusy(false)}
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
              <input type="file" name="files" accept="image/*,.pdf,.doc,.docx,.dwg" multiple />
              <span className="upload-icon">＋</span>
              <strong>Add photos, plans or documents</strong>
              <small>Choose files or drag and drop · JPG, PNG, PDF, DOC or DWG</small>
            </label>

            <button className="submit-button" type="submit">Submit Request <span>→</span></button>

            {submitted && (
              <div className="preview-notice" role="status">
                <strong>Your request details passed the preview check.</strong>
                <span>No information was sent or stored in this design preview.</span>
              </div>
            )}
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
            <a href={`mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20-%20Report%20an%20Issue&body=Please%20describe%20the%20issue%2C%20the%20page%20you%20were%20using%20and%20what%20you%20expected%20to%20happen.%0A%0AIssue%3A%0APage%3A%0ADevice%3A`}>Report an Issue</a>
          </div>
        </div>
      </footer>

      {portal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPortal(null)}>
          <section
            className="portal-modal"
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
              <>
                <p className="section-kicker">Customer portal</p>
                <h2 id={dialogTitleId}>Track your request</h2>
                <p>Enter the unique reference code provided after your request is submitted.</p>
                <form className="tracking-form" onSubmit={handleTracking}>
                  <label>
                    <span>Request or project code</span>
                    <input
                      value={trackingCode}
                      onChange={(event) => setTrackingCode(event.target.value)}
                      placeholder="ATP-2026-00124"
                      autoCapitalize="characters"
                      required
                    />
                  </label>
                  <button type="submit" className="submit-button">View project status <span>→</span></button>
                </form>
                <small className="modal-note">A preview reference is ready so you can review the customer experience.</small>
              </>
            ) : (
              <>
                <p className="section-kicker">Owner-controlled team access</p>
                <h2 id={dialogTitleId}>Team Sign In</h2>
                <p>Owner access requires the registered email and password. Staff enter email, password and Team Code, then wait for the Owner to approve their role.</p>
                <div className="owner-access-note">
                  <strong>Owner account</strong>
                  <span>Email-only entry is disabled. Your password is verified securely on the server.</span>
                </div>
                <form className="tracking-form" onSubmit={handleTeamSignIn}>
                  <label><span>Work email</span><input type="email" autoComplete="username" value={teamEmail} onChange={e=>setTeamEmail(e.target.value)} placeholder="name@company.com" required /></label>
                  <label><span>Password</span><input type="password" autoComplete="current-password" value={teamPassword} onChange={e=>setTeamPassword(e.target.value)} placeholder="Enter your password" required /></label>
                  <label><span>Team code <small>(team members only)</small></span><input type="password" value={teamCode} onChange={e=>setTeamCode(e.target.value)} placeholder="Owner can leave this blank" /></label>
                  {teamError && <p className="form-error" role="alert">{teamError}</p>}
                  <button type="submit" className="submit-button" disabled={teamBusy}>{teamBusy?"Checking with Owner…":"Check staff access"} <span>→</span></button>
                </form><small className="modal-note">Five unsuccessful attempts temporarily lock further sign-in attempts.</small>
              </>
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
                  <p>When the live request system is connected, Alert Tradie Pro will collect only the information needed to review, route and manage your project request, including your contact details, project details and files you choose to upload.</p>
                  <p>Your information will be used to contact you, assess the work, coordinate the appropriate Alert Construction or Alert Engineers team, and provide customer-visible project updates. We do not sell customer information.</p>
                  <p>This current design preview does not transmit or store form entries. Do not upload confidential documents until the secure live workflow is activated.</p>
                  <p>For a privacy question or correction request, email <a href={`mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20Privacy`}>{supportEmail}</a>.</p>
                </div>
              </>
            )}

            {infoPanel === "terms" && (
              <>
                <p className="section-kicker">Terms &amp; Conditions</p>
                <h2 id={dialogTitleId}>Using Alert Tradie Pro.</h2>
                <div className="info-copy">
                  <p>Submitting a request is an enquiry only. It does not create a building contract, guarantee availability, confirm a price or authorise work to begin.</p>
                  <p>Project scopes, estimates, quotes, engineering advice, timeframes and approvals must be confirmed separately by the responsible Alert Construction or Alert Engineers team. Customers are responsible for providing accurate and lawful information and files.</p>
                  <p>Tracking information is provided to help customers follow progress. Dates and activities may change because of site conditions, approvals, materials, weather or trade availability.</p>
                  <p>This preview is for design review and does not yet create a live request. Contact <a href={`mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20Terms`}>{supportEmail}</a> with any questions.</p>
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
                <a className="support-email-button" href={`mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20Support`}>Email {supportEmail}</a>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
