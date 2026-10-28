// Jarvis without an AI: the Owner's plain sentence is read by fixed rules into a command.
//
//   "set a task for Ali: check the tiles"            -> a task for Ali
//   "enter an expense of $320 for tiles on ATP-…"    -> a finance entry for that project
//   "put the council inspection in Sue's calendar on Friday at 1pm"
//   "tell Ben to be on site at 7"                    -> an in-app message
//   "what tasks does Ali have?" / "how is the money?" -> a read (answered from the database by lookups.mjs)
//
// This file only UNDERSTANDS. It never writes anything and never decides anything on its own: what it returns is a proposal
// that actions.mjs validates again against the real team and project lists, and that happens only when the Owner presses the button.
// When something is missing (who? what? how much? which project?) it asks a short question and remembers what it already understood
// (`pending`), so the Owner's next sentence only has to supply the missing piece.
//
// English, Persian (Persian letters) and Persian written in Latin letters ("baraye Ali task bezar") are understood. A word the rules
// do not know is never guessed: Jarvis asks.

import { clipText, oneLine } from "./text.mjs";

// ---------- Folding: one character in, one character out, so a position in the folded text is a position in the Owner's own text ----------

const DIGIT_FA = "۰۱۲۳۴۵۶۷۸۹";
const DIGIT_AR = "٠١٢٣٤٥٦٧٨٩";
export function fold(text) {
  return Array.from(String(text ?? ""), (char) => {
    const fa = DIGIT_FA.indexOf(char);
    if (fa >= 0) return String(fa);
    const ar = DIGIT_AR.indexOf(char);
    if (ar >= 0) return String(ar);
    if (char === "ي") return "ی";
    if (char === "ك") return "ک";
    if (char === "‌" || char === "‍" || char === "‏" || char === "‎") return " "; // half-space, joiner, direction marks
    if (char === "’" || char === "‘" || char === "ʼ") return "'";
    if (char === "“" || char === "”" || char === "«" || char === "»") return '"';
    if (char === "،") return ",";
    if (char === "؟") return "?";
    if (char === "–" || char === "—") return "-";
    if (char === "：") return ":";
    return char.toLowerCase();
  }).join("");
}

export const hasPersianLetters = (text) => /[؀-ۿ]/.test(text);
const isPersianish = (original) => hasPersianLetters(original) || /\b(?:baraye|bezar|bezari|bede|bego|peyam|farda|emrooz|pasfarda|hazine|daramad|sabt|yadavari)\b/i.test(original);

// ---------- Names ----------

const FA_TO_LATIN = { "ا": "a", "آ": "a", "ب": "b", "پ": "p", "ت": "t", "ث": "s", "ج": "j", "چ": "ch", "ح": "h", "خ": "kh", "د": "d", "ذ": "z", "ر": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s", "ض": "z", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "gh", "ک": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n", "و": "v", "ه": "h", "ی": "i", "ئ": "i", "ء": "", "ؤ": "v", "أ": "a", "إ": "a", "ة": "h" };

// A name reduced to its consonants: "Mohammad" and "محمد" both become "mhmd"; "Ali" and "علی" both become "al". Used only to recognise a name typed in
// Persian letters against a team list written in Latin letters (or the other way round). Two people with the same key are never guessed between: Jarvis asks.
export function nameKey(word) {
  const latin = hasPersianLetters(word) ? Array.from(word, (char) => FA_TO_LATIN[char] ?? (/[a-z]/.test(char) ? char : "")).join("") : word;
  const letters = latin.toLowerCase().replace(/[^a-z]/g, "").replace(/kh/g, "x").replace(/gh/g, "q").replace(/sh/g, "c").replace(/ch/g, "c").replace(/ph/g, "f").replace(/th/g, "t").replace(/w/g, "v").replace(/[qk]/g, "k").replace(/z/g, "s");
  if (letters.length < 2) return "";
  const consonants = letters.slice(1).replace(/[aeiouyhv]/g, "").replace(/(.)\1+/g, "$1");
  return `${/[aeiou]/.test(letters[0]) ? "a" : letters[0]}${consonants}`;
}

const NAME_STOP = new Set(["the", "and", "for", "site", "senior", "junior", "lead", "mr", "mrs", "ms", "dr", "owner", "admin", "team"]);
function personWords(person) {
  const local = String(person.email ?? "").split("@")[0] ?? "";
  const words = new Set();
  for (const part of [...local.split(/[._+\-\d]+/), ...String(person.name ?? "").split("·")[0].replace(/\(.*?\)/g, " ").split(/[^\p{L}\p{N}]+/u)]) {
    const word = fold(part);
    if (word.length >= 2 && !NAME_STOP.has(word)) words.add(word);
  }
  return [...words];
}
function roleWords(person) {
  const trade = String(person.name ?? "").split("·")[1] ?? "";
  return fold(`${person.role} ${trade}`).split(/[^\p{L}]+/u).filter((word) => word.length >= 4 && !NAME_STOP.has(word));
}

// One word of the Owner's text against the team: the first or last name or login word, then (Persian letters) the consonant key, then a job title ("the tiler").
function matchWord(word, people) {
  const exact = people.filter((person) => personWords(person).includes(word));
  if (exact.length) return { people: exact, how: "name" };
  if (word.length >= 2) {
    const key = nameKey(word);
    if (key) {
      // Persian letters against a Latin team list (or the reverse) by sound; two Latin spellings only when both are long enough not to confuse "Ali" with "Eli".
      const loose = people.filter((person) => personWords(person).some((candidate) => nameKey(candidate) === key && (hasPersianLetters(word) || hasPersianLetters(candidate) || (word.length >= 5 && candidate.length >= 5))));
      if (loose.length) return { people: loose, how: "sound" };
    }
  }
  if (word.length >= 4) {
    const byRole = people.filter((person) => roleWords(person).includes(word));
    if (byRole.length) return { people: byRole, how: "role" };
  }
  return null;
}

const SELF_WORDS = new Set(["me", "my", "myself", "mine", "خودم", "من", "برای خودم", "mano", "khodam"]);
const stripPossessive = (word) => word.replace(/'s$/, "").replace(/'$/, "");

// ---------- Tokens and the frame of a command ----------

