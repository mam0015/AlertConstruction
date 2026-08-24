import { b as require_react, t as require_jsx_runtime, w as __toESM } from "../index.js";
import { t as stageLabels } from "./types-CMO6RbMx.js";
//#region node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
	return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toPascalCase = (string) => {
	const camelCase = toCamelCase(string);
	return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
//#endregion
//#region node_modules/lucide-react/dist/esm/defaultAttributes.mjs
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var defaultAttributes = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round"
};
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var hasA11yProp = (props) => {
	for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
	return false;
};
//#endregion
//#region node_modules/lucide-react/dist/esm/context.mjs
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LucideContext = (0, import_react.createContext)({});
var useLucideContext = () => (0, import_react.useContext)(LucideContext);
//#endregion
//#region node_modules/lucide-react/dist/esm/Icon.mjs
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Icon = (0, import_react.forwardRef)(({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
	const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
	const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
	return (0, import_react.createElement)("svg", {
		ref,
		...defaultAttributes,
		width: size ?? contextSize ?? defaultAttributes.width,
		height: size ?? contextSize ?? defaultAttributes.height,
		stroke: color ?? contextColor,
		strokeWidth: calculatedStrokeWidth,
		className: mergeClasses("lucide", contextClass, className),
		...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
		...rest
	}, [...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
});
//#endregion
//#region node_modules/lucide-react/dist/esm/createLucideIcon.mjs
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var createLucideIcon = (iconName, iconNode) => {
	const Component = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_react.createElement)(Icon, {
		ref,
		iconNode,
		className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
		...props
	}));
	Component.displayName = toPascalCase(iconName);
	return Component;
};
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LayoutDashboard = createLucideIcon("layout-dashboard", [
	["rect", {
		width: "7",
		height: "9",
		x: "3",
		y: "3",
		rx: "1",
		key: "10lvy0"
	}],
	["rect", {
		width: "7",
		height: "5",
		x: "14",
		y: "3",
		rx: "1",
		key: "16une8"
	}],
	["rect", {
		width: "7",
		height: "9",
		x: "14",
		y: "12",
		rx: "1",
		key: "1hutg5"
	}],
	["rect", {
		width: "7",
		height: "5",
		x: "3",
		y: "16",
		rx: "1",
		key: "ldoo1y"
	}]
]);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Workflow = createLucideIcon("workflow", [
	["rect", {
		width: "8",
		height: "8",
		x: "3",
		y: "3",
		rx: "2",
		key: "by2w9f"
	}],
	["path", {
		d: "M7 11v4a2 2 0 0 0 2 2h4",
		key: "xkn7yn"
	}],
	["rect", {
		width: "8",
		height: "8",
		x: "13",
		y: "13",
		rx: "2",
		key: "1cgmvn"
	}]
]);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var TriangleAlert = createLucideIcon("triangle-alert", [
	["path", {
		d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
		key: "wmoenq"
	}],
	["path", {
		d: "M12 9v4",
		key: "juzpu7"
	}],
	["path", {
		d: "M12 17h.01",
		key: "p32p05"
	}]
]);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ArrowRight = createLucideIcon("arrow-right", [["path", {
	d: "M5 12h14",
	key: "1ays0h"
}], ["path", {
	d: "m12 5 7 7-7 7",
	key: "xquz4c"
}]]);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ListChecks = createLucideIcon("list-checks", [
	["path", {
		d: "M13 5h8",
		key: "a7qcls"
	}],
	["path", {
		d: "M13 12h8",
		key: "h98zly"
	}],
	["path", {
		d: "M13 19h8",
		key: "c3s6r1"
	}],
	["path", {
		d: "m3 17 2 2 4-4",
		key: "1jhpwq"
	}],
	["path", {
		d: "m3 7 2 2 4-4",
		key: "1obspn"
	}]
]);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var FolderKanban = createLucideIcon("folder-kanban", [
	["path", {
		d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z",
		key: "1fr9dc"
	}],
	["path", {
		d: "M8 10v4",
		key: "tgpxqk"
	}],
	["path", {
		d: "M12 10v2",
		key: "hh53o1"
	}],
	["path", {
		d: "M16 10v6",
		key: "1d6xys"
	}]
]);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var CalendarDays = createLucideIcon("calendar-days", [
	["path", {
		d: "M8 2v3",
		key: "1ioesn"
	}],
	["path", {
		d: "M16 2v3",
		key: "otl347"
	}],
	["rect", {
		x: "3",
		y: "3",
		width: "18",
		height: "18",
		rx: "2",
		key: "h1oib"
	}],
	["path", {
		d: "M3 9h18",
		key: "1pudct"
	}],
	["path", {
		d: "M8 13h.01",
		key: "1sbv64"
	}],
	["path", {
		d: "M12 13h.01",
		key: "y0uutt"
	}],
	["path", {
		d: "M16 13h.01",
		key: "wip0gl"
	}],
	["path", {
		d: "M8 17h.01",
		key: "p3bg7i"
	}],
	["path", {
		d: "M12 17h.01",
		key: "p32p05"
	}],
	["path", {
		d: "M16 17h.01",
		key: "ql8jdd"
	}]
]);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var MessageSquare = createLucideIcon("message-square", [["path", {
	d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
	key: "18887p"
}]]);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Briefcase = createLucideIcon("briefcase", [["path", {
	d: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
	key: "jecpp"
}], ["rect", {
	width: "20",
	height: "14",
	x: "2",
	y: "6",
	rx: "2",
	key: "i6l2r4"
}]]);
var workflow_module_default = {
	workflowShell: "_workflowShell_142l7_1",
	workflowHeader: "_workflowHeader_142l7_1",
	actionPanel: "_actionPanel_142l7_1",
	filesPanel: "_filesPanel_142l7_1",
	activityPanel: "_activityPanel_142l7_1",
	caseList: "_caseList_142l7_1",
	roleBadge: "_roleBadge_142l7_1",
	summaryStrip: "_summaryStrip_142l7_1",
	workspaceGrid: "_workspaceGrid_142l7_1",
	caseWorkspace: "_caseWorkspace_142l7_1",
	lowerGrid: "_lowerGrid_142l7_1",
	selectedCase: "_selectedCase_142l7_1",
	stageDot: "_stageDot_142l7_1",
	caseHero: "_caseHero_142l7_1",
	journey: "_journey_142l7_1",
	done: "_done_142l7_1",
	current: "_current_142l7_1",
	twoFields: "_twoFields_142l7_1",
	reviewBox: "_reviewBox_142l7_1",
	updateApproval: "_updateApproval_142l7_1",
	waiting: "_waiting_142l7_1",
	uploadBox: "_uploadBox_142l7_1",
	empty: "_empty_142l7_1",
	notice: "_notice_142l7_1",
	error: "_error_142l7_1",
	dangerButton: "_dangerButton_142l7_1",
	loading: "_loading_142l7_2",
	spin: "_spin_142l7_1"
};
//#endregion
//#region app/workflow/WorkflowBoard.tsx
var import_jsx_runtime = require_jsx_runtime();
var empty$2 = {
	cases: [],
	events: [],
	supervisors: [],
	role: "admin"
};
var journey = [
	"request_submitted",
	"admin_review",
	"customer_contacted",
	"site_visit_scheduled",
	"site_visit_submitted",
	"site_visit_approved",
	"estimate_ready",
	"estimate_sent",
	"customer_approved",
	"active_project",
	"quality_inspection",
	"completion_ready",
	"complete"
];
var today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(/* @__PURE__ */ new Date());
function when(value) {
	if (!value) return "Not set";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(date);
}
function currentJourneyIndex(stage) {
	if (stage === "visit_changes_requested") return 4;
	if (stage === "estimate_declined") return 7;
	if (stage === "complete") return journey.length - 1;
	if (stage === "closed") return 0;
	return journey.indexOf(stage);
}
function WorkflowBoard({ role }) {
	const [data, setData] = (0, import_react.useState)({
		...empty$2,
		role
	});
	const [selectedId, setSelectedId] = (0, import_react.useState)(0);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [working, setWorking] = (0, import_react.useState)(false);
	const [notice, setNotice] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [contactNote, setContactNote] = (0, import_react.useState)("");
	const [reviewNote, setReviewNote] = (0, import_react.useState)("");
	const [visitAt, setVisitAt] = (0, import_react.useState)("");
	const [supervisorEmail, setSupervisorEmail] = (0, import_react.useState)("");
	const [visitForm, setVisitForm] = (0, import_react.useState)({
		visitDate: today(),
		summary: "",
		findings: "",
		recommendations: "",
		internalNotes: ""
	});
	const [estimateForm, setEstimateForm] = (0, import_react.useState)({
		amount: "",
		scope: "",
		terms: "Final price and variations are governed by the signed contract and applicable Victorian law."
	});
	const [updateForm, setUpdateForm] = (0, import_react.useState)({
		workDate: today(),
		internalUpdate: "",
		customerUpdate: ""
	});
	const [qualityForm, setQualityForm] = (0, import_react.useState)({
		inspectedAt: today(),
		summary: "",
		defects: ""
	});
	const [sitePhotoIds, setSitePhotoIds] = (0, import_react.useState)([]);
	const [progressPhotoIds, setProgressPhotoIds] = (0, import_react.useState)([]);
	const [closeNote, setCloseNote] = (0, import_react.useState)("");
	async function load() {
		setLoading(true);
		setError("");
		try {
			const response = await fetch(`/api/workflow?previewRole=${role}`, { cache: "no-store" });
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "Project workflow could not be loaded.");
			setData(result.data);
			setSelectedId((current) => result.data.cases.some((item) => item.id === current) ? current : result.data.cases[0]?.id ?? 0);
			if (result.data.supervisors[0]) setSupervisorEmail((current) => current || result.data.supervisors[0].email);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Project workflow could not be loaded.");
		} finally {
			setLoading(false);
		}
	}
	(0, import_react.useEffect)(() => {
		let active = true;
		fetch(`/api/workflow?previewRole=${role}`, { cache: "no-store" }).then(async (response) => ({
			response,
			result: await response.json()
		})).then(({ response, result }) => {
			if (!response.ok || !result.data) throw new Error(result.error ?? "Project workflow could not be loaded.");
			if (!active) return;
			setData(result.data);
			setSelectedId(result.data.cases[0]?.id ?? 0);
			if (result.data.supervisors[0]) setSupervisorEmail(result.data.supervisors[0].email);
		}).catch((reason) => {
			if (active) setError(reason instanceof Error ? reason.message : "Project workflow could not be loaded.");
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => {
			active = false;
		};
	}, [role]);
	const selected = (0, import_react.useMemo)(() => data.cases.find((item) => item.id === selectedId) ?? data.cases[0] ?? null, [data.cases, selectedId]);
	const selectedEvents = (0, import_react.useMemo)(() => data.events.filter((item) => item.caseId === selected?.id), [data.events, selected]);
	const queue = role === "owner" ? data.cases.flatMap((item) => item.updates.filter((update) => update.status === "pending_owner")) : role === "admin" ? data.cases.filter((item) => [
		"request_submitted",
		"site_visit_submitted",
		"customer_approved"
	].includes(item.stage)).concat(data.cases.filter((item) => item.updates.some((update) => update.status === "pending_admin"))) : data.cases;
	async function action(name, payload = {}, success = "Workflow updated.") {
		if (!selected) return;
		setWorking(true);
		setError("");
		try {
			const response = await fetch(`/api/workflow?previewRole=${role}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: name,
					caseId: selected.id,
					payload
				})
			});
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "The action could not be completed.");
			setData(result.data);
			setNotice(success);
			window.setTimeout(() => setNotice(""), 3600);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "The action could not be completed.");
		} finally {
			setWorking(false);
		}
	}
	async function upload(category, file) {
		if (!selected || !file) return;
		setWorking(true);
		setError("");
		try {
			const form = new FormData();
			form.set("caseId", String(selected.id));
			form.set("category", category);
			form.set("file", file);
			const response = await fetch(`/api/workflow/files?previewRole=${role}`, {
				method: "POST",
				body: form
			});
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "Upload failed.");
			if (category === "site_visit") setSitePhotoIds((ids) => [...ids, result.data.id]);
			else if (category === "progress" || category === "quality") setProgressPhotoIds((ids) => [...ids, result.data.id]);
			setNotice(`${result.data.fileName} added to ${selected.projectCode || selected.requestCode}.`);
			await load();
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Upload failed.");
		} finally {
			setWorking(false);
		}
	}
	const selectedSupervisor = data.supervisors.find((item) => item.email === supervisorEmail) ?? data.supervisors[0];
	const progress = selected ? Math.max(0, currentJourneyIndex(selected.stage)) : 0;
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: workflow_module_default.loading,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Opening the live project workflow…"]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: workflow_module_default.workflowShell,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: workflow_module_default.workflowHeader,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "REQUEST → SITE VISIT → ESTIMATE → DELIVERY → QUALITY → COMPLETE" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Project workflow control" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Every hand-off is recorded. Customer updates stay private until Admin and Owner approve them." })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: workflow_module_default.roleBadge,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
						role === "supervisor" ? "Site Supervisor" : role[0].toUpperCase() + role.slice(1),
						" workspace"
					]
				})]
			}),
			(notice || error) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `${workflow_module_default.notice} ${error ? workflow_module_default.error : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: error ? "Action stopped" : "Saved" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error || notice }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							setError("");
							setNotice("");
						},
						children: "×"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: workflow_module_default.summaryStrip,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Workflow cases" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.cases.length }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Visible to this role" })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Action queue" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: queue.length }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Waiting for your role" })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Customer updates" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.cases.flatMap((item) => item.updates).filter((item) => item.status === "published").length }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Approved and published" })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner audit events" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.events.length }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Complete activity record" })
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: workflow_module_default.workspaceGrid,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: workflow_module_default.caseList,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project pipeline" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [data.cases.length, " records"] })] }), data.cases.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: selected?.id === item.id ? workflow_module_default.selectedCase : "",
						onClick: () => setSelectedId(item.id),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: workflow_module_default.stageDot }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.projectCode || item.requestCode }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.service }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									item.suburb,
									" · ",
									stageLabels[item.stage]
								] })
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "→" })
						]
					}, item.id))]
				}), selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: workflow_module_default.caseWorkspace,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: workflow_module_default.caseHero,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: selected.requestCode }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: selected.service }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.description })
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Customer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: selected.customerName })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: selected.projectCode || "Created after Admin approval" })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Current stage" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: stageLabels[selected.stage] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Site Supervisor" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: selected.assignedSupervisorName || "Not assigned" })] })
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
							className: workflow_module_default.journey,
							"aria-label": "Project workflow stages",
							children: journey.map((stage, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: index < progress ? workflow_module_default.done : index === progress ? workflow_module_default.current : "",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: index < progress ? "✓" : index + 1 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: stageLabels[stage] })]
							}, stage))
						}),
						role === "admin" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: workflow_module_default.actionPanel,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ADMIN CONTROL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Move this request to the next safe stage" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: stageLabels[selected.stage] })] }),
								selected.stage === "request_submitted" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									disabled: working,
									onClick: () => void action("review_started", {}, "Request moved into Admin review."),
									children: ["Start Admin review ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
								}),
								["request_submitted", "admin_review"].includes(selected.stage) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: (event) => {
										event.preventDefault();
										action("customer_contacted", { note: contactNote }, "Customer contact recorded.");
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Customer contact note" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: contactNote,
										onChange: (event) => setContactNote(event.target.value),
										placeholder: "Record the call, email or information requested…",
										required: true
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										disabled: working,
										children: "Save contact & continue"
									})]
								}),
								["admin_review", "customer_contacted"].includes(selected.stage) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									disabled: working,
									onClick: () => void action("approve_intake", {}, "Project folder created and ready for Site Visit assignment."),
									children: ["Approve intake & create project folder ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
								}),
								[
									"site_visit_ready",
									"site_visit_scheduled",
									"visit_changes_requested"
								].includes(selected.stage) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: (event) => {
										event.preventDefault();
										action("assign_visit", {
											supervisorEmail: selectedSupervisor?.email,
											supervisorName: selectedSupervisor?.name,
											visitAt
										}, "Site Visit assigned to the Site Supervisor.");
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: workflow_module_default.twoFields,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Site Supervisor" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											value: supervisorEmail,
											onChange: (event) => setSupervisorEmail(event.target.value),
											children: data.supervisors.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
												value: item.email,
												children: [
													item.name,
													" · ",
													item.email
												]
											}, item.email))
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Visit date & time" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "datetime-local",
											value: visitAt,
											onChange: (event) => setVisitAt(event.target.value),
											required: true
										})] })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										disabled: working,
										children: "Assign Site Visit"
									})]
								}),
								selected.stage === "site_visit_submitted" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: workflow_module_default.reviewBox,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selected.visitReport?.summary }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.visitReport?.findings }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: selected.visitReport?.recommendations })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Admin review note" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: reviewNote,
											onChange: (event) => setReviewNote(event.target.value)
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											onClick: () => void action("review_site_visit", {
												decision: "changes_requested",
												note: reviewNote
											}, "Site Visit returned to the Site Supervisor."),
											children: "Request changes"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											onClick: () => void action("review_site_visit", {
												decision: "approved",
												note: reviewNote
											}, "Site Visit approved. Estimate can now be prepared."),
											children: "Approve Site Visit"
										})] })
									]
								}),
								["site_visit_approved", "estimate_ready"].includes(selected.stage) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: (event) => {
										event.preventDefault();
										action("save_estimate", estimateForm, "Estimate saved internally.");
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: workflow_module_default.twoFields,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Estimate total (AUD)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												min: "1",
												value: estimateForm.amount,
												onChange: (event) => setEstimateForm((form) => ({
													...form,
													amount: event.target.value
												})),
												required: true
											})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Terms" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: estimateForm.terms,
												onChange: (event) => setEstimateForm((form) => ({
													...form,
													terms: event.target.value
												}))
											})] })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Scope included" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: estimateForm.scope,
											onChange: (event) => setEstimateForm((form) => ({
												...form,
												scope: event.target.value
											})),
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											children: "Save estimate"
										})
									]
								}),
								selected.stage === "estimate_ready" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									disabled: working,
									onClick: () => void action("send_estimate", {}, "Estimate sent to the Customer portal."),
									children: ["Send estimate to Customer ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
								}),
								selected.stage === "estimate_sent" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: workflow_module_default.waiting,
									children: "Waiting for the Customer to accept or decline the estimate in their portal."
								}),
								selected.stage === "customer_approved" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									disabled: working,
									onClick: () => void action("activate_project", {}, "Customer-approved work is now an active project."),
									children: ["Confirm approval & activate project ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
								}),
								selected.stage === "quality_inspection" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: workflow_module_default.reviewBox,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selected.qualityInspection?.summary }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.qualityInspection?.defects || "No defects recorded by the Site Supervisor." })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Admin quality note" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: reviewNote,
											onChange: (event) => setReviewNote(event.target.value)
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											onClick: () => void action("review_quality_inspection", {
												decision: "changes_requested",
												note: reviewNote
											}, "Rectification returned to the Site Supervisor."),
											children: "Request rectification"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											onClick: () => void action("review_quality_inspection", {
												decision: "approved",
												note: reviewNote
											}, "Quality inspection approved for Owner completion."),
											children: "Approve quality inspection"
										})] })
									]
								}),
								selected.updates.filter((update) => update.status === "pending_admin").map((update) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: workflow_module_default.updateApproval,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Customer update waiting for Admin" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: update.customerUpdate }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Internal: ", update.internalUpdate] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => void action("reject_update", {
												updateId: update.id,
												note: reviewNote || "Please revise the customer update."
											}, "Update returned to Site Supervisor."),
											children: "Return"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => void action("admin_approve_update", {
												updateId: update.id,
												note: reviewNote
											}, "Admin approved the update. Owner approval is next."),
											children: "Approve for Owner"
										})] })
									]
								}, update.id))
							]
						}),
						role === "supervisor" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: workflow_module_default.actionPanel,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SITE SUPERVISOR WORKSPACE" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Site evidence and two-level reporting" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: stageLabels[selected.stage] })] }),
								["site_visit_scheduled", "visit_changes_requested"].includes(selected.stage) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: (event) => {
										event.preventDefault();
										action("submit_site_visit", {
											...visitForm,
											fileIds: sitePhotoIds
										}, "Site Visit report submitted to Admin.");
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: workflow_module_default.uploadBox,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "file",
													accept: "image/*",
													onChange: (event) => void upload("site_visit", event.target.files?.[0])
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Upload mandatory Site Visit photos" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [sitePhotoIds.length, " photo(s) ready for this report"] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: workflow_module_default.twoFields,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Visit date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "date",
												value: visitForm.visitDate,
												onChange: (event) => setVisitForm((form) => ({
													...form,
													visitDate: event.target.value
												})),
												required: true
											})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Visit summary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: visitForm.summary,
												onChange: (event) => setVisitForm((form) => ({
													...form,
													summary: event.target.value
												})),
												required: true
											})] })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Important findings" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: visitForm.findings,
											onChange: (event) => setVisitForm((form) => ({
												...form,
												findings: event.target.value
											})),
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Recommendations to Admin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: visitForm.recommendations,
											onChange: (event) => setVisitForm((form) => ({
												...form,
												recommendations: event.target.value
											})),
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Internal notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: visitForm.internalNotes,
											onChange: (event) => setVisitForm((form) => ({
												...form,
												internalNotes: event.target.value
											}))
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											children: "Submit Site Visit to Admin"
										})
									]
								}),
								selected.stage === "active_project" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: (event) => {
										event.preventDefault();
										action("submit_progress_update", {
											...updateForm,
											fileIds: progressPhotoIds
										}, "Internal and customer updates sent for approval.");
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: workflow_module_default.uploadBox,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "file",
													accept: "image/*",
													onChange: (event) => void upload("progress", event.target.files?.[0])
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Upload today's mandatory progress photos" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [progressPhotoIds.length, " photo(s) ready"] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Work date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "date",
											value: updateForm.workDate,
											onChange: (event) => setUpdateForm((form) => ({
												...form,
												workDate: event.target.value
											})),
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Internal team update · Owner, Admin and Manager only" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: updateForm.internalUpdate,
											onChange: (event) => setUpdateForm((form) => ({
												...form,
												internalUpdate: event.target.value
											})),
											placeholder: "Work completed, issues, delays, safety, trade coordination and tomorrow's needs…",
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Customer update · hidden until Admin + Owner approval" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: updateForm.customerUpdate,
											onChange: (event) => setUpdateForm((form) => ({
												...form,
												customerUpdate: event.target.value
											})),
											placeholder: "Clear customer-safe progress update without internal notes or pricing…",
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											children: "Submit both updates for approval"
										})
									]
								}),
								selected.stage === "active_project" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: (event) => {
										event.preventDefault();
										action("submit_quality_inspection", {
											...qualityForm,
											fileIds: progressPhotoIds
										}, "Quality inspection sent to Admin.");
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: workflow_module_default.uploadBox,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "file",
													accept: "image/*",
													onChange: (event) => void upload("quality", event.target.files?.[0])
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Upload completion and quality evidence" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [progressPhotoIds.length, " photo(s) ready"] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Inspection date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "date",
											value: qualityForm.inspectedAt,
											onChange: (event) => setQualityForm((form) => ({
												...form,
												inspectedAt: event.target.value
											})),
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Quality inspection summary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: qualityForm.summary,
											onChange: (event) => setQualityForm((form) => ({
												...form,
												summary: event.target.value
											})),
											placeholder: "Work inspected, tests completed and handover readiness…",
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Defects or rectification items" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: qualityForm.defects,
											onChange: (event) => setQualityForm((form) => ({
												...form,
												defects: event.target.value
											})),
											placeholder: "Leave blank only when no defects were identified."
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											children: "Submit quality inspection"
										})
									]
								}),
								[
									"site_visit_submitted",
									"site_visit_approved",
									"estimate_ready",
									"estimate_sent",
									"customer_approved"
								].includes(selected.stage) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: workflow_module_default.waiting,
									children: "Your Site Visit is complete. Admin is handling the estimate and Customer approval stages."
								})
							]
						}),
						role === "owner" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: workflow_module_default.actionPanel,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OWNER AUTHORITY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Publication and complete oversight" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [data.events.length, " recorded events"] })] }),
								selected.updates.filter((update) => update.status === "pending_owner").map((update) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: workflow_module_default.updateApproval,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Admin approved · Owner decision required" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: update.customerUpdate }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Internal: ", update.internalUpdate] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => void action("reject_update", {
												updateId: update.id,
												note: reviewNote || "Please revise before publication."
											}, "Update returned for changes."),
											children: "Return"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => void action("owner_approve_update", {
												updateId: update.id,
												note: reviewNote
											}, "Update published to the Customer portal."),
											children: "Approve & publish"
										})] })
									]
								}, update.id)),
								!selected.updates.some((update) => update.status === "pending_owner") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: workflow_module_default.waiting,
									children: "No customer update is waiting for Owner approval on this project."
								}),
								selected.stage === "completion_ready" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: workflow_module_default.reviewBox,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Quality inspection approved by Admin" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.qualityInspection?.summary }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: selected.qualityInspection?.defects || "No outstanding defects recorded." })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner completion note" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: reviewNote,
											onChange: (event) => setReviewNote(event.target.value)
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											onClick: () => void action("complete_project", { note: reviewNote }, "Project completed and customer status updated."),
											children: "Owner approve & complete project"
										}) })
									]
								})
							]
						}),
						(role === "admin" || role === "owner") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: workflow_module_default.actionPanel,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PROJECT FOLDER · ADMIN & OWNER ONLY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Add documents & close requests" })] }) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: workflow_module_default.uploadBox,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "file",
											accept: "image/*,application/pdf",
											onChange: (event) => void upload("document", event.target.files?.[0])
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Add a photo or PDF to this project's folder" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Invoices, quotes, extra photos — stored internally, never shown to the customer" })
									]
								}),
								!["complete", "closed"].includes(selected.stage) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: (event) => {
										event.preventDefault();
										if (window.confirm("Close this request? It will leave the active pipeline and the customer will see it as closed. No records are deleted.")) action("close_case", { note: closeNote }, "Request closed.");
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reason for closing" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: closeNote,
										onChange: (event) => setCloseNote(event.target.value),
										placeholder: "e.g. duplicate submission, customer withdrew, test entry…",
										required: true
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: workflow_module_default.dangerButton,
										disabled: working,
										children: "Close this request"
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: workflow_module_default.waiting,
									children: selected.stage === "closed" ? "This request is closed." : "This project is complete."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: workflow_module_default.lowerGrid,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: workflow_module_default.filesPanel,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PROJECT EVIDENCE" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [selected.files.length, " files"] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: selected.files.length ? selected.files.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: file.url,
									target: "_blank",
									rel: "noreferrer",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: file.mimeType.startsWith("image/") ? "PHOTO" : "FILE" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: file.fileName }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
											file.category.replace("_", " "),
											" · ",
											file.visibility
										] })
									]
								}, file.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No photos uploaded yet." }) })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: workflow_module_default.activityPanel,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OWNER ACTIVITY FEED" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Everything recorded" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { children: selectedEvents.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.detail }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
										item.actorRole,
										" · ",
										when(item.createdAt)
									] })
								] })] }, item.id)) })]
							})]
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: workflow_module_default.empty,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No project workflow is assigned to this role." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Admin can assign a Site Visit after the project folder is created." })]
				})]
			})
		]
	});
}
var operations_module_default = {
	loading: "_loading_j9k92_1",
	spin: "_spin_j9k92_1",
	notice: "_notice_j9k92_2",
	error: "_error_j9k92_2",
	alertShell: "_alertShell_j9k92_3",
	statusShell: "_statusShell_j9k92_3",
	issueForm: "_issueForm_j9k92_3",
	issueRegister: "_issueRegister_j9k92_3",
	followForm: "_followForm_j9k92_3",
	clockForm: "_clockForm_j9k92_3",
	followRegister: "_followRegister_j9k92_3",
	alertCount: "_alertCount_j9k92_3",
	clearCount: "_clearCount_j9k92_3",
	alertList: "_alertList_j9k92_3",
	severityCritical: "_severityCritical_j9k92_3",
	severityHigh: "_severityHigh_j9k92_3",
	severityNormal: "_severityNormal_j9k92_3",
	clearState: "_clearState_j9k92_3",
	empty: "_empty_j9k92_3",
	statusGrid: "_statusGrid_j9k92_4",
	atRisk: "_atRisk_j9k92_4",
	onTrack: "_onTrack_j9k92_4",
	issueWorkspace: "_issueWorkspace_j9k92_5",
	followWorkspace: "_followWorkspace_j9k92_5",
	formGrid: "_formGrid_j9k92_5",
	actionBox: "_actionBox_j9k92_5",
	ownerBox: "_ownerBox_j9k92_5",
	wide: "_wide_j9k92_5",
	issueCards: "_issueCards_j9k92_5",
	resolved: "_resolved_j9k92_5",
	issueTop: "_issueTop_j9k92_5",
	managementDirection: "_managementDirection_j9k92_5",
	ownerDirection: "_ownerDirection_j9k92_5",
	followMetrics: "_followMetrics_j9k92_6",
	followGrid: "_followGrid_j9k92_6",
	tomorrow: "_tomorrow_j9k92_6",
	followComplete: "_followComplete_j9k92_6"
};
//#endregion
//#region app/operations/OperationsControlPanel.tsx
var empty = {
	viewer: {
		email: "",
		role: "Admin",
		name: ""
	},
	today: "",
	tomorrow: "",
	projects: [],
	issues: [],
	followUps: [],
	metrics: {
		openIssues: 0,
		criticalIssues: 0,
		dueToday: 0,
		overdue: 0
	}
};
var trades = [
	"Electrician",
	"Plumber",
	"Carpenter",
	"Tiler",
	"Plasterer",
	"Engineer",
	"Supplier",
	"Site access",
	"Weather",
	"Other"
];
var issueTypes = [
	"Trade delay",
	"Material delay",
	"Drawing / design issue",
	"Site access",
	"Safety issue",
	"Quality issue",
	"Weather delay",
	"Other problem"
];
var staticStorageKey = "alert-tradie-pro-operations-static-v1";
function localDate(offset = 0) {
	const date = /* @__PURE__ */ new Date();
	date.setDate(date.getDate() + offset);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function staticSnapshot(role) {
	const identity = role === "owner" ? {
		email: "owner.preview@example.invalid",
		role: "Owner",
		name: "Owner Preview"
	} : role === "admin" ? {
		email: "admin@alerttradiepro.demo",
		role: "Admin",
		name: "Admin 01"
	} : {
		email: "site.supervisor@alerttradiepro.demo",
		role: "Site Supervisor",
		name: "Site Supervisor 01"
	};
	const stored = typeof window !== "undefined" ? window.localStorage.getItem(staticStorageKey) : null;
	const shared = stored ? JSON.parse(stored) : {
		issues: [{
			id: 501,
			caseId: 124,
			projectCode: "ATP-2026-00124",
			projectName: "Glen Waverley renovation",
			siteLocation: "41 Orchard Street, Glen Waverley",
			affectedTrade: "Electrician",
			issueType: "Trade delay",
			severity: "High",
			summary: "Electrician cannot attend the confirmed rough-in",
			details: "The electrician advised that the current booking cannot be met and a replacement date is required.",
			impact: "Wall lining cannot start until the electrical rough-in is completed.",
			contactedPerson: "Electrical contractor",
			contactedAt: (/* @__PURE__ */ new Date()).toISOString(),
			expectedDate: localDate(2),
			reporterEmail: "site.supervisor@alerttradiepro.demo",
			reporterName: "Site Supervisor 01",
			status: "reported",
			adminAction: "",
			rescheduledDate: "",
			rescheduledTime: "",
			rescheduledAssignee: "",
			adminEmail: "",
			adminReviewedAt: "",
			ownerNote: "",
			reportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			resolvedAt: ""
		}],
		followUps: [{
			id: 601,
			personEmail: identity.email,
			personRole: identity.role,
			personName: identity.name,
			projectCode: "ATP-2026-00124",
			title: "Confirm electrician replacement booking",
			details: "Check the revised attendance time and update the Site Supervisor.",
			targetDate: localDate(1),
			source: "clock_out",
			status: "open",
			createdByEmail: identity.email,
			createdByRole: identity.role,
			workDate: localDate(),
			clockedOutAt: (/* @__PURE__ */ new Date()).toISOString(),
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			completedAt: ""
		}]
	};
	const issues = role === "supervisor" ? shared.issues.filter((issue) => issue.reporterEmail === identity.email) : shared.issues;
	const followUps = role === "supervisor" ? shared.followUps.filter((item) => item.personEmail === identity.email) : shared.followUps;
	const today = localDate();
	return {
		viewer: identity,
		today,
		tomorrow: localDate(1),
		projects: [{
			caseId: 124,
			projectCode: "ATP-2026-00124",
			projectName: "Glen Waverley renovation",
			siteLocation: "41 Orchard Street, Glen Waverley"
		}],
		issues,
		followUps,
		metrics: {
			openIssues: issues.filter((item) => item.status !== "resolved").length,
			criticalIssues: issues.filter((item) => item.status !== "resolved" && item.severity === "Critical").length,
			dueToday: followUps.filter((item) => item.status === "open" && item.targetDate === today).length,
			overdue: followUps.filter((item) => item.status === "open" && item.targetDate < today).length
		}
	};
}
function readable(value, withTime = false) {
	if (!value) return "Not set";
	const date = new Date(value.length === 10 ? `${value}T12:00:00+10:00` : value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("en-AU", withTime ? {
		day: "numeric",
		month: "short",
		hour: "numeric",
		minute: "2-digit"
	} : {
		day: "numeric",
		month: "short",
		year: "numeric"
	}).format(date);
}
function statusLabel(value) {
	return value.replaceAll("_", " ");
}
function OperationsControlPanel({ role, mode, preview = false, staticMode = false }) {
	const [data, setData] = (0, import_react.useState)(empty);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [working, setWorking] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [notice, setNotice] = (0, import_react.useState)("");
	const [issueProject, setIssueProject] = (0, import_react.useState)(0);
	const [issueLocation, setIssueLocation] = (0, import_react.useState)("");
	const [affectedTrade, setAffectedTrade] = (0, import_react.useState)("Electrician");
	const [issueType, setIssueType] = (0, import_react.useState)("Trade delay");
	const [severity, setSeverity] = (0, import_react.useState)("High");
	const [summary, setSummary] = (0, import_react.useState)("");
	const [details, setDetails] = (0, import_react.useState)("");
	const [impact, setImpact] = (0, import_react.useState)("");
	const [contactedPerson, setContactedPerson] = (0, import_react.useState)("");
	const [contactedAt, setContactedAt] = (0, import_react.useState)("");
	const [expectedDate, setExpectedDate] = (0, import_react.useState)("");
	const [issueDrafts, setIssueDrafts] = (0, import_react.useState)({});
	const [followProject, setFollowProject] = (0, import_react.useState)("Business / General");
	const [followTitle, setFollowTitle] = (0, import_react.useState)("");
	const [followDetails, setFollowDetails] = (0, import_react.useState)("");
	const [followDate, setFollowDate] = (0, import_react.useState)("");
	const [clockProject, setClockProject] = (0, import_react.useState)("Business / General");
	const [clockTitle, setClockTitle] = (0, import_react.useState)("");
	const [clockDetails, setClockDetails] = (0, import_react.useState)("");
	const query = preview ? `?previewRole=${role}` : "";
	async function load() {
		setLoading(true);
		setError("");
		try {
			if (staticMode) {
				const snapshot = staticSnapshot(role);
				setData(snapshot);
				setFollowDate((current) => current || snapshot.tomorrow);
				setIssueProject(snapshot.projects[0]?.caseId ?? 0);
				setIssueLocation(snapshot.projects[0]?.siteLocation ?? "");
				return;
			}
			const response = await fetch(`/api/operations${query}`, { cache: "no-store" });
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "Operations alerts could not be loaded.");
			const liveData = result.data;
			setData(liveData);
			setFollowDate((current) => current || liveData.tomorrow);
			if (!issueProject && liveData.projects[0]) {
				setIssueProject(liveData.projects[0].caseId);
				setIssueLocation(liveData.projects[0].siteLocation);
			}
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Operations alerts could not be loaded.");
		} finally {
			setLoading(false);
		}
	}
	(0, import_react.useEffect)(() => {
		queueMicrotask(() => void load());
	}, [query, staticMode]);
	const openIssues = (0, import_react.useMemo)(() => data.issues.filter((issue) => issue.status !== "resolved"), [data.issues]);
	const followUps = (0, import_react.useMemo)(() => data.followUps.filter((item) => item.status !== "cancelled"), [data.followUps]);
	async function action(name, payload, success) {
		setWorking(true);
		setError("");
		try {
			if (staticMode) {
				setData((current) => {
					const now = (/* @__PURE__ */ new Date()).toISOString();
					let issues = [...current.issues];
					let followUps = [...current.followUps];
					const issueId = Number(payload.issueId);
					if (name === "create_issue") issues = [{
						id: Date.now(),
						caseId: Number(payload.caseId),
						projectCode: current.projects.find((item) => item.caseId === Number(payload.caseId))?.projectCode ?? "ATP PROJECT",
						projectName: current.projects.find((item) => item.caseId === Number(payload.caseId))?.projectName ?? "Assigned project",
						siteLocation: String(payload.siteLocation),
						affectedTrade: String(payload.affectedTrade),
						issueType: String(payload.issueType),
						severity: String(payload.severity),
						summary: String(payload.summary),
						details: String(payload.details),
						impact: String(payload.impact),
						contactedPerson: String(payload.contactedPerson),
						contactedAt: String(payload.contactedAt),
						expectedDate: String(payload.expectedDate),
						reporterEmail: current.viewer.email,
						reporterName: current.viewer.name,
						status: "reported",
						adminAction: "",
						rescheduledDate: "",
						rescheduledTime: "",
						rescheduledAssignee: "",
						adminEmail: "",
						adminReviewedAt: "",
						ownerNote: "",
						reportedAt: now,
						updatedAt: now,
						resolvedAt: ""
					}, ...issues];
					if (name === "review_issue") issues = issues.map((item) => item.id === issueId ? {
						...item,
						status: "under_review",
						adminAction: String(payload.adminAction),
						adminEmail: current.viewer.email,
						adminReviewedAt: now,
						updatedAt: now
					} : item);
					if (name === "reschedule_issue") {
						const issue = issues.find((item) => item.id === issueId);
						issues = issues.map((item) => item.id === issueId ? {
							...item,
							status: "rescheduled",
							adminAction: String(payload.adminAction),
							rescheduledDate: String(payload.rescheduledDate),
							rescheduledTime: String(payload.rescheduledTime),
							rescheduledAssignee: String(payload.rescheduledAssignee),
							adminEmail: current.viewer.email,
							adminReviewedAt: now,
							updatedAt: now
						} : item);
						if (issue) followUps = [{
							id: Date.now() + 1,
							personEmail: issue.reporterEmail,
							personRole: "Site Supervisor",
							personName: issue.reporterName,
							projectCode: issue.projectCode,
							title: `Follow up ${issue.affectedTrade} delay`,
							details: String(payload.adminAction),
							targetDate: String(payload.rescheduledDate),
							source: "site_issue",
							status: "open",
							createdByEmail: current.viewer.email,
							createdByRole: current.viewer.role,
							workDate: current.today,
							clockedOutAt: "",
							createdAt: now,
							updatedAt: now,
							completedAt: ""
						}, ...followUps];
					}
					if (name === "resolve_issue") issues = issues.map((item) => item.id === issueId ? {
						...item,
						status: "resolved",
						adminAction: String(payload.adminAction),
						resolvedAt: now,
						updatedAt: now
					} : item);
					if (name === "owner_note") issues = issues.map((item) => item.id === issueId ? {
						...item,
						ownerNote: String(payload.ownerNote),
						updatedAt: now
					} : item);
					if (name === "create_follow_up" || name === "clock_out_follow_up") followUps = [{
						id: Date.now(),
						personEmail: current.viewer.email,
						personRole: current.viewer.role,
						personName: current.viewer.name,
						projectCode: String(payload.projectCode),
						title: String(payload.title),
						details: String(payload.details),
						targetDate: String(payload.targetDate),
						source: name === "clock_out_follow_up" ? "clock_out" : "manual",
						status: "open",
						createdByEmail: current.viewer.email,
						createdByRole: current.viewer.role,
						workDate: current.today,
						clockedOutAt: name === "clock_out_follow_up" ? now : "",
						createdAt: now,
						updatedAt: now,
						completedAt: ""
					}, ...followUps.filter((item) => !(name === "clock_out_follow_up" && item.source === "clock_out" && item.personEmail === current.viewer.email && item.workDate === current.today))];
					if (name === "set_follow_up_status") followUps = followUps.map((item) => item.id === Number(payload.followUpId) ? {
						...item,
						status: String(payload.status),
						updatedAt: now,
						completedAt: payload.status === "completed" ? now : ""
					} : item);
					const next = {
						...current,
						issues,
						followUps,
						metrics: {
							openIssues: issues.filter((item) => item.status !== "resolved").length,
							criticalIssues: issues.filter((item) => item.status !== "resolved" && item.severity === "Critical").length,
							dueToday: followUps.filter((item) => item.status === "open" && item.targetDate === current.today).length,
							overdue: followUps.filter((item) => item.status === "open" && item.targetDate < current.today).length
						}
					};
					window.localStorage.setItem(staticStorageKey, JSON.stringify({
						issues,
						followUps
					}));
					return next;
				});
				setNotice(success);
				window.setTimeout(() => setNotice(""), 4500);
				return true;
			}
			const response = await fetch(`/api/operations${query}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: name,
					payload
				})
			});
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "The operation could not be saved.");
			setData(result.data);
			setNotice(success);
			window.setTimeout(() => setNotice(""), 4500);
			return true;
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "The operation could not be saved.");
			return false;
		} finally {
			setWorking(false);
		}
	}
	async function submitIssue(event) {
		event.preventDefault();
		if (await action("create_issue", {
			caseId: issueProject,
			siteLocation: issueLocation,
			affectedTrade,
			issueType,
			severity,
			summary,
			details,
			impact,
			contactedPerson,
			contactedAt,
			expectedDate
		}, "Site issue sent immediately to Admin and Owner.")) {
			setSummary("");
			setDetails("");
			setImpact("");
			setContactedPerson("");
			setContactedAt("");
			setExpectedDate("");
		}
	}
	function draft(issue) {
		return issueDrafts[issue.id] ?? {
			action: issue.adminAction,
			date: issue.rescheduledDate || data.tomorrow,
			time: issue.rescheduledTime || "08:00",
			assignee: issue.rescheduledAssignee || issue.reporterName || "Site Supervisor 01",
			ownerNote: issue.ownerNote
		};
	}
	function patchDraft(issue, values) {
		setIssueDrafts((current) => ({
			...current,
			[issue.id]: {
				...draft(issue),
				...values
			}
		}));
	}
	async function createFollowUp(event) {
		event.preventDefault();
		if (await action("create_follow_up", {
			projectCode: followProject,
			title: followTitle,
			details: followDetails,
			targetDate: followDate
		}, "Upcoming follow-up saved.")) {
			setFollowTitle("");
			setFollowDetails("");
		}
	}
	async function clockOut(event) {
		event.preventDefault();
		if (await action("clock_out_follow_up", {
			projectCode: clockProject,
			title: clockTitle,
			details: clockDetails,
			targetDate: data.tomorrow
		}, "Clock-out recorded. Tomorrow’s follow-up is now in Daily Tasks.")) {
			setClockTitle("");
			setClockDetails("");
		}
	}
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: operations_module_default.loading,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Loading live site operations…"]
	});
	if (mode === "alerts") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: operations_module_default.alertShell,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "LIVE SITE CONTROL" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Delays & problems requiring attention" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "New Site Supervisor reports appear here as soon as they are submitted." })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", {
				className: openIssues.length ? operations_module_default.alertCount : operations_module_default.clearCount,
				children: [openIssues.length, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "OPEN" })]
			})] }),
			(error || notice) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `${operations_module_default.notice} ${error ? operations_module_default.error : ""}`,
				children: error || notice
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: operations_module_default.alertList,
				children: [openIssues.slice(0, 3).map((issue) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: operations_module_default[`severity${issue.severity}`],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							issue.severity,
							" · ",
							issue.issueType
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
							issue.projectCode,
							" · ",
							issue.siteLocation
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							issue.affectedTrade,
							": ",
							issue.summary
						] })
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: statusLabel(issue.status) })]
				}, issue.id)), !openIssues.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: operations_module_default.clearState,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "✓" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No open site delay reported." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "New reports will appear here automatically." })] })]
				})]
			})
		]
	});
	if (mode === "project-status") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: operations_module_default.statusShell,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OWNER PROJECT SITUATION" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Live project risk status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Every unresolved site issue is attached to its project and visible in the Owner activity trail." })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.metrics.openIssues }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "AT RISK" })] })] }),
			(error || notice) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `${operations_module_default.notice} ${error ? operations_module_default.error : ""}`,
				children: error || notice
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: operations_module_default.statusGrid,
				children: data.projects.map((project) => {
					const issues = openIssues.filter((issue) => issue.caseId === project.caseId);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: issues.length ? operations_module_default.atRisk : operations_module_default.onTrack,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: project.projectCode }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: issues.length ? "AT RISK" : "ON TRACK" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: project.projectName }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: project.siteLocation }),
							issues.length ? issues.map((issue) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: issue.affectedTrade }),
								" — ",
								issue.summary,
								" · ",
								statusLabel(issue.status)
							] }, issue.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "No open delay or site problem." })
						]
					}, project.caseId);
				})
			})
		]
	});
	if (mode === "issues") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: operations_module_default.issueWorkspace,
		children: [
			(error || notice) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `${operations_module_default.notice} ${error ? operations_module_default.error : ""}`,
				children: error || notice
			}),
			role === "supervisor" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: operations_module_default.issueForm,
				onSubmit: submitIssue,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "MANDATORY SITE ESCALATION" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Report a delay or site problem" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Use this as soon as a trade, delivery, drawing, access or safety problem can affect the project." })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: operations_module_default.formGrid,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: operations_module_default.wide,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: issueProject,
									onChange: (event) => {
										const id = Number(event.target.value);
										setIssueProject(id);
										const project = data.projects.find((item) => item.caseId === id);
										if (project) setIssueLocation(project.siteLocation);
									},
									required: true,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: 0,
										children: "Choose assigned project"
									}), data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
										value: project.caseId,
										children: [
											project.projectCode,
											" · ",
											project.projectName
										]
									}, project.caseId))]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: operations_module_default.wide,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Exact project location" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: issueLocation,
									onChange: (event) => setIssueLocation(event.target.value),
									placeholder: "41 Orchard Street, Glen Waverley",
									required: true
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Affected trade / source" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: affectedTrade,
								onChange: (event) => setAffectedTrade(event.target.value),
								children: trades.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: item }, item))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Problem type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: issueType,
								onChange: (event) => setIssueType(event.target.value),
								children: issueTypes.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: item }, item))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Severity" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: severity,
								onChange: (event) => setSeverity(event.target.value),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Normal" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "High" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Critical" })
								]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "New expected date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								value: expectedDate,
								onChange: (event) => setExpectedDate(event.target.value)
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: operations_module_default.wide,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Short alert summary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: summary,
									onChange: (event) => setSummary(event.target.value),
									placeholder: "Electrician cannot attend the confirmed rough-in",
									required: true
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: operations_module_default.wide,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "What happened?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: details,
									onChange: (event) => setDetails(event.target.value),
									placeholder: "Explain what was confirmed, what changed and what information Admin needs…",
									required: true
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: operations_module_default.wide,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Impact on the project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: impact,
									onChange: (event) => setImpact(event.target.value),
									placeholder: "Example: wall lining cannot begin until rough-in is completed.",
									required: true
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Person contacted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: contactedPerson,
								onChange: (event) => setContactedPerson(event.target.value),
								placeholder: "Trade name / company"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Contacted at" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "datetime-local",
								value: contactedAt,
								onChange: (event) => setContactedAt(event.target.value)
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: working || !data.projects.length,
						children: working ? "Sending alert…" : "Report issue to Admin & Owner"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: operations_module_default.issueRegister,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: role === "supervisor" ? "MY SITE REPORTS" : "MANAGEMENT ISSUE REGISTER" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: role === "supervisor" ? "Reported delays & problems" : "Review, reschedule and close" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [openIssues.length, " open"] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: operations_module_default.issueCards,
					children: [data.issues.map((issue) => {
						const values = draft(issue);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: issue.status === "resolved" ? operations_module_default.resolved : "",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: operations_module_default.issueTop,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: operations_module_default[`severity${issue.severity}`],
											children: issue.severity
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: issue.issueType }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: statusLabel(issue.status) })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
									issue.projectCode,
									" · ",
									issue.siteLocation
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { children: [
									issue.affectedTrade,
									": ",
									issue.summary
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: issue.details }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Project impact" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: issue.impact || "Not supplied" })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Reported by" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", { children: [
										issue.reporterName,
										" · ",
										readable(issue.reportedAt, true)
									] })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Trade contacted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", { children: [issue.contactedPerson || "Not recorded", issue.contactedAt ? ` · ${readable(issue.contactedAt, true)}` : ""] })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Expected date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: readable(issue.expectedDate) })] })
								] }),
								issue.adminAction && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: operations_module_default.managementDirection,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ADMIN ACTION" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: issue.adminAction }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: issue.rescheduledDate ? `${readable(issue.rescheduledDate)} at ${issue.rescheduledTime} · ${issue.rescheduledAssignee}` : statusLabel(issue.status) })
									]
								}),
								issue.ownerNote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: operations_module_default.ownerDirection,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OWNER DIRECTION" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: issue.ownerNote })]
								}),
								role !== "supervisor" && issue.status !== "resolved" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: operations_module_default.actionBox,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Management action / direction" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: values.action,
											onChange: (event) => patchDraft(issue, { action: event.target.value }),
											placeholder: "Record what Admin has confirmed and what happens next…"
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "New date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "date",
												value: values.date,
												onChange: (event) => patchDraft(issue, { date: event.target.value })
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Time" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "time",
												value: values.time,
												onChange: (event) => patchDraft(issue, { time: event.target.value })
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Assign to" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: values.assignee,
												onChange: (event) => patchDraft(issue, { assignee: event.target.value })
											})] })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												disabled: working,
												onClick: () => void action("review_issue", {
													issueId: issue.id,
													adminAction: values.action
												}, "Issue marked under review."),
												children: "Start review"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												disabled: working,
												onClick: () => void action("reschedule_issue", {
													issueId: issue.id,
													adminAction: values.action,
													rescheduledDate: values.date,
													rescheduledTime: values.time,
													rescheduledAssignee: values.assignee
												}, "Schedule updated and Site Supervisor follow-up created."),
												children: "Reschedule Site Supervisor"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												disabled: working,
												onClick: () => void action("resolve_issue", {
													issueId: issue.id,
													adminAction: values.action
												}, "Issue resolved and project situation updated."),
												children: "Resolve issue"
											})
										] })
									]
								}),
								role === "owner" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: operations_module_default.ownerBox,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner direction" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: values.ownerNote,
										onChange: (event) => patchDraft(issue, { ownerNote: event.target.value }),
										placeholder: "Add Owner direction or escalation…"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										disabled: working,
										onClick: () => void action("owner_note", {
											issueId: issue.id,
											ownerNote: values.ownerNote
										}, "Owner direction saved to the project activity."),
										children: "Save Owner direction"
									})]
								})
							]
						}, issue.id);
					}), !data.issues.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: operations_module_default.empty,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No site issue reported yet." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "New Site Supervisor reports will appear here immediately." })]
					})]
				})]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: operations_module_default.followWorkspace,
		children: [
			(error || notice) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `${operations_module_default.notice} ${error ? operations_module_default.error : ""}`,
				children: error || notice
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: operations_module_default.followMetrics,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "DUE TODAY" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.metrics.dueToday }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Needs follow-up" })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OVERDUE" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.metrics.overdue }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Still open" })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OPEN FOLLOW-UPS" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: followUps.filter((item) => item.status === "open").length }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Management visibility" })
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: operations_module_default.followGrid,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: operations_module_default.followForm,
					onSubmit: createFollowUp,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "UPCOMING EVENT / REMINDER" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Add a follow-up" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Save an item that must be checked later. It will stay visible until completed." })
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: followProject,
							onChange: (event) => setFollowProject(event.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Business / General" }), data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: project.projectCode }, project.caseId))]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Follow-up date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "date",
							value: followDate,
							onChange: (event) => setFollowDate(event.target.value),
							required: true
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "What needs follow-up?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: followTitle,
							onChange: (event) => setFollowTitle(event.target.value),
							placeholder: "Confirm electrician attendance",
							required: true
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Details" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: followDetails,
							onChange: (event) => setFollowDetails(event.target.value),
							placeholder: "Add the exact call, approval or project action required…"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							disabled: working,
							children: working ? "Saving…" : "Add upcoming follow-up"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: operations_module_default.clockForm,
					onSubmit: clockOut,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "END OF SHIFT REQUIREMENT" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Tomorrow's follow-up" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Before clocking out, record the most important item you must continue or check tomorrow." })
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: operations_module_default.tomorrow,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "TOMORROW" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: readable(data.tomorrow) })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: clockProject,
							onChange: (event) => setClockProject(event.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Business / General" }), data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: project.projectCode }, project.caseId))]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "First follow-up tomorrow" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: clockTitle,
							onChange: (event) => setClockTitle(event.target.value),
							placeholder: "Call the electrician and confirm arrival time",
							required: true
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Context / next step" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: clockDetails,
							onChange: (event) => setClockDetails(event.target.value),
							placeholder: "Explain what must be checked and what outcome is needed…",
							required: true
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							disabled: working,
							children: working ? "Clocking out…" : "Clock out & save tomorrow task"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: operations_module_default.followRegister,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "DAILY TASK CONTINUITY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Upcoming follow-ups" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [followUps.filter((item) => item.status === "open").length, " open"] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [followUps.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: item.status === "completed" ? operations_module_default.followComplete : "",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("time", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: readable(item.targetDate, false).split(" ")[0] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: readable(item.targetDate, false).split(" ").slice(1, 2) })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.source === "clock_out" ? "FROM CLOCK-OUT" : item.source === "site_issue" ? "SITE ISSUE FOLLOW-UP" : "UPCOMING EVENT" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: item.title }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.details || "No extra detail." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
								item.projectCode,
								" · ",
								item.personName,
								" (",
								item.personRole,
								")"
							] })
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: item.status }),
						item.status === "open" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							disabled: working,
							onClick: () => void action("set_follow_up_status", {
								followUpId: item.id,
								status: "completed"
							}, "Follow-up completed."),
							children: "Mark done"
						})
					]
				}, item.id)), !followUps.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: operations_module_default.empty,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No upcoming follow-up." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add an event or save tomorrow’s task at clock-out." })]
				})] })]
			})
		]
	});
}
//#endregion
export { CalendarDays as a, ArrowRight as c, LayoutDashboard as d, createLucideIcon as f, MessageSquare as i, TriangleAlert as l, WorkflowBoard as n, FolderKanban as o, Briefcase as r, ListChecks as s, OperationsControlPanel as t, Workflow as u };
