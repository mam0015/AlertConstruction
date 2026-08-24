import { b as require_react, t as require_jsx_runtime, w as __toESM } from "../index.js";
import Link from "./link-rFQpyoyn.js";
import { t as BrandLogo } from "./BrandLogo-3akqgd4n.js";
import TaskInbox from "./TaskInbox-D7BIzc6V.js";
//#region app/worker/worker.module.css
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var worker_module_default = {
	shell: "_shell_lr7tl_1",
	sidebar: "_sidebar_lr7tl_1",
	brand: "_brand_lr7tl_1",
	logo: "_logo_lr7tl_1",
	identity: "_identity_lr7tl_1",
	profile: "_profile_lr7tl_1",
	active: "_active_lr7tl_1",
	alertCount: "_alertCount_lr7tl_1",
	restricted: "_restricted_lr7tl_1",
	foot: "_foot_lr7tl_1",
	main: "_main_lr7tl_1",
	topbar: "_topbar_lr7tl_1",
	content: "_content_lr7tl_1",
	heading: "_heading_lr7tl_1",
	missing: "_missing_lr7tl_1",
	reportForm: "_reportForm_lr7tl_1",
	notice: "_notice_lr7tl_1",
	error: "_error_lr7tl_1",
	loading: "_loading_lr7tl_1",
	spin: "_spin_lr7tl_1",
	metrics: "_metrics_lr7tl_1",
	taskGrid: "_taskGrid_lr7tl_1",
	projectGrid: "_projectGrid_lr7tl_1",
	projectTasks: "_projectTasks_lr7tl_1",
	reportHistory: "_reportHistory_lr7tl_1",
	doneTask: "_doneTask_lr7tl_1",
	empty: "_empty_lr7tl_1",
	emptyState: "_emptyState_lr7tl_1",
	fileList: "_fileList_lr7tl_1",
	reportLayout: "_reportLayout_lr7tl_1"
};
//#endregion
//#region app/worker/WorkerDashboard.tsx
var import_jsx_runtime = require_jsx_runtime();
var empty = {
	identity: {
		email: "",
		role: "Worker",
		tradeTitle: "Worker"
	},
	projects: [],
	tasks: [],
	files: [],
	reports: [],
	missingReportDates: [],
	today: ""
};
function readableDate(value) {
	const date = /* @__PURE__ */ new Date(`${value}T12:00:00+10:00`);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", {
		day: "numeric",
		month: "long",
		year: "numeric"
	}).format(date);
}
function fileSize(bytes) {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function WorkerDashboard({ preview = false }) {
	const [view, setView] = (0, import_react.useState)("work");
	const [data, setData] = (0, import_react.useState)(empty);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [working, setWorking] = (0, import_react.useState)(false);
	const [notice, setNotice] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [projectId, setProjectId] = (0, import_react.useState)(0);
	const [completedWork, setCompletedWork] = (0, import_react.useState)("");
	const [nextStep, setNextStep] = (0, import_react.useState)("");
	const [issuesDelays, setIssuesDelays] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		let active = true;
		fetch(`/api/worker${preview ? "?previewWorker=1" : ""}`, { cache: "no-store" }).then(async (response) => ({
			response,
			result: await response.json()
		})).then(({ response, result }) => {
			if (!response.ok || !result.data) throw new Error(result.error ?? "Your work could not be loaded.");
			if (!active) return;
			setData(result.data);
			setProjectId(result.data.projects[0]?.caseId ?? 0);
			if (result.data.missingReportDates.length) setView("report");
		}).catch((reason) => {
			if (active) setError(reason instanceof Error ? reason.message : "Your work could not be loaded.");
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => {
			active = false;
		};
	}, [preview]);
	const missingDate = data.missingReportDates[0] ?? "";
	const reportDate = missingDate || data.today;
	const locked = Boolean(missingDate);
	const selectedProject = data.projects.find((project) => project.caseId === projectId) ?? data.projects[0];
	const openTasks = (0, import_react.useMemo)(() => data.tasks.filter((task) => task.status !== "completed"), [data.tasks]);
	async function submit(event) {
		event.preventDefault();
		if (!selectedProject) {
			setError("No assigned project is available for this report.");
			return;
		}
		setWorking(true);
		setError("");
		try {
			const response = await fetch(`/api/worker${preview ? "?previewWorker=1" : ""}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "submit_report",
					payload: {
						caseId: selectedProject.caseId,
						workDate: reportDate,
						completedWork,
						nextStep,
						issuesDelays
					}
				})
			});
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "The report could not be submitted.");
			setData(result.data);
			setCompletedWork("");
			setNextStep("");
			setIssuesDelays("");
			setNotice(`Report for ${readableDate(reportDate)} submitted to Owner and Admin.`);
			window.setTimeout(() => setNotice(""), 4500);
			if (!result.data.missingReportDates.length) setView("work");
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "The report could not be submitted.");
		} finally {
			setWorking(false);
		}
	}
	function choose(next) {
		if (locked && next !== "report") {
			setError(`Complete the missing report for ${readableDate(missingDate)} first.`);
			return;
		}
		setView(next);
		setError("");
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: worker_module_default.shell,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: worker_module_default.sidebar,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					className: worker_module_default.brand,
					href: "/",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
						kind: "tradie",
						tone: "dark",
						className: worker_module_default.logo
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: worker_module_default.identity,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: data.identity.tradeTitle.slice(0, 2).toUpperCase() }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "APPROVED WORKER" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.identity.tradeTitle }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: data.identity.email || "Secure team account" })
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: view === "work" ? worker_module_default.active : "",
						onClick: () => choose("work"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "✓" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "My work" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: openTasks.length })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: view === "projects" ? worker_module_default.active : "",
						onClick: () => choose("projects"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "▦" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Projects & files" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: view === "report" ? worker_module_default.active : "",
						onClick: () => choose("report"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "＋" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "End of day" }),
							locked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
								className: worker_module_default.alertCount,
								children: "!"
							})
						]
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: worker_module_default.restricted,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PRIVATE BY DESIGN" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Tasks and shared files only" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Customer history, budgets, quotes, margins and management notes are not available to this account." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: worker_module_default.foot,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), " Secure role session"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						href: "/",
						children: "Public website ↗"
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: worker_module_default.main,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: worker_module_default.topbar,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Alert Tradie Pro" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Worker workspace" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: worker_module_default.profile,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: data.identity.tradeTitle.slice(0, 2).toUpperCase() }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [data.identity.tradeTitle, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: data.identity.email })] })]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: worker_module_default.content,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: worker_module_default.heading,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: view === "work" ? "YOUR ASSIGNED WORK" : view === "projects" ? "CONTROLLED PROJECT ACCESS" : "END-OF-DAY REPORTING" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: view === "work" ? "What you need to do." : view === "projects" ? "Projects and files." : missingDate ? "Yesterday’s report is required." : "Tell the team what happened." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: view === "work" ? "Only instructions assigned to your account are shown." : view === "projects" ? "A file appears only when Owner or Admin shares it with you." : "Record completed work and your next step. No future date is required." })
						] }), view !== "report" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => choose("report"),
							children: "＋ End-of-day report"
						})]
					}),
					(notice || error) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `${worker_module_default.notice} ${error ? worker_module_default.error : ""}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: error ? "!" : "✓" }),
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
					locked && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: worker_module_default.missing,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "MISSING REPORT" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: readableDate(missingDate) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Your previous work session has no End-of-Day report. Complete it now before opening today's tasks or files." })
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setView("report"),
							children: "Complete report →"
						})]
					}),
					loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: worker_module_default.loading,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Opening assigned work…"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						view === "work" && !locked && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: worker_module_default.metrics,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ASSIGNED PROJECTS" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.projects.length }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Active work access" })
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OPEN TASKS" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: openTasks.length }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Set by Owner or Admin" })
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SHARED FILES" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.files.length }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Permission-controlled" })
									] })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskInbox, {
								role: "Worker",
								preview,
								compact: true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
								className: worker_module_default.taskGrid,
								children: data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: worker_module_default.projectTasks,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: project.projectCode }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: project.siteLabel || "Assigned worksite" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: project.tradeTitle })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [data.tasks.filter((task) => task.caseId === project.caseId).map((task, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
										className: task.status === "completed" ? worker_module_default.doneTask : "",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: task.status === "completed" ? "✓" : index + 1 }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: task.title }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: task.instructions }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: task.status === "completed" ? "Completed by management record" : task.status === "in_progress" ? "In progress" : "Assigned" })
										] })]
									}, task.id)), !data.tasks.some((task) => task.caseId === project.caseId) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: worker_module_default.empty,
										children: "No task has been assigned to you for this project."
									})] })]
								}, project.caseId))
							}),
							!data.projects.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: worker_module_default.emptyState,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No active work assigned." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Owner or Admin must assign your account to an active project before anything appears here." })]
							})
						] }),
						view === "projects" && !locked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
							className: worker_module_default.projectGrid,
							children: data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: project.projectCode }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: project.tradeTitle })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: project.siteLabel || "Assigned worksite" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Only instructions and explicitly shared project files are available." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: worker_module_default.fileList,
									children: [data.files.filter((file) => file.caseId === project.caseId).map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: `${file.url}${preview ? "&previewWorker=1" : ""}`,
										target: "_blank",
										rel: "noreferrer",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: file.mimeType.includes("pdf") ? "PDF" : file.mimeType.startsWith("image/") ? "IMG" : "FILE" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: file.fileName }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [fileSize(file.sizeBytes), " · Shared for your account"] })] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Open ↗" })
										]
									}, file.id)), !data.files.some((file) => file.caseId === project.caseId) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: worker_module_default.empty,
										children: "No file has been shared with you for this project."
									})]
								})
							] }, project.caseId))
						}),
						view === "report" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: worker_module_default.reportLayout,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								className: worker_module_default.reportForm,
								onSubmit: submit,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: missingDate ? "CATCH-UP REQUIRED" : "END OF DAY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: readableDate(reportDate || data.today) })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: selectedProject?.projectCode || "No project" })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project worked on" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: projectId,
										onChange: (event) => setProjectId(Number(event.target.value)),
										required: true,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "Select assigned project"
										}), data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
											value: project.caseId,
											children: [
												project.projectCode,
												" · ",
												project.siteLabel
											]
										}, project.caseId))]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "What work did you complete?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: completedWork,
										onChange: (event) => setCompletedWork(event.target.value),
										placeholder: "Write exactly what you completed during this work session…",
										required: true
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "What is your next step?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: nextStep,
										onChange: (event) => setNextStep(event.target.value),
										placeholder: "Describe the next action needed. Do not enter a future date…",
										required: true
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Issue or delay · optional" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: issuesDelays,
										onChange: (event) => setIssuesDelays(event.target.value),
										placeholder: "Materials, access, safety, coordination or anything management must know…"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										disabled: working || !data.projects.length,
										children: working ? "Submitting…" : missingDate ? "Submit missing report" : "Submit to Owner & Admin"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
								className: worker_module_default.reportHistory,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "MY REPORTS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [data.reports.length, " submitted"] })] }),
									data.reports.slice(0, 8).map((report) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: readableDate(report.workDate) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: report.projectCode })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.completedWork }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Next:" }),
											" ",
											report.nextStep
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: report.status })
									] }, report.id)),
									!data.reports.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: worker_module_default.empty,
										children: "Your submitted reports will appear here."
									})
								]
							})]
						})
					] })
				]
			})]
		})]
	});
}
//#endregion
export { WorkerDashboard as default };
