// Jarvis's basic mode (no AI): turns the Owner's sentence into prepared actions or a database answer, using the fixed rules in commands.mjs and the
// read-only lookups in lookups.mjs. It works with no AI connected, no internet and no key.
//
// Nothing here changes anything. An action is only PREPARED (checked against the real team and project lists by actions.mjs and shown as a card);
// it happens when the Owner presses the card's button. A question Jarvis cannot answer yet is asked back, and what it already understood travels
// with the Owner's next sentence (`pending`), so the Owner never has to start again.

import { describeAction, validateProposals } from "./actions.mjs";
import { cleanPending, formatMoney, interpret, niceName } from "./commands.mjs";
import { loadCategories, loadMoney, loadProjectDetail, loadProjects, loadTasks, moneyAnswer, projectAnswer, projectsAnswer, tasksAnswer, teamAnswer } from "./lookups.mjs";
import { hasPersianLetters, isolate, wantsPersian } from "./persian.mjs";
import { createReader } from "./readonly-db.mjs";

// The projects and finance categories that exist, so a sentence like "expense for the Smith job" can be tied to the real project. A failure here
// (a table that does not exist yet) only means those words are not recognised; the rest of the sentence is still understood.
export async function loadCommandContext(db) {
  try {
    const reader = createReader(db);
    const [projects, categories] = await Promise.all([loadProjects(reader).catch(() => []), loadCategories(reader).catch(() => [])]);
    return { projects, categories };
  } catch {
    return { projects: [], categories: [] };
  }
}

