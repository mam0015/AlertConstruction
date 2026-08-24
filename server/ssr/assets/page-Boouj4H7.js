import { b as require_react, c as useParams, t as require_jsx_runtime, w as __toESM } from "../index.js";
import Link from "./link-rFQpyoyn.js";
import { t as BrandLogo } from "./BrandLogo-3akqgd4n.js";
import { t as stageLabels } from "./types-CMO6RbMx.js";
//#region app/workflow/customer-workflow.module.css
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var customer_workflow_module_default = {
	customerWorkflow: "_customerWorkflow_1g9b3_1",
	customerGrid: "_customerGrid_1g9b3_1",
	estimate: "_estimate_1g9b3_1",
	privacyNote: "_privacyNote_1g9b3_1",
	decision: "_decision_1g9b3_1",
	decisionStatus: "_decisionStatus_1g9b3_1",
	update: "_update_1g9b3_1",
	empty: "_empty_1g9b3_1",
	loading: "_loading_1g9b3_1",
	error: "_error_1g9b3_1"
};
//#endregion
//#region app/workflow/CustomerWorkflowPanel.tsx
var import_jsx_runtime = require_jsx_runtime();
function money(cents) {
	return new Intl.NumberFormat("en-AU", {
		style: "currency",
		currency: "AUD",
		maximumFractionDigits: 0
	}).format(cents / 100);
}
function date(value) {
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-AU", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(parsed);
}
function CustomerWorkflowPanel({ code }) {
	const [data, setData] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	const [working, setWorking] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let active = true;
		fetch(`/api/workflow/public?code=${encodeURIComponent(code)}`, { cache: "no-store" }).then(async (response) => ({
			response,
			result: await response.json()
		})).then(({ response, result }) => {
			if (!active) return;
			if (response.ok && result.data) setData(result.data);
			else setError(result.error ?? "Project workflow is not available yet.");
		}).catch(() => {
			if (active) setError("Project workflow is not available yet.");
		});
		return () => {
			active = false;
		};
	}, [code]);
	async function decide(decision) {
		setWorking(true);
		setError("");
		try {
			const response = await fetch("/api/workflow/public", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					code,
					decision
				})
			});
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "Your decision could not be saved.");
			setData(result.data);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Your decision could not be saved.");
		} finally {
			setWorking(false);
		}
	}
	if (!data) return error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: customer_workflow_module_default.loading,
		children: [error, " Check the reference code or use the secure support form."]
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: customer_workflow_module_default.loading,
		children: "Opening your approved project information…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: customer_workflow_module_default.customerWorkflow,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "LIVE REQUEST & PROJECT WORKFLOW" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: data.projectCode || data.requestCode }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [data.service, data.suburb ? ` · ${data.suburb}` : ""] })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
				stageLabels[data.stage],
				" · ",
				Math.max(0, Math.min(100, Number(data.progress) || 0)),
				"%"
			] })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: customer_workflow_module_default.privacyNote,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "✓" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Only customer-approved information is shown here." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Internal site notes, pricing analysis and team conversations remain private." })] })]
			}),
			data.estimate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: customer_workflow_module_default.estimate,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PROJECT ESTIMATE" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(data.estimate.amountCents) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["Sent ", date(data.estimate.sentAt)] })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Scope included" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: data.estimate.scope }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: data.estimate.terms })
					] }),
					data.estimate.status === "sent" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: customer_workflow_module_default.decision,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							disabled: working,
							onClick: () => void decide("decline"),
							children: "Decline"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							disabled: working,
							onClick: () => void decide("accept"),
							children: "Accept estimate"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: customer_workflow_module_default.decisionStatus,
						children: data.estimate.status === "customer_accepted" ? "✓ Estimate accepted" : "Estimate declined"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: customer_workflow_module_default.customerGrid,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "APPROVED UPDATES" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.updates.length })] }), data.updates.length ? data.updates.map((update) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: customer_workflow_module_default.update,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: date(update.publishedAt) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: update.customerUpdate }),
						update.files.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: update.files.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: file.url,
							target: "_blank",
							rel: "noreferrer",
							children: ["View ", file.fileName]
						}, file.id)) })
					]
				}, update.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: customer_workflow_module_default.empty,
					children: "No customer update has passed Admin and Owner approval yet."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "APPROVED ACTIVITY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Latest" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { children: data.activity.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.detail }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: date(item.createdAt) })
				] })] }, `${item.createdAt}-${index}`)) })] })]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: customer_workflow_module_default.error,
				children: error
			})
		]
	});
}
var track_module_default = {
	portalShell: "_portalShell_9vy9s_1",
	header: "_header_9vy9s_10",
	logoLink: "_logoLink_9vy9s_24",
	logo: "_logo_9vy9s_24",
	headerNav: "_headerNav_9vy9s_34",
	exitLink: "_exitLink_9vy9s_51",
	portalBar: "_portalBar_9vy9s_57",
	reference: "_reference_9vy9s_71",
	statusLabel: "_statusLabel_9vy9s_79",
	hero: "_hero_9vy9s_89",
	heroHeading: "_heroHeading_9vy9s_98",
	statusBoard: "_statusBoard_9vy9s_99",
	workspace: "_workspace_9vy9s_100",
	footer: "_footer_9vy9s_101",
	kicker: "_kicker_9vy9s_115",
	heroCopy: "_heroCopy_9vy9s_133",
	updated: "_updated_9vy9s_141",
	miniLabel: "_miniLabel_9vy9s_150",
	projectIdentity: "_projectIdentity_9vy9s_174",
	progressPanel: "_progressPanel_9vy9s_175",
	nextVisit: "_nextVisit_9vy9s_176",
	progressRing: "_progressRing_9vy9s_242",
	updateCopy: "_updateCopy_9vy9s_282",
	actionCard: "_actionCard_9vy9s_283",
	dateBlock: "_dateBlock_9vy9s_299",
	visitConfirmed: "_visitConfirmed_9vy9s_320",
	tabs: "_tabs_9vy9s_335",
	activeTab: "_activeTab_9vy9s_370",
	overviewGrid: "_overviewGrid_9vy9s_378",
	documentsGrid: "_documentsGrid_9vy9s_379",
	timelinePanel: "_timelinePanel_9vy9s_386",
	schedulePanel: "_schedulePanel_9vy9s_387",
	documentsPanel: "_documentsPanel_9vy9s_388",
	messagePanel: "_messagePanel_9vy9s_389",
	sectionTitle: "_sectionTitle_9vy9s_396",
	timeline: "_timeline_9vy9s_386",
	timelineMarker: "_timelineMarker_9vy9s_445",
	done: "_done_9vy9s_480",
	current: "_current_9vy9s_490",
	sideColumn: "_sideColumn_9vy9s_501",
	updateCard: "_updateCard_9vy9s_507",
	updateImage: "_updateImage_9vy9s_515",
	documentList: "_documentList_9vy9s_553",
	inlineNotice: "_inlineNotice_9vy9s_569",
	scheduleList: "_scheduleList_9vy9s_589",
	scheduleRow: "_scheduleRow_9vy9s_594",
	scheduleDate: "_scheduleDate_9vy9s_604",
	scheduleName: "_scheduleName_9vy9s_617",
	scheduleTime: "_scheduleTime_9vy9s_618",
	scheduleStatus: "_scheduleStatus_9vy9s_641",
	confirmed: "_confirmed_9vy9s_649",
	changed: "_changed_9vy9s_654",
	planned: "_planned_9vy9s_659",
	delayNote: "_delayNote_9vy9s_664",
	fileType: "_fileType_9vy9s_699",
	documentNotice: "_documentNotice_9vy9s_733",
	sentNotice: "_sentNotice_9vy9s_803",
	footerLogo: "_footerLogo_9vy9s_830"
};
//#endregion
//#region app/track/[code]/page.tsx
function formatProjectCode(raw) {
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (!value) return "";
	try {
		return decodeURIComponent(value).toUpperCase().replace(/\/+|\s+/g, "-");
	} catch {
		return "";
	}
}
function ProjectStatusPage() {
	const params = useParams();
	const projectCode = (0, import_react.useMemo)(() => formatProjectCode(params?.code), [params?.code]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: track_module_default.portalShell,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: track_module_default.header,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					className: track_module_default.logoLink,
					href: "/",
					"aria-label": "Alert Tradie Pro home",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
						kind: "tradie",
						tone: "dark",
						className: track_module_default.logo
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: track_module_default.headerNav,
					"aria-label": "Customer portal navigation",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							href: "/",
							children: "Home"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							href: "/#request",
							children: "Secure support"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							className: track_module_default.exitLink,
							href: "/",
							children: "Exit project"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: track_module_default.portalBar,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Secure customer project portal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: track_module_default.reference,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
						" Reference\xA0 ",
						projectCode || "Not supplied"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: track_module_default.hero,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: track_module_default.heroHeading,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: track_module_default.kicker,
							children: "Approved project information"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
							"Your live project",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"record."
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: track_module_default.heroCopy,
							children: "Only information approved for customer viewing is shown. No placeholder percentage, date, document or site update is displayed."
						})
					] })
				})
			}),
			projectCode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CustomerWorkflowPanel, { code: projectCode }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: track_module_default.workspace,
				children: "Enter a valid request or project reference from the home page."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: track_module_default.footer,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
						kind: "tradie",
						tone: "dark",
						className: track_module_default.footerLogo
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Customer-visible project information only." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						href: "/#request",
						children: "Secure support"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						href: "/",
						children: "Return home"
					})] })
				]
			})
		]
	});
}
//#endregion
export { ProjectStatusPage as default };
