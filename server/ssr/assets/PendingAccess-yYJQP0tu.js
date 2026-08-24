import { b as require_react, t as require_jsx_runtime, w as __toESM } from "../index.js";
import Link from "./link-rFQpyoyn.js";
import { t as BrandLogo } from "./BrandLogo-3akqgd4n.js";
//#region app/team/team.module.css
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var team_module_default = {
	teamShell: "_teamShell_1ci5n_1",
	accessCard: "_accessCard_1ci5n_1",
	teamLogo: "_teamLogo_1ci5n_1",
	statusMark: "_statusMark_1ci5n_1",
	eyebrow: "_eyebrow_1ci5n_1",
	identityRow: "_identityRow_1ci5n_1",
	progressRow: "_progressRow_1ci5n_1",
	pulse: "_pulse_1ci5n_1"
};
//#endregion
//#region app/team/pending/PendingAccess.tsx
var import_jsx_runtime = require_jsx_runtime();
function PendingAccess({ email, preview = false }) {
	const [status, setStatus] = (0, import_react.useState)("Pending");
	(0, import_react.useEffect)(() => {
		if (preview) return;
		let active = true;
		async function check() {
			const result = await (await fetch("/api/staff/status", { cache: "no-store" })).json().catch(() => ({}));
			if (!active) return;
			if (result.status === "Approved" && result.redirect) window.location.href = result.redirect;
			else if (result.status === "Rejected") setStatus("Rejected");
		}
		check();
		const timer = window.setInterval(check, 5e3);
		return () => {
			active = false;
			window.clearInterval(timer);
		};
	}, [preview]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: team_module_default.teamShell,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: team_module_default.accessCard,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
					kind: "tradie",
					tone: "dark",
					className: team_module_default.teamLogo
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: team_module_default.statusMark,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: status === "Pending" ? "···" : "×" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: team_module_default.eyebrow,
					children: "Staff access control"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: status === "Pending" ? "Owner approval in progress." : "Access was not approved." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: status === "Pending" ? "Your secure access request was received. The Owner must assign your role and approve access before your workspace opens." : "The Owner has reviewed this request. Please contact the Owner if your role or details need to be corrected." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: team_module_default.identityRow,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Request email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: email })]
				}),
				status === "Pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: team_module_default.progressRow,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "This page checks automatically. You do not need to sign in again." })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					href: "/",
					children: "Return to public website"
				})
			]
		})
	});
}
//#endregion
export { PendingAccess as default };
