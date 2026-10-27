// Jarvis only ever PREPARES things (a message, a calendar entry, a task); the Owner's button makes them happen. An AI brain can still write
// "Done, I have sent it and deleted the rest" by mistake. That sentence would be false, and the Owner could believe it, so it is taken out of the reply
// and one plain, true line is put in its place. Sentences that describe what OTHER people did ("Sue sent the report") are left alone: only the AI's
// claims about its own doing (first person, a bare "Done", or "everything has been sent") are removed.

const I = "(?:i|i've|i have|i had|we've|we have)\\s+(?:just\\s+|already\\s+|now\\s+|also\\s+|gone ahead and\\s+)?";
// Verbs that can only mean "I did something in the world" are enough on their own; softer ones ("added", "updated") count only with an object.
const FIRST_PERSON = new RegExp(`\\b${I}(?:(?:sent|messaged|emailed|e-mailed|texted|notified|told|deleted|erased|removed|wiped|cancelled|canceled)\\b|done (?:it|that|this|so)\\b|(?:created|added|booked|scheduled|updated|changed|assigned|approved|paid|published|completed)\\b[^.!?\\n]{0,40}\\b(?:task|message|email|e-mail|entry|calendar|event|reminder|meeting|project|record|invoice|payment|everyone|him|her|them|team|customer|client)\\b)`, "i");
const BARE_DONE = /^\s*(?:all\s+)?(?:done|sorted|finished|completed)\b(?:\s*[,.!:;—-]|\s*$)/i;
const EVERYTHING = /\b(?:everything|all of it|all|it|that|they|these|those)\s+(?:has|have|was|were|is|are)\s+(?:now\s+|already\s+)?(?:been\s+)?(?:sent|delivered|deleted|erased|removed|wiped|done|created|added|booked|scheduled|messaged|emailed|notified|updated)\b/i;
const OBJECT_DONE = /^\s*(?:message|email|e-mail|task|reminder|calendar entry|entry|reply)\s+(?:sent|created|added|booked|scheduled|deleted|delivered)\s*[.!]*\s*$/i;
// A sentence that says what WILL happen, what is only ready, or what did NOT happen is true and stays.
const SAFE = /\b(?:when|once|after|if|until|before|whenever|press|pressing|button|click|confirm|will|would|going to|can be|could be|to be|ready|prepared|prepare|not yet|nothing|hasn't|haven't|has not|have not|did not|didn't|could not|couldn't|cannot|can't|unable)\b/i;

const FA_CLAIM = /(?:انجام شد|انجامش دادم|انجام دادم|فرستادم|ارسال شد|فرستاده شد|پاک کردم|پاک شد|حذف شد|حذف کردم|اضافه کردم|اضافه شد|ثبت شد|ثبت کردم|ساختم|ایجاد شد|رزرو کردم|تمام شد|اطلاع دادم|پیام دادم)/;
const FA_SAFE = /(?:وقتی|بعد از|با فشردن|دکمه|نشده|هنوز|می‌شود|میشود|می‌شوند|خواهد|نتوانستم|نمی‌توانم|هیچ|آماده)/;

const hasPersian = (text) => /[؀-ۿ]/.test(text);

function isFalseClaim(sentence) {
  if (hasPersian(sentence)) return FA_CLAIM.test(sentence) && !FA_SAFE.test(sentence);
  if (SAFE.test(sentence)) return false;
  return FIRST_PERSON.test(sentence) || BARE_DONE.test(sentence) || EVERYTHING.test(sentence) || OBJECT_DONE.test(sentence);
}

const TRUE_LINE = {
  en: { none: "Nothing has been done: Jarvis only reads and prepares things.", prepared: "Nothing has been done yet: what is prepared happens only when you press its button." },
  fa: { none: "هیچ کاری انجام نشده است: Jarvis فقط می‌خواند و آماده می‌کند.", prepared: "هنوز هیچ کاری انجام نشده است: آنچه آماده شده فقط با فشردن دکمه‌اش انجام می‌شود." },
};

// Returns { reply, removed } where `removed` is the number of sentences taken out. `prepared` says whether the Owner has buttons waiting.
export function removeFalseClaims(reply, { prepared = false } = {}) {
  const text = String(reply ?? "");
  const parts = text.split(/(?<=[.!?؟۔])[ \t]+|\n+/).filter((part) => part.trim());
  const kept = parts.filter((part) => !isFalseClaim(part));
  const removed = parts.length - kept.length;
  if (!removed) return { reply: text, removed: 0 };
  const lines = TRUE_LINE[hasPersian(text) ? "fa" : "en"];
  return { reply: [...kept, prepared ? lines.prepared : lines.none].join(" ").trim(), removed };
}
