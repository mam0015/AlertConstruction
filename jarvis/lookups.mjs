// The "read" half of Jarvis's basic mode (no AI): open tasks, the money, how one project stands, the team. Every answer is built from fresh,
// read-only queries (readonly-db.mjs), not from the news window, so "what tasks are open?" does not depend on how long ago a task was last touched.
// Money in the database is in cents; it is shown in dollars here.

import { clip } from "./briefing.mjs";
import { FA, isolate } from "./persian.mjs";
import { formatMoney, niceName } from "./commands.mjs";
import { isMissingTable } from "./readonly-db.mjs";

const DAY = 86_400_000;
const fmtDay = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });
const fmtDayFa = new Intl.DateTimeFormat("fa-u-ca-gregory-nu-latn", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });

async function safe(promise) {
  try { return await promise; } catch (error) {
    if (isMissingTable(error)) return [];
    console.error("Jarvis lookup failed:", error instanceof Error ? error.message : "unknown");
    throw error;
  }
}

// ---------- What Jarvis needs to understand a sentence: the projects and the finance categories already in use ----------

export async function loadProjects(reader) {
  // Two plain reads, joined here: a company that has projects but no workflow cases yet (or the reverse) must still work.
  const [rows, cases] = await Promise.all([
    safe(reader.all(`SELECT code AS code, name AS name, customer_name AS customer, suburb AS suburb, stage AS stage, progress AS progress, contract_value AS contractValue, balance AS balance
      FROM projects ORDER BY updated_at DESC, id DESC LIMIT 300`)),
    safe(reader.all("SELECT project_code AS code, request_code AS requestCode, stage AS caseStage FROM workflow_cases WHERE project_code <> '' LIMIT 1000")),
  ]);
  const byCode = new Map(cases.map((row) => [String(row.code), row]));
  return rows.map((row) => ({
    code: String(row.code), name: String(row.name ?? ""), customer: String(row.customer ?? ""), suburb: String(row.suburb ?? ""), stage: String(row.stage ?? ""),
    progress: Number(row.progress ?? 0), contractValue: Number(row.contractValue ?? 0), balance: Number(row.balance ?? 0), requestCode: String(byCode.get(String(row.code))?.requestCode ?? ""),
    // Only a project that is "active" in the workflow can be given tasks (the same rule the Tasks page uses); a project that was added by hand can still hold money.
    active: byCode.get(String(row.code))?.caseStage === "active_project",
  }));
}

export async function loadCategories(reader) {
  const rows = await safe(reader.all("SELECT category AS category, COUNT(*) AS uses FROM finance_entries GROUP BY category ORDER BY uses DESC LIMIT 30"));
  return rows.map((row) => String(row.category)).filter(Boolean);
}

// ---------- Tasks ----------

// case id -> project code, read on its own so a missing workflow table never hides the tasks themselves.
async function caseCodes(reader) {
  const rows = await safe(reader.all("SELECT id AS id, project_code AS code FROM workflow_cases WHERE project_code <> '' LIMIT 2000"));
  return new Map(rows.map((row) => [Number(row.id), String(row.code)]));
}

export async function loadTasks(reader, { open = true } = {}) {
  const since = new Date(Date.now() - 21 * DAY).toISOString();
  const [team, worker, codes] = await Promise.all([
    open
      ? safe(reader.all(`SELECT id AS id, assignee_email AS assignee, assignee_title AS trade, title AS title, priority AS priority, status AS status, case_id AS caseId, created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt
        FROM team_tasks WHERE status <> 'completed' ORDER BY CASE priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 ELSE 2 END, created_at LIMIT 150`))
      : safe(reader.all(`SELECT id AS id, assignee_email AS assignee, assignee_title AS trade, title AS title, priority AS priority, status AS status, case_id AS caseId, created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt
        FROM team_tasks WHERE status = 'completed' AND updated_at >= ? ORDER BY updated_at DESC LIMIT 100`, since)),
    open
      ? safe(reader.all(`SELECT id AS id, worker_email AS assignee, title AS title, status AS status, case_id AS caseId, created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt
        FROM worker_tasks WHERE status <> 'completed' ORDER BY created_at LIMIT 100`))
      : safe(reader.all(`SELECT id AS id, worker_email AS assignee, title AS title, status AS status, case_id AS caseId, created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt
        FROM worker_tasks WHERE status = 'completed' AND updated_at >= ? ORDER BY updated_at DESC LIMIT 100`, since)),
    caseCodes(reader),
  ]);
  return [
    ...team.map((row) => ({ id: `t${row.id}`, assignee: String(row.assignee), trade: String(row.trade ?? ""), title: String(row.title), priority: String(row.priority ?? "Normal"), status: String(row.status), createdAt: String(row.createdAt), updatedAt: String(row.updatedAt), completedAt: String(row.completedAt ?? ""), projectCode: codes.get(Number(row.caseId)) ?? "" })),
    ...worker.map((row) => ({ id: `w${row.id}`, assignee: String(row.assignee), trade: "", title: String(row.title), priority: "Normal", status: String(row.status), createdAt: String(row.createdAt), updatedAt: String(row.updatedAt), completedAt: String(row.completedAt ?? ""), projectCode: codes.get(Number(row.caseId)) ?? "" })),
  ];
}