const dayFa = new Intl.DateTimeFormat("fa-u-ca-gregory-nu-latn", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

// The card text is English (it is shown next to the buttons); the spoken/read answer for a Persian sentence says the same thing in Persian.
function describeFa(action) {
  const name = isolate(action.personName || action.personEmail);
  if (action.type === "add_finance") {
    const project = action.projectCode === "Business / General" ? "کل شرکت" : `${isolate(action.projectName)} (${action.projectCode})`;
    return `ثبت ${action.financeType === "Income" ? "درآمد" : "هزینه"} ${formatMoney(action.amountCents)} (${isolate(action.category)}) برای ${project}، تاریخ ${action.entryDate}${action.text ? `. یادداشت: ${isolate(action.text)}` : ""}`;
  }
  if (action.type === "create_task") return `تسک${action.priority !== "Normal" ? ` ${action.priority === "Urgent" ? "فوری" : "مهم"}` : ""} برای ${name}: ${isolate(action.title)}`;
  if (action.type === "send_message") return `پیام به ${name}: ${isolate(action.text)}`;
  const date = dayFa.format(new Date(`${action.dates[0]}T12:00:00Z`));
  return `برنامه‌ی تقویم برای ${name}: ${isolate(action.title)} — ${date}${action.startTime ? `، ساعت ${action.startTime}` : ""}`;
}

/**
 * @returns {Promise<null | { reply: string, actions: any[], pending: any, persian: boolean }>} null when the sentence is not a command or a lookup
 */
export async function basicCommand({ db, message, people, owner, today, pending = null, isOtherIntent = () => false, isNewsOrPlans = () => false, projects, categories }) {
  const clean = cleanPending(pending);
  const ctx = { people, projects, categories, today, owner, pending: clean, isOtherIntent };
  const result = interpret(message, ctx);
  if (!result) return null;
  // "What's the news about Sam?" is a news question, not a request for the project's status.
  if (result.kind === "read" && (result.what === "project" || result.what === "projectChoice" || result.what === "projects") && isNewsOrPlans(message)) return null;
  const persian = wantsPersian(message) || hasPersianLetters(message) || Boolean(result.persian) || Boolean(clean?.slots?.persian) || Boolean(result.pending?.slots?.persian);
  const say = (en, fa) => (persian ? fa : en);
  const done = (reply, extra = {}) => ({ reply, actions: [], pending: null, persian, ...extra });

  if (result.kind === "dropped" || result.kind === "say") return done(persian ? result.say.fa : result.say.en);
  if (result.kind === "ask") return done(persian ? result.say.fa : result.say.en, { pending: result.pending });

  if (result.kind === "actions") {
    const { actions, dropped } = validateProposals(result.actions, { people, projects, today, ownerEmail: owner.email });
    if (!actions.length) {
      const why = [...new Set(dropped)].join(" ");
      return done(say(`I could not prepare that. ${why}`, `نتوانستم این را آماده کنم. ${why}`));
    }
    const lines = actions.map((action) => (persian ? describeFa(action) : describeAction(action)));
    const own = result.own ? say(" You did not name anyone, so it goes in your own calendar.", " اسم کسی را نگفتید، برای همین در تقویم خودتان می‌گذارم.") : "";
    const reply = actions.length === 1
      ? say(`Ready for you to confirm: ${lines[0]}${own} Press the button on the card to do it. Nothing has happened yet.`, `آماده‌ی تأیید شماست: ${lines[0]}.${own} دکمه‌ی کارت را بزنید تا انجام شود. هنوز هیچ کاری انجام نشده است.`)
      : say(`Ready for you to confirm (${actions.length}):\n${lines.map((line) => `• ${line}`).join("\n")}${own}\nPress the button on each card to do it. Nothing has happened yet.`, `آماده‌ی تأیید شماست (${actions.length} مورد):\n${lines.map((line) => `• ${line}`).join("\n")}.${own}\nدکمه‌ی هر کارت را بزنید تا انجام شود. هنوز هیچ کاری انجام نشده است.`);
    const extra = dropped.length ? say(`\n(I could not prepare ${dropped.length === 1 ? "one thing" : `${dropped.length} things`}: ${[...new Set(dropped)].join(" ")})`, `\n(${dropped.length} مورد را نتوانستم آماده کنم: ${[...new Set(dropped)].join(" ")})`) : "";
    return done(`${reply}${extra}`, { actions });
  }

  // ---- reads ----
  const reader = createReader(db);
  const byEmail = new Map(people.map((person) => [person.email.toLowerCase(), person]));
  if (result.what === "team") return done(teamAnswer({ people, persian }));
  if (result.what === "projects") return done(projectsAnswer({ projects, read: result, persian }));

  if (result.what === "tasks") {
    if (result.ambiguous?.length) return done(say(`Which one do you mean: ${result.ambiguous.join(" or ")}?`, `کدام یک را می‌گویید: ${result.ambiguous.join(" یا ")}؟`));
    if (result.projectUnknown) return done(say(`I can't find a project with the code ${result.projectUnknown}.`, `پروژه‌ای با کد ${result.projectUnknown} پیدا نکردم.`));
    if (result.unknownPerson) {
      const list = people.filter((person) => person.role !== "Owner").slice(0, 12).map(niceName).join(", ");
      return done(say(`I don't know anyone called “${result.unknownPerson}” on the approved team.${list ? ` The team is: ${list}.` : ""}`, `کسی به اسم «${result.unknownPerson}» در تیم تأییدشده نیست.${list ? ` تیم: ${list}.` : ""}`));
    }
    const tasks = await loadTasks(reader, { open: result.open });
    return done(tasksAnswer({ tasks, people: [...byEmail.values()], projects, read: result, persian }));
  }

  if (result.what === "money") {
    if (result.projectUnknown) return done(say(`I can't find a project with the code ${result.projectUnknown}.`, `پروژه‌ای با کد ${result.projectUnknown} پیدا نکردم.`));
    if (result.options?.length) {
      const list = result.options.map((code) => projects.find((project) => project.code === code)).filter(Boolean).map((project) => `${project.name || project.customer} (${project.code})`);
      return done(say(`Which project: ${list.join(" or ")}?`, `کدام پروژه: ${list.join(" یا ")}؟`));
    }
    const money = await loadMoney(reader, { projectCode: result.projectCode, general: result.general, category: result.category });
    return done(moneyAnswer({ money, projects, read: result, persian }));
  }

  if (result.what === "projectChoice") {
    const list = result.options.map((code) => projects.find((project) => project.code === code)).filter(Boolean).map((project) => `${project.name || project.customer} (${project.code})`);
    return done(say(`Which project: ${list.join(" or ")}?`, `کدام پروژه: ${list.join(" یا ")}؟`));
  }

  if (result.what === "project") {
    const project = projects.find((entry) => entry.code === result.projectCode);
    if (!project) return null;
    const [detail, money] = await Promise.all([loadProjectDetail(reader, project), loadMoney(reader, { projectCode: project.code })]);
    return done(projectAnswer({ project, detail, money, persian }));
  }
  return null;
}

export { niceName };
