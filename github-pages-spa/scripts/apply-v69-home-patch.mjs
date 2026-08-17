import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), "src/Home.tsx");
let source = readFileSync(path, "utf8");

function replaceOnce(oldText, newText, label) {
  if (source.includes(newText)) return;
  if (!source.includes(oldText)) throw new Error(`V69 Home patch could not find: ${label}`);
  source = source.replace(oldText, newText);
}

replaceOnce(
  '  const [submitted, setSubmitted] = useState<string | null>(null);\n  const [theme, setTheme] = useState<Theme>("light");',
  '  const [submitted, setSubmitted] = useState<string | null>(null);\n  const [requestError, setRequestError] = useState("");\n  const [theme, setTheme] = useState<Theme>("light");',
  "request error state",
);
replaceOnce(
  '  const [trackingCode, setTrackingCode] = useState("ATP-2026-00124");',
  '  const [trackingCode, setTrackingCode] = useState("");',
  "empty tracking reference",
);

replaceOnce(
`  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
    const response = await fetch("/api/workflow/public", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { data?: { code: string }; error?: string };
    if (!response.ok || !result.data) { setTeamError(result.error ?? "Your request could not be saved."); return; }
    setTrackingCode(result.data.code);
    setSubmitted(result.data.code);
  }`,
`  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/workflow/public", { method: "POST", body: form });
      const result = await response.json() as { data?: { code: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Your request could not be saved.");
      setTrackingCode(result.data.code);
      setSubmitted(result.data.code);
      formElement.reset();
      setSelectedService("");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Your request could not be saved.");
    }
  }`,
  "real multipart request submission",
);

replaceOnce(
  '              <input type="file" name="files" accept="image/*,.pdf,.doc,.docx,.dwg" multiple />',
  '              <input type="file" name="files" accept="image/*,.pdf" multiple />',
  "safe request upload types",
);
replaceOnce(
  '              <small>Choose files or drag and drop · JPG, PNG, PDF, DOC or DWG</small>',
  '              <small>Up to 5 files · JPG, PNG, WebP, HEIC or PDF · 12 MB each / 25 MB total</small>',
  "request upload limits copy",
);
replaceOnce(
  '            <button className="submit-button" type="submit">Submit Request <span>→</span></button>\n\n            {submitted && (',
  '            <button className="submit-button" type="submit">Submit Request <span>→</span></button>\n            {requestError && <p className="form-error" role="alert">{requestError}</p>}\n\n            {submitted && (',
  "request error display",
);
replaceOnce(
  '                <span>Use this code in Track Project. GitHub Pages keeps this demo workflow in this browser.</span>',
  '                <span>Keep this reference. Your request and uploaded files are stored in the shared project system.</span>',
  "request success copy",
);
replaceOnce(
  '                    <span>Request or project code</span>',
  '                    <span>Customer reference</span>',
  "customer reference label",
);
replaceOnce(
  '                      placeholder="ATP-2026-00124"',
  '                      placeholder="REQ-2026-XXXXXXXXXXXXXXXX"',
  "tracking placeholder",
);
replaceOnce(
  '                <small className="modal-note">A preview reference is ready so you can review the customer experience.</small>',
  '                <small className="modal-note">Use the reference received after submitting your request.</small>',
  "customer modal copy",
);
replaceOnce(
  '                  <p>When the live request system is connected, Alert Tradie Pro will collect only the information needed to review, route and manage your project request, including your contact details, project details and files you choose to upload.</p>',
  '                  <p>Alert Tradie Pro collects only the information needed to review, route and manage your project request, including your contact details, project details and files you choose to upload.</p>',
  "privacy live wording",
);
replaceOnce(
  '                  <p>This current design preview does not transmit or store form entries. Do not upload confidential documents until the secure live workflow is activated.</p>',
  '                  <p>Project information is sent to the configured secure backend for this test deployment. Customer-visible information is separated from internal team notes and unpublished files.</p>',
  "privacy storage wording",
);
replaceOnce(
  '                  <p>This preview is for design review and does not yet create a live request. Contact <a href={`mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20Terms`}>{supportEmail}</a> with any questions.</p>',
  '                  <p>This test deployment can create real test records in the configured ATP backend. It must not be treated as a signed building contract or final project authority. Contact <a href={`mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20Terms`}>{supportEmail}</a> with any questions.</p>',
  "terms test deployment wording",
);
replaceOnce(
  '                  <div><span>2</span><p><strong>Receive your ATP code</strong>After the live system accepts the request, you receive a unique code such as ATP/123456.</p></div>',
  '                  <div><span>2</span><p><strong>Receive your project reference</strong>After the system accepts the request, you receive a unique reference such as REQ-2026-XXXXXXXXXXXXXXXX.</p></div>',
  "support reference wording",
);

writeFileSync(path, source);
console.log("ATP V69 Home source patch applied.");
