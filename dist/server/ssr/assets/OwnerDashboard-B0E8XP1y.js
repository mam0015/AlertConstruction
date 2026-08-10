import { b as require_react, t as require_jsx_runtime, u as useRouter, w as __toESM } from "../index.js";
import Link from "./link-DXveEjG3.js";
import { t as BrandLogo } from "./BrandLogo-D0AA1HMO.js";
import { t as owner_module_default } from "./owner.module-_-hgwW9O.js";
//#region app/owner/OwnerDashboard.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var empty = {
	projects: [],
	financeEntries: [],
	scheduleEvents: [],
	eodReports: [],
	messages: [],
	permissions: {
		role: "Admin",
		projects: 1,
		schedule: 1,
		finance: 0,
		financeExport: 0
	},
	staffRequests: []
};
var nav = [
	{
		id: "dashboard",
		label: "Executive overview",
		icon: "◈"
	},
	{
		id: "projects",
		label: "Project portfolio",
		icon: "▦"
	},
	{
		id: "finance",
		label: "Financial command",
		icon: "$"
	},
	{
		id: "schedule",
		label: "Master schedule",
		icon: "□"
	},
	{
		id: "team",
		label: "People & attendance",
		icon: "◉"
	},
	{
		id: "staff",
		label: "New staff",
		icon: "+"
	},
	{
		id: "eod",
		label: "Daily approvals",
		icon: "✓"
	},
	{
		id: "messages",
		label: "Team intelligence",
		icon: "↗"
	},
	{
		id: "access",
		label: "Authority controls",
		icon: "⚙"
	}
];
var attendance = [
	{
		i: "AD",
		name: "Admin 01",
		role: "Admin",
		inn: "7:58 am",
		out: "—",
		hours: "3h 14m",
		status: "Online"
	},
	{
		i: "SS",
		name: "Site Supervisor 01",
		role: "Site Supervisor",
		inn: "7:16 am",
		out: "—",
		hours: "3h 56m",
		status: "On site"
	},
	{
		i: "W1",
		name: "Worker 01",
		role: "Worker",
		inn: "7:31 am",
		out: "4:02 pm",
		hours: "8h 01m",
		status: "Checked out"
	},
	{
		i: "W2",
		name: "Worker 02",
		role: "Worker",
		inn: "8:04 am",
		out: "—",
		hours: "3h 08m",
		status: "Online"
	}
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
], services = [
	"Home Renovation",
	"Bathroom Renovation",
	"Kitchen Renovation",
	"Home Extension",
	"New Home",
	"Building Inspection",
	"Maintenance & Repairs",
	"Engineering"
], categories = [
	"Customer payment",
	"Progress payment",
	"Invoice",
	"Materials",
	"Trade payment",
	"Labour",
	"Plumbing",
	"Electrical",
	"Equipment",
	"Permits",
	"Other"
];
var staffRoleOptions = [
	"Admin",
	"Manager",
	"Site Supervisor",
	"Worker",
	"Electrician",
	"Plumber",
	"Cleaner",
	"Carpenter",
	"Plasterer",
	"Tiler"
];
var pf0 = {
	code: "",
	name: "",
	service: "Home Renovation",
	stage: "Admin review",
	progress: "0",
	contractValue: "",
	balance: "",
	customerName: "",
	suburb: "",
	startDate: "",
	notes: ""
}, ff0 = {
	type: "Outcome",
	category: "Materials",
	projectCode: "Business / General",
	amount: "",
	entryDate: "2026-08-09",
	note: ""
}, sf0 = {
	eventDate: "2026-08-10",
	startTime: "08:00",
	title: "",
	assignee: "",
	projectCode: "Business / General",
	tone: "gold",
	notes: ""
};
var money = (c) => new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD",
	maximumFractionDigits: 0
}).format(c / 100);
var date = (v, o) => {
	const d = new Date(v.length === 10 ? `${v}T12:00:00+10:00` : v);
	return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat("en-AU", o ?? {
		day: "numeric",
		month: "short",
		year: "numeric"
	}).format(d);
};
function series(entries, period) {
	const m = /* @__PURE__ */ new Map();
	for (const e of entries) {
		const d = /* @__PURE__ */ new Date(`${e.entryDate}T12:00:00+10:00`);
		let key = e.projectCode, label = e.projectCode.replace("ATP-2026-", "ATP-"), order = key;
		if (period === "Monthly") {
			key = e.entryDate.slice(0, 7);
			label = new Intl.DateTimeFormat("en-AU", { month: "short" }).format(d);
			order = key;
		} else if (period === "Fortnightly") {
			const x = d.getDate() <= 14 ? 1 : 15;
			key = `${e.entryDate.slice(0, 7)}-${x}`;
			label = `${x === 1 ? "1–14" : "15–end"} ${new Intl.DateTimeFormat("en-AU", { month: "short" }).format(d)}`;
			order = key;
		} else if (period === "Annual") {
			key = e.entryDate.slice(0, 4);
			label = key;
			order = key;
		}
		const r = m.get(key) ?? {
			label,
			income: 0,
			outcome: 0,
			order
		};
		r[e.type === "Income" ? "income" : "outcome"] += e.amount;
		m.set(key, r);
	}
	return [...m.values()].sort((a, b) => a.order.localeCompare(b.order)).slice(-7);
}
function Line({ rows }) {
	const r = rows.length ? rows : [{
		label: "No data",
		income: 0,
		outcome: 0
	}], max = Math.max(1, ...r.flatMap((x) => [x.income, x.outcome])), step = r.length > 1 ? 520 / (r.length - 1) : 0, pts = (k) => r.map((x, i) => `${54 + i * step},${178 - x[k] / max * 132}`).join(" ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: owner_module_default.lineChart,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: owner_module_default.chartKey,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Income"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Outcome"] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 620 218",
			role: "img",
			"aria-label": "Income and outcome trend",
			children: [
				[
					46,
					79,
					112,
					145,
					178
				].map((y) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "48",
					x2: "580",
					y1: y,
					y2: y
				}, y)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: pts("outcome") }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: pts("income") }),
				r.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: 54 + i * step,
					y: "210",
					textAnchor: "middle",
					children: x.label
				}, x.label + i))
			]
		})]
	});
}
function Bars({ rows }) {
	const max = Math.max(1, ...rows.flatMap((x) => [x.income, x.outcome]));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: owner_module_default.barChart,
		children: rows.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { height: `${Math.max(3, x.income / max * 100)}%` } }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { height: `${Math.max(3, x.outcome / max * 100)}%` } })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x.label })] }, x.label + i))
	});
}
function Pie({ entries }) {
	const m = /* @__PURE__ */ new Map();
	entries.filter((e) => e.type === "Outcome").forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
	const colors = [
		"#d4ad52",
		"#f0cf7d",
		"#f4f0e7",
		"#8a8378",
		"#5f5a52"
	], items = [...m].sort((a, b) => b[1] - a[1]).slice(0, 5), total = Math.max(1, items.reduce((s, x) => s + x[1], 0));
	const grad = items.map((x, i) => {
		const s = items.slice(0, i).reduce((sum, item) => sum + item[1], 0) / total * 360, e = items.slice(0, i + 1).reduce((sum, item) => sum + item[1], 0) / total * 360;
		return `${colors[i]} ${s}deg ${e}deg`;
	}).join(",");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: owner_module_default.pieLayout,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: owner_module_default.pie,
			style: { background: grad ? `conic-gradient(${grad})` : "#161616" },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [money(total), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Recorded costs" })] })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: owner_module_default.pieLegend,
			children: items.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { background: colors[i] } }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x[0] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [Math.round(x[1] / total * 100), "%"] })
			] }, x[0]))
		})]
	});
}
function Histogram({ entries }) {
	const v = entries.filter((e) => e.type === "Outcome").map((e) => e.amount / 100), counts = [
		[
			"$0–2k",
			0,
			2e3
		],
		[
			"$2–5k",
			2e3,
			5e3
		],
		[
			"$5–10k",
			5e3,
			1e4
		],
		[
			"$10–20k",
			1e4,
			2e4
		],
		[
			"$20k+",
			2e4,
			Infinity
		]
	].map((x) => ({
		label: x[0],
		n: v.filter((y) => y >= x[1] && y < x[2]).length
	})), max = Math.max(1, ...counts.map((x) => x.n));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: owner_module_default.histogram,
		children: counts.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: x.n }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { height: `${Math.max(4, x.n / max * 100)}%` } }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x.label })
		] }, x.label))
	});
}
function Toggle({ checked, onChange, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: `${owner_module_default.toggle} ${checked ? owner_module_default.toggleOn : ""}`,
		type: "button",
		role: "switch",
		"aria-checked": checked,
		"aria-label": label,
		onClick: onChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
	});
}
function OwnerDashboard({ ownerName, ownerEmail }) {
	const router = useRouter(), [view, setView] = (0, import_react.useState)("dashboard"), [data, setData] = (0, import_react.useState)(empty), [loading, setLoading] = (0, import_react.useState)(true), [working, setWorking] = (0, import_react.useState)(false), [notice, setNotice] = (0, import_react.useState)(""), [error, setError] = (0, import_react.useState)(""), [period, setPeriod] = (0, import_react.useState)("Monthly"), [financeProject, setFinanceProject] = (0, import_react.useState)("All projects"), [query, setQuery] = (0, import_react.useState)(""), [projectModal, setProjectModal] = (0, import_react.useState)(null), [pf, setPf] = (0, import_react.useState)(pf0), [financeModal, setFinanceModal] = (0, import_react.useState)(null), [ff, setFf] = (0, import_react.useState)(ff0), [scheduleModal, setScheduleModal] = (0, import_react.useState)(null), [sf, setSf] = (0, import_react.useState)(sf0), [notes, setNotes] = (0, import_react.useState)({}), [draft, setDraft] = (0, import_react.useState)(""), [permission, setPermission] = (0, import_react.useState)(empty.permissions), [staffDrafts, setStaffDrafts] = (0, import_react.useState)({});
	(0, import_react.useEffect)(() => {
		let active = true;
		async function load() {
			setLoading(true);
			try {
				const r = await fetch("/api/owner/data", { cache: "no-store" });
				if (r.status === 401) {
					router.refresh();
					return;
				}
				const j = await r.json();
				if (!r.ok || !j.data) throw new Error(j.error ?? "Owner data could not be loaded.");
				if (active) {
					setData(j.data);
					setPermission(j.data.permissions);
					setNotes(Object.fromEntries(j.data.eodReports.map((x) => [x.id, x.ownerNote])));
					setStaffDrafts(Object.fromEntries(j.data.staffRequests.map((x) => [x.id, {
						role: x.role === "Unassigned" ? "Admin" : x.role,
						tradeTitle: x.tradeTitle
					}])));
				}
			} catch (e) {
				if (active) setError(e instanceof Error ? e.message : "Owner data could not be loaded.");
			} finally {
				if (active) setLoading(false);
			}
		}
		load();
		return () => {
			active = false;
		};
	}, [router]);
	async function mutate(method, resource, payload = {}, id, msg = "Saved.") {
		setWorking(true);
		setError("");
		try {
			const r = await fetch("/api/owner/data", {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					resource,
					payload,
					id
				})
			});
			if (r.status === 401) {
				router.refresh();
				return false;
			}
			const j = await r.json();
			if (!r.ok || !j.data) throw new Error(j.error ?? "The change could not be saved.");
			setData(j.data);
			setPermission(j.data.permissions);
			setNotice(msg);
			setTimeout(() => setNotice(""), 4e3);
			return true;
		} catch (e) {
			setError(e instanceof Error ? e.message : "The change could not be saved.");
			return false;
		} finally {
			setWorking(false);
		}
	}
	const choose = (v) => {
		setView(v);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	function openProject(p) {
		setProjectModal(p ?? "new");
		setPf(p ? {
			code: p.code,
			name: p.name,
			service: p.service,
			stage: p.stage,
			progress: String(p.progress),
			contractValue: String(p.contractValue / 100),
			balance: String(p.balance / 100),
			customerName: p.customerName,
			suburb: p.suburb,
			startDate: p.startDate,
			notes: p.notes
		} : { ...pf0 });
	}
	async function saveProject(e) {
		e.preventDefault();
		const p = {
			...pf,
			progress: Number(pf.progress),
			contractValue: Math.round(Number(pf.contractValue || 0) * 100),
			balance: Math.round(Number(pf.balance || 0) * 100)
		};
		if (projectModal === "new" ? await mutate("POST", "project", p, void 0, "Project created and added to the portfolio.") : await mutate("PATCH", "project", p, projectModal?.id, "Project details updated.")) setProjectModal(null);
	}
	function openFinance(f) {
		setFinanceModal(f ?? "new");
		setFf(f ? {
			type: f.type,
			category: f.category,
			projectCode: f.projectCode,
			amount: String(f.amount / 100),
			entryDate: f.entryDate,
			note: f.note
		} : {
			...ff0,
			projectCode: data.projects[0]?.code ?? "Business / General"
		});
	}
	async function saveFinance(e) {
		e.preventDefault();
		const p = {
			...ff,
			amount: Math.round(Number(ff.amount) * 100)
		};
		if (financeModal === "new" ? await mutate("POST", "finance", p, void 0, "Finance entry recorded. Charts recalculated.") : await mutate("PATCH", "finance", p, financeModal?.id, "Finance entry updated. Charts recalculated.")) setFinanceModal(null);
	}
	function openSchedule(x) {
		setScheduleModal(x ?? "new");
		setSf(x ? {
			eventDate: x.eventDate,
			startTime: x.startTime,
			title: x.title,
			assignee: x.assignee,
			projectCode: x.projectCode,
			tone: x.tone,
			notes: x.notes
		} : {
			...sf0,
			projectCode: data.projects[0]?.code ?? "Business / General"
		});
	}
	async function saveSchedule(e) {
		e.preventDefault();
		if (scheduleModal === "new" ? await mutate("POST", "schedule", sf, void 0, "Schedule item created.") : await mutate("PATCH", "schedule", sf, scheduleModal?.id, "Schedule item updated.")) setScheduleModal(null);
	}
	async function remove(resource, id, label) {
		if (window.confirm(`Delete ${label}? This cannot be undone.`)) await mutate("DELETE", resource, {}, id, `${label} deleted.`);
	}
	async function updateReport(r, status) {
		await mutate("PATCH", "report", {
			status,
			ownerNote: notes[r.id] ?? ""
		}, r.id, `End-of-day report ${status.toLowerCase()}.`);
	}
	async function send(e) {
		e.preventDefault();
		if (!draft.trim()) return;
		if (await mutate("POST", "message", {
			recipient: "Site Supervisor 01",
			body: draft.trim()
		}, void 0, "Message sent.")) setDraft("");
	}
	async function signOut() {
		await fetch("/api/owner/logout", { method: "POST" });
		router.refresh();
	}
	async function reviewStaff(request, status) {
		const draft = staffDrafts[request.id] ?? {
			role: "Admin",
			tradeTitle: ""
		};
		if (status === "Approved" && !draft.role) {
			setError("Choose a role before approving access.");
			return;
		}
		await mutate("PATCH", "staff", {
			status,
			role: draft.role,
			tradeTitle: draft.tradeTitle
		}, request.id, status === "Approved" ? `${request.email} approved as ${draft.role}.` : `${request.email} access rejected.`);
	}
	const projects = (0, import_react.useMemo)(() => data.projects.filter((p) => `${p.code} ${p.name} ${p.suburb}`.toLowerCase().includes(query.toLowerCase())), [data.projects, query]), finance = financeProject === "All projects" ? data.financeEntries : data.financeEntries.filter((f) => f.projectCode === financeProject), rows = series(finance, period), income = data.financeEntries.filter((x) => x.type === "Income").reduce((s, x) => s + x.amount, 0), outcome = data.financeEntries.filter((x) => x.type === "Outcome").reduce((s, x) => s + x.amount, 0), net = income - outcome, margin = income ? net / income * 100 : 0, pending = data.eodReports.filter((x) => x.status === "Pending").length, pendingStaff = data.staffRequests.filter((x) => x.status === "Pending").length, active = data.projects.filter((x) => x.stage !== "Complete").length, selected = data.projects.find((p) => p.code === (financeProject === "All projects" ? data.projects[0]?.code : financeProject)), se = data.financeEntries.filter((x) => x.projectCode === selected?.code), paid = se.filter((x) => x.type === "Income").reduce((s, x) => s + x.amount, 0), cost = se.filter((x) => x.type === "Outcome").reduce((s, x) => s + x.amount, 0);
	const heads = {
		dashboard: [
			"Operation Hub · Owner",
			`Good morning, ${ownerName.split(" ")[0]}.`,
			"Projects, finance, people and approvals inside one black-and-gold command centre."
		],
		projects: [
			"Portfolio governance",
			"Project portfolio",
			"Create, edit and control every request, inspection, estimate and live project."
		],
		finance: [
			"Private owner finance",
			"Financial command",
			"Live income, outcomes, margins and project positions calculated from saved records."
		],
		schedule: [
			"Operational direction",
			"Master schedule",
			"Set the work, assign responsibility and keep delivery under control."
		],
		team: [
			"People intelligence",
			"Team & attendance",
			"Review check-ins, hours and current working status."
		],
		staff: [
			"Owner approval queue",
			"New staff",
			"Review new sign-ins, assign the correct role and open only the workspace they need."
		],
		eod: [
			"Owner authority",
			"Daily approvals",
			"Review completed work, leave direction and approve or reject reports."
		],
		messages: [
			"Operational intelligence",
			"Team communication",
			"Keep decisions and project conversations inside the owner environment."
		],
		access: [
			"Governance",
			"Authority controls",
			"Decide what Admin may see. Finance stays private unless you grant it."
		]
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: owner_module_default.ownerShell,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: owner_module_default.sidebar,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						className: owner_module_default.brandLink,
						href: "/",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
							kind: "tradie",
							tone: "dark",
							className: owner_module_default.sidebarLogo
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: owner_module_default.executiveIdentity,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "AM" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Authenticated owner" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: ownerName }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Full executive authority" })
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: owner_module_default.sidebarNav,
						children: nav.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: view === n.id ? owner_module_default.activeNav : "",
							onClick: () => choose(n.id),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: n.icon }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: n.label }),
								n.id === "eod" && pending > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: pending }),
								n.id === "staff" && pendingStaff > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: pendingStaff })
							]
						}, n.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: owner_module_default.sidebarBottom,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Secure session active" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
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
				className: owner_module_default.mainPanel,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: owner_module_default.topbar,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: owner_module_default.mobileBrand,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
								kind: "tradie",
								tone: "dark",
								className: owner_module_default.mobileLogo
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: owner_module_default.topbarMeta,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Monday, 10 August 2026" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Alert Tradie Pro · Operation Hub" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: owner_module_default.profileChip,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "AM" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: ownerName.split(" ")[0] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: ownerEmail })] })]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: owner_module_default.content,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: owner_module_default.commandHeading,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: owner_module_default.eyebrow,
									children: heads[view][0]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: heads[view][1] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: heads[view][2] })
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: owner_module_default.headingActions,
								children: [
									view === "projects" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: owner_module_default.primaryButton,
										onClick: () => openProject(),
										children: "＋ New project"
									}),
									view === "finance" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: owner_module_default.primaryButton,
										onClick: () => openFinance(),
										children: "＋ Record entry"
									}),
									view === "schedule" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: owner_module_default.primaryButton,
										onClick: () => openSchedule(),
										children: "＋ Schedule work"
									}),
									view === "staff" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: owner_module_default.pendingLabel,
										children: [pendingStaff, " waiting"]
									}),
									view === "dashboard" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: owner_module_default.secondaryButton,
										onClick: () => choose("schedule"),
										children: "Master schedule"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: owner_module_default.primaryButton,
										onClick: () => choose("projects"),
										children: "Project portfolio"
									})] })
								]
							})]
						}),
						(notice || error) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `${owner_module_default.notice} ${error ? owner_module_default.errorNotice : ""}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error ? "!" : "✓" }),
								error || notice,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										setError("");
										setNotice("");
									},
									children: "×"
								})
							]
						}),
						loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: owner_module_default.loadingState,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Opening your live owner records…"]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							view === "dashboard" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: owner_module_default.executiveMetrics,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Portfolio in motion" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: active }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [data.projects.length, " saved projects"] })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner decisions" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: pending + pendingStaff }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
												pendingStaff,
												" staff · ",
												pending,
												" daily reports"
											] })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Capital received" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(income) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "All recorded projects" })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Net position" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(net) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [margin.toFixed(1), "% recorded margin"] })
										] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: owner_module_default.dashboardGrid,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: owner_module_default.panel,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: owner_module_default.panelHeading,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Operation Hub · private finance" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Business position" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => choose("finance"),
													children: "Open finance →"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: owner_module_default.financeTotals,
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Income" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(income) })] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Outcome" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(outcome) })] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Net" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(net) })] })
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, { rows: series(data.financeEntries, "Monthly") })
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: owner_module_default.panel,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: owner_module_default.panelHeading,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner decision queue" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Requires attention" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => choose(pendingStaff ? "staff" : "eod"),
												children: "Review all →"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: owner_module_default.decisionList,
											children: [data.staffRequests.filter((r) => r.status === "Pending").slice(0, 2).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => choose("staff"),
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "NS" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "New staff request" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: r.email }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Team Code accepted · role assignment required" })
													] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "→" })
												]
											}, `staff-${r.id}`)), data.eodReports.filter((r) => r.status === "Pending").slice(0, 3).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => choose("eod"),
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: r.person.slice(0, 2).toUpperCase() }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: r.person }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: r.projectCode }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: r.summary })
													] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "→" })
												]
											}, r.id))]
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: `${owner_module_default.panel} ${owner_module_default.portfolioTable}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: owner_module_default.panelHeading,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Live portfolio" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Priority projects" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => choose("projects"),
												children: "Manage portfolio →"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: owner_module_default.tableHeader,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Stage" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delivery" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Contract" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Balance" })
											]
										}),
										data.projects.slice(0, 4).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											className: owner_module_default.projectRow,
											onClick: () => {
												choose("projects");
												setQuery(p.code);
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: p.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
													p.code,
													" · ",
													p.suburb || p.service
												] })] })] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.stage }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { style: { width: `${p.progress}%` } }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [p.progress, "%"] })] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: p.contractValue ? money(p.contractValue) : "TBC" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: p.balance ? money(p.balance) : "—" })
											]
										}, p.id))
									]
								})
							] }),
							view === "projects" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: owner_module_default.controlBar,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "⌕" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: query,
									onChange: (e) => setQuery(e.target.value),
									placeholder: "Search project, ATP code or suburb"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [projects.length, " records"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => openProject(),
									children: "＋ Add project"
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
								className: owner_module_default.projectCards,
								children: projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: owner_module_default.projectCardTop,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: String(p.id).padStart(2, "0") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: p.stage })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: p.code }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: p.name }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [p.service, p.suburb ? ` · ${p.suburb}` : ""] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: owner_module_default.projectCardProgress,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [p.progress, "%"] }), " delivered"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { style: { width: `${p.progress}%` } }) })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Contract" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: p.contractValue ? money(p.contractValue) : "TBC" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Balance" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: p.balance ? money(p.balance) : "—" })] })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: owner_module_default.recordActions,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => openProject(p),
											children: "Edit details"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => remove("project", p.id, p.code),
											children: "Delete"
										})]
									})
								] }, p.id))
							})] }),
							view === "finance" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: owner_module_default.financeMetricStrip,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total income" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(finance.filter((x) => x.type === "Income").reduce((s, x) => s + x.amount, 0)) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Saved income" })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total outcome" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(finance.filter((x) => x.type === "Outcome").reduce((s, x) => s + x.amount, 0)) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Saved expenses" })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Current position" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(finance.reduce((s, x) => s + (x.type === "Income" ? x.amount : -x.amount), 0)) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Income less outcome" })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Recorded entries" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: finance.length }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Editable audit trail" })
										] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: owner_module_default.financeControls,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: [
										"Fortnightly",
										"Monthly",
										"Annual",
										"By project"
									].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: period === x ? owner_module_default.selectedSegment : "",
										onClick: () => setPeriod(x),
										children: x
									}, x)) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: financeProject,
										onChange: (e) => setFinanceProject(e.target.value),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "All projects" }), data.projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: p.code,
											children: p.name
										}, p.id))]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: owner_module_default.chartsGrid,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: owner_module_default.panel,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: owner_module_default.panelHeading,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [period, " comparison"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Income vs outcome" })] })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bars, { rows })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: owner_module_default.panel,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: owner_module_default.panelHeading,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Cost structure" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Outcome allocation" })] })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, { entries: finance })]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: owner_module_default.chartsGrid,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: owner_module_default.panel,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: owner_module_default.panelHeading,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Cash movement" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Recorded trend" })] })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, { rows })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: owner_module_default.panel,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: owner_module_default.panelHeading,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Transaction intelligence" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Outcome distribution" })] })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Histogram, { entries: finance })]
									})]
								}),
								selected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: `${owner_module_default.panel} ${owner_module_default.projectProfitPanel}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: owner_module_default.panelHeading,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project position" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: selected.name })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("i", { children: [
											selected.stage,
											" · ",
											selected.progress,
											"%"
										] })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: owner_module_default.projectProfitStats,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Contract" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(selected.contractValue) })] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Customer paid" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(paid) })] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Costs" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(cost) })] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Current position" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(paid - cost) })] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Contract less cost" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(selected.contractValue - cost) })] })
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: `${owner_module_default.panel} ${owner_module_default.transactionsPanel}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: owner_module_default.panelHeading,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Editable audit trail" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Finance records" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => openFinance(),
											children: "＋ Record entry"
										})]
									}), finance.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: owner_module_default.transactionRow,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: f.type === "Income" ? owner_module_default.incomeType : owner_module_default.outcomeType,
												children: f.type
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: f.category }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [f.projectCode, f.note ? ` · ${f.note}` : ""] })] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: date(f.entryDate, {
												day: "numeric",
												month: "short",
												year: "2-digit"
											}) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [f.type === "Income" ? "+" : "−", money(f.amount)] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => openFinance(f),
												children: "Edit"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => remove("finance", f.id, `${f.category} entry`),
												children: "Delete"
											})] })
										]
									}, f.id))]
								})
							] }),
							view === "schedule" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
								className: owner_module_default.calendarGrid,
								children: Array.from({ length: 31 }, (_, i) => i + 1).map((day) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: day }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Aug" })] }), data.scheduleEvents.filter((x) => Number(x.eventDate.slice(-2)) === day).map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: owner_module_default[`event_${x.tone}`] ?? owner_module_default.event_gold,
									onClick: () => openSchedule(x),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
										x.startTime,
										" · ",
										x.title
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: x.assignee })]
								}, x.id))] }, day))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: `${owner_module_default.panel} ${owner_module_default.scheduleList}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: owner_module_default.panelHeading,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Master schedule records" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Upcoming work" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => openSchedule(),
										children: "＋ Schedule work"
									})]
								}), data.scheduleEvents.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("time", { children: [date(x.eventDate, {
										day: "2-digit",
										month: "short"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: x.startTime })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: owner_module_default[`eventDot_${x.tone}`] ?? owner_module_default.eventDot_gold }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: x.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
										x.projectCode,
										" · ",
										x.assignee
									] })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => openSchedule(x),
										children: "Edit"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => remove("schedule", x.id, x.title),
										children: "Delete"
									})] })
								] }, x.id))]
							})] }),
							view === "team" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: `${owner_module_default.panel} ${owner_module_default.attendancePanel}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: owner_module_default.panelHeading,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Live team record" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Today’s attendance" })] })
								}), attendance.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: owner_module_default.attendanceRow,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.i }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: p.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: p.role })] })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.inn }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.out }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: p.hours }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: p.status })
									]
								}, p.name))]
							}),
							view === "staff" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: owner_module_default.staffWorkspace,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: owner_module_default.staffSummary,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Pending approval" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: pendingStaff }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Team Code verified" })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Approved staff" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.staffRequests.filter((x) => x.status === "Approved").length }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Role-based access active" })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner control" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "100%" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "No automatic staff entry" })
										] })
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: owner_module_default.staffGrid,
									children: data.staffRequests.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: `${owner_module_default.panel} ${owner_module_default.emptyStaff}`,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "+" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "No staff requests yet" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "When a team member enters email, password and the company Team Code, the request will appear here." })
										]
									}) : data.staffRequests.map((request) => {
										const staffDraft = staffDrafts[request.id] ?? {
											role: request.role === "Unassigned" ? "Admin" : request.role,
											tradeTitle: request.tradeTitle
										};
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
											className: `${owner_module_default.panel} ${owner_module_default.staffCard}`,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: owner_module_default.staffAvatar,
														children: request.email.slice(0, 2).toUpperCase()
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Staff access request" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: request.email }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["Team Code verified · ", date(request.requestedAt)] })
													] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
														className: owner_module_default[`staff${request.status}`],
														children: request.status
													})
												] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: owner_module_default.staffControls,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Assign role" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
														value: staffDraft.role,
														onChange: (e) => setStaffDrafts((all) => ({
															...all,
															[request.id]: {
																...staffDraft,
																role: e.target.value
															}
														})),
														children: staffRoleOptions.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: role }, role))
													})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Trade / position label" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														value: staffDraft.tradeTitle,
														onChange: (e) => setStaffDrafts((all) => ({
															...all,
															[request.id]: {
																...staffDraft,
																tradeTitle: e.target.value
															}
														})),
														placeholder: "e.g. Worker 01, Lead Electrician"
													})] })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: owner_module_default.staffAccessPreview,
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Workspace after approval" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: staffDraft.role }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: staffDraft.role === "Admin" ? "Projects, new requests, schedule and team messages. Finance and Team Management remain hidden." : staffDraft.role === "Manager" ? "Assigned project coordination with no private company Finance." : staffDraft.role === "Site Supervisor" ? "My Workday, site schedule, checklists, photos and EOD reports." : "Role-specific My Workday access only. No Finance or Owner controls." })
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => reviewStaff(request, "Rejected"),
													disabled: working,
													children: "Reject"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													className: owner_module_default.primaryButton,
													onClick: () => reviewStaff(request, "Approved"),
													disabled: working,
													children: "✓ Approve & open access"
												})] })
											]
										}, request.id);
									})
								})]
							}),
							view === "eod" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: owner_module_default.eodLayout,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: data.eodReports.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: `${owner_module_default.panel} ${owner_module_default.eodCard}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: r.person.slice(0, 2).toUpperCase() }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: r.person }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
												r.role,
												" · ",
												r.projectCode
											] })] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: r.status })
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: owner_module_default.eodBody,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Work completed" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: r.summary }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["Submitted ", date(r.submittedAt)] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner direction" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: notes[r.id] ?? "",
											onChange: (e) => setNotes((n) => ({
												...n,
												[r.id]: e.target.value
											}))
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => updateReport(r, "Rejected"),
												children: "Reject"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => updateReport(r, r.status),
												children: "Save note"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => updateReport(r, "Approved"),
												children: "✓ Approve day"
											})
										] })
									]
								}, r.id)) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
									className: owner_module_default.panel,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Today’s authority queue" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
											data.eodReports.length - pending,
											" / ",
											data.eodReports.length
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Reports approved or reviewed by Owner." })
									]
								})]
							}),
							view === "messages" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: `${owner_module_default.panel} ${owner_module_default.messageWorkspace}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Project channels" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Site Supervisor 01" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ATP-2026-00124" })] })] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Site Supervisor 01" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "On site · ATP-2026-00124" })] })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: data.messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: m.sender === "Owner" ? owner_module_default.ownMessage : owner_module_default.teamMessage,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: m.sender }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: m.body }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: date(m.sentAt, {
												hour: "numeric",
												minute: "2-digit"
											}) })
										]
									}, m.id)) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
										onSubmit: send,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: draft,
											onChange: (e) => setDraft(e.target.value),
											placeholder: "Write a direction or message…"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { children: "Send ↑" })]
									})
								] })]
							}),
							view === "access" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: owner_module_default.accessLayout,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: `${owner_module_default.panel} ${owner_module_default.permissionsPanel}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: owner_module_default.panelHeading,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delegated authority" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Admin access" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "Owner controlled" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: owner_module_default.permissionList,
											children: [
												[
													"Projects & customer requests",
													"Create, assign and update operational records.",
													"projects"
												],
												[
													"Master schedule",
													"Create tasks, assign work and record changes.",
													"schedule"
												],
												[
													"Private finance dashboard",
													"Income, outcomes, project positions and charts.",
													"finance"
												],
												[
													"Finance export",
													"Download financial and profitability records.",
													"financeExport"
												]
											].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: x[0] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: x[1] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
												checked: Boolean(permission[x[2]]),
												onChange: () => setPermission((p) => ({
													...p,
													[x[2]]: p[x[2]] ? 0 : 1
												})),
												label: `Toggle ${x[0]}`
											})] }, x[2]))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Saved to the secure owner database." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: owner_module_default.primaryButton,
											onClick: () => mutate("PATCH", "permission", permission, "Admin", "Admin permissions saved."),
											children: "Save authority settings"
										})] })
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
									className: owner_module_default.panel,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Current Admin position" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: permission.finance ? "Finance delegated" : "Finance remains private" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Customer access is never permitted." })
									]
								})]
							})
						] })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: owner_module_default.mobileNav,
				children: nav.slice(0, 6).map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: view === n.id ? owner_module_default.activeMobileNav : "",
					onClick: () => choose(n.id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: n.icon }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: n.label.split(" ")[0] })]
				}, n.id))
			}),
			projectModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: owner_module_default.modalBackdrop,
				onMouseDown: () => setProjectModal(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: owner_module_default.recordModal,
					onSubmit: saveProject,
					onMouseDown: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setProjectModal(null),
							children: "×"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: owner_module_default.eyebrow,
							children: "Portfolio record"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: projectModal === "new" ? "Create a project" : "Edit project" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: owner_module_default.formGrid,
							children: [
								[
									["ATP project code", "code"],
									["Project name", "name"],
									["Progress %", "progress"],
									["Contract value (AUD)", "contractValue"],
									["Outstanding balance (AUD)", "balance"],
									["Customer name", "customerName"],
									["Suburb", "suburb"],
									["Start date", "startDate"]
								].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x[0] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: x[1] === "startDate" ? "date" : [
										"progress",
										"contractValue",
										"balance"
									].includes(x[1]) ? "number" : "text",
									value: pf[x[1]],
									onChange: (e) => setPf((p) => ({
										...p,
										[x[1]]: e.target.value
									})),
									required: ["code", "name"].includes(x[1])
								})] }, x[1])),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Service" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: pf.service,
									onChange: (e) => setPf((p) => ({
										...p,
										service: e.target.value
									})),
									children: services.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: x }, x))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Stage" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: pf.stage,
									onChange: (e) => setPf((p) => ({
										...p,
										stage: e.target.value
									})),
									children: stages.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: x }, x))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: owner_module_default.fullField,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: pf.notes,
										onChange: (e) => setPf((p) => ({
											...p,
											notes: e.target.value
										}))
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: owner_module_default.primaryButton,
							disabled: working,
							children: working ? "Saving…" : "Save project"
						})
					]
				})
			}),
			financeModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: owner_module_default.modalBackdrop,
				onMouseDown: () => setFinanceModal(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: owner_module_default.recordModal,
					onSubmit: saveFinance,
					onMouseDown: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setFinanceModal(null),
							children: "×"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: owner_module_default.eyebrow,
							children: "Private finance"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: financeModal === "new" ? "Record finance entry" : "Edit finance entry" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: owner_module_default.typeSelector,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ff.type === "Income" ? owner_module_default.selectedType : "",
								onClick: () => setFf((f) => ({
									...f,
									type: "Income"
								})),
								children: "Income"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ff.type === "Outcome" ? owner_module_default.selectedType : "",
								onClick: () => setFf((f) => ({
									...f,
									type: "Outcome"
								})),
								children: "Outcome"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: owner_module_default.formGrid,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Amount (AUD)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									step: ".01",
									value: ff.amount,
									onChange: (e) => setFf((f) => ({
										...f,
										amount: e.target.value
									})),
									required: true
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "date",
									value: ff.entryDate,
									onChange: (e) => setFf((f) => ({
										...f,
										entryDate: e.target.value
									}))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: ff.projectCode,
									onChange: (e) => setFf((f) => ({
										...f,
										projectCode: e.target.value
									})),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Business / General" }), data.projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: p.code,
										children: p.code
									}, p.id))]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Category" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: ff.category,
									onChange: (e) => setFf((f) => ({
										...f,
										category: e.target.value
									})),
									children: categories.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: x }, x))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: owner_module_default.fullField,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reference / note" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: ff.note,
										onChange: (e) => setFf((f) => ({
											...f,
											note: e.target.value
										}))
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: owner_module_default.primaryButton,
							disabled: working,
							children: "Save finance entry"
						})
					]
				})
			}),
			scheduleModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: owner_module_default.modalBackdrop,
				onMouseDown: () => setScheduleModal(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: owner_module_default.recordModal,
					onSubmit: saveSchedule,
					onMouseDown: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setScheduleModal(null),
							children: "×"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: owner_module_default.eyebrow,
							children: "Master schedule"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: scheduleModal === "new" ? "Schedule work" : "Edit scheduled work" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: owner_module_default.formGrid,
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
										"Work / task",
										"title",
										"text"
									],
									[
										"Assignee",
										"assignee",
										"text"
									]
								].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x[0] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: x[2],
									value: sf[x[1]],
									onChange: (e) => setSf((s) => ({
										...s,
										[x[1]]: e.target.value
									})),
									required: true
								})] }, x[1])),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: sf.projectCode,
									onChange: (e) => setSf((s) => ({
										...s,
										projectCode: e.target.value
									})),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Business / General" }), data.projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: p.code,
										children: p.code
									}, p.id))]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Colour" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: sf.tone,
									onChange: (e) => setSf((s) => ({
										...s,
										tone: e.target.value
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
									className: owner_module_default.fullField,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Direction / notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: sf.notes,
										onChange: (e) => setSf((s) => ({
											...s,
											notes: e.target.value
										}))
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: owner_module_default.primaryButton,
							disabled: working,
							children: "Save schedule"
						})
					]
				})
			})
		]
	});
}
//#endregion
export { OwnerDashboard as default };
