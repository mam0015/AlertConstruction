import { b as require_react, t as require_jsx_runtime, u as useRouter, w as __toESM } from "../index.js";
import Link from "./link-rFQpyoyn.js";
import { a as CalendarDays, c as ArrowRight, d as LayoutDashboard, f as createLucideIcon, i as MessageSquare, l as TriangleAlert, n as WorkflowBoard, o as FolderKanban, r as Briefcase, s as ListChecks, t as OperationsControlPanel, u as Workflow } from "./OperationsControlPanel-BeFTSRdd.js";
import { n as WorkerManagementPanel, r as HardHat, t as TaskManagementPanel } from "./TaskManagementPanel-DxaFOCMx.js";
import { t as BrandLogo } from "./BrandLogo-3akqgd4n.js";
import TaskInbox from "./TaskInbox-D7BIzc6V.js";
//#region node_modules/lucide-react/dist/esm/icons/inbox.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Inbox = createLucideIcon("inbox", [["polyline", {
	points: "22 12 16 12 14 15 10 15 8 12 2 12",
	key: "o97t9d"
}], ["path", {
	d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
	key: "oot6mr"
}]]);
var admin_module_default = {
	adminShell: "_adminShell_wlt4a_1",
	loginShell: "_loginShell_wlt4a_1",
	eyebrow: "_eyebrow_wlt4a_1",
	sidebar: "_sidebar_wlt4a_2",
	topbar: "_topbar_wlt4a_2",
	panel: "_panel_wlt4a_2",
	metricStrip: "_metricStrip_wlt4a_2",
	controlBar: "_controlBar_wlt4a_2",
	segmented: "_segmented_wlt4a_2",
	weekCalendar: "_weekCalendar_wlt4a_2",
	projectCards: "_projectCards_wlt4a_2",
	requestGrid: "_requestGrid_wlt4a_2",
	pageHeading: "_pageHeading_wlt4a_2",
	loginCopy: "_loginCopy_wlt4a_2",
	primaryButton: "_primaryButton_wlt4a_2",
	secondaryButton: "_secondaryButton_wlt4a_2",
	outlineButton: "_outlineButton_wlt4a_2",
	sidebarNav: "_sidebarNav_wlt4a_2",
	activeNav: "_activeNav_wlt4a_2",
	restrictedCard: "_restrictedCard_wlt4a_2",
	loginFrame: "_loginFrame_wlt4a_2",
	loginIntro: "_loginIntro_wlt4a_2",
	loginForm: "_loginForm_wlt4a_2",
	recordModal: "_recordModal_wlt4a_2",
	messageWorkspace: "_messageWorkspace_wlt4a_2",
	selectedPerson: "_selectedPerson_wlt4a_2",
	requestBody: "_requestBody_wlt4a_2",
	projectRow: "_projectRow_wlt4a_2",
	progress: "_progress_wlt4a_2",
	loginLogo: "_loginLogo_wlt4a_3",
	loginScope: "_loginScope_wlt4a_3",
	loginHeading: "_loginHeading_wlt4a_3",
	roleCard: "_roleCard_wlt4a_3",
	profileChip: "_profileChip_wlt4a_3",
	loginError: "_loginError_wlt4a_3",
	backLink: "_backLink_wlt4a_3",
	brandLink: "_brandLink_wlt4a_4",
	sidebarLogo: "_sidebarLogo_wlt4a_4",
	sidebarBottom: "_sidebarBottom_wlt4a_4",
	mainPanel: "_mainPanel_wlt4a_5",
	mobileBrand: "_mobileBrand_wlt4a_5",
	content: "_content_wlt4a_5",
	headingActions: "_headingActions_wlt4a_5",
	notice: "_notice_wlt4a_5",
	errorNotice: "_errorNotice_wlt4a_5",
	loading: "_loading_wlt4a_5",
	spin: "_spin_wlt4a_1",
	panelHeading: "_panelHeading_wlt4a_6",
	overviewGrid: "_overviewGrid_wlt4a_6",
	requestQueue: "_requestQueue_wlt4a_6",
	nextSchedule: "_nextSchedule_wlt4a_6",
	projectTable: "_projectTable_wlt4a_7",
	tableHeader: "_tableHeader_wlt4a_7",
	projectCardTop: "_projectCardTop_wlt4a_7",
	projectNote: "_projectNote_wlt4a_7",
	segmentActive: "_segmentActive_wlt4a_8",
	priorityNormal: "_priorityNormal_wlt4a_8",
	priorityHigh: "_priorityHigh_wlt4a_8",
	priorityUrgent: "_priorityUrgent_wlt4a_8",
	event_gold: "_event_gold_wlt4a_9",
	event_blue: "_event_blue_wlt4a_9",
	event_green: "_event_green_wlt4a_9",
	event_orange: "_event_orange_wlt4a_9",
	tone_gold: "_tone_gold_wlt4a_9",
	tone_blue: "_tone_blue_wlt4a_9",
	tone_green: "_tone_green_wlt4a_9",
	tone_orange: "_tone_orange_wlt4a_9",
	scheduleList: "_scheduleList_wlt4a_9",
	teamMessage: "_teamMessage_wlt4a_10",
	ownMessage: "_ownMessage_wlt4a_10",
	modalBackdrop: "_modalBackdrop_wlt4a_11",
	formGrid: "_formGrid_wlt4a_11",
	fullField: "_fullField_wlt4a_11",
	restrictedNotice: "_restrictedNotice_wlt4a_11",
	requestSummary: "_requestSummary_wlt4a_11",
	mobileNav: "_mobileNav_wlt4a_11",
	mobileLogo: "_mobileLogo_wlt4a_13",
	activeMobileNav: "_activeMobileNav_wlt4a_13",
	metricIcon: "_metricIcon_wlt4a_16"
};
//#endregion
//#region app/admin/AdminDashboard.tsx
var import_jsx_runtime = require_jsx_runtime();
var empty = {
	projects: [],
	requests: [],
	scheduleEvents: [],
	messages: [],
	permissions: {
		role: "Admin",
		projects: 1,
		schedule: 1,
		finance: 0,
		financeExport: 0
	}
};
var nav = [
	{
		id: "overview",
		label: "Operations overview",
		icon: LayoutDashboard
	},
	{
		id: "workflow",
		label: "Project workflow",
		icon: Workflow
	},
	{
		id: "issues",
		label: "Site delays & problems",
		icon: TriangleAlert
	},
	{
		id: "followups",
		label: "Upcoming follow-ups",
		icon: ArrowRight
	},
	{
		id: "workers",
		label: "Worker assignments",
		icon: HardHat
	},
	{
		id: "tasks",
		label: "Team tasks",
		icon: ListChecks
	},
	{
		id: "projects",
		label: "Projects",
		icon: FolderKanban
	},
	{
		id: "requests",
		label: "New requests",
		icon: Inbox
	},
	{
		id: "schedule",
		label: "Schedule",
		icon: CalendarDays
	},
	{
		id: "messages",
		label: "Team messages",
		icon: MessageSquare
	}
];
function NavIcon({ icon: Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
		size: 18,
		strokeWidth: 1.75
	});
}
function MetricIcon({ icon: Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
		className: admin_module_default.metricIcon,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
			size: 16,
			strokeWidth: 1.75
		})
	});
}
var services = [
	"Home Renovation",
	"Bathroom Renovation",
	"Kitchen Renovation",
	"Home Extension",
	"New Home",
	"Building Inspection",
	"Maintenance & Repairs",
	"Engineering"
];
var stages = [
	"Admin review",
	"Site inspection",
	"Estimate",
	"Quote sent",
	"Customer approval",
	"Scheduled",
	"Construction",
	"Handover",
	"Complete"
];
var requestStatuses = [
	"New",
	"Contacted",
	"Needs review",
	"Site visit booked",
	"Converted",
	"Closed"
];
var assignees = [
	"Unassigned",
	"Admin 01",
	"Site Supervisor 01",
	"Estimator 01",
	"Engineer 01"
];
var projectBlank = {
	code: "",
	name: "",
	service: "Home Renovation",
	stage: "Admin review",
	progress: "0",
	customerName: "",
	suburb: "",
	startDate: "",
	notes: ""
};
var melbourneDate = () => new Intl.DateTimeFormat("en-CA", {
	timeZone: "Australia/Melbourne",
	year: "numeric",
	month: "2-digit",
	day: "2-digit"
}).format(/* @__PURE__ */ new Date());
var scheduleBlank = {
	eventDate: melbourneDate(),
	startTime: "08:00",
	title: "",
	assignee: "Site Supervisor 01",
	projectCode: "Business / General",
	tone: "gold",
	notes: ""
};
function currentWeek() {
	const today = /* @__PURE__ */ new Date(`${melbourneDate()}T12:00:00+10:00`);
	const sunday = new Date(today);
	sunday.setDate(today.getDate() - today.getDay());
	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(sunday);
		date.setDate(sunday.getDate() + index);
		return {
			key: new Intl.DateTimeFormat("en-CA", {
				timeZone: "Australia/Melbourne",
				year: "numeric",
				month: "2-digit",
				day: "2-digit"
			}).format(date),
			day: new Intl.DateTimeFormat("en-AU", {
				timeZone: "Australia/Melbourne",
				weekday: "short"
			}).format(date),
			date: new Intl.DateTimeFormat("en-AU", {
				timeZone: "Australia/Melbourne",
				day: "numeric"
			}).format(date)
		};
	});
}
function formatDate(value, options) {
	const date = new Date(value.length === 10 ? `${value}T12:00:00+10:00` : value);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", options ?? {
		day: "numeric",
		month: "short",
		year: "numeric"
	}).format(date);
}
function todayLabel() {
	return new Intl.DateTimeFormat("en-AU", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "Australia/Melbourne"
	}).format(/* @__PURE__ */ new Date());
}
function AdminDashboard({ viewerName, viewerEmail, previewAsOwner }) {
	const router = useRouter();
	const [view, setView] = (0, import_react.useState)("overview");
	const [data, setData] = (0, import_react.useState)(empty);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [working, setWorking] = (0, import_react.useState)(false);
	const [notice, setNotice] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [projectModal, setProjectModal] = (0, import_react.useState)(null);
	const [projectForm, setProjectForm] = (0, import_react.useState)(projectBlank);
	const [requestModal, setRequestModal] = (0, import_react.useState)(null);
	const [requestForm, setRequestForm] = (0, import_react.useState)({
		status: "New",
		priority: "Normal",
		assignedTo: "Unassigned",
		summary: ""
	});
	const [scheduleModal, setScheduleModal] = (0, import_react.useState)(null);
	const [scheduleForm, setScheduleForm] = (0, import_react.useState)(scheduleBlank);
	const [requestFilter, setRequestFilter] = (0, import_react.useState)("All requests");
	const [projectQuery, setProjectQuery] = (0, import_react.useState)("");
	const [recipient, setRecipient] = (0, import_react.useState)("Site Supervisor 01");
	const [draft, setDraft] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		let active = true;
		(async () => {
			setLoading(true);
			setError("");
			try {
				const response = await fetch(viewerEmail.endsWith(".invalid") ? "/api/admin/data?preview=operation-hub" : "/api/admin/data", { cache: "no-store" });
				if (response.status === 401) {
					router.refresh();
					return;
				}
				const result = await response.json();
				if (!response.ok || !result.data) throw new Error(result.error ?? "Admin data could not be loaded.");
				if (active) setData(result.data);
			} catch (reason) {
				if (active) setError(reason instanceof Error ? reason.message : "Admin data could not be loaded.");
			} finally {
				if (active) setLoading(false);
			}
		})();
		return () => {
			active = false;
		};
	}, [router, viewerEmail]);
	async function mutate(method, resource, payload = {}, id, message = "Saved.") {
		setWorking(true);
		setError("");
		try {
			const response = await fetch("/api/admin/data", {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					resource,
					payload,
					id
				})
			});
			if (response.status === 401) {
				router.refresh();
				return false;
			}
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "The change could not be saved.");
			setData(result.data);
			setNotice(message);
			window.setTimeout(() => setNotice(""), 3500);
			return true;
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "The change could not be saved.");
			return false;
		} finally {
			setWorking(false);
		}
	}
	function choose(next) {
		setView(next);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	}
	function openProject(project, request) {
		setProjectModal(project ?? "new");
		setProjectForm(project ? {
			code: project.code,
			name: project.name,
			service: project.service,
			stage: project.stage,
			progress: String(project.progress),
			customerName: project.customerName,
			suburb: project.suburb,
			startDate: project.startDate,
			notes: project.notes
		} : request ? {
			code: request.code.replace(/^(REQ|JOB)/, "ATP"),
			name: `${request.service} · ${request.suburb}`,
			service: request.service,
			stage: "Admin review",
			progress: "0",
			customerName: request.customerName,
			suburb: request.suburb,
			startDate: "",
			notes: `${request.summary}\nSource request: ${request.code}`
		} : { ...projectBlank });
	}
	async function saveProject(event) {
		event.preventDefault();
		const payload = {
			...projectForm,
			progress: Number(projectForm.progress)
		};
		if (projectModal === "new" ? await mutate("POST", "project", payload, void 0, "Project created and added to operations.") : await mutate("PATCH", "project", payload, projectModal?.id, "Project details updated.")) setProjectModal(null);
	}
	function openRequest(request) {
		setRequestModal(request);
		setRequestForm({
			status: request.status,
			priority: request.priority,
			assignedTo: request.assignedTo,
			summary: request.summary
		});
	}
	async function saveRequest(event) {
		event.preventDefault();
		if (requestModal && await mutate("PATCH", "request", requestForm, requestModal.id, "Request follow-up saved.")) setRequestModal(null);
	}
	function openSchedule(item) {
		setScheduleModal(item ?? "new");
		setScheduleForm(item ? {
			eventDate: item.eventDate,
			startTime: item.startTime,
			title: item.title,
			assignee: item.assignee,
			projectCode: item.projectCode,
			tone: item.tone,
			notes: item.notes
		} : {
			...scheduleBlank,
			projectCode: data.projects[0]?.code ?? "Business / General"
		});
	}
	async function saveSchedule(event) {
		event.preventDefault();
		if (scheduleModal === "new" ? await mutate("POST", "schedule", scheduleForm, void 0, `Work scheduled for ${scheduleForm.assignee}.`) : await mutate("PATCH", "schedule", scheduleForm, scheduleModal?.id, "Scheduled work updated.")) setScheduleModal(null);
	}
	async function removeSchedule(item) {
		if (window.confirm(`Remove ${item.title} from the schedule?`)) await mutate("DELETE", "schedule", {}, item.id, "Schedule item removed.");
	}
	async function sendMessage(event) {
		event.preventDefault();
		if (!draft.trim()) return;
		if (await mutate("POST", "message", {
			recipient,
			body: draft.trim()
		}, void 0, `Message sent to ${recipient}.`)) setDraft("");
	}
	async function signOut() {
		await fetch("/api/admin/logout", { method: "POST" });
		router.refresh();
	}
	const newRequests = data.requests.filter((request) => ["New", "Needs review"].includes(request.status));
	const activeProjects = data.projects.filter((project) => project.stage !== "Complete");
	const todayItems = data.scheduleEvents.filter((item) => item.eventDate === melbourneDate());
	const week = currentWeek();
	const filteredRequests = requestFilter === "All requests" ? data.requests : data.requests.filter((request) => request.requestType === requestFilter);
	const filteredProjects = (0, import_react.useMemo)(() => data.projects.filter((project) => `${project.code} ${project.name} ${project.suburb}`.toLowerCase().includes(projectQuery.toLowerCase())), [data.projects, projectQuery]);
	const headers = {
		overview: [
			"Operation Hub · Admin",
			"Keep delivery moving.",
			"Requests, projects, site time and team direction in one black-and-gold operational command centre."
		],
		workflow: [
			"Request-to-project control",
			"Project workflow",
			"Review customer requests, coordinate Site Visits, prepare estimates and control every hand-off."
		],
		issues: [
			"Immediate site escalation",
			"Site delays & problems",
			"Review Site Supervisor reports, record the action and reschedule the next site follow-up."
		],
		followups: [
			"Daily task continuity",
			"Upcoming follow-ups",
			"Record tomorrow’s priorities at clock-out and keep every open follow-up visible."
		],
		workers: [
			"Controlled trade access",
			"Worker assignments",
			"Assign approved Workers, issue tasks, choose file access and review End-of-Day reports."
		],
		tasks: [
			"Operational direction",
			"Team task centre",
			"Assign tasks to Site Supervisors, Electricians, Plumbers and other approved field Workers."
		],
		projects: [
			"Project control",
			"Projects",
			"Create and update operational project records without access to private finance."
		],
		requests: [
			"Intake & follow-up",
			"New requests",
			"Review new project and job requests, contact customers and assign the next action."
		],
		schedule: [
			"Site coordination",
			"Schedule",
			"Send clear dates, times and task directions to the Site Supervisor and team."
		],
		messages: [
			"Team coordination",
			"Messages",
			"Keep project follow-up and site direction inside the management portal."
		]
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: admin_module_default.adminShell,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: admin_module_default.sidebar,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						className: admin_module_default.brandLink,
						href: "/",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
							kind: "tradie",
							tone: "dark",
							className: admin_module_default.sidebarLogo
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: admin_module_default.roleCard,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "AD" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: previewAsOwner ? "Owner preview mode" : "Authenticated role" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: previewAsOwner ? "Admin workspace" : viewerName }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Operational access" })
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: admin_module_default.sidebarNav,
						children: nav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: view === item.id ? admin_module_default.activeNav : "",
							onClick: () => choose(item.id),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavIcon, { icon: item.icon }) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label }),
								item.id === "requests" && newRequests.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: newRequests.length })
							]
						}, item.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: admin_module_default.restrictedCard,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Restricted by Owner" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Finance · Owner settings" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Worker delivery controls are available; private Owner authority remains locked." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: admin_module_default.sidebarBottom,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Secure session active" })] }),
							previewAsOwner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								href: "/owner",
								children: "← Back to Owner"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: signOut,
								children: "Sign out"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								href: "/",
								children: "Public website ↗"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: admin_module_default.mainPanel,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: admin_module_default.topbar,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: admin_module_default.mobileBrand,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
								kind: "tradie",
								tone: "dark",
								className: admin_module_default.mobileLogo
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: todayLabel() }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Alert Tradie Pro · Operation Hub" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: admin_module_default.profileChip,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "AD" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: previewAsOwner ? "Admin preview" : viewerName }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: viewerEmail })] })]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: admin_module_default.content,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: admin_module_default.pageHeading,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: admin_module_default.eyebrow,
									children: headers[view][0]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: headers[view][1] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: headers[view][2] })
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: admin_module_default.headingActions,
								children: [
									view === "projects" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: admin_module_default.primaryButton,
										onClick: () => openProject(),
										children: "＋ New project"
									}),
									view === "schedule" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: admin_module_default.primaryButton,
										onClick: () => openSchedule(),
										children: "＋ Schedule site time"
									}),
									view === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: admin_module_default.secondaryButton,
										onClick: () => choose("requests"),
										children: "Review requests"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: admin_module_default.primaryButton,
										onClick: () => openSchedule(),
										children: "Schedule work"
									})] })
								]
							})]
						}),
						(notice || error) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `${admin_module_default.notice} ${error ? admin_module_default.errorNotice : ""}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error ? "!" : "✓" }),
								error || notice,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										setNotice("");
										setError("");
									},
									children: "×"
								})
							]
						}),
						loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: admin_module_default.loading,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Opening live operations…"]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							view === "workflow" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkflowBoard, { role: "admin" }),
							view === "issues" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperationsControlPanel, {
								role: "admin",
								mode: "issues",
								preview: viewerEmail.includes(".local")
							}),
							view === "followups" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperationsControlPanel, {
								role: "admin",
								mode: "followups",
								preview: viewerEmail.includes(".local")
							}),
							view === "workers" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkerManagementPanel, { role: "admin" }),
							view === "tasks" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								!previewAsOwner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskInbox, {
									role: "Admin",
									preview: viewerEmail.includes(".local"),
									compact: true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperationsControlPanel, {
									role: "admin",
									mode: "followups",
									preview: viewerEmail.includes(".local")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskManagementPanel, {
									role: "admin",
									scope: "operations"
								})
							] }),
							view === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperationsControlPanel, {
									role: "admin",
									mode: "alerts",
									preview: viewerEmail.includes(".local")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: admin_module_default.metricStrip,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricIcon, { icon: Inbox }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "New requests" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: newRequests.length }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Need follow-up" })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricIcon, { icon: Briefcase }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Active projects" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: activeProjects.length }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [data.projects.length, " project records"] })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricIcon, { icon: CalendarDays }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Today on site" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: todayItems.length }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Scheduled actions" })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricIcon, { icon: MessageSquare }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Team messages" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.messages.length }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Saved conversation entries" })
										] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: admin_module_default.overviewGrid,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: admin_module_default.panel,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: admin_module_default.panelHeading,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Priority intake" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Requests requiring action" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => choose("requests"),
												children: "Open all →"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: admin_module_default.requestQueue,
											children: [newRequests.slice(0, 4).map((request) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => openRequest(request),
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: admin_module_default[`priority${request.priority}`] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
															request.requestType,
															" · ",
															request.code
														] }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
															request.service,
															" — ",
															request.suburb
														] }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
															request.customerName,
															" · ",
															request.status
														] })
													] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })
												]
											}, request.id)), newRequests.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No customer request requires action." })]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: admin_module_default.panel,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: admin_module_default.panelHeading,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Site direction" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Next scheduled work" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => choose("schedule"),
												children: "Full schedule →"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: admin_module_default.nextSchedule,
											children: [data.scheduleEvents.slice(0, 4).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => openSchedule(item),
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("time", { children: [formatDate(item.eventDate, {
														day: "2-digit",
														month: "short"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.startTime })] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: admin_module_default[`tone_${item.tone}`] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
														item.assignee,
														" · ",
														item.projectCode
													] })] })
												]
											}, item.id)), data.scheduleEvents.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No work has been scheduled." })]
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: `${admin_module_default.panel} ${admin_module_default.projectTable}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: admin_module_default.panelHeading,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Operational portfolio" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Projects in motion" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => choose("projects"),
												children: "Manage projects →"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: admin_module_default.tableHeader,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Stage" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delivery" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Next action" })
											]
										}),
										activeProjects.slice(0, 5).map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											className: admin_module_default.projectRow,
											onClick: () => openProject(project),
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: project.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
													project.code,
													" · ",
													project.suburb || project.service
												] })] })] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: project.stage }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { style: { width: `${project.progress}%` } }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [project.progress, "%"] })] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: project.notes || "Review project record" })
											]
										}, project.id)),
										activeProjects.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No active project records." })
									]
								})
							] }),
							view === "projects" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: admin_module_default.controlBar,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "⌕" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: projectQuery,
									onChange: (event) => setProjectQuery(event.target.value),
									placeholder: "Search project, ATP code or suburb"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [filteredProjects.length, " operational records"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => openProject(),
									children: "＋ Add project"
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
								className: admin_module_default.projectCards,
								children: filteredProjects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: admin_module_default.projectCardTop,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: project.code }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: project.stage })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: project.name }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
										project.customerName || "Customer not assigned",
										" · ",
										project.suburb || project.service
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: admin_module_default.progress,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [project.progress, "%"] }), " delivered"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { style: { width: `${project.progress}%` } }) })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Service" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: project.service })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Start" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: project.startDate ? formatDate(project.startDate, {
										day: "numeric",
										month: "short"
									}) : "TBC" })] })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: admin_module_default.projectNote,
										children: project.notes || "No operational note yet."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: admin_module_default.outlineButton,
										onClick: () => openProject(project),
										children: "Edit project details"
									})
								] }, project.id))
							})] }),
							view === "requests" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: admin_module_default.segmented,
								children: [
									"All requests",
									"Project Request",
									"Job Request"
								].map((filter) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: requestFilter === filter ? admin_module_default.segmentActive : "",
									onClick: () => setRequestFilter(filter),
									children: filter
								}, filter))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
								className: admin_module_default.requestGrid,
								children: filteredRequests.map((request) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: admin_module_default.panel,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: request.requestType }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: request.code })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
											className: admin_module_default[`priority${request.priority}`],
											children: request.priority
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: admin_module_default.requestBody,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: request.service }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: request.customerName }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
													request.suburb,
													" · ",
													request.contact
												] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", { children: request.summary }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: request.status })] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Assigned to" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: request.assignedTo })] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Received" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: formatDate(request.submittedAt, {
														day: "numeric",
														month: "short",
														hour: "numeric",
														minute: "2-digit"
													}) })] })
												] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => openRequest(request),
											children: "Follow up"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: admin_module_default.primaryButton,
											onClick: () => openProject(void 0, request),
											children: "Create project →"
										})] })
									]
								}, request.id))
							})] }),
							view === "schedule" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
								className: admin_module_default.weekCalendar,
								children: week.map((date) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: date.day }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: date.date })] }), data.scheduleEvents.filter((item) => item.eventDate === date.key).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: admin_module_default[`event_${item.tone}`],
									onClick: () => openSchedule(item),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.startTime }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.title }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.assignee })
									]
								}, item.id))] }, date.key))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: `${admin_module_default.panel} ${admin_module_default.scheduleList}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: admin_module_default.panelHeading,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Site Supervisor & team time" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Scheduled work" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => openSchedule(),
											children: "＋ Send time & task"
										})]
									}),
									data.scheduleEvents.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("time", { children: [formatDate(item.eventDate, {
											day: "2-digit",
											month: "short"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.startTime })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: admin_module_default[`tone_${item.tone}`] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
											item.projectCode,
											" · ",
											item.assignee,
											item.notes ? ` · ${item.notes}` : ""
										] })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => openSchedule(item),
											children: "Edit"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => removeSchedule(item),
											children: "Remove"
										})] })
									] }, item.id)),
									data.scheduleEvents.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No scheduled work has been saved." })
								]
							})] }),
							view === "messages" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: `${admin_module_default.panel} ${admin_module_default.messageWorkspace}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: admin_module_default.eyebrow,
									children: "Team channels"
								}), [
									"Site Supervisor 01",
									"Owner",
									"Estimator 01",
									"Engineer 01"
								].map((person) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: recipient === person ? admin_module_default.selectedPerson : "",
									onClick: () => setRecipient(person),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: person.split(" ").map((part) => part[0]).slice(0, 2).join("") }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: person }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: person === "Site Supervisor 01" ? "On site" : "Team member" })] })]
								}, person))] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: recipient.split(" ").map((part) => part[0]).slice(0, 2).join("") }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: recipient }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Management portal conversation" })] })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: data.messages.filter((message) => message.sender === recipient || message.recipient === recipient || recipient === "Owner" && [message.sender, message.recipient].includes("Owner")).map((message) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: message.sender === "Admin" ? admin_module_default.ownMessage : admin_module_default.teamMessage,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: message.sender }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: message.body }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatDate(message.sentAt, {
												hour: "numeric",
												minute: "2-digit"
											}) })
										]
									}, message.id)) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
										onSubmit: sendMessage,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: draft,
											onChange: (event) => setDraft(event.target.value),
											placeholder: `Message ${recipient}…`
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											disabled: working,
											children: "Send ↑"
										})]
									})
								] })]
							})
						] })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: admin_module_default.mobileNav,
				children: nav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: view === item.id ? admin_module_default.activeMobileNav : "",
					onClick: () => choose(item.id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavIcon, { icon: item.icon }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label.split(" ")[0] })]
				}, item.id))
			}),
			projectModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: admin_module_default.modalBackdrop,
				onMouseDown: () => setProjectModal(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: admin_module_default.recordModal,
					onSubmit: saveProject,
					onMouseDown: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setProjectModal(null),
							children: "×"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: admin_module_default.eyebrow,
							children: "Operational project record"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: projectModal === "new" ? "Create project" : "Edit project" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: admin_module_default.formGrid,
							children: [
								[
									[
										"ATP project code",
										"code",
										"text"
									],
									[
										"Project name",
										"name",
										"text"
									],
									[
										"Customer name",
										"customerName",
										"text"
									],
									[
										"Suburb",
										"suburb",
										"text"
									],
									[
										"Progress %",
										"progress",
										"number"
									],
									[
										"Start date",
										"startDate",
										"date"
									]
								].map(([label, key, type]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type,
									value: projectForm[key],
									onChange: (event) => setProjectForm((current) => ({
										...current,
										[key]: event.target.value
									})),
									required: ["code", "name"].includes(key)
								})] }, key)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Service" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: projectForm.service,
									onChange: (event) => setProjectForm((current) => ({
										...current,
										service: event.target.value
									})),
									children: services.map((service) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: service }, service))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Stage" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: projectForm.stage,
									onChange: (event) => setProjectForm((current) => ({
										...current,
										stage: event.target.value
									})),
									children: stages.map((stage) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: stage }, stage))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: admin_module_default.fullField,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Operational note" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: projectForm.notes,
										onChange: (event) => setProjectForm((current) => ({
											...current,
											notes: event.target.value
										}))
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: admin_module_default.restrictedNotice,
							children: "Private contract values, balances and Finance records remain Owner-only."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: admin_module_default.primaryButton,
							disabled: working,
							children: working ? "Saving…" : "Save project"
						})
					]
				})
			}),
			requestModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: admin_module_default.modalBackdrop,
				onMouseDown: () => setRequestModal(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: admin_module_default.recordModal,
					onSubmit: saveRequest,
					onMouseDown: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setRequestModal(null),
							children: "×"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: admin_module_default.eyebrow,
							children: [
								requestModal.requestType,
								" · ",
								requestModal.code
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Follow up request" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: admin_module_default.requestSummary,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: requestModal.customerName }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									requestModal.service,
									" · ",
									requestModal.suburb
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: requestModal.contact })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: admin_module_default.formGrid,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: requestForm.status,
									onChange: (event) => setRequestForm((current) => ({
										...current,
										status: event.target.value
									})),
									children: requestStatuses.map((status) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: status }, status))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Priority" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: requestForm.priority,
									onChange: (event) => setRequestForm((current) => ({
										...current,
										priority: event.target.value
									})),
									children: [
										"Normal",
										"High",
										"Urgent"
									].map((priority) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: priority }, priority))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: admin_module_default.fullField,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Assign next action to" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: requestForm.assignedTo,
										onChange: (event) => setRequestForm((current) => ({
											...current,
											assignedTo: event.target.value
										})),
										children: assignees.map((assignee) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: assignee }, assignee))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: admin_module_default.fullField,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Follow-up note" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: requestForm.summary,
										onChange: (event) => setRequestForm((current) => ({
											...current,
											summary: event.target.value
										}))
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: admin_module_default.primaryButton,
							disabled: working,
							children: "Save follow-up"
						})
					]
				})
			}),
			scheduleModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: admin_module_default.modalBackdrop,
				onMouseDown: () => setScheduleModal(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: admin_module_default.recordModal,
					onSubmit: saveSchedule,
					onMouseDown: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setScheduleModal(null),
							children: "×"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: admin_module_default.eyebrow,
							children: "Site time & direction"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: scheduleModal === "new" ? "Schedule work" : "Edit scheduled work" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: admin_module_default.formGrid,
							children: [
								[
									[
										"Date",
										"eventDate",
										"date"
									],
									[
										"Start time",
										"startTime",
										"time"
									],
									[
										"Task / work",
										"title",
										"text"
									]
								].map(([label, key, type]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type,
									value: scheduleForm[key],
									onChange: (event) => setScheduleForm((current) => ({
										...current,
										[key]: event.target.value
									})),
									required: true
								})] }, key)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Assignee" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: scheduleForm.assignee,
									onChange: (event) => setScheduleForm((current) => ({
										...current,
										assignee: event.target.value
									})),
									children: assignees.filter((item) => item !== "Unassigned").map((assignee) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: assignee }, assignee))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: scheduleForm.projectCode,
									onChange: (event) => setScheduleForm((current) => ({
										...current,
										projectCode: event.target.value
									})),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Business / General" }), data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: project.code,
										children: project.code
									}, project.id))]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Calendar colour" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: scheduleForm.tone,
									onChange: (event) => setScheduleForm((current) => ({
										...current,
										tone: event.target.value
									})),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "gold",
											children: "Gold"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "blue",
											children: "Blue"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "green",
											children: "Green"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "orange",
											children: "Orange"
										})
									]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: admin_module_default.fullField,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Site direction / note" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: scheduleForm.notes,
										onChange: (event) => setScheduleForm((current) => ({
											...current,
											notes: event.target.value
										}))
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: admin_module_default.primaryButton,
							disabled: working,
							children: working ? "Saving…" : `Send time to ${scheduleForm.assignee}`
						})
					]
				})
			})
		]
	});
}
//#endregion
export { AdminDashboard as default };
