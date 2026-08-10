import { b as require_react, c as useParams, t as require_jsx_runtime, w as __toESM } from "../index.js";
import Link from "./link-DXveEjG3.js";
import { t as BrandLogo } from "./BrandLogo-D0AA1HMO.js";
//#region app/track/[code]/track.module.css
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var track_module_default = {
	portalShell: "_portalShell_170dz_1",
	lookupState: "_lookupState_170dz_10",
	kicker: "_kicker_170dz_28",
	emptySchedule: "_emptySchedule_170dz_45",
	messagePanel: "_messagePanel_170dz_61",
	messageError: "_messageError_170dz_66",
	header: "_header_170dz_72",
	logoLink: "_logoLink_170dz_86",
	logo: "_logo_170dz_86",
	headerNav: "_headerNav_170dz_96",
	exitLink: "_exitLink_170dz_113",
	portalBar: "_portalBar_170dz_119",
	reference: "_reference_170dz_133",
	statusLabel: "_statusLabel_170dz_141",
	hero: "_hero_170dz_151",
	heroHeading: "_heroHeading_170dz_160",
	statusBoard: "_statusBoard_170dz_161",
	workspace: "_workspace_170dz_162",
	footer: "_footer_170dz_163",
	heroCopy: "_heroCopy_170dz_195",
	updated: "_updated_170dz_203",
	miniLabel: "_miniLabel_170dz_212",
	projectIdentity: "_projectIdentity_170dz_236",
	progressPanel: "_progressPanel_170dz_237",
	nextVisit: "_nextVisit_170dz_238",
	progressRing: "_progressRing_170dz_304",
	updateCopy: "_updateCopy_170dz_344",
	actionCard: "_actionCard_170dz_345",
	dateBlock: "_dateBlock_170dz_361",
	visitConfirmed: "_visitConfirmed_170dz_382",
	tabs: "_tabs_170dz_397",
	activeTab: "_activeTab_170dz_432",
	overviewGrid: "_overviewGrid_170dz_440",
	documentsGrid: "_documentsGrid_170dz_441",
	timelinePanel: "_timelinePanel_170dz_448",
	schedulePanel: "_schedulePanel_170dz_449",
	documentsPanel: "_documentsPanel_170dz_450",
	sectionTitle: "_sectionTitle_170dz_458",
	timeline: "_timeline_170dz_448",
	timelineMarker: "_timelineMarker_170dz_507",
	done: "_done_170dz_542",
	current: "_current_170dz_552",
	sideColumn: "_sideColumn_170dz_563",
	updateCard: "_updateCard_170dz_569",
	updateImage: "_updateImage_170dz_577",
	documentList: "_documentList_170dz_615",
	inlineNotice: "_inlineNotice_170dz_631",
	scheduleList: "_scheduleList_170dz_651",
	scheduleRow: "_scheduleRow_170dz_656",
	scheduleDate: "_scheduleDate_170dz_666",
	scheduleName: "_scheduleName_170dz_679",
	scheduleTime: "_scheduleTime_170dz_680",
	scheduleStatus: "_scheduleStatus_170dz_703",
	confirmed: "_confirmed_170dz_711",
	changed: "_changed_170dz_716",
	planned: "_planned_170dz_721",
	delayNote: "_delayNote_170dz_726",
	fileType: "_fileType_170dz_761",
	documentNotice: "_documentNotice_170dz_795",
	sentNotice: "_sentNotice_170dz_865",
	footerLogo: "_footerLogo_170dz_892"
};
//#endregion
//#region app/track/[code]/page.tsx
var import_jsx_runtime = require_jsx_runtime();
var stages = [
	{
		label: "Request received",
		date: "22 Jun",
		state: "done"
	},
	{
		label: "Admin review",
		date: "23 Jun",
		state: "done"
	},
	{
		label: "Site inspection",
		date: "29 Jun",
		state: "done"
	},
	{
		label: "Estimate & quote",
		date: "06 Jul",
		state: "done"
	},
	{
		label: "Project scheduled",
		date: "20 Jul",
		state: "done"
	},
	{
		label: "Demolition",
		date: "03 Aug",
		state: "done"
	},
	{
		label: "Construction",
		date: "In progress",
		state: "current"
	},
	{
		label: "Final clean",
		date: "Upcoming",
		state: "next"
	},
	{
		label: "Complete",
		date: "Upcoming",
		state: "next"
	}
];
var schedule = [
	{
		date: "12 AUG",
		day: "Wednesday",
		title: "Plumbing rough-in",
		time: "7:30 am – 1:00 pm",
		company: "Licensed plumbing team",
		status: "Confirmed",
		tone: "confirmed"
	},
	{
		date: "14 AUG",
		day: "Friday",
		title: "Framing inspection",
		time: "10:00 am – 11:30 am",
		company: "Site Supervisor",
		status: "Confirmed",
		tone: "confirmed"
	},
	{
		date: "17 AUG",
		day: "Monday",
		title: "Electrical rough-in",
		time: "7:30 am – 12:00 pm",
		company: "Licensed electrical team",
		status: "Rebooked",
		tone: "changed"
	},
	{
		date: "20 AUG",
		day: "Thursday",
		title: "Wall lining begins",
		time: "8:00 am – 3:30 pm",
		company: "Construction team",
		status: "Planned",
		tone: "planned"
	}
];
var documents = [
	{
		name: "Accepted project quote",
		meta: "PDF · Shared 8 Jul 2026",
		type: "QUOTE"
	},
	{
		name: "Current project schedule",
		meta: "PDF · Updated 9 Aug 2026",
		type: "PLAN"
	},
	{
		name: "Site inspection summary",
		meta: "PDF · Shared 30 Jun 2026",
		type: "REPORT"
	}
];
function formatProjectCode(raw) {
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (!value) return "ATP-2026-00124";
	try {
		return decodeURIComponent(value).toUpperCase().replace(/\//g, "-");
	} catch {
		return "ATP-2026-00124";
	}
}
function ProjectStatusPage() {
	const params = useParams();
	const projectCode = (0, import_react.useMemo)(() => formatProjectCode(params?.code), [params?.code]);
	const [activeTab, setActiveTab] = (0, import_react.useState)("overview");
	const [messageSent, setMessageSent] = (0, import_react.useState)(false);
	const [messageBusy, setMessageBusy] = (0, import_react.useState)(false);
	const [messageError, setMessageError] = (0, import_react.useState)("");
	const [documentNotice, setDocumentNotice] = (0, import_react.useState)("");
	const [record, setRecord] = (0, import_react.useState)(null);
	const [lookupState, setLookupState] = (0, import_react.useState)("loading");
	(0, import_react.useEffect)(() => {
		let active = true;
		fetch(`/api/track/${encodeURIComponent(projectCode)}`, { cache: "no-store" }).then(async (response) => {
			if (!response.ok) throw new Error("missing");
			return response.json();
		}).then((result) => {
			if (!active) return;
			setRecord(result);
			setLookupState("ready");
		}).catch(() => {
			if (!active) return;
			setRecord(null);
			setLookupState("missing");
		});
		return () => {
			active = false;
		};
	}, [projectCode]);
	const isRequest = record?.recordType === "request";
	const journeyStages = (0, import_react.useMemo)(() => isRequest ? [
		{
			label: "Request received",
			date: "Complete",
			state: "done"
		},
		{
			label: "Admin review",
			date: "Current",
			state: "current"
		},
		{
			label: "Initial contact",
			date: "Upcoming",
			state: "next"
		},
		{
			label: "Site inspection",
			date: "Upcoming",
			state: "next"
		},
		{
			label: "Estimate & quote",
			date: "Upcoming",
			state: "next"
		},
		{
			label: "Project scheduled",
			date: "Upcoming",
			state: "next"
		},
		{
			label: "Delivery",
			date: "Upcoming",
			state: "next"
		}
	] : stages, [isRequest]);
	async function handleMessage(event) {
		event.preventDefault();
		const form = event.currentTarget;
		const fields = new FormData(form);
		setMessageBusy(true);
		setMessageError("");
		setMessageSent(false);
		try {
			const response = await fetch(`/api/track/${encodeURIComponent(projectCode)}/messages`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subject: fields.get("subject"),
					message: fields.get("message")
				})
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "The message could not be saved.");
			form.reset();
			setMessageSent(true);
		} catch (error) {
			setMessageError(error instanceof Error ? error.message : "The message could not be saved.");
		} finally {
			setMessageBusy(false);
		}
	}
	if (lookupState !== "ready" || !record) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: track_module_default.portalShell,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
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
						children: "Request a Job"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						className: track_module_default.exitLink,
						href: "/",
						children: "Exit project"
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: track_module_default.lookupState,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: track_module_default.kicker,
					children: lookupState === "loading" ? "Checking project reference" : "Reference not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: lookupState === "loading" ? "Loading your project…" : "We could not find that tracking code." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: lookupState === "loading" ? "Please wait while we retrieve the latest customer-visible status." : "Check the code and try again from Customer Sign In on the homepage." }),
				lookupState === "missing" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					href: "/",
					children: "Return to Customer Sign In"
				})
			]
		})]
	});
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
							children: "Request a Job"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "mailto:MAMOBINI@gmail.com?subject=Alert%20Tradie%20Pro%20Support",
							children: "Support"
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
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Customer project portal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: track_module_default.reference,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
						" Reference\xA0 ",
						projectCode
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: track_module_default.hero,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: track_module_default.heroHeading,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: track_module_default.kicker,
							children: "Project status"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: isRequest ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							"Your request has",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"been received."
						] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							"Your project is",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"moving forward."
						] }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: track_module_default.heroCopy,
							children: isRequest ? "Your details are saved. Our team will review the request before project stages and dates are added." : "Follow approved updates, upcoming site work and shared project documents in one clear place."
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: track_module_default.updated,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Last customer update" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: new Date(record.updatedAt).toLocaleString("en-AU", {
							dateStyle: "medium",
							timeStyle: "short"
						}) })]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: track_module_default.statusBoard,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: track_module_default.projectIdentity,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: track_module_default.statusLabel,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
										" ",
										isRequest ? "Request received" : "Work in progress"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: record.service.toUpperCase() }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: isRequest ? `${record.service} request` : record.name }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Project reference" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: projectCode })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Project area" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: record.suburb || "Melbourne, VIC" })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Managed by" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: record.service.toLowerCase().includes("engineer") ? "Alert Engineers" : "Alert Construction" })] })
								] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: track_module_default.progressPanel,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: track_module_default.progressRing,
								"aria-label": `Project is ${record.progress} percent complete`,
								style: { background: `conic-gradient(var(--portal-gold) 0 ${record.progress}%, #2c3032 ${record.progress}% 100%)` },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [record.progress, "%"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "complete" })] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: track_module_default.miniLabel,
									children: "Current stage"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: record.stage }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: isRequest ? "The Admin team will review your scope and contact details." : record.notes })
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: track_module_default.nextVisit,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: track_module_default.miniLabel,
								children: isRequest ? "Next step" : "Next confirmed visit"
							}), isRequest ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: track_module_default.dateBlock,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "01" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										"TEAM",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"REVIEW"
									] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Request assessment" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "We will contact you after the initial review." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: track_module_default.visitConfirmed,
									children: "Pending review"
								})
							] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: track_module_default.dateBlock,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "12" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										"AUG",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"WED"
									] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Plumbing rough-in" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "7:30 am – 1:00 pm" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: track_module_default.visitConfirmed,
									children: "Confirmed"
								})
							] })]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: track_module_default.workspace,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: track_module_default.tabs,
						role: "tablist",
						"aria-label": "Project information",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: activeTab === "overview" ? track_module_default.activeTab : "",
								type: "button",
								onClick: () => setActiveTab("overview"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "01" }), " Overview"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: activeTab === "schedule" ? track_module_default.activeTab : "",
								type: "button",
								onClick: () => setActiveTab("schedule"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "02" }), " Schedule"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: activeTab === "documents" ? track_module_default.activeTab : "",
								type: "button",
								onClick: () => setActiveTab("documents"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "03" }), " Files & Messages"]
							})
						]
					}),
					activeTab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: track_module_default.overviewGrid,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: track_module_default.timelinePanel,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: track_module_default.sectionTitle,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: track_module_default.kicker,
									children: "Project journey"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Progress timeline" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isRequest ? "Request registered" : "6 of 9 stages reached" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
								className: track_module_default.timeline,
								children: journeyStages.map((stage, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: track_module_default[stage.state],
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: track_module_default.timelineMarker,
										children: stage.state === "done" ? "✓" : index + 1
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stage.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: stage.date })] })]
								}, stage.label))
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
							className: track_module_default.sideColumn,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: track_module_default.updateCard,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: track_module_default.updateImage,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: "/images/hero-construction.webp",
										alt: "Customer-visible site progress update"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isRequest ? `Request upload · ${record.attachmentCount} file${record.attachmentCount === 1 ? "" : "s"}` : "Site update · 3 photos" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: track_module_default.updateCopy,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: track_module_default.miniLabel,
											children: isRequest ? "Latest update · request received" : "Latest update · 9 Aug"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: isRequest ? "Your request is safely in the review queue" : "Framing area prepared for services" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: isRequest ? "The Admin team can now review the scope, contact details and submitted files before assigning the next action." : "The demolition area is clear and the team has marked the new service locations ahead of the plumbing rough-in." }),
										!isRequest && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setDocumentNotice("Photo gallery preview opened."),
											children: ["View update photos ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
										}),
										documentNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
											className: track_module_default.inlineNotice,
											children: documentNotice
										})
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: track_module_default.actionCard,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: track_module_default.miniLabel,
										children: "Your next step"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: isRequest ? "Wait for our review" : "No action required" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: isRequest ? "We will contact you when the request has been reviewed or if more information is required." : "Your next site visit is confirmed. We will notify you if timing or access requirements change." }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setActiveTab("documents"),
										children: "Message the team"
									})
								]
							})]
						})]
					}),
					activeTab === "schedule" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: track_module_default.schedulePanel,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: track_module_default.sectionTitle,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: track_module_default.kicker,
									children: "Customer schedule"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Upcoming site work" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Dates approved for customer view" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: track_module_default.scheduleList,
								children: isRequest ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: track_module_default.emptySchedule,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No site dates have been approved yet." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "The schedule will appear here after the request is reviewed and accepted." })]
								}) : schedule.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: track_module_default.scheduleRow,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: track_module_default.scheduleDate,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.date.split(" ")[0] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												item.date.split(" ")[1],
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
												item.day
											] })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: track_module_default.scheduleName,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.company }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: item.title })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: track_module_default.scheduleTime,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Arrival window" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.time })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `${track_module_default.scheduleStatus} ${track_module_default[item.tone]}`,
											children: item.status
										})
									]
								}, item.date + item.title))
							}),
							!isRequest && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: track_module_default.delayNote,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Schedule change" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Electrical rough-in moved from 15 August to 17 August due to trade availability. The new date is confirmed." })]
							})
						]
					}),
					activeTab === "documents" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: track_module_default.documentsGrid,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: track_module_default.documentsPanel,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: track_module_default.sectionTitle,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: track_module_default.kicker,
										children: "Shared with you"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Project files" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isRequest ? `${record.attachmentCount} submitted file${record.attachmentCount === 1 ? "" : "s"}` : "3 customer documents" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: track_module_default.documentList,
									children: isRequest ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: track_module_default.fileType,
										children: "INFO"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Request attachments received" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: record.attachmentCount ? `${record.attachmentCount} file${record.attachmentCount === 1 ? "" : "s"} are stored with your request` : "No files were attached" })] })] }) : documents.map((document) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: track_module_default.fileType,
											children: document.type
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: document.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: document.meta })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setDocumentNotice(`${document.name} is ready in the design preview.`),
											children: "View file"
										})
									] }, document.name))
								}),
								documentNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: track_module_default.documentNotice,
									children: documentNotice
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: track_module_default.messagePanel,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: track_module_default.kicker,
									children: "Project support"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Message the team" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Send a question about access, timing or a customer-visible project update." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: handleMessage,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Subject" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											name: "subject",
											placeholder: "What is your question about?",
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Message" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											name: "message",
											rows: 6,
											placeholder: "Write your message here...",
											required: true
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "submit",
											disabled: messageBusy,
											children: [
												messageBusy ? "Saving…" : "Send message",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })
											]
										})
									]
								}),
								messageError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: track_module_default.messageError,
									role: "alert",
									children: messageError
								}),
								messageSent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: track_module_default.sentNotice,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Message saved." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Your message is now attached to this project reference." })]
								})
							]
						})]
					})
				]
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
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "mailto:MAMOBINI@gmail.com?subject=Alert%20Tradie%20Pro%20Support",
						children: "Support"
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
