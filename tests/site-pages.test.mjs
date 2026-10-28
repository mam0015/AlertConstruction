// The public pages: company strip, About Us, Services (with About), Why Us, Support. Rendered by the built Worker, read as a visitor would.
import assert from "node:assert/strict";
import test from "node:test";
import { SERVICES, SUPPORT_EMAIL, CONSTRUCTION_URL, ENGINEERS_URL, PRODUCT_NAME } from "../app/site/site-content.ts";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("site", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
const get = (path) => worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, ctx);
const page = async (path) => { const response = await get(path); assert.equal(response.status, 200, path); return { response, html: await response.text() }; };
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");

const NAV = ["/", "/about", "/services", "/why-us", "/support"];

test("site: every page has the company strip, the same navigation and a footer; the strip's links open the other companies' sites safely", async () => {
  for (const path of NAV) {
    const { html } = await page(path);
    assert.match(html, /aria-label="Our companies"/, path);
    const strip = html.match(/<nav class="company-bar"[\s\S]*?<\/nav>/)?.[0] ?? "";
    assert.match(strip, new RegExp(`href="${CONSTRUCTION_URL}"[^>]*target="_blank"[^>]*rel="noopener noreferrer"|rel="noopener noreferrer"[^>]*href="${CONSTRUCTION_URL}"`), `${path}: Alert Construction`);
    assert.match(strip, new RegExp(`href="${ENGINEERS_URL}"`), `${path}: Alert Engineers`);
    assert.match(strip, new RegExp(`href="/"[^>]*>${PRODUCT_NAME}<`), `${path}: ${PRODUCT_NAME} stays on our own site`);
    for (const label of ["Home", "About Us", "Services", "Why Us", "Customer Sign In", "Team Sign In", "Support", "Request a Job"]) assert.ok(html.includes(`>${label}</`), `${path}: ${label}`);
    for (const href of ["/about", "/services", "/why-us", "/support"]) assert.ok(html.includes(`href="${href}"`), `${path}: link to ${href}`);
    assert.match(html, /<footer/, path);
    // every link that leaves the site opens in a new tab and cannot reach back into it
    for (const tag of html.match(/<a [^>]*href="https?:\/\/[^"]*"[^>]*>/g) ?? []) {
      assert.match(tag, /rel="noopener noreferrer"/, `${path}: ${tag}`);
      assert.match(tag, /target="_blank"/, `${path}: ${tag}`);
    }
  }
});

test("site: About Us explains what Alert Tradie Pro is, what the two companies do, how a customer signs in and follows a project", async () => {
  const { html, response } = await page("/about");
  const words = text(html);
  assert.match(html, /<title>About Us \| /);
  assert.match(html, /<link rel="canonical" href="\/about"|rel="canonical"[^>]*\/about/);
  assert.match(words, /About Alert Tradie Pro/);
  assert.match(words, /part of Alert Construction/);
  assert.match(words, /Alert Construction takes its engineering from Alert Engineers/);
  assert.match(words, /Register your project/);
  assert.match(words, /Our team follows up/);
  assert.match(words, /Sign in whenever you like/);
  assert.match(words, /Track it and see your news/);
  assert.ok(html.includes(`href="${ENGINEERS_URL}"`) && words.includes("Visit Alert Engineers"));
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
});

test("site: Services lists every service with Request this Service and About, and the About text says what the service includes", async () => {
  const { html } = await page("/services");
  const words = text(html);
  assert.equal(SERVICES.length, 8);
  for (const service of SERVICES) {
    assert.ok(words.includes(service.title), service.title);
    assert.ok(html.includes(`id="${service.slug}"`), `${service.slug} can be linked to`);
    assert.ok(html.includes(`href="/?service=${encodeURIComponent(service.title)}#request"`), `${service.title}: Request this Service`);
    assert.ok(words.includes(service.about.slice(0, 40)), `${service.title}: About text is on the page`);
    for (const item of service.includes) assert.ok(words.includes(item.slice(0, 30)), `${service.title}: ${item}`);
  }
  assert.equal((html.match(/Request this Service/g) ?? []).length >= 8, true);
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length >= 8, true, "About starts closed and tells assistive technology so");
  for (const must of ["Kitchen Renovations", "Bathroom Renovations", "Home Renovations", "Home Extensions"]) assert.ok(words.includes(must), must);
  assert.match(words, /A request on this site is an enquiry only/, "no promise of scope or price");
});

test("site: Why Us speaks to the customer — what they get, in plain words — and answers the usual questions", async () => {
  const { html } = await page("/why-us");
  const words = text(html);
  assert.match(html, /<title>Why Alert Tradie Pro \| /);
  for (const phrase of ["One place for your whole project", "You always know what is happening", "Builder and engineer under one roof", "Written before it is built", "Your information stays yours", "Quality is checked, not assumed", "A real person to talk to", "Do I need to create an account?", "I lost my reference. What now?"]) assert.ok(words.includes(phrase), phrase);
  // written for the customer, not for the Owner: none of the Owner/manager tools are sold here
  for (const inside of ["Jarvis", "Owner dashboard", "payroll", "Team Code", "timesheet", "finance entries"]) assert.ok(!words.includes(inside), `${inside} is not customer-facing`);
});

test("site: Support has the email address and says the team replies as fast as it can; the address is only on this page", async () => {
  const { html } = await page("/support");
  const words = text(html);
  assert.equal(SUPPORT_EMAIL, "mamobiniali@gmail.com", "the address the Owner gave");
  assert.ok(words.includes(SUPPORT_EMAIL));
  assert.ok(html.includes(`href="mailto:${SUPPORT_EMAIL}?subject=`), "a ready-to-send email");
  assert.match(words, /Any problem or issue/);
  assert.match(words, /We reply as fast as we can/);
  assert.match(words, /never send a password or a payment-card number/);
  for (const path of ["/", "/about", "/services", "/why-us"]) assert.ok(!(await page(path)).html.includes(SUPPORT_EMAIL), `${path} does not show the support address`);
});

test("site: the home page keeps its sign-in windows and request form, uses the shared header, and no longer carries the old Support window", async () => {
  const { html } = await page("/");
  assert.match(html, /id="request"/);
  const about = html.match(/<a [^>]*service-about-link[^>]*>/g) ?? [];
  assert.equal(about.length, 8, "every service card on the home page has an About link");
  assert.ok(about.some((tag) => tag.includes('href="/services#kitchen-renovations"')));
  assert.match(html, /<nav class="company-bar"/);
  assert.ok(!html.includes('id="support"'));
  assert.ok(!html.includes("How the app works."));
  assert.ok(html.includes('href="/support"'));
});

test("site: the new pages send the same security headers as the rest of the site, can be indexed, and are not server errors for odd paths", async () => {
  for (const path of ["/about", "/services", "/why-us", "/support"]) {
    const { response, html } = await page(path);
    const csp = response.headers.get("content-security-policy") ?? "";
    assert.match(csp, /frame-ancestors 'none'|default-src 'self'/, path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
    assert.ok(!/noindex/i.test(html + (response.headers.get("x-robots-tag") ?? "")), `${path} may be indexed`);
  }
  for (const path of ["/about/", "/services?service=%3Cscript%3E", "/why-us?x=1", "/support#<b>"]) {
    const response = await get(path);
    assert.ok(response.status < 500, `${path} → ${response.status}`);
  }
  assert.equal((await get("/about/../../etc/passwd")).status < 500, true);
});
