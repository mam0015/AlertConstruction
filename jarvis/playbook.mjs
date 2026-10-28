// Practical steps for the moments an Owner asks "what do I do?" and no AI is connected. Fixed text, written once: general business
// guidance for a Victorian builder, not legal advice. With an AI connected, Jarvis answers the actual situation instead.

export const DISPUTE_QUESTION = /(?<![\p{L}])(?:disputes?|disputing|argu(?:e|ed|ing|ment)|fight|fought|angry|furious|upset|unhappy (?:customer|client)|(?:customer|client)s? (?:is |are )?(?:unhappy|angry|upset)|won'?t pay|not paying|refus\w+ to pay|threaten\w*|lawyer|solicitor|vcat|ombudsman|legal action)(?![\p{L}])|دعوا|دعوای|اختلاف|بحث با|عصبانی|ناراضی|شکایت|نمی ?خواد پول|پول نمی ?ده|وکیل/u;
export const ADVICE_QUESTION = /(?<![\p{L}])(?:advice|advise|ideas?|suggest\w*|what should i (?:say|do|tell)|how (?:should|do|can) i (?:handle|deal|respond|reply|approach|talk)|any ideas|help me (?:with|decide|plan|think|handle)|strategy)(?![\p{L}])|نظر|ایده|راهنمایی|پیشنهاد|چکار کنم|چه کار کنم|چی کار کنم|چطور برخورد/u;

export function disputePlaybook(persian) {
  if (persian) {
    return [
      "چند قدمِ عملی برای وقتی با مشتری اختلاف دارید (راهنمای عمومی، مشاوره‌ی حقوقی نیست):",
      "۱. آرام بمانید و همه‌چیز را کتبی ادامه دهید؛ تماس تلفنی را با یک ایمیل خلاصه کنید.",
      "۲. اول واقعیت‌ها را جمع کنید: قرارداد، تغییرات امضاشده، عکس‌ها، گزارش‌های روزانه و پرداخت‌ها.",
      "۳. نگرانی مشتری را بپذیرید، ولی تا بررسی نکرده‌اید قصور یا پرداخت را قبول نکنید.",
      "۴. یک بازدید کوتاه از سایت با سرپرست پیشنهاد دهید تا مشکل را کنار هم ببینید.",
      "۵. راه‌حل و تاریخ را کتبی پیشنهاد دهید و تأیید مشتری را بگیرید.",
      "۶. اگر بحث پول یا تغییر کار است، قرارداد و تغییرِ امضاشده را بخوانید. در ویکتوریا قبل از VCAT معمولاً سرویس DBDRV است.",
      "۷. اگر صحبت از وکیل یا شکایت شد، پیام ندهید؛ اول با وکیل یا بیمه‌ی خودتان صحبت کنید.",
      "برای ایده‌های مخصوص همین مشتری، Jarvis 1 یا Jarvis 2 را وصل کنید و ماجرا را برایش توضیح دهید.",
    ].join("\n");
  }
  return [
    "Practical steps when you have a dispute with a customer (general guidance, not legal advice):",
    "1. Stay calm and keep it in writing; follow any phone call with a short email that says what was agreed.",
    "2. Get the facts first: the contract, signed variations, photos, daily logs and the payments made.",
    "3. Acknowledge the customer's concern, but do not admit fault or promise money until you have checked the facts.",
    "4. Offer a short site meeting with your supervisor so you can look at the problem together.",
    "5. Put a fix and a date in writing and ask the customer to confirm.",
    "6. If it is about money or extra work, read the contract and the signed variation. In Victoria, Domestic Building Dispute Resolution Victoria (DBDRV) normally comes before VCAT.",
    "7. If a lawyer or legal action is mentioned, stop replying and talk to your own solicitor or insurer first.",
    "For ideas about this particular customer, connect Jarvis 1 or Jarvis 2 and tell it what happened.",
  ].join("\n");
}