function tokenize(text) {
  return Array.from(text.matchAll(/\S+/gu), (match) => ({ raw: match[0], start: match.index, end: match.index + match[0].length }));
}
const bare = (raw) => stripPossessive(raw.replace(/^[\s"'(\[{.,:;!?\-]+|[\s"')\]}.,:;!?\-]+$/gu, ""));

// STRONG: the words of the command itself ("set a task for … to …"). CONNECT: the little words that link them. ARTICLE: only part of the frame when they sit
// before a STRONG word ("a task"); right before the Owner's own words they belong to those words ("the tiles arrive Thursday").
const STRONG = new Set(`set give assign create add make put enter record log book schedule send write post tell message messages msg text notify remind ping inform let know
task tasks todo todos assignment assigned allocate hand ask please pls kindly can could would will you i we
calendar diary entry reminder
تسک وظیفه بذار بگذار بده بدی بساز ایجاد ست کن تعریف ثبت اضافه وارد بنویس بفرست بگو بگیر پیام خبر اطلاع یادآوری تقویم لطفا خواهشا بکن بکنی بزن
task bezar bezari bede bedi bokon kon bego begoo peyam yadavari sabt vared ezafe lotfan`.split(/\s+/));
const CONNECT = new Set(`to for of on in at into by from with about regarding that as and then so also now just them him her his their it
برای به را رو که تا از در با و هم ام است`.split(/\s+/));
// "be", "ro", "ke" … are Persian-in-Latin-letters words but also plain English ("to be on site"): they count as frame words only in a sentence that is clearly Finglish.
const CONNECT_FINGLISH = new Set("baraye be ro ra ke ta az dar ba va ham".split(" "));
const FINGLISH_MARK = /(?<![\p{L}])(?:baraye|bezar|bezari|bede|bedi|bego|begoo|peyam|bokon|lotfan|yadavari|farda|emrooz|pasfarda|sabt|vared|ezafe)(?![\p{L}])/u;
const ARTICLE = new Set(["a", "an", "the", "my", "our", "one", "some", "new", "another", "me", "us", "یک", "یه", "جدید", "yek", "ye"]);
const STOPPERS = new Set(["to", "that", "about", "regarding", "که", "تا", "ke", "ta"]);
const isFrameWord = (word) => word === "" || STRONG.has(word) || CONNECT.has(word) || ARTICLE.has(word);

const POLITE_LEAD = /^(?:(?:hey|hi|hello|ok|okay|so|jarvis)[\s,]+)*(?:(?:can|could|would|will) you(?: please)?|i need you to|i want you to|i'd like you to|i would like you to|please)\s+/;
const POLITE_LEAD_FA = /^(?:لطفا|لطفاً|خواهشا|خواهش می ?کنم|میشه|می شه|میتونی|می تونی|میخوام|می خوام|lotfan)\s+/;

// ---------- Dates and times ----------

const dayMs = 86_400_000;
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (date, days) => isoDate(Date.parse(`${date}T00:00:00Z`) + days * dayMs);
const weekdayOf = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();
function realDate(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  const text = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return !Number.isNaN(Date.parse(`${text}T00:00:00Z`)) && isoDate(Date.parse(`${text}T00:00:00Z`)) === text ? text : "";
}
function nextWeekday(today, weekday) {
  let delta = (weekday - weekdayOf(today) + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(today, delta);
}
// A date without a year means the next time it comes round.
function yearless(today, month, day, past = false) {
  const year = Number(today.slice(0, 4));
  const thisYear = realDate(year, month, day);
  if (past) return thisYear && thisYear <= addDays(today, 1) ? thisYear : realDate(year - 1, month, day);
  return thisYear && thisYear >= today ? thisYear : realDate(year + 1, month, day);
}

const MONTHS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const WEEKDAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const WEEKDAYS_SHORT = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const WEEKDAYS_FA = [["یکشنبه", 0], ["یک شنبه", 0], ["دوشنبه", 1], ["دو شنبه", 1], ["سه شنبه", 2], ["سهشنبه", 2], ["چهارشنبه", 3], ["چهار شنبه", 3], ["پنجشنبه", 4], ["پنج شنبه", 4], ["جمعه", 5], ["شنبه", 6]];
const WEEKDAYS_FINGLISH = { yekshanbe: 0, doshanbe: 1, seshanbe: 2, chaharshanbe: 3, panjshanbe: 4, jome: 5, jomeh: 5, shanbe: 6 };
const NOT_LETTER_BEFORE = "(?<![\\p{L}\\d])";
const NOT_LETTER_AFTER = "(?![\\p{L}\\d])";

// Finds a date in the folded text: { date, start, end }, or { jalali: true } for a Persian-calendar year (never guessed), or null.
export function parseDate(f, today, { past = false } = {}) {
  let m;
  if ((m = /(?<![\d/-])(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?![\d/-])/.exec(f))) {
    const year = Number(m[1]);
    if (year >= 1300 && year <= 1500) return { jalali: true, start: m.index, end: m.index + m[0].length };
    const date = realDate(year, Number(m[2]), Number(m[3]));
    if (date) return { date, start: m.index, end: m.index + m[0].length };
  }
  if ((m = /(?<![\d.:/$-])(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?(?![\d:/])(?!\s*(?:am|pm))/.exec(f))) {
    const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null;
    if (year && year >= 1300 && year <= 1500) return { jalali: true, start: m.index, end: m.index + m[0].length };
    const date = year ? realDate(year, Number(m[2]), Number(m[1])) : yearless(today, Number(m[2]), Number(m[1]), past);
    if (date) return { date, start: m.index, end: m.index + m[0].length };
  }
  if ((m = new RegExp(`${NOT_LETTER_BEFORE}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_NAMES})${NOT_LETTER_AFTER}(?:,?\\s+(\\d{4}))?`, "u").exec(f))) {
    const date = m[3] ? realDate(Number(m[3]), MONTHS[m[2]], Number(m[1])) : yearless(today, MONTHS[m[2]], Number(m[1]), past);
    if (date) return { date, start: m.index, end: m.index + m[0].length };
  }
  if ((m = new RegExp(`${NOT_LETTER_BEFORE}(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:])(?:,?\\s+(\\d{4}))?`, "u").exec(f))) {
    const date = m[3] ? realDate(Number(m[3]), MONTHS[m[1]], Number(m[2])) : yearless(today, MONTHS[m[1]], Number(m[2]), past);
    if (date) return { date, start: m.index, end: m.index + m[0].length };
  }
  const relative = [
    [new RegExp(`day after tomorrow|پس ?فردا|${NOT_LETTER_BEFORE}pas ?farda${NOT_LETTER_AFTER}`, "u"), 2],
    [new RegExp(`${NOT_LETTER_BEFORE}(?:tomorrow|tmrw|tmw|farda|فردا)${NOT_LETTER_AFTER}`, "u"), 1],
    [new RegExp(`${NOT_LETTER_BEFORE}(?:today|tonight|emrooz|امروز|امشب)${NOT_LETTER_AFTER}`, "u"), 0],
  ];
  for (const [pattern, days] of relative) if ((m = pattern.exec(f))) return { date: addDays(today, days), start: m.index, end: m.index + m[0].length };
  for (const [name, weekday] of WEEKDAYS_FA) {
    const found = new RegExp(`${NOT_LETTER_BEFORE}${name}${NOT_LETTER_AFTER}`, "u").exec(f);
    if (found) return { date: nextWeekday(today, weekday), start: found.index, end: found.index + found[0].length };
  }
  for (const [name, weekday] of Object.entries(WEEKDAYS_FINGLISH)) {
    const found = new RegExp(`${NOT_LETTER_BEFORE}${name}${NOT_LETTER_AFTER}`, "u").exec(f);
    if (found) return { date: nextWeekday(today, weekday), start: found.index, end: found.index + found[0].length };
  }
  if ((m = new RegExp(`${NOT_LETTER_BEFORE}(?:(?:next|this|on|by|every)\\s+)?(${Object.keys(WEEKDAYS).join("|")})${NOT_LETTER_AFTER}`, "u").exec(f))) {
    return { date: nextWeekday(today, WEEKDAYS[m[1]]), start: m.index, end: m.index + m[0].length };
  }
  if ((m = new RegExp(`${NOT_LETTER_BEFORE}(?:next|this|on|by)\\s+(${Object.keys(WEEKDAYS_SHORT).join("|")})${NOT_LETTER_AFTER}`, "u").exec(f))) {
    return { date: nextWeekday(today, WEEKDAYS_SHORT[m[1]]), start: m.index, end: m.index + m[0].length };
  }
  return null;
}

// "1pm", "13:30", "at 9am", "ساعت ۱۰ صبح". Returns { time: "HH:MM", start, end } or null.
export function parseTime(f) {
  let m;
  if ((m = /(?:\bat\s+|@\s*)?(?<![\d:.])(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?![\p{L}])/u.exec(f))) {
    let hour = Number(m[1]);
    if (hour >= 1 && hour <= 12) {
      const pm = m[3].startsWith("p");
      hour = pm ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
      return { time: `${String(hour).padStart(2, "0")}:${m[2] ?? "00"}`, start: m.index, end: m.index + m[0].length };
    }
  }
  if ((m = /(?<![\d.:/])([01]?\d|2[0-3]):([0-5]\d)(?![\d:/])/.exec(f))) {
    return { time: `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`, start: m.index, end: m.index + m[0].length };
  }
  if ((m = /(?:ساعت|\bsaat\b|\bat\b)\s*(\d{1,2})(?::(\d{2}))?(?:\s*(صبح|ظهر|بعد ?از ?ظهر|عصر|شب|morning|afternoon|evening|night))?/u.exec(f))) {
    let hour = Number(m[1]);
    if (hour > 23) return null;
    const part = m[3] ?? "";
    if (/بعد|عصر|شب|afternoon|evening|night/.test(part) && hour < 12) hour += 12;
    else if (/ظهر/.test(part) && hour < 11) hour += 12;
    return { time: `${String(hour).padStart(2, "0")}:${m[2] ?? "00"}`, start: m.index, end: m.index + m[0].length };
  }
  return null;
}

// ---------- Money ----------

const LARGE = 10_000_000_000; // cents: $100,000,000, the same ceiling the finance form enforces
const UNIT = "(k|grand|thousand|هزار|hezar|m|million|میلیون|milion)";

// "$320", "320 dollars", "1,250.50", "5k", "2.5 grand", "۵ هزار دلار"; a bare number ("5000") counts only when allowBare. Returns { cents, start, end } or null.
export function parseAmount(f, { allowBare = false } = {}) {
  const scale = (value, unit) => {
    const number = Number(String(value).replace(/,/g, ""));
    if (!Number.isFinite(number)) return NaN;
    if (/^(k|grand|thousand|هزار|hezar)$/.test(unit ?? "")) return number * 1000;
    if (/^(m|million|میلیون|milion)$/.test(unit ?? "")) return number * 1_000_000;
    return number;
  };
  const candidates = [
    new RegExp(`(?:aud\\s*)?\\$\\s*(\\d[\\d,]*(?:\\.\\d{1,2})?)\\s*${UNIT}?${NOT_LETTER_AFTER}`, "u"),
    new RegExp(`${NOT_LETTER_BEFORE}(\\d[\\d,]*(?:\\.\\d{1,2})?)\\s*${UNIT}?\\s*(?:dollars?|aud|bucks|\\$|دلاری?|dolar)${NOT_LETTER_AFTER}`, "u"),
    new RegExp(`${NOT_LETTER_BEFORE}(\\d[\\d,]*(?:\\.\\d{1,2})?)\\s*(k|grand)${NOT_LETTER_AFTER}`, "u"),
  ];
  for (const pattern of candidates) {
    const m = pattern.exec(f);
    if (m) {
      const value = scale(m[1], m[2]);
      if (Number.isFinite(value)) return { cents: Math.round(value * 100), start: m.index, end: m.index + m[0].length };
    }
  }
  if (allowBare) {
    const m = /(?<![\p{L}\d.\-/:$])(\d[\d,]*(?:\.\d{1,2})?)(?![\p{L}\d.\-/:])/u.exec(f);
    if (m) {
      const value = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(value)) return { cents: Math.round(value * 100), start: m.index, end: m.index + m[0].length };
    }
  }
  return null;
}

// Whole dollars show without cents ("$320"); anything else shows both digits ("$1,250.50").
export const formatMoney = (cents) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: Number(cents ?? 0) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(Number(cents ?? 0) / 100);

const CATEGORY_WORDS = [
  ["Materials", /(?<![\p{L}])(?:materials?|tiles?|timber|paint|grout|cement|concrete|bricks?|plaster\w*|gyprock|insulation|steel|pipes?|cable|wiring|supplies|hardware|lumber|glass|flooring|cabinets?|benchtops?|bunnings|مصالح|کاشی|رنگ|سیمان|چوب|لوله|مواد)(?![\p{L}])/u],
  ["Labour", /(?<![\p{L}])(?:labou?r|wages?|payroll|salary|salaries|casuals?|overtime|دستمزد|حقوق|کارگر)(?![\p{L}])/u],
  ["Subcontractors", /(?<![\p{L}])(?:sub-?contract\w*|plumber|plumbing|electrician|electrical|tiler|carpenter|roofer|painter|concreter|bricklayer|پیمانکار)(?![\p{L}])/u],
  ["Equipment hire", /(?<![\p{L}])(?:hire|rental|equipment|scaffold\w*|skip bin|excavator|machinery|tools?|ابزار|اجاره)(?![\p{L}])/u],
  ["Fuel", /(?<![\p{L}])(?:fuel|petrol|diesel|servo|بنزین|گازوئیل|سوخت)(?![\p{L}])/u],
  ["Permits and fees", /(?<![\p{L}])(?:permits?|council|fees?|insurance|licen[cs]e|engineer|engineering|مجوز|شهرداری|بیمه|عوارض)(?![\p{L}])/u],
  ["Deposit", /(?<![\p{L}])(?:deposits?|down ?payment|پیش ?پرداخت|بیعانه)(?![\p{L}])/u],
  ["Progress payment", /(?<![\p{L}])(?:progress (?:payment|claim)|stage payment|claim)(?![\p{L}])/u],
  ["Final payment", /(?<![\p{L}])(?:final (?:payment|claim|invoice)|completion payment|handover payment|تسویه)(?![\p{L}])/u],
  ["Variation", /(?<![\p{L}])(?:variation|extra work|change order)(?![\p{L}])/u],
];
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function guessCategory(f, known = []) {
  for (const category of known) {
    const name = fold(category);
    if (name.length >= 3 && new RegExp(`${NOT_LETTER_BEFORE}${escapeRegex(name)}${NOT_LETTER_AFTER}`, "u").test(f)) return category;
  }
  for (const [category, pattern] of CATEGORY_WORDS) if (pattern.test(f)) return category;
  return "";
}

const INCOME = /(?<![\p{L}])(?:income|revenue|received|receive|deposits?|payment from|paid by|paid us|(?:client|customer) paid|progress payment|final payment|got paid|invoice paid|درآمد|دریافت(?:ی)?|واریز|بیعانه|پیش ?پرداخت|daramad|daryaft|variz)(?![\p{L}])/u;
const EXPENSE = /(?<![\p{L}])(?:expenses?|expenditure|outcome|spent|spend|cost|costs|bought|buy|purchase[ds]?|paid for|paid to|paid|bill|supplier|wages?|هزینه|خرج|خرید|پرداخت|hazine|kharj|kharid|pardakht)(?![\p{L}])/u;
const FINANCE_NOUN = /(?<![\p{L}])(?:finance|financial|money|ledger|expenses?|income|outcome|revenue|costs?|spent|deposits?|payments?|invoices?|paid|bought|مالی|پول|هزینه|درآمد|دریافت|واریز|پرداخت|فاکتور|خرید)(?![\p{L}])/u;
// The words that only say income-or-expense; they are not part of the note. (Words like "wages" or "fuel" say WHAT it was and stay in the note.)
const TYPE_ONLY = /^(?:income|revenue|received|receive|expenses?|expenditure|outcome|spent|spend|costs?|paid|bought|purchased?|درآمد|هزینه|دریافت|واریز|پرداخت|خرج|خرید|daramad|hazine)$/u;
const ENTER_VERB = /(?<![\p{L}])(?:enter|add|log|record|put|book|post|register|note|create|make|input|save|insert|set|spent|paid|bought|received)(?![\p{L}])|ثبت|وارد|اضافه|بنویس|بزن|بذار|بگذار|بساز|(?<![\p{L}])(?:sabt|vared|ezafe|benevis)(?![\p{L}])/u;

// ---------- Projects ----------

const CODE_SHAPE = /(?<![\p{L}\d])[a-z]{2,6}-\d{4}-\d{3,6}(?![\p{L}\d])/u;
const PROJECT_STOP = new Set(["the", "and", "for", "job", "jobs", "project", "projects", "site", "house", "home", "new", "work", "works", "task", "tasks", "kitchen", "bathroom", "renovation", "extension", "repairs", "repair", "inspection", "pty", "ltd", "construction", "customer", "client", "general"]);
function projectWords(project) {
  const words = new Set();
  for (const part of [project.customer, project.name, project.suburb]) {
    for (const word of fold(part).split(/[^\p{L}\p{N}]+/u)) if (word.length >= 3 && !PROJECT_STOP.has(word)) words.add(word);
  }
  return [...words];
}
const projectLabel = (project) => `${project.code} — ${project.name || project.customer}${project.suburb ? ` (${project.suburb})` : ""}`;

// Which project does the sentence mean? A code is exact. Otherwise a customer's, project's or suburb's name must appear and one project must stand out.
// { project, words } | { ambiguous: [...] } | { unknown: "CODE" } | { general: true } | null (none mentioned)
export function findProject(f, projects, { skip = new Set() } = {}) {
  const code = CODE_SHAPE.exec(f);
  if (code) {
    const exact = projects.find((project) => fold(project.code) === code[0] || (project.requestCode && fold(project.requestCode) === code[0]));
    return exact ? { project: exact, words: [], span: [code.index, code.index + code[0].length] } : { unknown: code[0].toUpperCase() };
  }
  if (/(?<![\p{L}])(?:business\s*\/?\s*general|general (?:expenses?|business|overheads?)|overheads?|company (?:expense|cost)s?)(?![\p{L}])|هزینه (?:های )?(?:شرکت|عمومی)|(?<![\p{L}])عمومی(?![\p{L}])/u.test(f)) return { general: true };
  const words = (f.match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => word.length >= 3 && !PROJECT_STOP.has(word) && !skip.has(word));
  if (!words.length || !projects.length) return null;
  const scored = projects.map((project) => {
    const known = projectWords(project);
    const hit = words.filter((word) => known.includes(word) || (hasPersianLetters(word) && known.some((candidate) => nameKey(candidate) && nameKey(candidate) === nameKey(word))));
    return { project, score: new Set(hit).size, hit };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const top = scored.filter((entry) => entry.score === scored[0].score);
  return top.length === 1 ? { project: top[0].project, words: top[0].hit } : { ambiguous: top.slice(0, 5).map((entry) => entry.project) };
}

// ---------- Peeling the frame off a sentence ----------

// The sentence is "frame + the Owner's own words (+ frame)". The frame is made of command words, little linking words, team members' names, dates, times and the project.
// It is peeled off both ends; what is left is returned exactly as the Owner wrote it. People found in the frame are the recipients.
function peel(original, folded, ctx, { claimed = [], strong = STRONG, owner, people: findPeople = true } = {}) {
  const tokens = tokenize(folded);
  const finglish = FINGLISH_MARK.test(folded);
  const inClaim = (token) => claimed.some(([a, b]) => token.start >= a && token.end <= b);
  const people = new Map();
  const ambiguous = [];
  const classify = (token, index) => {
    const word = bare(token.raw);
    if (inClaim(token)) return "claimed";
    if (word === "کار" || word === "کاری") return index > 0 && ["یک", "یه", "yek", "ye"].includes(bare(tokens[index - 1].raw)) ? "frame" : null;
    if (strong.has(word) || CONNECT.has(word) || (finglish && CONNECT_FINGLISH.has(word))) return "frame";
    if (findPeople && SELF_WORDS.has(word)) return "self";
    if (ARTICLE.has(word)) return "article";
    if (!findPeople) return null;
    const match = matchWord(word, ctx.people);
    if (match) return match.people.length === 1 ? "person" : "ambiguous";
    return null;
  };
  const take = (token, kind) => {
    const word = bare(token.raw);
    if (kind === "person") {
      const match = matchWord(word, ctx.people);
      people.set(match.people[0].email, { person: match.people[0], how: match.how });
    } else if (kind === "self" && owner) people.set(owner.email, { person: owner, how: "self", self: true });
    else if (kind === "ambiguous") ambiguous.push({ word, options: matchWord(word, ctx.people).people });
  };
  let first = 0;
  let last = tokens.length - 1;
  const consumed = [];
  let seenPerson = false;
  while (first <= last) {
    const kind = classify(tokens[first], first);
    if (!kind) break;
    consumed.push([first, kind]);
    if (kind === "person" || kind === "self" || kind === "ambiguous") seenPerson = true;
    first += 1;
    // "tell Sara TO send the invoices", "set a task for Ali THAT …": after the person, these words end the frame, so a verb that follows is the Owner's own.
    if (seenPerson && kind === "frame" && STOPPERS.has(bare(tokens[first - 1].raw))) break;
  }
  // A run of articles right before the Owner's own words belongs to those words.
  while (first > 0 && classify(tokens[first - 1], first - 1) === "article" && first <= last) first -= 1;
  while (last >= first) {
    const kind = classify(tokens[last], last);
    if (!kind) break;
    consumed.push([last, kind]);
    last -= 1;
  }
  const frame = [];
  for (const [index, kind] of consumed) if (index < first || index > last) { take(tokens[index], kind); if (index < first) frame.push(bare(tokens[index].raw)); }
  let content = first > last ? "" : original.slice(tokens[first].start, tokens[last].end).trim().replace(/^[\s:,;\-]+|[\s,;]+$/gu, "");
  const quoted = /^(["'«“‘])([\s\S]*)(["'»”’])$/u.exec(content);
  if (quoted && !/["'«»“”‘’]/u.test(quoted[2])) content = quoted[2].trim();
  // `before` is the frame word right in front of the Owner's words ("about", "to" …): "tell Ali about Thursday" names a topic, "tell Ali to come at 7" gives words.
  return { content, people: [...people.values()], ambiguous, before: first > 0 ? bare(tokens[first - 1].raw) : "", frame };
}

function sentenceCase(text) {
  const value = text.trim();
  return value && /[a-z]/.test(value[0]) ? value[0].toUpperCase() + value.slice(1) : value;
}
const shortTitle = (text) => {
  const line = oneLine(text, 400).replace(/[.!?؟]+$/u, "");
  if (line.length <= 80) return line;
  const cut = line.slice(0, 80);
  const space = cut.lastIndexOf(" ");
  return `${(space > 40 ? cut.slice(0, space) : cut).trim()}…`;
};

// ---------- Intent words ----------

const TASK_WORD = /(?<![\p{L}])(?:tasks?|to-?dos?|assign\w*|allocate)(?![\p{L}])|تسک|وظیفه|(?:یک|یه) کار(?:ی)?(?![\p{L}])|کار جدید|(?<![\p{L}])taskh?a(?![\p{L}])/u;
const MESSAGE_WORD = /(?<![\p{L}])(?:message|messages|msg|text|tell|ask|notify|remind|ping|inform|let\s+\S+\s+know|send(?:\s+(?:a|an|the))?\s+(?:message|note|text))(?![\p{L}])|پیام|بگو|بهش بگو|خبر بده|اطلاع بده|یادآوری کن|(?<![\p{L}])(?:peyam|bego)(?![\p{L}])/u;
const CALENDAR_WORD = /(?<![\p{L}])(?:calendars?|diary|agenda|appointment|reminder|event|booking)(?![\p{L}])|تقویم|یادآوری|(?<![\p{L}])taghvim(?![\p{L}])/u;
const CREATE_VERB = /(?<![\p{L}])(?:set|give|assign|create|add|make|put|enter|record|log|book|schedule|new|allocate|hand)(?![\p{L}])|ست کن|بذار|بگذار|بده(?![\p{L}])|بساز|ایجاد|تعریف|ثبت|اضافه|وارد|بنویس|بفرست|(?<![\p{L}])(?:bezar|bede|bokon|sabt|ezafe|besaz)(?![\p{L}])/u;
const QUESTION_LEAD = /^(?:what|which|who|whom|whose|how|when|where|why|do|does|did|is|are|was|were|has|have|had|show|list|display|tell me|give me|let me know|any|anything|are there|is there|status|summary|summari[sz]e|report|ok so what)(?![\p{L}])|^(?:چه|چی|چند|کدام|کدوم|کی|کجا|چطور|چگونه|آیا|نشان بده|نشونم بده|لیست|گزارش|وضعیت|خلاصه|چقدر)/u;
const startsAsQuestion = (f) => QUESTION_LEAD.test(f.trim()) || /\?\s*$/.test(f) || /(?:^|\s)(?:چیه|چی هست|چقدره|چطوره|چنده|کیه|کجاست|هست)\s*\??\s*$/u.test(f);

const PRIORITY_WORDS = [["Urgent", /(?<![\p{L}])(?:urgent\w*|asap|immediately|right away|emergency|critical)(?![\p{L}])|فوری|اضطراری|(?<![\p{L}])fori(?![\p{L}])/u], ["High", /(?<![\p{L}])(?:high[- ]priority|important|priority)(?![\p{L}])|مهم|اولویت بالا|(?<![\p{L}])mohem(?![\p{L}])/u]];
function priorityOf(f) {
  for (const [label, pattern] of PRIORITY_WORDS) if (pattern.test(f)) return label;
  return "Normal";
}

const splitAtColon = (original, f) => {
  const at = f.search(/(?<!\d):\s*\S|:\s+\S/); // not the colon inside a time such as 2:30
  return at < 0 ? null : { headOriginal: original.slice(0, at), headFolded: f.slice(0, at), tail: original.slice(at + 1).trim() };
};

const teamList = (people) => people.filter((person) => person.role !== "Owner").slice(0, 12).map(niceName).join(", ");

// ---------- The command reader ----------

/**
 * @typedef {{ people: {email:string,name:string,role:string}[], projects: any[], categories?: string[], today: string, owner: {email:string,name:string}, pending?: any }} Context
 */

// Returns one of:
//   null                                       – not a command: the caller answers it some other way (news, plans, search …)
//   { kind: "actions", actions: [...] }        – proposals for actions.mjs to validate
//   { kind: "ask", need, say: {en, fa}, pending } – a question; `pending` is what is already understood
//   { kind: "read", what, ... }                – a lookup the caller runs against the database
//   { kind: "dropped", say }                   – the Owner told Jarvis to forget the question it had asked
export function interpret(message, ctx) {
  const original = String(message ?? "").trim();
  if (!original) return null;
  const folded = fold(original);
  if (ctx.pending) {
    const resumed = resume(original, folded, ctx);
    if (resumed) return resumed;
  }
  return fresh(original, folded, ctx);
}

function stripLead(original, folded) {
  const lead = POLITE_LEAD.exec(folded) ?? POLITE_LEAD_FA.exec(folded);
  return lead ? { original: original.slice(lead[0].length), folded: folded.slice(lead[0].length) } : { original, folded };
}

function fresh(originalFull, foldedFull, ctx) {
  const { original, folded } = stripLead(originalFull, foldedFull);
  const persian = isPersianish(originalFull);
  const question = startsAsQuestion(folded);
  const colon = splitAtColon(original, folded);
  const hasTask = TASK_WORD.test(colon ? colon.headFolded : folded);
  const hasMessage = MESSAGE_WORD.test(colon ? colon.headFolded : folded);
  const hasCalendar = CALENDAR_WORD.test(colon ? colon.headFolded : folded);
  const create = CREATE_VERB.test(colon ? colon.headFolded : folded);
  const money = parseAmount(folded);
  const financeish = FINANCE_NOUN.test(folded) || INCOME.test(folded) || EXPENSE.test(folded);

  if (question) return readIntent(folded, ctx);

  if (hasTask && (create || colon)) return buildPerson("task", original, folded, ctx, persian);
  if (hasCalendar && !hasMessage && (create || parseDate(folded, ctx.today) || colon)) return buildPerson("calendar", original, folded, ctx, persian);
  if (hasMessage) return buildPerson("message", original, folded, ctx, persian);
  if (financeish && (money || (ENTER_VERB.test(folded) && parseAmount(maskCodes(folded), { allowBare: true })))) return buildFinance(original, folded, ctx, persian);
  if (money && /(?<![\p{L}])(?:enter|add|log|record|register)(?![\p{L}])|ثبت کن/u.test(folded)) return buildFinance(original, folded, ctx, persian);
  if (financeish && ENTER_VERB.test(folded) && /(?<![\p{L}])(?:entry|entries|expense|income)(?![\p{L}])|ثبت/u.test(folded) && !hasTask) return buildFinance(original, folded, ctx, persian);
  return readIntent(folded, ctx);
}

// ---- task / message / calendar: a person, plus what to say ----

function ask(need, intent, slots, say) {
  return { kind: "ask", need, say, pending: { intent, need, slots: sanitizeSlots(slots) } };
}

const VERB = { task: "give the task to", message: "send the message to", calendar: "put it in the calendar of" };

// "ali.hassan · Estimator" is how the app names staff; Jarvis says "Ali Hassan (Estimator)".
export function niceName(person) {
  const [login, trade] = String(person.name ?? "").split("·").map((part) => part.trim());
  if (!trade) return String(person.name ?? person.email);
  const words = login.split(/[._\-]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1));
  return words.join(" ").toLowerCase() === trade.toLowerCase() ? words.join(" ") : `${words.join(" ")} (${trade})`;
}
const names = (list) => list.map(niceName).join(", ");

// Words that only say how important it is ("urgent", "asap", "high priority") are not part of the task's text.
const PRIORITY_NOISE = /(?:^|[\s,;(-])(?:urgent\w*|asap|high[- ]priority|top priority|important|فوری|مهم)(?=[\s,;).!]|$)[\s,;).!]*/giu;
function withoutPriority(text) {
  const cleaned = text.replace(PRIORITY_NOISE, " ").replace(/\s+/g, " ").replace(/^[\s,;:\-]+|[\s,;:\-]+$/g, "").trim();
  return cleaned.length >= 2 ? cleaned : text;
}

// Neighbours of a project's name in the sentence ("the Smith kitchen job") are part of how the Owner pointed at the project, not of what to do.
function projectClaims(folded, projectHit) {
  const spans = [];
  if (projectHit?.span) spans.push(projectHit.span);
  if (!projectHit?.words?.length) return spans;
  const tokens = tokenize(folded);
  const hit = tokens.map((token) => projectHit.words.includes(bare(token.raw)));
  tokens.forEach((token, index) => {
    if (hit[index]) { spans.push([token.start, token.end]); return; }
    const near = hit[index - 1] || hit[index + 1] || (PROJECT_STOP.has(bare(tokens[index + 1]?.raw ?? "")) && hit[index + 2]);
    if (near && PROJECT_STOP.has(bare(token.raw)) && /^(?:kitchen|bathroom|job|house|home|site|project|renovation|extension|reno)$/.test(bare(token.raw))) spans.push([token.start, token.end]);
  });
  return spans;
}

function buildPerson(intent, original, folded, ctx, persian, preset = {}) {
  const colon = splitAtColon(original, folded);
  const dateHit = intent === "calendar" ? parseDate(folded, ctx.today) : null;
  const clock = intent === "calendar" ? parseTime(folded) : null;
  const projectHit = findProject(folded, ctx.projects, { skip: new Set(ctx.people.flatMap(personWords)) });
  const claimed = [...projectClaims(folded, projectHit)];
  if (dateHit && !dateHit.jalali) claimed.push([dateHit.start, dateHit.end]);
  if (dateHit?.jalali) claimed.push([dateHit.start, dateHit.end]);
  if (clock) claimed.push([clock.start, clock.end]);
  const strong = intent === "calendar" ? CALENDAR_FRAME : STRONG;
  const peeled = colon
    ? { ...peel(colon.headOriginal, colon.headFolded, ctx, { claimed, strong, owner: ctx.owner }), content: colon.tail, before: ":" }
    : peel(original, folded, ctx, { claimed, strong, owner: ctx.owner });

  const recipients = preset.people?.length ? preset.people.map((person) => ({ person, self: person.email === ctx.owner.email })) : peeled.people;
  const projectCode = preset.projectCode ?? (projectHit?.project?.code ?? "");
  const slotsBase = { original, persian, projectCode, priority: preset.priority ?? priorityOf(folded), date: preset.date ?? (dateHit?.jalali ? "" : dateHit?.date ?? ""), time: preset.time ?? clock?.time ?? "", text: preset.text };

  if (!recipients.length) {
    if (peeled.ambiguous.length) {
      const options = peeled.ambiguous[0].options;
      return ask("person", intent, slotsBase, { en: `Which one do you mean: ${options.map(niceName).join(" or ")}?`, fa: `کدام یک را می‌گویید: ${options.map(niceName).join(" یا ")}؟` });
    }
    const name = unknownName(folded, original, claimed);
    const list = names(ctx.people.filter((person) => person.role !== "Owner").slice(0, 12));
    // A calendar entry with no name at all is the Owner's own.
    if (intent === "calendar" && !name) return buildPerson(intent, original, folded, ctx, persian, { ...preset, people: [ctx.owner], ownCalendar: true });
    return ask("person", intent, slotsBase, {
      en: name ? `I don't know anyone called “${name}” on the approved team.${list ? ` The team is: ${list}.` : ""} Who did you mean?` : `Who should I ${VERB[intent]}?${list ? ` The team is: ${list}.` : ""}`,
      fa: name ? `کسی به اسم «${name}» در تیم تأییدشده نیست.${list ? ` تیم: ${list}.` : ""} منظورتان کیست؟` : `برای چه کسی؟${list ? ` تیم: ${list}.` : ""}`,
    });
  }
  const withPeople = { ...slotsBase, people: recipients.map((entry) => entry.person.email) };
  if (projectHit?.unknown && !preset.projectCode) {
    return ask("project", intent, withPeople, { en: `I can't find a project with the code ${projectHit.unknown}. Which project do you mean?`, fa: `پروژه‌ای با کد ${projectHit.unknown} پیدا نکردم. کدام پروژه را می‌گویید؟` });
  }

  let content = preset.text ?? peeled.content;
  if (intent === "calendar" && preset.text === undefined) {
    if (colon) {
      const tailFolded = fold(colon.tail);
      const tailClaims = [];
      const tailDate = parseDate(tailFolded, ctx.today);
      const tailTime = parseTime(tailFolded);
      if (tailDate) tailClaims.push([tailDate.start, tailDate.end]);
      if (tailTime) tailClaims.push([tailTime.start, tailTime.end]);
      content = peel(colon.tail, tailFolded, ctx, { claimed: tailClaims, strong: CALENDAR_FRAME, people: false }).content || colon.tail;
    } else content = calendarTitle(original, folded, ctx, claimed);
  }
  const wasReminder = intent === "message" && preset.text === undefined && /(?<![\p{L}])remind(?![\p{L}])|یادآوری کن/u.test(folded);
  const topicOnly = intent === "message" && preset.text === undefined && !wasReminder && ["about", "regarding"].includes(peeled.before);
  if (intent === "task") content = withoutPriority(content ?? "");
  content = clipText(content ?? "", intent === "message" ? 2000 : 1000);
  const who = names(recipients.map((entry) => entry.person));

  if (content.length < 2 || topicOnly) {
    const topic = topicOnly && content ? ` about “${shortTitle(content)}”` : "";
    return ask("content", intent, { ...withPeople, text: undefined }, intent === "task" ? { en: `What should ${who}'s task be? Tell me in your own words.`, fa: `تسکِ ${who} چه باشد؟ با حرف‌های خودتان بگویید.` }
      : intent === "calendar" ? { en: `What should I call the calendar entry for ${who}?`, fa: `اسم برنامه‌ی تقویمِ ${who} چه باشد؟` }
        : { en: `What do you want to say to ${who}${topic}? Tell me the words and I will use them as they are.`, fa: `به ${who} چه بگویم${topic ? ` درباره‌ی «${shortTitle(content)}»` : ""}؟ حرفتان را بنویسید تا همان‌طور که هست بفرستم.` });
  }

  if (intent === "calendar") {
    if (dateHit?.jalali && !preset.date) return ask("date", intent, { ...withPeople, text: content }, { en: "I can't read Persian-calendar dates. Give the date as day/month (for example 3/11) or say tomorrow or Friday.", fa: "تاریخ شمسی را نمی‌خوانم. تاریخ را به صورت روز/ماه میلادی (مثلاً ۳/۱۱) بگویید، یا بگویید فردا یا جمعه." });
    if (!slotsBase.date) return ask("date", intent, { ...withPeople, text: content }, { en: `Which day is “${shortTitle(content)}”? Say for example tomorrow, Friday or 3 November.`, fa: `«${shortTitle(content)}» چه روزی است؟ مثلاً بگویید فردا، جمعه یا ۳ نوامبر.` });
    return { kind: "actions", persian, own: Boolean(preset.ownCalendar), actions: recipients.map((entry) => ({ type: "add_calendar", person: entry.person.email, title: shortTitle(content), text: "", dates: [slotsBase.date], startTime: slotsBase.time, projectCode, priority: "Normal" })) };
  }
  if (intent === "task") {
    return { kind: "actions", persian, actions: recipients.map((entry) => ({ type: "create_task", person: entry.person.email, title: shortTitle(content), text: sentenceCase(content), dates: [], startTime: "", projectCode, priority: slotsBase.priority })) };
  }
  const others = recipients.filter((entry) => !entry.self && entry.person.email !== ctx.owner.email);
  if (!others.length) return { kind: "say", say: { en: "A message can't be sent to yourself. Who should I send it to?", fa: "پیام را نمی‌شود برای خودتان فرستاد. برای چه کسی بفرستم؟" } };
  const text = wasReminder ? `Reminder: ${content}` : content;
  return { kind: "actions", persian, actions: others.map((entry) => ({ type: "send_message", person: entry.person.email, title: "", text: sentenceCase(text), dates: [], startTime: "", projectCode: "", priority: "Normal" })) };
}

function unknownName(folded, original, claimed = []) {
  // The word right after "for / to / tell / message" (or Persian "برای / به") that is not a frame word, a date or a time: probably the name Jarvis does not know.
  const match = /(?:(?<![\p{L}])(?:for|to|assign|tell|message|text|notify|remind)|برای|(?:^|\s)به|baraye)\s+([\p{L}][\p{L}'.-]{1,30})/u.exec(folded);
  if (!match) return "";
  const at = match.index + match[0].lastIndexOf(match[1]);
  if (claimed.some(([a, b]) => at >= a && at < b)) return "";
  const word = stripPossessive(match[1]);
  if (isFrameWord(word) || SELF_WORDS.has(word) || /^(?:someone|somebody|everyone|all|him|her|them|ali's)$/.test(word)) return "";
  if (parseDate(word, "2026-01-01") || /^(?:next|this|every|calendar|diary)$/.test(word)) return "";
  return original.slice(at, at + match[1].length).replace(/'s$/i, "");
}

const CALENDAR_FRAME = new Set([...STRONG, "on", "at", "in", "into", "to", "for", "by", "next", "this", "every", "calendar", "calendars", "diary", "agenda", "تقویم", "taghvim", "تو", "توی"]);
function calendarTitle(original, folded, ctx, claimed) {
  return peel(original, folded, ctx, { claimed, strong: CALENDAR_FRAME, owner: ctx.owner }).content;
}

// ---- finance ----

const FINANCE_FRAME = new Set([...STRONG, ...`expense expenses expenditure income outcome revenue spent spend paid pay
cost costs entry entries finance financial amount dollars dollar aud received receive got bought purchase purchased
for on of from to at in by as the a an and project job site general business with towards toward
ثبت وارد هزینه درآمد دلار خرج پرداخت واریز دریافت مالی بابت برای به از در با و را رو پروژه یک یه
hazine daramad sabt vared proje pool`.split(/\s+/)]);

function buildFinance(original, folded, ctx, persian, preset = {}) {
  const projectHit = findProject(folded, ctx.projects, { skip: new Set(ctx.people.flatMap(personWords)) });
  // A bare number counts when the sentence is clearly a finance entry; the date is read after the amount is set aside, so "12.50" is not 12 December.
  const amount = preset.cents !== undefined ? { cents: preset.cents } : parseAmount(folded) ?? parseAmount(maskCodes(folded), { allowBare: true });
  const masked = amount?.start !== undefined ? folded.slice(0, amount.start) + " ".repeat(amount.end - amount.start) + folded.slice(amount.end) : folded;
  const dateHit = preset.date ? null : parseDate(maskCodes(masked), ctx.today, { past: true });
  const word = /(?<![\p{L}])(?:yesterday|dirooz)(?![\p{L}])|دیروز/u.exec(masked);
  const yesterday = word ? addDays(ctx.today, -1) : "";
  const isIncome = INCOME.test(folded);
  const isExpense = EXPENSE.test(folded);
  const financeType = preset.financeType || (isIncome && !isExpense ? "Income" : isExpense && !isIncome ? "Outcome" : "");
  const category = preset.category || guessCategory(folded, ctx.categories ?? []);
  const entryDate = preset.date || yesterday || (dateHit && !dateHit.jalali ? dateHit.date : "") || ctx.today;

  const claimed = [...projectClaims(folded, projectHit)];
  if (amount?.start !== undefined) claimed.push([amount.start, amount.end]);
  if (dateHit) claimed.push([dateHit.start, dateHit.end]);
  if (word) claimed.push([word.index, word.index + word[0].length]);
  for (const token of tokenize(folded)) if (TYPE_ONLY.test(bare(token.raw))) claimed.push([token.start, token.end]);
  const colon = splitAtColon(original, folded);
  let noteText = preset.note;
  if (noteText === undefined) {
    if (colon?.tail) {
      // The words after the colon are the Owner's own note; an amount or "income" repeated in them is the same information as before, so it is dropped.
      const tailFolded = fold(colon.tail);
      const tailClaims = [];
      const tailAmount = parseAmount(tailFolded) ?? parseAmount(maskCodes(tailFolded), { allowBare: true });
      if (tailAmount) tailClaims.push([tailAmount.start, tailAmount.end]);
      for (const token of tokenize(tailFolded)) if (TYPE_ONLY.test(bare(token.raw))) tailClaims.push([token.start, token.end]);
      noteText = peel(colon.tail, tailFolded, ctx, { claimed: tailClaims, strong: FINANCE_FRAME, owner: ctx.owner, people: false }).content;
    } else noteText = peel(original, folded, ctx, { claimed, strong: FINANCE_FRAME, owner: ctx.owner, people: false }).content;
  }
  const note = clipText(noteText ?? "", 500);

  const carried = { original, persian, note, category, financeType, date: preset.date || yesterday || (dateHit && !dateHit.jalali ? dateHit.date : ""), cents: amount?.cents, projectCode: preset.projectCode ?? projectHit?.project?.code ?? "", general: preset.general ?? Boolean(projectHit?.general) };
  if (!amount || !Number.isFinite(amount.cents) || amount.cents < 1) return ask("amount", "finance", carried, { en: "How much is it? Say the amount in dollars, for example $320.", fa: "چقدر است؟ مبلغ را به دلار بگویید، مثلاً ۳۲۰ دلار." });
  if (amount.cents > LARGE) return ask("amount", "finance", { ...carried, cents: undefined }, { en: "That amount is above $100,000,000, which the finance form does not accept. What is the amount?", fa: "این مبلغ از ۱۰۰ میلیون دلار بیشتر است و فرم مالی نمی‌پذیرد. مبلغ چقدر است؟" });
  if (!financeType) return ask("type", "finance", carried, { en: "Is that money in (income) or money out (expense)?", fa: "این پول دریافتی است (درآمد) یا پرداختی (هزینه)؟" });
  if (dateHit?.jalali && !preset.date) return ask("date", "finance", carried, { en: "I can't read Persian-calendar dates. Give the date as day/month, or say today or yesterday.", fa: "تاریخ شمسی را نمی‌خوانم. تاریخ را روز/ماه میلادی بگویید، یا بگویید امروز یا دیروز." });
  if (projectHit?.unknown && !preset.projectCode) return ask("project", "finance", carried, { en: `I can't find a project with the code ${projectHit.unknown}. Which project is it for? You can also say “general” for a business-wide entry.`, fa: `پروژه‌ای با کد ${projectHit.unknown} پیدا نکردم. برای کدام پروژه است؟ برای هزینه‌ی کلی شرکت بگویید «عمومی».` });
  if (projectHit?.ambiguous && !preset.projectCode) return ask("project", "finance", carried, { en: `Which project: ${projectHit.ambiguous.map(projectLabel).join(" or ")}?`, fa: `کدام پروژه: ${projectHit.ambiguous.map(projectLabel).join(" یا ")}؟` });
  if (!carried.projectCode && !carried.general && ctx.projects.length && /(?<![\p{L}])(?:project|job|site)(?![\p{L}])|پروژه|(?<![\p{L}])proje(?![\p{L}])/u.test(folded)) {
    return ask("project", "finance", carried, { en: `Which project is it for? ${ctx.projects.slice(0, 6).map(projectLabel).join("; ")}. Or say “general”.`, fa: `برای کدام پروژه است؟ ${ctx.projects.slice(0, 6).map(projectLabel).join("؛ ")}. یا بگویید «عمومی».` });
  }
  return {
    kind: "actions", persian,
    actions: [{ type: "add_finance", financeType, category: category || (financeType === "Income" ? "Payment received" : "General"), projectCode: carried.projectCode || "Business / General", amountCents: amount.cents, entryDate, text: note, title: "", dates: [], startTime: "", priority: "Normal" }],
  };
}

const maskCodes = (f) => f.replace(/(?<![\p{L}\d])[a-z]{2,6}-\d{4}-\d{3,6}(?![\p{L}\d])/gu, (match) => " ".repeat(match.length));

// ---- reads ----

function readIntent(folded, ctx) {
  const taskWord = /(?<![\p{L}])(?:tasks?|to-?dos?|assignments?|workload|working on|assigned|overdue|open items?|follow-?ups?)(?![\p{L}])|تسک|وظیفه|کارهای|کار های|کاراش|چه کار|(?<![\p{L}])taskha(?![\p{L}])/u.test(folded);
  const moneyWord = /(?<![\p{L}])(?:money|finances?|financial|cash|cashflow|profit|margin|income|expenses?|spent|spend|spending|owe|owed|owing|balance|budget|revenue|takings|collect|receivable)(?![\p{L}])|پول|مالی|هزینه|درآمد|سود|مانده|بدهی|بدهکار|(?<![\p{L}])(?:hazine|daramad|pool)(?![\p{L}])/u.test(folded);
  const teamWord = /(?<![\p{L}])(?:who(?:'s| is| are)? (?:on|in) the team|team list|staff list|roster|who works|our team|my team|team members|who do we have)(?![\p{L}])|لیست تیم|اعضای تیم|تیم ما|اعضای شرکت/u.test(folded);
  const statusWord = /(?<![\p{L}])(?:status|how(?:'s| is| are)|progress|update on|summary|summari[sz]e|tell me about|what(?:'s| is) (?:happening|going on)|where are we|state of)(?![\p{L}])|وضعیت|چطور|چه خبر|پیشرفت|خلاصه|(?<![\p{L}])vazeiat(?![\p{L}])/u.test(folded);
  const named = peelNames(folded, ctx);
  const projectHit = findProject(folded, ctx.projects, { skip: new Set(ctx.people.flatMap(personWords)) });
  const open = !/(?<![\p{L}])(?:done|completed|finished|closed)(?![\p{L}])|انجام شده|تمام شده/u.test(folded);

  if (teamWord) return { kind: "read", what: "team" };
  if (taskWord && !moneyWord) {
    return { kind: "read", what: "tasks", personEmails: named.people.map((person) => person.email), ambiguous: named.ambiguous[0]?.map((person) => person.name) ?? [], projectCode: projectHit?.project?.code ?? "", projectUnknown: projectHit?.unknown ?? "", open };
  }
  if (moneyWord) return { kind: "read", what: "money", projectCode: projectHit?.project?.code ?? "", general: Boolean(projectHit?.general), projectUnknown: projectHit?.unknown ?? "", options: projectHit?.ambiguous?.map((project) => project.code) ?? [] };
  // A bare project reference ("Jo Smith bathroom", "ATP-2026-00200") is a request for that project's status; so is anything with a status word in it.
  const onlyProject = (project) => {
    const known = new Set(fold(`${project.customer} ${project.name} ${project.suburb} ${project.code}`).split(/[^\p{L}\p{N}-]+/u).filter(Boolean));
    return tokenize(folded).every((token) => { const word = bare(token.raw); return !word || isFrameWord(word) || PROJECT_STOP.has(word) || known.has(word) || /^(?:status|update|summary|of|on|about)$/.test(word); });
  };
  if (projectHit?.project && (statusWord || onlyProject(projectHit.project))) return { kind: "read", what: "project", projectCode: projectHit.project.code };
  if (projectHit?.ambiguous && (statusWord || projectHit.ambiguous.every(onlyProject))) return { kind: "read", what: "projectChoice", options: projectHit.ambiguous.map((project) => project.code) };
  if (named.people.length === 1 && /(?<![\p{L}])(?:finish\w*|complet\w*|done)(?![\p{L}])|انجام داد/u.test(folded)) return { kind: "read", what: "tasks", personEmails: [named.people[0].email], ambiguous: [], projectCode: "", projectUnknown: "", open: false };
  if (named.people.length === 1 && statusWord) return { kind: "read", what: "tasks", personEmails: [named.people[0].email], ambiguous: [], projectCode: "", projectUnknown: "", open: true };
  return null;
}

// Team members named anywhere in a question (a question has no frame to peel).
function peelNames(folded, ctx) {
  const people = new Map();
  const ambiguous = [];
  for (const token of tokenize(folded)) {
    const word = bare(token.raw);
    if (isFrameWord(word) || word.length < 2) continue;
    if (SELF_WORDS.has(word)) { people.set(ctx.owner.email, ctx.owner); continue; }
    const match = matchWord(word, ctx.people);
    if (!match || match.how === "role") continue;
    if (match.people.length === 1) people.set(match.people[0].email, match.people[0]);
    else ambiguous.push(match.people);
  }
  return { people: [...people.values()], ambiguous };
}

// ---------- Asking, and picking the answer up again ----------

function sanitizeSlots(slots) {
  const out = {};
  for (const key of ["text", "projectCode", "date", "time", "priority", "original", "note", "category", "financeType"]) if (typeof slots[key] === "string") out[key] = slots[key].slice(0, 2000);
  if (Array.isArray(slots.people)) out.people = slots.people.filter((value) => typeof value === "string").slice(0, 5).map((value) => value.slice(0, 200));
  if (Number.isInteger(slots.cents) && slots.cents > 0 && slots.cents <= LARGE) out.cents = slots.cents;
  if (typeof slots.persian === "boolean") out.persian = slots.persian;
  if (typeof slots.general === "boolean") out.general = slots.general;
  return out;
}

// What the browser sends back with the Owner's next sentence. It is only ever used to fill in blanks: everything is read and checked again.
export function cleanPending(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (!["task", "message", "calendar", "finance"].includes(raw.intent)) return null;
  if (!["person", "content", "date", "project", "amount", "type"].includes(raw.need)) return null;
  return { intent: raw.intent, need: raw.need, slots: sanitizeSlots(raw.slots && typeof raw.slots === "object" ? raw.slots : {}) };
}

const CANCEL = /^(?:cancel|never ?mind|forget it|stop|no|nope|skip|ولش کن|بیخیال|نه|لغو|کنسل)[\s.!]*$/u;

// The Owner answered a question Jarvis asked. A sentence that is itself a whole new command wins over the answer.
function resume(original, folded, ctx) {
  const { intent, need, slots } = ctx.pending;
  const persian = slots.persian ?? isPersianish(original);
  const stripped = stripLead(original, folded);
  if (CANCEL.test(stripped.folded.trim())) return { kind: "dropped", say: { en: "OK, I dropped it. Nothing was done.", fa: "باشه، ولش کردم. هیچ کاری انجام نشد." } };
  const words = tokenize(stripped.folded).length;
  // A news / plans / greeting question, or a whole new command, ends the question Jarvis asked.
  if (ctx.isOtherIntent?.(stripped.original)) return null;
  if (startsAsQuestion(stripped.folded) && readIntent(stripped.folded, ctx)) return null;
  const newCommand = words > 3 && ((TASK_WORD.test(stripped.folded) && CREATE_VERB.test(stripped.folded)) || (MESSAGE_WORD.test(stripped.folded) && peelNames(stripped.folded, ctx).people.length > 0));
  if (newCommand) return null;

  const people = (slots.people ?? []).map((email) => ctx.people.find((person) => person.email === email)).filter(Boolean);
  if (intent === "finance") {
    const preset = { note: slots.note, category: slots.category || undefined, financeType: slots.financeType || undefined, date: slots.date || undefined, cents: slots.cents, projectCode: slots.projectCode || undefined, general: slots.general };
    if (need === "amount") {
      const money = parseAmount(stripped.folded) ?? parseAmount(stripped.folded, { allowBare: true });
      if (!money) return ask("amount", "finance", slots, { en: "I couldn't read an amount. Say it like $320.", fa: "مبلغ را نتوانستم بخوانم. مثلاً بگویید ۳۲۰ دلار." });
      preset.cents = money.cents;
    } else if (need === "type") {
      if (INCOME.test(stripped.folded) || /^(?:in|yes)(?![\p{L}])/u.test(stripped.folded)) preset.financeType = "Income";
      else if (EXPENSE.test(stripped.folded) || /^(?:out|cost)(?![\p{L}])/u.test(stripped.folded)) preset.financeType = "Outcome";
      else return ask("type", "finance", slots, { en: "Please say “income” (money in) or “expense” (money out).", fa: "لطفاً بگویید «درآمد» (پول دریافتی) یا «هزینه» (پول پرداختی)." });
    } else if (need === "project") {
      const hit = findProject(stripped.folded, ctx.projects, { skip: new Set(ctx.people.flatMap(personWords)) });
      if (hit?.general) { preset.general = true; preset.projectCode = undefined; }
      else if (hit?.project) preset.projectCode = hit.project.code;
      else return ask("project", "finance", slots, { en: "I couldn't tell which project. Say its code (like ATP-2026-00124), the customer's name, or “general”.", fa: "نفهمیدم کدام پروژه. کد پروژه، اسم مشتری یا «عمومی» را بگویید." });
    } else if (need === "date") {
      const when = parseDate(stripped.folded, ctx.today);
      if (/(?<![\p{L}])yesterday(?![\p{L}])|دیروز/u.test(stripped.folded)) preset.date = addDays(ctx.today, -1);
      else if (when?.date) preset.date = when.date;
      else return ask("date", "finance", slots, { en: "Say the date as today, yesterday or day/month.", fa: "تاریخ را بگویید: امروز، دیروز یا روز/ماه." });
    }
    const source = slots.original ?? original;
    return buildFinance(source, fold(source), ctx, persian, preset);
  }

  const preset = { people: people.length ? people : undefined, text: slots.text || undefined, projectCode: slots.projectCode || undefined, priority: slots.priority || undefined, date: slots.date || undefined, time: slots.time || undefined };
  if (need === "person") {
    const found = peelNames(stripped.folded, ctx);
    if (!found.people.length) {
      const list = teamList(ctx.people);
      return ask("person", intent, slots, { en: `I still don't know who. ${list ? `The team is: ${list}.` : ""} Say a name.`, fa: `هنوز نمی‌دانم چه کسی. ${list ? `تیم: ${list}.` : ""} یک اسم بگویید.` });
    }
    preset.people = found.people;
  } else if (need === "content") {
    preset.text = clipText(stripped.original, intent === "message" ? 2000 : 1000);
    if (priorityOf(stripped.folded) !== "Normal") preset.priority = priorityOf(stripped.folded);
    // "check the tiles on the Jo Smith job": the project can be named in the words that were just added.
    if (intent !== "message" && !preset.projectCode) {
      const hit = findProject(stripped.folded, ctx.projects, { skip: new Set(ctx.people.flatMap(personWords)) });
      if (hit?.project) preset.projectCode = hit.project.code;
    }
  } else if (need === "date") {
    const when = parseDate(stripped.folded, ctx.today);
    if (when?.jalali) return ask("date", intent, slots, { en: "I can't read Persian-calendar dates. Say the date as day/month, or tomorrow or Friday.", fa: "تاریخ شمسی را نمی‌خوانم. روز/ماه میلادی یا فردا یا جمعه را بگویید." });
    if (!when?.date) return ask("date", intent, slots, { en: "I couldn't read the date. Say for example tomorrow, Friday or 3 November.", fa: "تاریخ را نخواندم. مثلاً بگویید فردا، جمعه یا ۳ نوامبر." });
    preset.date = when.date;
    const clock = parseTime(stripped.folded);
    if (clock) preset.time = clock.time;
  } else if (need === "project") {
    const hit = findProject(stripped.folded, ctx.projects, { skip: new Set(ctx.people.flatMap(personWords)) });
    if (!hit?.project) return ask("project", intent, slots, { en: "I couldn't tell which project. Say its code or the customer's name.", fa: "نفهمیدم کدام پروژه. کد پروژه یا اسم مشتری را بگویید." });
    preset.projectCode = hit.project.code;
  }
  const source = slots.original ?? original;
  if (!preset.people?.length) return null;
  return buildPerson(intent, source, fold(source), ctx, persian, preset);
}
