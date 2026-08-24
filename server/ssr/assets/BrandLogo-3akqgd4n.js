import { t as require_jsx_runtime } from "../index.js";
//#region app/BrandLogo.tsx
var import_jsx_runtime = require_jsx_runtime();
var brandLogoDetails = {
	construction: {
		name: "Alert Construction",
		division: "CONSTRUCTION",
		mark: "/images/logo-alert-construction-mark.png"
	},
	engineers: {
		name: "Alert Engineers",
		division: "ENGINEERS",
		mark: "/images/logo-alert-engineers-mark.png"
	},
	tradie: {
		name: "Alert Tradie Pro",
		division: "TRADIE PRO",
		mark: "/images/logo-alert-tradie-pro-mark-v53.png"
	}
};
function BrandLogo({ kind, tone = "auto", className = "" }) {
	const brand = brandLogoDetails[kind];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: `brand-lockup brand-lockup-${kind} brand-lockup-${tone} ${className}`.trim(),
		role: "img",
		"aria-label": kind === "tradie" ? `${brand.name}, powered by Alert Construction` : brand.name,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "brand-lockup-mark",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: brand.mark,
				alt: ""
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "brand-lockup-copy",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "brand-lockup-alert",
				children: "ALERT"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "brand-lockup-division",
				children: brand.division
			})]
		})]
	});
}
//#endregion
export { BrandLogo as t };
