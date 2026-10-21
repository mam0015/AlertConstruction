// Persian for Jarvis's basic mode (the rules that answer when no AI is connected). When the Owner writes Persian (in Persian letters, or a few
// well-known words in Latin letters), the fixed sentences Jarvis adds come out in Persian too. With an AI connected the AI already answers
// in the language the Owner wrote in (see ai.mjs), so this only matters for the rules.
//
// Records (titles, names, previews) are shown exactly as they were written, in whatever language that was. Each is wrapped in a Unicode
// "isolate" so English words inside a Persian line, and Persian words inside an English line, stay in their own place instead of jumbling
// the order of the sentence.

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const FINGLISH = /\b(khabar|akhbar|barname|taghvim)\b/i;

export const hasPersianLetters = (text) => ARABIC_SCRIPT.test(String(text ?? ""));
export const wantsPersian = (text) => hasPersianLetters(text) || FINGLISH.test(String(text ?? ""));

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
  basicLead: "حالت ساده است (هوش مصنوعی وصل نیست)، برای همین در رکوردهای شما گشتم. ",
  basicPreview: "حالت ساده است (هوش مصنوعی وصل نیست). حرف‌های شما را همان‌طور که گفتید در یک پاسخ گذاشتم. آن را بخوانید، هر چه خواستید عوض کنید و بعد Send را بزنید.",
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
    work: "درخواست‌ها و پروژه‌ها", tasks: "کارها", finance: "مالی", people: "تیم",
  },
};