const ageText = (iso, persian) => {
  const days = Math.floor((Date.now() - Date.parse(iso)) / DAY);
  if (!Number.isFinite(days)) return "";
  if (persian) return days <= 0 ? "امروز" : days === 1 ? "دیروز" : `${days} روز پیش`;
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

const STATUS_FA = { assigned: "داده شده", in_progress: "در حال انجام", completed: "انجام شده", blocked: "متوقف" };

export function tasksAnswer({ tasks, people, projects, read, persian }) {
  const byEmail = new Map(people.map((person) => [person.email.toLowerCase(), person]));
  const byCode = new Map(projects.map((project) => [project.code, project]));
  const who = read.personEmails ?? [];
  let list = tasks.filter((task) => (!who.length || who.includes(task.assignee.toLowerCase())) && (!read.projectCode || task.projectCode === read.projectCode));
  const subject = who.length ? who.map((email) => (byEmail.get(email) ? niceName(byEmail.get(email)) : email)).join(", ") : "";
  const project = read.projectCode ? byCode.get(read.projectCode) : null;
  const where = project ? ` — ${project.name || project.customer} (${project.code})` : "";
  if (!list.length) {
    if (persian) return `${read.open ? "تسک بازی" : "تسک انجام‌شده‌ای در ۳ هفته گذشته"} ${subject ? `برای ${subject} ` : ""}پیدا نکردم${where ? ` ${where}` : ""}.`;
    return `${read.open ? "There are no open tasks" : "No tasks were finished in the last 3 weeks"}${subject ? ` for ${subject}` : ""}${where}.`;
  }
  const rank = { Urgent: 0, High: 1, Normal: 2 };
  list = [...list].sort((a, b) => (read.open ? (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2) || Date.parse(a.createdAt) - Date.parse(b.createdAt) : Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
  const shown = list.slice(0, 15);
  const line = (task) => {
    const person = byEmail.get(task.assignee.toLowerCase());
    const name = person ? niceName(person) : task.assignee;
    const proj = task.projectCode && byCode.get(task.projectCode) ? ` · ${byCode.get(task.projectCode).name || byCode.get(task.projectCode).customer}` : task.projectCode ? ` · ${task.projectCode}` : "";
    const mark = task.priority !== "Normal" ? `[${task.priority}] ` : "";
    const when = read.open ? ageText(task.createdAt, persian) : ageText(task.updatedAt, persian);
    if (persian) return `• ${mark}${isolate(clip(task.title, 90))} — ${isolate(name)}${proj ? isolate(proj) : ""} · ${read.open ? `${STATUS_FA[task.status] ?? task.status.replaceAll("_", " ")}، ${when}` : when}`;
    return `• ${mark}${clip(task.title, 90)} — ${name}${proj} · ${read.open ? `${task.status.replaceAll("_", " ")}, given ${when}` : `finished ${when}`}`;
  };
  const urgent = list.filter((task) => task.priority === "Urgent").length;
  const head = persian
    ? `${read.open ? "تسک‌های باز" : "تسک‌های انجام‌شده (۳ هفته گذشته)"}${subject ? ` — ${subject}` : ""}${where}: ${list.length} مورد${read.open && urgent ? ` (${urgent} فوری)` : ""}`
    : `${read.open ? "Open tasks" : "Finished tasks (last 3 weeks)"}${subject ? ` — ${subject}` : ""}${where}: ${list.length}${read.open && urgent ? ` (${urgent} urgent)` : ""}`;
  const more = list.length > shown.length ? (persian ? `\nو ${list.length - shown.length} مورد دیگر.` : `\nand ${list.length - shown.length} more.`) : "";
  return `${head}\n${shown.map(line).join("\n")}${more}`;
}

// ---------- Money ----------

export async function loadMoney(reader, { projectCode = "", general = false } = {}) {
  const scope = general ? "Business / General" : projectCode;
  const totals = await safe(reader.all(scope
    ? "SELECT project_code AS projectCode, type AS type, SUM(amount) AS total, COUNT(*) AS entries FROM finance_entries WHERE project_code = ? GROUP BY project_code, type"
    : "SELECT project_code AS projectCode, type AS type, SUM(amount) AS total, COUNT(*) AS entries FROM finance_entries GROUP BY project_code, type", ...(scope ? [scope] : [])));
  const recent = await safe(reader.all(scope
    ? "SELECT type AS type, category AS category, project_code AS projectCode, amount AS amount, entry_date AS entryDate, note AS note FROM finance_entries WHERE project_code = ? ORDER BY entry_date DESC, id DESC LIMIT 6"
    : "SELECT type AS type, category AS category, project_code AS projectCode, amount AS amount, entry_date AS entryDate, note AS note FROM finance_entries ORDER BY entry_date DESC, id DESC LIMIT 6", ...(scope ? [scope] : [])));
  return { totals, recent };
}

export function moneyAnswer({ money, projects, read, persian }) {
  const byCode = new Map(projects.map((project) => [project.code, project]));
  const income = money.totals.filter((row) => row.type === "Income").reduce((sum, row) => sum + Number(row.total), 0);
  const outcome = money.totals.filter((row) => row.type === "Outcome").reduce((sum, row) => sum + Number(row.total), 0);
  const entries = money.totals.reduce((sum, row) => sum + Number(row.entries), 0);
  const label = (code) => (byCode.get(code) ? `${byCode.get(code).name || byCode.get(code).customer} (${code})` : code);
  const scope = read.general ? "Business / General" : read.projectCode;
  const lines = [];
  if (persian) {
    lines.push(scope ? `مالی ${isolate(label(scope))}:` : "مالیِ کل شرکت:");
    lines.push(`• درآمد: ${formatMoney(income)}`, `• هزینه: ${formatMoney(outcome)}`, `• خالص: ${formatMoney(income - outcome)}`, `• تعداد ثبت‌ها: ${entries}`);
  } else {
    lines.push(scope ? `Money for ${label(scope)}:` : "Money across the whole company:");
    lines.push(`• Income: ${formatMoney(income)}`, `• Expenses: ${formatMoney(outcome)}`, `• Net: ${formatMoney(income - outcome)}`, `• Entries: ${entries}`);
  }
  const project = scope ? byCode.get(scope) : null;
  if (project && project.contractValue > 0) {
    lines.push(persian ? `• ارزش قرارداد: ${formatMoney(project.contractValue)}` : `• Contract value: ${formatMoney(project.contractValue)}`);
    lines.push(persian ? `• هنوز باید دریافت شود: ${formatMoney(project.balance)}` : `• Still to collect: ${formatMoney(project.balance)}`);
  }
  if (!scope) {
    const owing = projects.filter((item) => item.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);
    const total = projects.reduce((sum, item) => sum + Math.max(0, item.balance), 0);
    if (owing.length) {
      lines.push(persian ? `\nمطالبات باز (جمعاً ${formatMoney(total)}):` : `\nStill to collect (${formatMoney(total)} in all):`);
      for (const item of owing) lines.push(`• ${persian ? isolate(item.name || item.customer) : item.name || item.customer} (${item.code}) — ${formatMoney(item.balance)}`);
    }
  }
  if (money.recent.length) {
    lines.push(persian ? "\nآخرین ثبت‌ها:" : "\nLatest entries:");
    for (const row of money.recent) {
      const sign = row.type === "Income" ? "+" : "−";
      lines.push(`• ${row.entryDate} ${sign}${formatMoney(row.amount)} ${persian ? isolate(row.category) : row.category}${scope ? "" : ` · ${row.projectCode}`}${row.note ? ` — ${persian ? isolate(clip(row.note, 60)) : clip(row.note, 60)}` : ""}`);
    }
  }
  if (!entries && !project) lines.push(persian ? "\nهنوز هیچ ثبت مالی‌ای نیست." : "\nNo finance entries have been recorded yet.");
  return lines.join("\n");
}

// ---------- One project ----------

export async function loadProjectDetail(reader, project) {
  const today = new Date().toISOString().slice(0, 10);
  const caseRows = await safe(reader.all("SELECT id AS id FROM workflow_cases WHERE project_code = ? LIMIT 5", project.code));
  const ids = caseRows.map((row) => Number(row.id)).filter(Number.isInteger);
  const [events, plans, tasks] = await Promise.all([
    ids.length ? safe(reader.all(`SELECT title AS title, created_at AS at FROM workflow_events WHERE case_id = ? ORDER BY created_at DESC LIMIT 4`, ids[0])) : [],
    safe(reader.all("SELECT event_date AS day, start_time AS time, title AS title FROM schedule_events WHERE project_code = ? AND event_date >= ? ORDER BY event_date, start_time LIMIT 4", project.code, today)),
    loadTasks(reader, { open: true }),
  ]);
  return { events, plans, tasks: tasks.filter((task) => task.projectCode === project.code) };
}

export function projectAnswer({ project, detail, money, persian }) {
  const income = money.totals.filter((row) => row.type === "Income").reduce((sum, row) => sum + Number(row.total), 0);
  const outcome = money.totals.filter((row) => row.type === "Outcome").reduce((sum, row) => sum + Number(row.total), 0);
  const title = `${project.name || project.customer} (${project.code})`;
  const lines = persian
    ? [`${isolate(title)}`, `• مشتری: ${isolate(project.customer || "—")}${project.suburb ? ` · ${isolate(project.suburb)}` : ""}`, `• مرحله: ${isolate(project.stage || "—")} — ${project.progress}٪ پیشرفت`,
      `• ارزش قرارداد: ${formatMoney(project.contractValue)} · هنوز باید دریافت شود: ${formatMoney(project.balance)}`, `• تا الان: درآمد ${formatMoney(income)}، هزینه ${formatMoney(outcome)}`]
    : [title, `• Customer: ${project.customer || "—"}${project.suburb ? ` · ${project.suburb}` : ""}`, `• Stage: ${project.stage || "—"} — ${project.progress}% complete`,
      `• Contract value ${formatMoney(project.contractValue)} · still to collect ${formatMoney(project.balance)}`, `• So far: income ${formatMoney(income)}, expenses ${formatMoney(outcome)}`];
  const urgent = detail.tasks.filter((task) => task.priority === "Urgent").length;
  lines.push(persian ? `• تسک‌های باز: ${detail.tasks.length}${urgent ? ` (${urgent} فوری)` : ""}` : `• Open tasks: ${detail.tasks.length}${urgent ? ` (${urgent} urgent)` : ""}`);
  for (const task of detail.tasks.slice(0, 4)) lines.push(`   – ${persian ? isolate(clip(task.title, 70)) : clip(task.title, 70)}`);
  if (detail.plans.length) {
    lines.push(persian ? "• برنامه‌های پیش رو:" : "• Coming up:");
    for (const plan of detail.plans) lines.push(`   – ${plan.day}${plan.time ? ` ${plan.time}` : ""} ${persian ? isolate(clip(plan.title, 60)) : clip(plan.title, 60)}`);
  }
  if (detail.events.length) {
    lines.push(persian ? "• آخرین اتفاق‌ها:" : "• Latest changes:");
    for (const event of detail.events) lines.push(`   – ${(persian ? fmtDayFa : fmtDay).format(new Date(event.at))}: ${persian ? isolate(clip(event.title, 70)) : clip(event.title, 70)}`);
  }
  return lines.join("\n");
}

export function teamAnswer({ people, persian }) {
  const rows = people.map((person) => `• ${persian ? isolate(niceName(person)) : niceName(person)} — ${person.role}`);
  return persian ? `اعضای تأییدشده‌ی تیم (${people.length}):\n${rows.join("\n")}` : `Approved team members (${people.length}):\n${rows.join("\n")}`;
}

export const FA_UNUSED = FA; // keeps the Persian module linked for the formatters above
