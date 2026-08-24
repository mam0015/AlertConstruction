import { b as require_react, t as require_jsx_runtime, w as __toESM } from "../index.js";
import { t as tasks_module_default } from "./tasks.module-DmMHdd44.js";
//#region app/tasks/TaskInbox.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var empty = {
	identity: {
		email: "",
		role: "",
		title: ""
	},
	tasks: []
};
function TaskInbox({ role, preview = false, tone = "dark", compact = false }) {
	const [data, setData] = (0, import_react.useState)(empty);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [working, setWorking] = (0, import_react.useState)(0);
	const [error, setError] = (0, import_react.useState)("");
	const query = preview ? `?previewRole=${encodeURIComponent(role)}` : "";
	(0, import_react.useEffect)(() => {
		let active = true;
		fetch(`/api/tasks${query}`, { cache: "no-store" }).then(async (response) => ({
			response,
			result: await response.json()
		})).then(({ response, result }) => {
			if (!response.ok || !result.data) throw new Error(result.error ?? "Your tasks could not be loaded.");
			if (active) setData(result.data);
		}).catch((reason) => {
			if (active) setError(reason instanceof Error ? reason.message : "Your tasks could not be loaded.");
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => {
			active = false;
		};
	}, [query, role]);
	const open = (0, import_react.useMemo)(() => data.tasks.filter((task) => task.status !== "completed"), [data.tasks]);
	async function status(taskId, next) {
		setWorking(taskId);
		setError("");
		try {
			const response = await fetch(`/api/tasks${query}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "set_status",
					payload: {
						taskId,
						status: next
					}
				})
			});
			const result = await response.json();
			if (!response.ok || !result.data) throw new Error(result.error ?? "The task could not be updated.");
			setData(result.data);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "The task could not be updated.");
		} finally {
			setWorking(0);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: `${tasks_module_default.inbox} ${tone === "light" ? tasks_module_default.light : ""} ${compact ? tasks_module_default.compact : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "MY ASSIGNED TASKS" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: data.identity.title || role }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Directions assigned specifically to this account by ",
					role === "Admin" || role === "Manager" ? "Owner" : "Owner or Admin",
					"."
				] })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [open.length, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "OPEN" })] })] }),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `${tasks_module_default.notice} ${tasks_module_default.error}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "!" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setError(""),
						children: "×"
					})
				]
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: tasks_module_default.loading,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), "Loading assigned tasks…"]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: tasks_module_default.inboxGrid,
				children: [data.tasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: task.status === "completed" ? tasks_module_default.complete : "",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: tasks_module_default.taskTop,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									className: tasks_module_default[`priority${task.priority}`],
									children: task.priority
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: task.projectCode }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: task.status.replaceAll("_", " ") })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: task.title }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: task.instructions }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
							className: tasks_module_default.creator,
							children: [
								"Set by ",
								task.createdByRole,
								" · ",
								task.siteLabel
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
							task.status === "assigned" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								disabled: working === task.id,
								onClick: () => void status(task.id, "in_progress"),
								children: "Start task"
							}),
							task.status === "in_progress" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								disabled: working === task.id,
								onClick: () => void status(task.id, "completed"),
								children: "Mark completed"
							}),
							task.status === "completed" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								disabled: working === task.id,
								onClick: () => void status(task.id, "in_progress"),
								children: "Reopen"
							})
						] })
					]
				}, task.id)), !data.tasks.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: tasks_module_default.empty,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No task assigned." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "New directions from management will appear here." })]
				})]
			})
		]
	});
}
//#endregion
export { TaskInbox as default };
