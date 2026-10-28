import Link from "next/link";
import BrandLogo from "../BrandLogo";
import { CONSTRUCTION_NAME, CONSTRUCTION_URL, ENGINEERS_NAME, ENGINEERS_URL } from "./site-content";

// The footer of every page except the home page (which has its own, with the Privacy and Terms windows).
export default function SiteFooter() {
  return (
    <footer>
      <div className="footer-main">
        <div className="footer-brand">
          <BrandLogo kind="construction" tone="dark" className="footer-lockup" />
          <a href={CONSTRUCTION_URL} target="_blank" rel="noopener noreferrer">alertconstruction.com.au<span className="sr-only"> ({CONSTRUCTION_NAME}, opens in a new tab)</span></a>
        </div>
        <div className="footer-brand">
          <BrandLogo kind="engineers" tone="dark" className="footer-lockup" />
          <a href={ENGINEERS_URL} target="_blank" rel="noopener noreferrer">alertengineers.com.au<span className="sr-only"> ({ENGINEERS_NAME}, opens in a new tab)</span></a>
        </div>
        <div className="footer-brand">
          <BrandLogo kind="tradie" tone="dark" className="footer-lockup" />
          <small>Powered by {CONSTRUCTION_NAME}</small>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Alert Tradie Pro</span>
        <div>
          <Link href="/#privacy">Privacy</Link>
          <Link href="/#terms">Terms &amp; Conditions</Link>
          <Link href="/support">Support</Link>
          <Link href="/#request">Report an Issue</Link>
        </div>
      </div>
    </footer>
  );
}
