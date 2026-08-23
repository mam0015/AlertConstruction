# راهنمای نصب امن Alert Tradie Pro روی WordPress

نسخه: 2026-08-17

## تصمیم معماری مهم

اپ مدیریتی را داخل PHP یا دیتابیس WordPress کپی نکنید. WordPress فقط صفحهٔ ورودی برندشده را نشان می‌دهد و اپ امن روی یک ساب‌دامین جدا، مثل `https://portal.example.com` اجرا می‌شود. این جداسازی باعث می‌شود افزونه‌های WordPress به رمزها، sessionها، درخواست‌های مشتری و اطلاعات Owner دسترسی نداشته باشند.

فایل `dist-github` فقط برای نمایش طراحی است. آن را برای دادهٔ واقعی، لاگین واقعی یا پروژهٔ واقعی استفاده نکنید.

## بخش ۱ — ساخت حساب Owner و Team Code

1. روی کامپیوتر خودتان Node.js نسخه 22 یا بالاتر نصب کنید.
2. داخل پوشهٔ سورس این دستور را اجرا کنید:

   `node scripts/security-setup.mjs`

3. برای حساب Owner گزینه `owner` و برای Team Code گزینه `team` را انتخاب کنید.
4. رمز Owner یا Team Code را وارد کنید. مقدار هنگام تایپ نمایش داده نمی‌شود.
5. خروجی را فقط داخل Secret Manager هاست قرار دهید. آن را در Chat، GitHub، WordPress، ایمیل یا اسکرین‌شات قرار ندهید.
6. Owner با همان ایمیل و پسورد وارد فرم مشترک می‌شود و Team Code را خالی می‌گذارد.
7. عضو جدید تیم ایمیل، پسورد و Team Code را وارد می‌کند و تا تأیید Owner در صفحه Waiting Approval می‌ماند.
8. بعد از تأیید، نقش کارمند ذخیره می‌شود و ورودهای بعدی با همان ایمیل و پسورد انجام می‌شود.

## بخش ۲ — GitHub فقط برای Preview

1. فایل ZIP مخصوص GitHub Preview را باز کنید.
2. محتویات داخل ZIP، از جمله `index.html` و پوشهٔ `assets`، باید مستقیماً در root شاخهٔ GitHub Pages قرار بگیرند.
3. در GitHub وارد Settings → Pages شوید.
4. Branch را انتخاب و Save کنید.
5. فقط دادهٔ ساختگی ببینید؛ هیچ ایمیل، تلفن، آدرس، رمز یا فایل مشتری واقعی وارد نکنید.

این Preview عمداً ناشناس است و submitهای نمایشی، نام و اطلاعات تماس واردشده را ذخیره نمی‌کنند.

## بخش ۳ — راه‌اندازی Portal واقعی

نسخهٔ فعلی backend از Cloudflare D1/R2 استفاده می‌کند، نه Supabase. فایل GitHub Preview را به‌عنوان backend روی Supabase آپلود نکنید. برای انتقال آینده به Supabase باید migration جداگانهٔ schema، RLS و Edge Functions نوشته و تست شود.

1. سورس کامل را روی هاست full-stack سازگار با Node/Cloudflare قرار دهید.
2. Environment variableهای موجود در `release-docs/ENVIRONMENT-TEMPLATE.txt` را در Secret Manager هاست بسازید.
3. هیچ فایل `.env` واقعی را commit نکنید.
4. `ATP_DEMO_SEED=false` بماند.
5. Portal را فقط با HTTPS روی ساب‌دامین جدا مثل `portal.example.com` منتشر کنید.
6. D1 migrations را اجرا و R2 private bucket را متصل کنید.
7. ابتدا Owner، سپس یک درخواست Admin و بعد یک درخواست Site Supervisor را از مسیر Team Code بررسی و تأیید کنید.
8. درخواست مشتری آزمایشی بسازید و مسیر Request → Review → Contact → Site Visit → Estimate → Customer Approval → Active → Quality Inspection → Completion را کامل تست کنید.

## بخش ۴ — نصب Plugin در WordPress

1. وارد WordPress Admin شوید.
2. Plugins → Add New Plugin → Upload Plugin را باز کنید.
3. فایل `alert-tradie-pro-wordpress-bridge.zip` را انتخاب کنید.
4. Install Now و سپس Activate را بزنید.
5. Settings → Alert Tradie Pro را باز کنید.
6. آدرس HTTPS Portal واقعی را وارد کنید؛ آدرس GitHub Pages را وارد نکنید.
7. Pages → Add New را بزنید و صفحه‌ای به نام `Project Portal` بسازید.
8. داخل صفحه این shortcode را قرار دهید:

   `[alert_tradie_pro_portal]`

9. صفحه را Publish و آن را به منوی اصلی WordPress اضافه کنید.
10. با مرورگر Private/Incognito تست کنید که Request، Tracking و Team Sign In به Portal واقعی می‌روند. Owner نیز از همان Team Sign In وارد می‌شود.

برای قفل کردن آدرس Portal خارج از دیتابیس WordPress، این خط را با آدرس واقعی در `wp-config.php` و بالای خط `That's all, stop editing` قرار دهید:

`define('ATP_PORTAL_URL', 'https://portal.example.com');`

## بخش ۵ — چک نهایی قبل از انتشار عمومی

- هیچ صفحهٔ ورود جداگانه برای Owner یا Admin وجود نداشته باشد.
- هیچ رمز، hash، Team Code، service key یا session secret در GitHub وجود نداشته باشد.
- GitHub Pages فقط Preview ناشناس باشد.
- فایل‌های مشتری private باشند و URL عمومی دائمی نداشته باشند.
- backup رمزگذاری‌شده و تست restore فعال باشد.
- هشدار login failure و خطاهای امنیتی مانیتور شود.
- Terms، Privacy و متن قرارداد توسط وکیل ساختمانی Victoria بازبینی شود.
- پلاگین‌ها، WordPress، PHP و theme همیشه به‌روز باشند.
- Owner و اعضای تیم روی دستگاه مشترک یا مرورگر عمومی login نکنند.

## نکته حقوقی

متن داخل اپ یک پیش‌نویس عملیاتی است، نه جایگزین مشاورهٔ حقوقی. بند variation، پرداخت 14 روزه، تعلیق یا فسخ باید با قرارداد نهایی و قوانین اجباری Victoria هماهنگ و قبل از launch توسط وکیل بازبینی شود. فسخ به‌صورت خودکار بعد از 14 روز در متن قرار نگرفته؛ فقط اقدام قانونی مطابق قرارداد و notice معتبر مجاز دانسته شده است.

مراجع رسمی برای بازبینی وکیل:

- Consumer Affairs Victoria — Building contracts: https://www.consumer.vic.gov.au/housing/building-and-renovating/plan-and-manage-your-building-project/contracts
- Building and Plumbing Commission Victoria — Protect your build: https://www.vba.vic.gov.au/consumers/home-renovation-essentials/protect-your-build
- OAIC — APP 11 security of personal information: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information
- OAIC — Notifiable Data Breaches: https://www.oaic.gov.au/privacy/notifiable-data-breaches
