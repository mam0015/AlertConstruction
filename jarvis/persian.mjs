// Persian for Jarvis's basic mode (the rules that answer when no AI is connected). When the Owner writes Persian (in Persian letters, or a few
// well-known words in Latin letters), the fixed sentences Jarvis adds come out in Persian too. With an AI connected the AI already answers
// in the language the Owner wrote in (see ai.mjs), so this only matters for the rules.
//
// Records (titles, names, previews) are shown exactly as they were written, in whatever language that was. Each is wrapped in a Unicode
// "isolate" so English words inside a Persian line, and Persian words inside an English line, stay in their own place instead of jumbling
// the order of the sentence.

const PERSIAN_LETTER = "؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿";
const ARABIC_SCRIPT = new RegExp(`[${PERSIAN_LETTER}]`);
const ARABIC_LETTERS = new RegExp(`[${PERSIAN_LETTER}]`, "g");
const LATIN_LETTERS = /[A-Za-z]/g;
const FINGLISH = /\b(khabar|akhbar|barname|taghvim)\b/i;

export const hasPersianLetters = (text) => ARABIC_SCRIPT.test(String(text ?? ""));
// Persian when about a third or more of the letters are Persian (so an English question with one Persian word stays English), or when a short
// message is written in Latin letters but uses a well-known Persian word for news or plans ("khabar chie?").
export function wantsPersian(text) {
  const value = String(text ?? "");
  const persian = (value.match(ARABIC_LETTERS) ?? []).length;
  const latin = (value.match(LATIN_LETTERS) ?? []).length;
  if (persian && persian * 2 >= latin) return true;
  return !persian && latin <= 60 && FINGLISH.test(value);
}

// First-strong isolate: the wrapped text decides its own direction and cannot reorder the text around it.
export function isolate(text) {
  const value = String(text ?? "").trim();
  return value ? `⁨${value}⁩` : "";
}

const formatter = new Intl.DateTimeFormat("fa-u-ca-gregory-nu-latn", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export function persianWhen(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? String(iso) : formatter.format(date);
}

export const FA = {
  hello: "سلام. اخبار، برنامه‌های پیش رو، یا یک مشتری یا پروژه را بخواهید تا بگردم.",
  thanks: "خواهش می‌کنم.",
  cannot: "این کار از من برنمی‌آید. می‌توانم برنامه را بخوانم، اخبار را بگویم و پیام، برنامهٔ تقویم و کار را برای تأیید شما آماده کنم. هیچ رکورد، پول یا دسترسی را پاک یا عوض نمی‌کنم.",
  needsAi: `این را به‌عنوان یک دستور نفهمیدم. بدون هوش مصنوعی جمله‌هایی مثل این‌ها را می‌فهمم:
• برای علی یک تسک بذار: کاشی‌ها را چک کند
• به بن بگو فردا ساعت ۷ سر کار باشد
• بازرسی شهرداری را جمعه ساعت ۱ ظهر توی تقویم سارا بذار
• یک هزینه‌ی ۳۲۰ دلاری برای کاشی روی پروژه ATP-2026-00124 ثبت کن
• تسک‌های علی چیه؟ · وضعیت مالی چطوره؟ · پروژه‌ی اسمیت چطوره؟
• اخبار چیه؟ · چه برنامه‌هایی پیش رو است؟
زیر خط فرمان می‌توانید «Prepare by hand» را هم بزنید. برای کارهای بازتر، یک هوش مصنوعی وصل کنید.`,
  noNews: (period) => `در ${period} هیچ اتفاق تازه‌ای نیفتاده است.`,
  noMatch: (period) => `در ${period} چیزی پیدا نکردم.`,
  lookupOnly: (period) => `در ${period} چیزی درباره‌ی این پیدا نکردم.
${FA.needsAi}`,
  periods: { day: "۲۴ ساعت گذشته", days: (n) => `${n} روز گذشته`, hours: (n) => `${n} ساعت گذشته` },
  // Short screen-only notes (never part of the answer, so they are never read aloud).
  basicNote: "حالت ساده: هوش مصنوعی وصل نیست، برای همین در رکوردهای شما گشتم.",
  adviceNeedsAi: "ایده و مشورت کار هوش مصنوعی است: رکوردهای شما را می‌خواند و با شما موضوع را بررسی می‌کند. برای آن Jarvis 1 یا Jarvis 2 را وصل کنید.",
  basicRulesNote: "حالت ساده: هوش مصنوعی وصل نیست، برای همین جمله‌ی شما را با قاعده‌های ثابت خواندم.",
  notConnected: (name, engine) => `${name} (${engine}) هنوز وصل نیست، برای همین حالت ساده را استفاده کردم.`,
  offline: (name) => `${name} در حالت Offline است، پس چیزی برای هوش مصنوعی فرستاده نشد و حالت ساده را استفاده کردم.`,
  basicLead: "حالت ساده است (هوش مصنوعی وصل نیست)، برای همین در رکوردهای شما گشتم. ",
  basicPreviewTail: "حرف‌های شما را همان‌طور که گفتید در یک پاسخ گذاشتم. آن را بخوانید، هر چه خواستید عوض کنید و بعد Send را بزنید.",
  basicPrefix: "حالت ساده است (هوش مصنوعی وصل نیست). ",
  couldNotRead: "پاسخ شما را ننوشتم، چون نتوانستم آن ایمیل را بخوانم. کمی بعد دوباره امتحان کنید.",
  newsHeader: "این اتفاق‌ها افتاده است، از تازه‌ترین:",
  newsNone: "در این بازه هیچ اتفاق تازه‌ای نیفتاده است.",
  plansHeader: "این برنامه‌ها پیش رو است، از نزدیک‌ترین:",
  plansNone: (days) => `در ${days} روز آینده برنامه‌ای ثبت نشده است.`,
  matches: "این‌ها با خواسته‌ی شما می‌خوانند:",
  attention: "این‌ها به توجه شما نیاز دارند:",
  nothingFound: "در این بازه چیزی پیدا نکردم.",
  incomplete: (labels) => `توجه: نتوانستم ${labels} را کامل بخوانم، پس ممکن است این پاسخ ناقص باشد.`,
  and: " و ",
  areas: {
    company_email: "ایمیل", employee_updates: "گزارش‌ها", client_comments: "مشتری‌ها", team_messages: "پیام‌های تیم",
    work: "درخواست‌ها و پروژه‌ها", tasks: "کارها", finance: "مالی", people: "تیم", schedule: "برنامه‌ها",
  },
};
