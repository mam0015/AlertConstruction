import { b as require_react, t as require_jsx_runtime, w as __toESM } from "../index.js";
import Link from "./link-rFQpyoyn.js";
import { a as CalendarDays, c as ArrowRight, d as LayoutDashboard, f as createLucideIcon, i as MessageSquare, l as TriangleAlert, n as WorkflowBoard, o as FolderKanban, r as Briefcase, s as ListChecks, t as OperationsControlPanel, u as Workflow } from "./OperationsControlPanel-BeFTSRdd.js";
import { t as BrandLogo } from "./BrandLogo-3akqgd4n.js";
import TaskInbox from "./TaskInbox-D7BIzc6V.js";
//#region node_modules/lucide-react/dist/esm/icons/clipboard-check.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ClipboardCheck = createLucideIcon("clipboard-check", [
	["rect", {
		width: "8",
		height: "4",
		x: "8",
		y: "2",
		rx: "1",
		ry: "1",
		key: "tgr4d6"
	}],
	["path", {
		d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
		key: "116196"
	}],
	["path", {
		d: "m9 14 2 2 4-4",
		key: "df797q"
	}]
]);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var FileText = createLucideIcon("file-text", [
	["path", {
		d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
		key: "1oefj6"
	}],
	["path", {
		d: "M14 2v5a1 1 0 0 0 1 1h5",
		key: "wfsgrz"
	}],
	["path", {
		d: "M10 9H8",
		key: "b1mrlr"
	}],
	["path", {
		d: "M16 13H8",
		key: "t4e002"
	}],
	["path", {
		d: "M16 17H8",
		key: "z1uh3a"
	}]
]);
var supervisor_module_default = {
	shell: "_shell_1m67t_1",
	sidebar: "_sidebar_1m67t_1",
	brand: "_brand_1m67t_1",
	logo: "_logo_1m67t_1",
	roleCard: "_roleCard_1m67t_1",
	active: "_active_1m67t_1",
	restricted: "_restricted_1m67t_1",
	sidebarFoot: "_sidebarFoot_1m67t_1",
	main: "_main_1m67t_1",
	topbar: "_topbar_1m67t_1",
	content: "_content_1m67t_1",
	heading: "_heading_1m67t_1",
	panel: "_panel_1m67t_1",
	projectCards: "_projectCards_1m67t_1",
	report: "_report_1m67t_1",
	messages: "_messages_1m67t_1",
	metrics: "_metrics_1m67t_1",
	overviewGrid: "_overviewGrid_1m67t_1",
	taskList: "_taskList_1m67t_1",
	schedule: "_schedule_1m67t_1",
	gold: "_gold_1m67t_1",
	green: "_green_1m67t_1",
	blue: "_blue_1m67t_1",
	orange: "_orange_1m67t_1",
	progressRing: "_progressRing_1m67t_1",
	tableHead: "_tableHead_1m67t_1",
	projectTable: "_projectTable_1m67t_1",
	checklist: "_checklist_1m67t_1",
	formGrid: "_formGrid_1m67t_1",
	upload: "_upload_1m67t_1",
	mine: "_mine_1m67t_1",
	emptyState: "_emptyState_1m67t_17",
	dataNotice: "_dataNotice_1m67t_18",
	metricIcon: "_metricIcon_1m67t_21"
};
//#endregion
//#region app/site-supervisor/SiteSupervisor.tsx
var import_jsx_runtime = require_jsx_runtime();
var nav = [
	{
		id: "overview",
		icon: LayoutDashboard,
		label: "Site overview"
	},
	{
		id: "workflow",
		icon: Workflow,
		label: "Site Visit workflow"
	},
	{
		id: "tasks",
		icon: ListChecks,
		label: "Assigned tasks"
	},
	{
		id: "issues",
		icon: TriangleAlert,
		label: "Delays & site problems"
	},
	{
		id: "followups",
		icon: ArrowRight,
		label: "Tomorrow follow-ups"
	},
	{
		id: "projects",
		icon: FolderKanban,
		label: "Assigned projects"
	},
	{
		id: "schedule",
		icon: CalendarDays,
		label: "My schedule"
	},
	{
		id: "checklist",
		icon: ClipboardCheck,
		label: "Site checklist"
	},
	{
		id: "report",
		icon: FileText,
		label: "End-of-day report"
	},
	{
		id: "messages",
		icon: MessageSquare,
		label: "Team messages"
	}
];
function NavIcon({ icon: Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
		size: 17,
		strokeWidth: 1.75
	});
}
function MetricIcon({ icon: Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
		className: supervisor_module_default.metricIcon,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
			size: 16,
			strokeWidth: 1.75
		})
	});
}
var demoDirections = [
	{
		time: "07:30",
		title: "Confirm plumbing set-out",
		project: "ATP-2026-00124",
		tone: "gold"
	},
	{
		time: "10:00",
		title: "Framing inspection",
		project: "ATP-2026-00124",
		tone: "green"
	},
	{
		time: "13:30",
		title: "Upload marked-up site photos",
		project: "ATP-2026-00124",
		tone: "blue"
	},
	{
		time: "15:45",
		title: "Submit end-of-day report",
		project: "ATP-2026-00124",
		tone: "orange"
	}
];
var demoProjects = [{
	caseId: 124,
	projectCode: "ATP-2026-00124",
	service: "Home Renovation",
	suburb: "Glen Waverley",
	stage: "Construction",
	progress: 62,
	assignedSupervisorName: "Site Supervisor Preview"
}, {
	caseId: 131,
	projectCode: "ATP-2026-00131",
	service: "Engineering",
	suburb: "Rowville",
	stage: "Site inspection",
	progress: 28,
	assignedSupervisorName: "Site Supervisor Preview"
}];
var checks = [
	"Site access clear and secure",
	"PPE and amenities checked",
	"Framing dimensions verified",
	"Plumbing set-out confirmed",
	"Photos uploaded to project",
	"Weather and delay notes recorded"
];
var todayLabel = () => new Intl.DateTimeFormat("en-AU", {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "Australia/Melbourne"
}).format(/* @__PURE__ */ new Date());
function SiteSupervisor({ previewTasks = false }) {
	const [view, setView] = (0, import_react.useState)("overview");
	const [checked, setChecked] = (0, import_react.useState)(previewTasks ? {
		"Site access clear and secure": true,
		"PPE and amenities checked": true,
		"Framing dimensions verified": true
	} : {});
	const [reportSent, setReportSent] = (0, import_react.useState)(false);
	const [message, setMessage] = (0, import_react.useState)("");
	const [projects, setProjects] = (0, import_react.useState)(previewTasks ? demoProjects : []);
	const [directions, setDirections] = (0, import_react.useState)(previewTasks ? demoDirections.map((item, index) => ({
		id: index + 1,
		projectCode: item.project,
		title: item.title,
		instructions: "Preview management direction",
		priority: "Normal",
		status: index < 2 ? "completed" : "assigned"
	})) : []);
	const [openIssues, setOpenIssues] = (0, import_react.useState)(previewTasks ? 1 : 0);
	const [dataError, setDataError] = (0, import_react.useState)("");
	const completed = (0, import_react.useMemo)(() => Object.values(checked).filter(Boolean).length, [checked]);
	const openDirections = (0, import_react.useMemo)(() => directions.filter((task) => task.status !== "completed"), [directions]);
	const selectedProject = projects[0] ?? null;
	(0, import_react.useEffect)(() => {
		let active = true;
		const staticPreview = window.location.pathname.includes("/AlertConstruction/");
		if (previewTasks || staticPreview) {
			const frame = window.requestAnimationFrame(() => {
				if (!active) return;
				setProjects(demoProjects);
				setDirections(demoDirections.map((item, index) => ({
					id: index + 1,
					projectCode: item.project,
					title: item.title,
					instructions: "Preview management direction",
					priority: "Normal",
					status: index < 2 ? "completed" : "assigned"
				})));
				setOpenIssues(1);
			});
			return () => {
				active = false;
				window.cancelAnimationFrame(frame);
			};
		}
		Promise.all([
			fetch("/api/workflow", { cache: "no-store" }).then((response) => response.json().then((result) => ({
				response,
				result
			}))),
			fetch("/api/tasks", { cache: "no-store" }).then((response) => response.json().then((result) => ({
				response,
				result
			}))),
			fetch("/api/operations", { cache: "no-store" }).then((response) => response.json().then((result) => ({
				response,
				result
			})))
		]).then(([workflow, taskData, operations]) => {
			if (!workflow.response.ok || !taskData.response.ok || !operations.response.ok) throw new Error("Live Site Supervisor data could not be loaded.");
			if (!active) return;
			setProjects((workflow.result.data?.cases ?? []).map((item) => ({
				caseId: Number(item.id ?? 0),
				projectCode: String(item.projectCode || item.requestCode || ""),
				service: String(item.service || "Project"),
				suburb: String(item.suburb || "Site"),
				stage: String(item.stage || "Assigned"),
				progress: Math.max(0, Math.min(100, Number(item.progress ?? 0))),
				assignedSupervisorName: String(item.assignedSupervisorName || "Site Supervisor")
			})));
			setDirections(taskData.result.data?.tasks ?? []);
			setOpenIssues(Number(operations.result.data?.metrics?.openIssues ?? 0));
		}).catch((reason) => {
			if (active) setDataError(reason instanceof Error ? reason.message : "Live data could not be loaded.");
		});
		return () => {
			active = false;
		};
	}, [previewTasks]);
	const heading = {
		overview: [
			"Operation Hub · Site Supervisor",
			"Good morning, Site Supervisor.",
			"Your assigned projects, site directions and reporting tools — without private finance or pricing."
		],
		workflow: [
			"Assigned hand-offs",
			"Site Visit workflow",
			"Upload mandatory site evidence, submit Visit Reports and send internal and customer-safe updates."
		],
		tasks: [
			"Management direction",
			"Assigned tasks",
			"Only tasks that Owner or Admin assigned to your Site Supervisor account appear here."
		],
		issues: [
			"Immediate escalation",
			"Delays & site problems",
			"Report a trade delay or site problem immediately so Admin can review and reschedule it."
		],
		followups: [
			"Daily task continuity",
			"Tomorrow & upcoming follow-ups",
			"Clock out with a clear next action so nothing is forgotten on the next working day."
		],
		projects: [
			"Assigned work",
			"My projects",
			"Only projects allocated to your role are visible here."
		],
		schedule: [
			"Site direction",
			"My schedule",
			"Owner and Admin instructions for upcoming site work."
		],
		checklist: [
			"Quality control",
			"Site checklist",
			"Record the checks completed before work moves forward."
		],
		report: [
			"Daily reporting",
			"End-of-day report",
			"Send progress, delays, photos and tomorrow's requirements to the Owner."
		],
		messages: [
			"Team coordination",
			"Messages",
			"Keep project instructions and site updates together."
		]
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: supervisor_module_default.shell,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: supervisor_module_default.sidebar,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					className: supervisor_module_default.brand,
					href: "/",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
						kind: "tradie",
						tone: "dark",
						className: supervisor_module_default.logo
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: supervisor_module_default.roleCard,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "AUTHENTICATED ROLE" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Site Supervisor 01" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Site delivery access" })
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { children: nav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: view === item.id ? supervisor_module_default.active : "",
					onClick: () => setView(item.id),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavIcon, { icon: item.icon }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label }),
						item.id === "checklist" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [completed, "/6"] })
					]
				}, item.id)) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: supervisor_module_default.restricted,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "RESTRICTED BY OWNER" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Finance · Quotes · Profit" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Private pricing and management controls are never sent to this role." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: supervisor_module_default.sidebarFoot,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), " Secure session active"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						href: "/",
						children: "Public website ↗"
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: supervisor_module_default.main,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: supervisor_module_default.topbar,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [todayLabel(), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Alert Tradie Pro · Operation Hub" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "SS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Site Supervisor", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ATP field team" })] })] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: supervisor_module_default.content,
				children: [
					previewTasks && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: supervisor_module_default.dataNotice,
						role: "note",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Anonymous GitHub design preview" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "All projects, tasks and percentages on this page are labelled demo data. The production workspace starts at zero and loads only assigned database records." })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: supervisor_module_default.heading,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: heading[view][0] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: heading[view][1] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: heading[view][2] })
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setView("report"),
							children: "＋ Daily report"
						})]
					}),
					dataError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: supervisor_module_default.dataNotice,
						role: "alert",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Live data unavailable" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: dataError })]
					}),
					view === "workflow" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkflowBoard, { role: "supervisor" }),
					view === "tasks" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskInbox, {
						role: "Site Supervisor",
						preview: previewTasks,
						tone: "light"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperationsControlPanel, {
						role: "supervisor",
						mode: "followups",
						preview: previewTasks
					})] }),
					view === "issues" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperationsControlPanel, {
						role: "supervisor",
						mode: "issues",
						preview: previewTasks
					}),
					view === "followups" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperationsControlPanel, {
						role: "supervisor",
						mode: "followups",
						preview: previewTasks
					}),
					view === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperationsControlPanel, {
							role: "supervisor",
							mode: "alerts",
							preview: previewTasks
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: supervisor_module_default.metrics,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricIcon, { icon: Briefcase }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ASSIGNED PROJECTS" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: projects.length }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [projects.filter((project) => project.stage.toLowerCase() !== "complete").length, " active"] })
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricIcon, { icon: ListChecks }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OPEN DIRECTIONS" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: openDirections.length }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [directions.filter((task) => task.status === "completed").length, " completed"] })
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricIcon, { icon: ClipboardCheck }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "CHECKLIST" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
										completed,
										"/",
										checks.length
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Today's site checks" })
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricIcon, { icon: TriangleAlert }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OPEN SITE ISSUES" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: openIssues }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Live operations record" })
								] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: supervisor_module_default.overviewGrid,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: supervisor_module_default.panel,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "MANAGEMENT DIRECTION" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Assigned work" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setView("tasks"),
									children: "Open tasks →"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: supervisor_module_default.taskList,
									children: [directions.slice(0, 5).map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { children: task.status === "completed" ? "DONE" : "OPEN" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: supervisor_module_default[task.priority === "Urgent" ? "orange" : task.priority === "High" ? "gold" : "blue"] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: task.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
											task.projectCode,
											" · ",
											task.instructions
										] })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setView("tasks"),
											children: "Open →"
										})
									] }, task.id)), directions.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: supervisor_module_default.emptyState,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No direction assigned." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "New Owner or Admin tasks will appear here." })]
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: supervisor_module_default.panel,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "QUALITY CONTROL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Checklist progress" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setView("checklist"),
									children: "Open checklist →"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: supervisor_module_default.progressRing,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: { "--progress": `${completed / checks.length * 360}deg` },
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: completed }),
											" of ",
											checks.length
										] })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Framing checks underway" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Complete every relevant item before submitting today's report." })] })]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: `${supervisor_module_default.panel} ${supervisor_module_default.projectTable}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ASSIGNED PROJECTS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Projects in motion" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setView("projects"),
									children: "View projects →"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: supervisor_module_default.tableHead,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Current stage" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delivery" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Next direction" })
									]
								}),
								projects.map((project) => {
									const next = openDirections.find((task) => task.projectCode === project.projectCode);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
											project.service,
											" · ",
											project.suburb
										] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
											project.projectCode,
											" · ",
											project.suburb
										] })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: project.stage.replaceAll("_", " ") }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { style: { width: `${project.progress}%` } }) }),
											project.progress,
											"%"
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: next?.title ?? "No open direction" })
									] }, project.caseId);
								}),
								projects.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: supervisor_module_default.emptyState,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No project assigned." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Assigned projects will appear after Admin completes the hand-off." })]
								})
							]
						})
					] }),
					view === "projects" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: supervisor_module_default.projectCards,
						children: [projects.map((project) => {
							const next = openDirections.find((task) => task.projectCode === project.projectCode);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: project.projectCode }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { children: [
									project.service,
									" · ",
									project.suburb
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: project.stage.replaceAll("_", " ") }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { style: { width: `${project.progress}%` } }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [project.progress, "%"] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Next direction" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: next?.title ?? "No open direction" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Data source" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Live approved project record" })
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setView("checklist"),
									children: "Open site checklist"
								})
							] }, project.caseId);
						}), projects.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: supervisor_module_default.emptyState,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No project assigned." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "This workspace starts at zero until Admin assigns a live project." })]
						})]
					}),
					view === "schedule" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: supervisor_module_default.panel,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SITE SUPERVISOR TASKS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Upcoming directions" })] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: supervisor_module_default.schedule,
							children: [openDirections.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("time", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "—" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"NO",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									"FAKE DATE"
								] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: supervisor_module_default[task.priority === "Urgent" ? "orange" : task.priority === "High" ? "gold" : "blue"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: task.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									task.projectCode,
									" · ",
									task.instructions
								] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: task.status.replaceAll("_", " ") })
							] }, task.id)), openDirections.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: supervisor_module_default.emptyState,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No upcoming direction." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Dates and tasks appear only after management saves them." })]
							})]
						})]
					}),
					view === "checklist" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: supervisor_module_default.panel,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: selectedProject?.projectCode || "NO PROJECT" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Quality inspection checklist" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selectedProject ? `${completed} of ${checks.length} complete` : "0 complete" })] }), selectedProject ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: supervisor_module_default.checklist,
							children: checks.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: Boolean(checked[item]),
									onChange: () => setChecked((current) => ({
										...current,
										[item]: !current[item]
									}))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: checked[item] ? "✓" : index + 1 }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: checked[item] ? "Completed in this session" : "Tap to confirm when complete" })] })
							] }, item))
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: supervisor_module_default.emptyState,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No assigned project." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "A quality inspection starts only after a project is assigned." })]
						})]
					}),
					view === "report" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: `${supervisor_module_default.panel} ${supervisor_module_default.report}`,
						onSubmit: (event) => {
							event.preventDefault();
							if (selectedProject) setReportSent(true);
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "END-OF-DAY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Daily site report" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selectedProject?.projectCode || "No project assigned" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: supervisor_module_default.formGrid,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Work completed" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										required: true,
										disabled: !selectedProject
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delay or issue" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { disabled: !selectedProject })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Tomorrow's requirement" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										required: true,
										disabled: !selectedProject
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Site photos" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: supervisor_module_default.upload,
										children: "＋ Add customer-safe and internal photos"
									})] })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								disabled: !selectedProject,
								children: "Submit report to Owner"
							}),
							!selectedProject && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No report can be submitted until a project is assigned." }),
							reportSent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "✓ Report submitted to Owner approval." })
						]
					}),
					view === "messages" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: `${supervisor_module_default.panel} ${supervisor_module_default.messages}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PROJECT CHANNEL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Owner & Admin" })] }) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: previewTasks ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Admin Preview · 9:12 am" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Please confirm the plumbing set-out before the trade starts." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: supervisor_module_default.mine,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Site Supervisor Preview · 9:36 am" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Confirmed. Marked-up photos are ready to upload." })]
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: supervisor_module_default.emptyState,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No message history." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Messages will appear after the secure channel receives its first item." })]
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: (event) => {
									event.preventDefault();
									setMessage("");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: message,
									onChange: (event) => setMessage(event.target.value),
									placeholder: "Message Owner and Admin…"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { children: "Send ↑" })]
							})
						]
					})
				]
			})]
		})]
	});
}
//#endregion
export { SiteSupervisor as default };
