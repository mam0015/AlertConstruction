import { b as require_react, t as require_jsx_runtime, u as useRouter, w as __toESM } from "../index.js";
import Link from "./link-DXveEjG3.js";
import { t as BrandLogo } from "./BrandLogo-D0AA1HMO.js";
import { t as owner_module_default } from "./owner.module-_-hgwW9O.js";
//#region app/owner/OwnerLogin.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function OwnerLogin() {
	const router = useRouter(), [email, setEmail] = (0, import_react.useState)(""), [password, setPassword] = (0, import_react.useState)(""), [error, setError] = (0, import_react.useState)(""), [busy, setBusy] = (0, import_react.useState)(false);
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		setError("");
		try {
			const r = await fetch("/api/owner/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					password
				})
			}), j = await r.json();
			if (!r.ok) throw new Error(j.error ?? "Sign-in failed.");
			router.refresh();
		} catch (x) {
			setError(x instanceof Error ? x.message : "Sign-in failed.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: owner_module_default.accessShell,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: owner_module_default.executiveLogin,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: owner_module_default.loginBrand,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
						kind: "tradie",
						tone: "dark",
						className: owner_module_default.accessLogo
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Private owner environment" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: owner_module_default.loginStatement,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: owner_module_default.eyebrow,
							children: "Executive access"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
							"Owner",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"Control Centre"
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "One protected view for projects, finance, people and decisions across Alert Tradie Pro." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: owner_module_default.loginSignals,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Private" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner-only financial data" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Live" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Persistent projects and records" })] })]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: owner_module_default.ownerLoginForm,
					onSubmit: submit,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: owner_module_default.loginFormHeading,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "AM" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Registered owner" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Email and password required" })] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "email",
							autoComplete: "username",
							value: email,
							onChange: (e) => setEmail(e.target.value),
							placeholder: "Enter your registered email",
							required: true
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Password" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "password",
							autoComplete: "current-password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							placeholder: "Enter your password",
							required: true
						})] }),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: owner_module_default.loginError,
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: owner_module_default.loginSubmit,
							type: "submit",
							disabled: busy,
							children: [busy ? "Checking access…" : "Enter Owner Control Centre", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Protected by encrypted password verification, rate limiting and a private session." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					className: owner_module_default.backToSite,
					href: "/",
					children: "← Return to public website"
				})
			]
		})
	});
}
//#endregion
export { OwnerLogin as default };
