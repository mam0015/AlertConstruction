import { b as require_react, t as require_jsx_runtime, w as __toESM } from "../index.js";
import { f as createLucideIcon } from "./OperationsControlPanel-BeFTSRdd.js";
import { t as tasks_module_default } from "./tasks.module-DmMHdd44.js";
/**
* @license lucide-react v1.33.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var HardHat = createLucideIcon("hard-hat", [
	["path", {
		d: "M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5",
		key: "1p9q5i"
	}],
	["path", {
		d: "M14 6a6 6 0 0 1 6 6v3",
		key: "1hnv84"
	}],
	["path", {
		d: "M4 15v-3a6 6 0 0 1 6-6",
		key: "9ciidu"
	}],
	["rect", {
		x: "2",
		y: "15",
		width: "20",
		height: "4",
		rx: "1",
		key: "g3x8cw"
	}]
]);
//#endregion
//#region app/workers/workers.module.css
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var workers_module_default = {
	shell: "_shell_1t7zg_1",
	header: "_header_1t7zg_1",
	formCard: "_formCard_1t7zg_1",
	listCard: "_listCard_1t7zg_1",
	reportList: "_reportList_1t7zg_1",
	notice: "_notice_1t7zg_1",
	error: "_error_1t7zg_1",
	tabs: "_tabs_1t7zg_1",
	active: "_active_1t7zg_1",
	loading: "_loading_1t7zg_1",
	spin: "_spin_1t7zg_1",
	twoColumns: "_twoColumns_1t7zg_1",
	review: "_review_1t7zg_1",
	formNote: "_formNote_1t7zg_1",
	checkbox: "_checkbox_1t7zg_1",
	taskRow: "_taskRow_1t7zg_1",
	fileRow: "_fileRow_1t7zg_1",
	accessList: "_accessList_1t7zg_1",
	empty: "_empty_1t7zg_1",
	reportHead: "_reportHead_1t7zg_1",
	reportGrid: "_reportGrid_1t7zg_1",
	reviewed: "_reviewed_1t7zg_1"
};
//#endregion
//#region app/workers/WorkerManagementPanel.tsx
var import_jsx_runtime = require_jsx_runtime();
var empty$1 = {
	projects: [],
	workers: [],
	assignments: [],
	tasks: [],
	files: [],
	reports: []
};
function date(value) {
	const parsed = new Date(value.length === 10 ? `${value}T12:00:00+10:00` : value);
	return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-AU", {
		day: "numeric",
		month: "short",
		year: "numeric"
	}).format(parsed);
}
function WorkerManagementPanel({ role }) {
	const [data, setData] = (0, import_react.useState)(empty$1);
	const [tab, setTab] = (0, import_react.useState)("assignments");
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [working, setWorking] = (0, import_react.useState)(false);
	const [notice, setNotice] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [caseId, setCaseId] = (0, import_react.useState)(0);
	const [workerEmail, setWorkerEmail] = (0, import_react.useState)("");
	const [tradeTitle, setTradeTitle] = (0, import_react.useState)("");
	const [title, setTitle] = (0, import_react.useState)("");
	const [instructions, setInstructions] = (0, import_react.useState)("");
	const [file, setFile] = (0, import_react.useState)(null);
	const [fileWorkers, setFileWorkers] = (0, import_react.useState)([]);
	const [reportNotes, setReportNotes] = (0, import_react.useState)({});
	const query = `?previewRole=${role}`;
	(0, import_react.useEffect)(() => {
		let active = true;
		fetch(`/api/worker/manage?previewRole=${role}`, { cache: "no-store" }).then(async (response) => ({
			response,
			result: await response.json()
		})).then(({ response, result }) => {
			if (!response.ok || !result.data) throw new Error(result.error ?? "Worker management could not be loaded.");
			if (!active) return;
			setData(result.data);
			setCaseId(result.data.projects[0]?.caseId ?? 0);
			setWorkerEmail(result.data.workers[0]?.email ?? "");
		}).catch((reason) => {
			if (active) setError(reason instanceof Error ? reason.message : "Worker management could not be loaded.");
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => {
			active = false;
		};
	}, [role]);
	const selectedWorker = data.workers.find((worker) => worker.email === workerEmail);
	const selectedProject = data.projects.find((project) => project.caseId === caseId);
	const assignedEmails = (0, import_react.useMemo)(() => data.assignments.filter((assignment) => assignment.caseId === caseId && assignment.status === "active").map((assignment) => assignment.workerEmail), [data.assignments, caseId]);
	async function action(name, payload, success) {
		setWorking(true);
		setError("");
		try {
			const response = await fetch(`/api/worker/manage${query}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: name,
					payload
				})
			});
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "The change could not be saved.");
			setData(result.data);
			setNotice(success);
			window.setTimeout(() => setNotice(""), 4e3);
			return true;
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "The change could not be saved.");
			return false;
		} finally {
			setWorking(false);
		}
	}
	async function assign(event) {
		event.preventDefault();
		await action("assign_worker", {
			caseId,
			workerEmail,
			tradeTitle: tradeTitle || selectedWorker?.tradeTitle
		}, `${workerEmail} can now open ${selectedProject?.projectCode}.`);
	}
	async function createTask(event) {
		event.preventDefault();
		if (await action("create_task", {
			caseId,
			workerEmail,
			title,
			instructions
		}, `Task sent to ${workerEmail}.`)) {
			setTitle("");
			setInstructions("");
		}
	}
	async function upload(event) {
		event.preventDefault();
		if (!file) {
			setError("Choose a plan, drawing or project file.");
			return;
		}
		setWorking(true);
		setError("");
		try {
			const form = new FormData();
			form.set("caseId", String(caseId));
			form.set("workerEmails", JSON.stringify(fileWorkers));
			form.set("file", file);
			const response = await fetch(`/api/worker/files${query}`, {
				method: "POST",
				body: form
			});
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "The file could not be uploaded.");
			setData(result.data);
			setFile(null);
			setNotice(fileWorkers.length ? `File uploaded and shared with ${fileWorkers.length} selected Worker account(s).` : "File uploaded privately. No Worker can open it until access is ticked.");
			window.setTimeout(() => setNotice(""), 4e3);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "The file could not be uploaded.");
		} finally {
			setWorking(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: workers_module_default.shell,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: workers_module_default.header,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "WORKER ACCESS CONTROL" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Tasks, files and daily reports" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Assign only the work and documents each trade needs. Worker accounts never receive customer history, pricing or management records." })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [data.workers.length, " approved Workers"] })]
			}),
			(notice || error) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `${workers_module_default.notice} ${error ? workers_module_default.error : ""}`,
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: workers_module_default.tabs,
				children: [
					"assignments",
					"tasks",
					"files",
					"reports"
				].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: tab === item ? workers_module_default.active : "",
					onClick: () => setTab(item),
					children: [item === "assignments" ? "Worker access" : item === "tasks" ? "Assigned tasks" : item === "files" ? "Shared files" : "End-of-day reports", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: item === "assignments" ? data.assignments.filter((assignment) => assignment.status === "active").length : item === "tasks" ? data.tasks.length : item === "files" ? data.files.length : data.reports.length })]
				}, item))
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: workers_module_default.loading,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Opening Worker controls…"]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				tab === "assignments" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: workers_module_default.twoColumns,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: workers_module_default.formCard,
						onSubmit: assign,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "01 · PROJECT ACCESS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Assign a Worker" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Active project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: caseId,
								onChange: (event) => {
									setCaseId(Number(event.target.value));
									setFileWorkers([]);
								},
								required: true,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Choose project"
								}), data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: project.caseId,
									children: [
										project.projectCode,
										" · ",
										project.siteLabel
									]
								}, project.caseId))]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Approved Worker" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: workerEmail,
								onChange: (event) => {
									setWorkerEmail(event.target.value);
									setTradeTitle(data.workers.find((item) => item.email === event.target.value)?.tradeTitle ?? "");
								},
								required: true,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Choose Worker"
								}), data.workers.map((worker) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: worker.email,
									children: [
										worker.tradeTitle,
										" · ",
										worker.email
									]
								}, worker.email))]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Trade shown in this project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: tradeTitle,
								onChange: (event) => setTradeTitle(event.target.value),
								placeholder: selectedWorker?.tradeTitle || "Electrician, Plumber, Carpenter…"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								disabled: working || !data.projects.length || !data.workers.length,
								children: working ? "Saving…" : "Assign project access"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: workers_module_default.listCard,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ACTIVE ASSIGNMENTS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Who can see each project" })] }),
							data.assignments.filter((assignment) => assignment.status === "active").map((assignment) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: assignment.tradeTitle }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: assignment.workerEmail }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									assignment.projectCode,
									" · assigned ",
									date(assignment.assignedAt)
								] })
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								disabled: working,
								onClick: () => void action("unassign_worker", {
									caseId: assignment.caseId,
									workerEmail: assignment.workerEmail
								}, `Access removed for ${assignment.workerEmail}.`),
								children: "Remove access"
							})] }, assignment.id)),
							!data.assignments.some((assignment) => assignment.status === "active") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: workers_module_default.empty,
								children: "No Worker has been assigned to an active project."
							})
						]
					})]
				}),
				tab === "tasks" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: workers_module_default.twoColumns,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: workers_module_default.formCard,
						onSubmit: createTask,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "02 · WORK INSTRUCTIONS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Create a Worker task" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: caseId,
								onChange: (event) => setCaseId(Number(event.target.value)),
								required: true,
								children: data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: project.caseId,
									children: [
										project.projectCode,
										" · ",
										project.siteLabel
									]
								}, project.caseId))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Assigned Worker" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: workerEmail,
								onChange: (event) => setWorkerEmail(event.target.value),
								required: true,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Choose an assigned Worker"
								}), data.workers.filter((worker) => assignedEmails.includes(worker.email)).map((worker) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: worker.email,
									children: [
										worker.tradeTitle,
										" · ",
										worker.email
									]
								}, worker.email))]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Task" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: title,
								onChange: (event) => setTitle(event.target.value),
								placeholder: "Complete electrical rough-in",
								required: true
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Exact instructions" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: instructions,
								onChange: (event) => setInstructions(event.target.value),
								placeholder: "Tell the Worker only what must be completed. No budget or customer discussion…",
								required: true
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: workers_module_default.formNote,
								children: "Tasks intentionally have no future date. The Worker reports the next required step at End of Day."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								disabled: working,
								children: "Send task to Worker"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: workers_module_default.listCard,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "LIVE TASK LIST" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Management-controlled status" })] }),
							data.tasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: workers_module_default.taskRow,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: task.title }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: task.workerEmail }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
										task.projectCode,
										" · ",
										task.status.replaceAll("_", " ")
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: task.instructions })
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: task.status,
									onChange: (event) => void action("set_task_status", {
										taskId: task.id,
										status: event.target.value
									}, `Task marked ${event.target.value.replaceAll("_", " ")}.`),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "assigned",
											children: "Assigned"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "in_progress",
											children: "In progress"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "completed",
											children: "Completed"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => void action("delete_task", { taskId: task.id }, "Task removed."),
									children: "Delete"
								})] })]
							}, task.id)),
							!data.tasks.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: workers_module_default.empty,
								children: "No Worker tasks have been created."
							})
						]
					})]
				}),
				tab === "files" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: workers_module_default.twoColumns,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: workers_module_default.formCard,
						onSubmit: upload,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "03 · EXPLICIT FILE ACCESS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Upload and choose recipients" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: caseId,
								onChange: (event) => {
									setCaseId(Number(event.target.value));
									setFileWorkers([]);
								},
								required: true,
								children: data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: project.caseId,
									children: [
										project.projectCode,
										" · ",
										project.siteLabel
									]
								}, project.caseId))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Plan, drawing or project file" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								onChange: (event) => setFile(event.target.files?.[0] ?? null),
								required: true
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: "Workers allowed to open this file · optional" }), data.workers.filter((worker) => assignedEmails.includes(worker.email)).map((worker) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: workers_module_default.checkbox,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: fileWorkers.includes(worker.email),
									onChange: () => setFileWorkers((current) => current.includes(worker.email) ? current.filter((email) => email !== worker.email) : [...current, worker.email])
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: worker.tradeTitle }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: worker.email })] })]
							}, worker.email))] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: workers_module_default.formNote,
								children: "Leave everyone unticked to store the file privately. You can grant exact access later."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								disabled: working,
								children: working ? "Uploading…" : fileWorkers.length ? `Upload for ${fileWorkers.length} selected` : "Upload privately"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: workers_module_default.listCard,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PROJECT FILE PERMISSIONS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Unticked Workers see nothing" })] }),
							data.files.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: workers_module_default.fileRow,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.fileName }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.projectCode }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [item.sharedWith.length, " Worker account(s) can open this file"] })
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: workers_module_default.accessList,
									children: data.workers.filter((worker) => data.assignments.some((assignment) => assignment.caseId === item.caseId && assignment.workerEmail === worker.email && assignment.status === "active")).map((worker) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: item.sharedWith.includes(worker.email),
										onChange: (event) => void action("set_file_access", {
											fileId: item.id,
											workerEmail: worker.email,
											granted: event.target.checked
										}, event.target.checked ? `File shared with ${worker.email}.` : `File hidden from ${worker.email}.`)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [worker.tradeTitle, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: worker.email })] })] }, worker.email))
								})]
							}, item.id)),
							!data.files.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: workers_module_default.empty,
								children: "No Worker file has been uploaded."
							})
						]
					})]
				}),
				tab === "reports" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: workers_module_default.reportList,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OWNER & ADMIN VISIBILITY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Worker End-of-Day reports" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [data.reports.filter((report) => report.status === "submitted").length, " awaiting review"] })] }),
						data.reports.map((report) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: workers_module_default.reportHead,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: report.workerEmail }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									report.projectCode,
									" · ",
									date(report.workDate)
								] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: report.status })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: workers_module_default.reportGrid,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "COMPLETED WORK" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.completedWork })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "NEXT STEP" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.nextStep })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ISSUE OR DELAY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.issuesDelays || "None reported" })] })
								]
							}),
							report.status === "submitted" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: workers_module_default.review,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: reportNotes[report.id] ?? "",
									onChange: (event) => setReportNotes((current) => ({
										...current,
										[report.id]: event.target.value
									})),
									placeholder: "Optional management review note"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => void action("review_report", {
										reportId: report.id,
										note: reportNotes[report.id] ?? ""
									}, "Worker report reviewed and recorded."),
									children: "Mark reviewed"
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: workers_module_default.reviewed,
								children: [
									"Reviewed by ",
									report.reviewedBy,
									report.reviewNote ? ` · ${report.reviewNote}` : ""
								]
							})
						] }, report.id)),
						!data.reports.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: workers_module_default.empty,
							children: "Worker reports will appear here after submission."
						})
					]
				})
			] })
		]
	});
}
//#endregion
//#region app/tasks/TaskManagementPanel.tsx
var empty = {
	viewerRole: "Admin",
	people: [],
	projects: [],
	tasks: []
};
function readable(value) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", {
		day: "numeric",
		month: "short",
		hour: "numeric",
		minute: "2-digit"
	}).format(date);
}
function TaskManagementPanel({ role, scope }) {
	const [data, setData] = (0, import_react.useState)(empty);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [working, setWorking] = (0, import_react.useState)(false);
	const [notice, setNotice] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [assigneeEmail, setAssigneeEmail] = (0, import_react.useState)("");
	const [caseId, setCaseId] = (0, import_react.useState)(0);
	const [title, setTitle] = (0, import_react.useState)("");
	const [instructions, setInstructions] = (0, import_react.useState)("");
	const [priority, setPriority] = (0, import_react.useState)("Normal");
	const query = `?previewRole=${role}`;
	(0, import_react.useEffect)(() => {
		let active = true;
		fetch(`/api/tasks/manage${query}`, { cache: "no-store" }).then(async (response) => ({
			response,
			result: await response.json()
		})).then(({ response, result }) => {
			if (!response.ok || !result.data) throw new Error(result.error ?? "Task centre could not be loaded.");
			if (!active) return;
			setData(result.data);
			setAssigneeEmail(result.data.people.find((person) => person.group === scope)?.email ?? "");
		}).catch((reason) => {
			if (active) setError(reason instanceof Error ? reason.message : "Task centre could not be loaded.");
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => {
			active = false;
		};
	}, [
		query,
		role,
		scope
	]);
	const people = (0, import_react.useMemo)(() => data.people.filter((person) => person.group === scope), [data.people, scope]);
	const emails = (0, import_react.useMemo)(() => new Set(people.map((person) => person.email)), [people]);
	const tasks = (0, import_react.useMemo)(() => data.tasks.filter((task) => emails.has(task.assigneeEmail)), [data.tasks, emails]);
	const open = tasks.filter((task) => task.status !== "completed").length;
	async function action(name, payload, success) {
		setWorking(true);
		setError("");
		try {
			const response = await fetch(`/api/tasks/manage${query}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: name,
					payload
				})
			});
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "The task change could not be saved.");
			setData(result.data);
			setNotice(success);
			window.setTimeout(() => setNotice(""), 4200);
			return true;
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "The task change could not be saved.");
			return false;
		} finally {
			setWorking(false);
		}
	}
	async function create(event) {
		event.preventDefault();
		const person = people.find((item) => item.email === assigneeEmail);
		if (await action("create_task", {
			assigneeEmail,
			caseId,
			title,
			instructions,
			priority
		}, `Task assigned to ${person?.title || assigneeEmail}.`)) {
			setTitle("");
			setInstructions("");
			setPriority("Normal");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: tasks_module_default.managerShell,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: tasks_module_default.managerHeader,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: scope === "management" ? "OWNER-ONLY MANAGEMENT DIRECTION" : "OPERATIONAL TASK CONTROL" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: scope === "management" ? "Tasks for Admin & Manager" : "Tasks for Site Supervisors & Workers" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: scope === "management" ? "Only Owner can create, change or remove these management tasks." : "Owner and Admin can send clear work instructions to approved field and trade accounts." })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: tasks_module_default.summary,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: open }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OPEN TASKS" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [people.length, " approved people"] })
					]
				})]
			}),
			(notice || error) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `${tasks_module_default.notice} ${error ? tasks_module_default.error : ""}`,
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
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: tasks_module_default.loading,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Opening task control…"]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: tasks_module_default.managementGrid,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: tasks_module_default.taskForm,
					onSubmit: create,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "NEW ASSIGNMENT" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Give clear direction" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Assign to" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: assigneeEmail,
							onChange: (event) => setAssigneeEmail(event.target.value),
							required: true,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Choose approved team member"
							}), people.map((person) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: person.email,
								children: [
									person.title,
									" · ",
									person.email
								]
							}, person.email))]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: caseId,
							onChange: (event) => setCaseId(Number(event.target.value)),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: 0,
								children: "Business / General"
							}), data.projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: project.caseId,
								children: [
									project.projectCode,
									" · ",
									project.siteLabel
								]
							}, project.caseId))]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Priority" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: priority,
							onChange: (event) => setPriority(event.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Normal" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "High" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Urgent" })
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Task title" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: title,
							onChange: (event) => setTitle(event.target.value),
							placeholder: scope === "management" ? "Review estimate approval pack" : "Confirm electrical rough-in",
							required: true
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Exact instructions" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: instructions,
							onChange: (event) => setInstructions(event.target.value),
							placeholder: "Explain what must be completed and what result should be reported…",
							required: true
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							disabled: working || !people.length,
							children: working ? "Sending…" : "Assign task"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: tasks_module_default.taskRegister,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "LIVE TASK REGISTER" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Assigned work and progress" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [tasks.length, " total"] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: tasks_module_default.filters,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [tasks.filter((task) => task.status === "assigned").length, " assigned"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [tasks.filter((task) => task.status === "in_progress").length, " in progress"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [tasks.filter((task) => task.status === "completed").length, " completed"] })
							]
						}),
						tasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: tasks_module_default.managementTask,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: tasks_module_default.taskTop,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
											className: tasks_module_default[`priority${task.priority}`],
											children: task.priority
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: task.projectCode }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: readable(task.updatedAt) })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: task.title }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: task.instructions }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: tasks_module_default.assignee,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: task.assigneeTitle.slice(0, 2).toUpperCase() }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: task.assigneeTitle }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: task.assigneeEmail })] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: task.status,
									onChange: (event) => void action("set_status", {
										taskId: task.id,
										status: event.target.value
									}, `Task marked ${event.target.value.replaceAll("_", " ")}.`),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "assigned",
											children: "Assigned"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "in_progress",
											children: "In progress"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "completed",
											children: "Completed"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => void action("delete_task", { taskId: task.id }, "Task removed."),
									children: "Remove"
								})] })
							]
						}, task.id)),
						!tasks.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: tasks_module_default.empty,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No tasks in this section." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Create the first assignment from the form." })]
						})
					]
				})]
			})
		]
	});
}
//#endregion
export { WorkerManagementPanel as n, HardHat as r, TaskManagementPanel as t };
