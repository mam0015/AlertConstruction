import { b as require_react, t as require_jsx_runtime, u as useRouter, w as __toESM } from "../index.js";
import Link from "./link-DXveEjG3.js";
import { t as BrandLogo } from "./BrandLogo-D0AA1HMO.js";
import { t as admin_module_default } from "./admin.module-fjRXQ-q6.js";
//#region app/admin/AdminLogin.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function AdminLogin() {
	const router = useRouter();
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [teamCode, setTeamCode] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	async function submit(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const response = await fetch("/api/admin/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					password,
					teamCode
				})
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Sign-in failed.");
			router.push(result.redirect ?? "/admin");
			router.refresh();
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Sign-in failed.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: admin_module_default.loginShell,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: admin_module_default.loginFrame,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: admin_module_default.loginIntro,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
						kind: "tradie",
						tone: "dark",
						className: admin_module_default.loginLogo
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: admin_module_default.loginCopy,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: admin_module_default.eyebrow,
								children: "Management portal · Admin"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "The operational desk." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Move customer requests into delivery, coordinate the Site Supervisor and keep every project action visible." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: admin_module_default.loginScope,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "01" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Requests" }), "Review and qualify new work."] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "02" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Delivery" }), "Schedule site actions and follow-up."] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "03" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Communication" }), "Send clear direction to the team."] })] })
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: admin_module_default.loginForm,
				onSubmit: submit,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: admin_module_default.loginHeading,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "AD" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Staff access request" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Owner approval is required" })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Email address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "email",
						autoComplete: "username",
						value: email,
						onChange: (event) => setEmail(event.target.value),
						required: true
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Password" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "password",
						autoComplete: "current-password",
						value: password,
						onChange: (event) => setPassword(event.target.value),
						required: true
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Team Code" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "password",
						value: teamCode,
						onChange: (event) => setTeamCode(event.target.value),
						required: true
					})] }),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: admin_module_default.loginError,
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: admin_module_default.primaryButton,
						disabled: busy,
						children: [busy ? "Checking with Owner…" : "Check staff access", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "First-time access is sent to the Owner. Your workspace opens only after your role is approved." })
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			className: admin_module_default.backLink,
			href: "/",
			children: "← Return to public website"
		})]
	});
}
//#endregion
export { AdminLogin as default };
