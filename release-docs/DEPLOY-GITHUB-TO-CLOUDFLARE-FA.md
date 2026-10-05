# راه‌اندازی اپ از GitHub روی اینترنت (Cloudflare) — قدم به قدم

## چرا لاگین روی `mam0015.github.io` کار نمی‌کند؟

**GitHub Pages فقط صفحه‌های ثابت (static) نشان می‌دهد.** این اپ سرور، دیتابیس (D1) و ذخیرهٔ فایل (R2) لازم دارد؛ بدون آن‌ها لاگین، پیام، تقویم و workflow اجرا نمی‌شود. به همین دلیل در GitHub Pages فقط یک نسخهٔ نمایشی قدیمی دیده می‌شد که پیام
«Secure Owner and staff sign-in requires the Full-Stack deployment» می‌داد. این یک باگ کد نیست.

راه‌حل: **کد در GitHub می‌ماند، و هر بار که فایل جدید در GitHub بریزید، خودکار روی Cloudflare Workers منتشر می‌شود** (رایگان برای شروع).
فایل `.github/workflows/deploy.yml` همین کار را انجام می‌دهد.

## یک‌بار راه‌اندازی (حدود ۲۰ دقیقه)

### ۱. حساب Cloudflare
1. در https://dash.cloudflare.com ثبت‌نام کنید (رایگان).
2. از منوی چپ **R2 Object Storage** را باز کنید و یک‌بار **Get started / Enable R2** بزنید (ممکن است کارت بانکی بخواهد؛ تا حجم رایگان هزینه‌ای ندارد).
3. **Account ID** را از صفحهٔ Workers & Pages (سمت راست) کپی کنید.
4. توکن بسازید: My Profile → API Tokens → Create Token → قالب **Edit Cloudflare Workers** را انتخاب کنید و علاوه بر آن این دسترسی‌ها را اضافه کنید:
   `Account · D1 · Edit` و `Account · Workspace/R2 Storage · Edit`. توکن را کپی کنید (فقط یک‌بار نشان داده می‌شود).

### ۲. ساخت رمزها (روی کامپیوتر خودتان)
```bash
node scripts/security-setup.mjs
```
ایمیل Owner، نام و پسورد Owner را می‌پرسد (پسورد هنگام تایپ دیده نمی‌شود) و چند خط `NAME=VALUE` چاپ می‌کند.
**پسورد Owner فقط در همین مرحله و فقط شما می‌دانید؛ هیچ‌جا در کد ذخیره نمی‌شود.**

### ۳. گذاشتن رمزها در GitHub
در ریپو: **Settings → Secrets and variables → Actions → New repository secret** و این‌ها را یکی‌یکی بسازید
(Name = قبل از `=`، Secret = بعد از `=`):

| Name | از کجا |
|---|---|
| `CLOUDFLARE_API_TOKEN` | مرحلهٔ ۱ |
| `CLOUDFLARE_ACCOUNT_ID` | مرحلهٔ ۱ |
| `OWNER_EMAIL` | خروجی مرحلهٔ ۲ |
| `OWNER_PASSWORD_HASH` | خروجی مرحلهٔ ۲ |
| `OWNER_DISPLAY_NAME` | خروجی مرحلهٔ ۲ |
| `OWNER_SESSION_SECRET` | خروجی مرحلهٔ ۲ |
| `TEAM_SESSION_SECRET` | خروجی مرحلهٔ ۲ |
| `CUSTOMER_CONTACT_HASH_SECRET` | خروجی مرحلهٔ ۲ |

### ۴. آپلود فایل‌ها
همهٔ فایل‌ها (از جمله پوشهٔ مخفی `.github`) را در ریپو قرار دهید. اگر با drag & drop پوشهٔ `.github` منتقل نشد (Finder پوشه‌های مخفی را نشان نمی‌دهد):
Add file → Create new file → در نام فایل بنویسید `.github/workflows/deploy.yml` و محتوا را paste کنید.

### ۵. منتشر کردن
تب **Actions** → «Deploy Alert Tradie Pro» → **Run workflow**. بعد از ۳–۵ دقیقه آدرس `https://alert-tradie-pro.<نام‌شما>.workers.dev` ساخته می‌شود
(در لاگ مرحلهٔ Deploy نوشته شده). از این به بعد هر تغییر در شاخهٔ `main` خودکار منتشر می‌شود.

دامنهٔ شرکت (مثلاً `app.alertconstruction.com.au`) را بعداً در Cloudflare → Workers → Settings → Domains اضافه کنید.

## بعد از اولین اجرا
1. آدرس بالا را باز کنید → **Team Sign In** → با ایمیل و پسورد Owner وارد شوید.
2. در **Owner → Settings** کد تیم (Team Code) را ببینید و به اعضای تیم بدهید.
3. هر عضو تیم: Team Sign In → ایمیل + پسورد + Team Code → «Waiting approval».
4. Owner در **Owner → Staff** سمت (Admin، Manager، Estimator، Site Supervisor، Worker…) را تعیین و تأیید می‌کند.
5. از این به بعد هر عضو فقط با ایمیل و پسورد وارد می‌شود و فقط پنل مربوط به سمت خودش را می‌بیند.

## اگر لاگین خطا داد
- پیام «Sign-in is not fully set up on the server» یعنی یکی از secretهای مرحلهٔ ۳ در Cloudflare نیست؛ Actions را دوباره اجرا کنید.
- Cloudflare → Workers & Pages → alert-tradie-pro → Logs: علت دقیق خطا آنجا نوشته می‌شود.

## تست کامل قبل از ارائه (روی کامپیوتر خودتان)
با رمزهای **تستی** در `.dev.vars` (نه رمز واقعی) و `npm run dev`:
```bash
BASE=http://localhost:5173 OWNER_EMAIL=... OWNER_PASSWORD=... TEAM_CODE=... node scripts/e2e-local.mjs
```
این اسکریپت کل مسیر را می‌رود: ثبت‌نام و تأیید تیم → درخواست مشتری → Admin → Site Supervisor → Estimator → مشتری → پروژهٔ فعال → تقویم → پیام → گزارش پایان روز → بررسی Owner.
