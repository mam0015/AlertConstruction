# راه‌اندازی Alert Tradie Pro روی اینترنت تا شرکت از همین امروز استفاده کند

نسخهٔ انگلیسی: [`GO-LIVE.md`](GO-LIVE.md)

## چه چیزی راه می‌اندازید؟

| بخش | چیست | اطلاعات کجا ذخیره می‌شود |
|---|---|---|
| اپ | یک **Worker** در Cloudflare (سایت، پنل Owner / Team / مشتری، API و Jarvis) | خود Worker چیزی ذخیره نمی‌کند |
| دیتابیس | **D1** در Cloudflare — درخواست‌ها، پروژه‌ها، مالی، گزارش‌ها، پیام‌ها، کارکنان، لاگ ارسال Jarvis | Cloudflare، در حساب خودتان |
| فایل‌ها | **R2** (فضای خصوصی) — عکس و مدارک آپلودشده | Cloudflare، در حساب خودتان |
| کد | **GitHub** | فقط کد؛ هرگز رمز یا اطلاعات مشتری |

سرور برای نگهداری ندارید: نه ماشین لینوکس، نه به‌روزرسانی سیستم، نه نصب دیتابیس. هر چیزی که شرکت وارد کند در D1 و R2
**حساب Cloudflare خودتان** ذخیره می‌شود. جدول‌های دیتابیس اولین باری که لازم شوند خودکار ساخته می‌شوند.

روی GitHub Pages اجرا نمی‌شود (فقط صفحهٔ ثابت نشان می‌دهد) و همین‌طور که هست روی Supabase هم اجرا نمی‌شود.

> **پلن:** برای امتحان با پلن رایگان Cloudflare شروع کنید. برای کار واقعی شرکت **Workers Paid (حدود ۵ دلار آمریکا در ماه)** بگیرید.
> پلن رایگان محدودیت دارد (زمان پردازش و تعداد درخواست‌های خروجی برای هر درخواست). ورود به سیستم هش قوی رمز می‌سازد و
> Jarvis با Google حرف می‌زند؛ در روز شلوغ ممکن است به این محدودیت‌ها بخورید. اگر خطای «Error 1102» یا «Too many subrequests»
> دیدید، پلن را ارتقا دهید؛ چیز دیگری عوض نمی‌شود.

## پیش‌نیازها

* حساب **GitHub** با همین ریپو و حساب **Cloudflare** (<https://dash.cloudflare.com>).
* روی کامپیوتر: **Node.js نسخهٔ ۲۲٫۱۳ یا بالاتر** (<https://nodejs.org>).
* حدود ۳۰ دقیقه.

## قدم ۱ — بررسی پروژه روی کامپیوتر خودتان (۵ دقیقه)

```bash
npm ci
npm run verify      # lint + بررسی نوع‌ها + build + همهٔ تست‌ها؛ در خط‌های آخر باید "# fail 0" باشد
```

اگر تمیز تمام نشد همین‌جا بایستید و اول آن را درست کنید. با `npm run preview:local` اپ واقعی را روی کامپیوتر خودتان اجرا می‌کنید
(`docs/UPDATE-ON-MY-COMPUTER.md`).

## قدم ۲ — حساب Cloudflare

1. در <https://dash.cloudflare.com> ثبت‌نام یا ورود کنید.
2. منوی چپ → **R2 Object Storage** → یک‌بار **Get started / Enable R2** (ممکن است کارت بخواهد؛ سهمیهٔ رایگان برای یک شرکت کوچک کافی است).
3. Account ID و دیتابیس D1 و باکت R2 موجود شما از قبل در فایل **`cloudflare.resources.json`** نوشته شده‌اند
   (فقط شناسه، بدون رمز). deploy از همین‌ها استفاده می‌کند و **هیچ‌وقت دیتابیس یا باکت دوم نمی‌سازد**. اگر دیتابیس پیدا نشود
   متوقف می‌شود و دلیل را می‌نویسد. برای اتصال به حساب یا دیتابیس دیگر همین فایل را عوض کنید
   و دوباره push کنید. باکت نام‌برده‌شده فقط وصل می‌شود و هرگز ساخته نمی‌شود (اگر اسمش غلط باشد deploy متوقف می‌شود).
   حساب نوشته‌شده در فایل همان است که استفاده می‌شود (اگر secret به اسم `CLOUDFLARE_ACCOUNT_ID` حساب دیگری را نشان بدهد نادیده گرفته می‌شود و deploy این را می‌گوید).
   اگر deploy را دستی اجرا کنید، متغیرهای `D1_DATABASE_ID` و `R2_BUCKET_NAME` و `FILES_LIMIT_GB` بر فایل غلبه می‌کنند؛ GitHub workflow از فایل استفاده می‌کند.
4. بالا-راست پروفایل → **My Profile → API Tokens → Create Token** → قالب **Edit Cloudflare Workers** و دو دسترسی اضافه کنید:
   `Account · D1 · Edit` و `Account · Workers R2 Storage · Edit`. توکن را بسازید و کپی کنید (فقط یک‌بار نشان داده می‌شود).

## قدم ۳ — ساخت رمزهای خصوصی شرکت (روی کامپیوتر خودتان)

```bash
node scripts/security-setup.mjs
```

گزینهٔ `all` را بزنید. ایمیل، نام و رمز Owner را می‌پرسد (حداقل ۱۰ حرف؛ موقع تایپ دیده نمی‌شود) و خط‌هایی مثل `OWNER_EMAIL=…` چاپ می‌کند.
**رمز Owner را فقط خودتان می‌دانید؛ فقط یک هش یک‌طرفه از آن ذخیره می‌شود.** خروجی را در یک password manager نگه دارید.

## قدم ۴ — گذاشتن رمزها در GitHub

ریپو → **Settings → Secrets and variables → Actions → New repository secret**. برای هر خط یک secret بسازید (Name = قبل از `=`، Value = بعد از `=`).

**الزامی (بدون این‌ها deploy اجرا نمی‌شود):**

| Name | از کجا |
|---|---|
| `CLOUDFLARE_API_TOKEN` | قدم ۲ |
| `CLOUDFLARE_ACCOUNT_ID` | از قبل در `cloudflare.resources.json` هست؛ می‌توانید این secret را نگذارید (اگر بگذارید، همان ارجح است) |
| `OWNER_EMAIL` | قدم ۳ |
| `OWNER_PASSWORD_HASH` | قدم ۳ |
| `OWNER_SESSION_SECRET` | قدم ۳ |
| `CUSTOMER_CONTACT_HASH_SECRET` | قدم ۳ |

**اپ کاملاً خالی شروع می‌کند.** deploy فقط اپ را به دیتابیس و باکت وصل می‌کند؛ هیچ رکوردی نمی‌نویسد و داده‌ی نمایشی
در نسخه‌ی واقعی خاموش است (`ATP_DEMO_SEED=false`). جدول‌ها اولین بار که اپ اجرا شود خالی ساخته می‌شوند و بعد از آن فقط افراد خود شرکت داده وارد می‌کنند.

**سقف فایل‌ها:** مجموع فایل‌های شرکت (پیوست چت، عکس و مدارک پروژه، فایل مشتری) حداکثر **۸ گیگابایت** است
(`filesLimitGb` در `cloudflare.resources.json` یا تنظیم `FILES_LIMIT_GB`). آپلودی که از سقف بگذرد با پیام روشن رد می‌شود و در
داشبورد Owner بخش **Settings ← File storage** یک نوار حجم دارد که از ۸۰٪ هشدار می‌دهد. مشتری‌ها (که وارد نشده‌اند) فقط تا ۸۰٪ سقف می‌توانند آپلود کنند
تا برای کارکنان همیشه جا برای عکس و مدارک بماند. فعلاً در برنامه صفحه‌ای برای پاک کردن فایل‌های آپلودشده نیست؛ وقتی نوار پر شد راه باز کردن جا این است که
`filesLimitGb` را بیشتر کنید و دوباره deploy کنید. دیتابیس (D1) جدا است و سقف خودش را دارد.

**توصیه‌شده:** `OWNER_DISPLAY_NAME` و `TEAM_SESSION_SECRET` (هر دو در قدم ۳ چاپ می‌شوند).

**اختیاری:**

| Name | کاربرد |
|---|---|
| `TEAM_CODE`، `TEAM_CODE_HASH` | Team Code دلخواه (`node scripts/security-setup.mjs` و گزینهٔ `team`). اگر نگذارید، در اولین اجرا خودکار ساخته و در **Owner → Settings** نشان داده می‌شود. |
| `RESEND_API_KEY`، `TEAM_NOTIFICATION_EMAIL_FROM` | ایمیل به Owner وقتی کسی درخواست دسترسی می‌دهد |
| `JARVIS_GMAIL_CLIENT_ID`، `JARVIS_GMAIL_CLIENT_SECRET`، `JARVIS_GMAIL_ACCOUNTS` | اجازهٔ خواندن (و اگر بخواهید پاسخ دادن) ایمیل شرکت توسط Jarvis — قدم ۷ |
| `JARVIS_ANTHROPIC_API_KEY` | «حالت هوشمند» Jarvis (جواب به زبان ساده و نوشتن پاسخ ایمیل) — قدم ۷ |
| `JARVIS_OPENJARVIS_URL`، `JARVIS_OPENJARVIS_API_KEY`، `JARVIS_OPENJARVIS_MODEL` (و `…_ACCESS_ID`، `…_ACCESS_SECRET`) | «Jarvis 2»: سرور OpenJarvis خودتان به‌عنوان مغز Jarvis — `JARVIS2-OPENJARVIS-FA.md` |
| `JARVIS_AI_MODEL`، `JARVIS_AI`، `JARVIS_AI_FALLBACKS`، `JARVIS_COMPANY_NAME` | تنظیم دقیق‌تر؛ اگر لازم نیست نگذارید |

## قدم ۵ — مطمئن شوید فایل deploy در ریپو است

deploy خودکار همان فایل **`.github/workflows/deploy.yml`** است. پوشه‌هایی که با نقطه شروع می‌شوند را آپلود با drag & drop اغلب رد می‌کند؛
در GitHub ببینید فایل هست یا نه. اگر نبود: **Add file → Create new file** و در نام فایل بنویسید `.github/workflows/deploy.yml`
و محتوای `docs/deploy-workflow.yml` (کپی یکسان و قابل‌دیدن) را paste کنید.

بعد کارهای این شاخه را به **`main`** ببرید (deploy وقتی اجرا می‌شود که `main` عوض شود): در GitHub یک pull request از
`claude/quirky-archimedes-j36ll5` به `main` بسازید و merge کنید.

## قدم ۶ — Deploy

ریپو → **Actions → «Deploy Alert Tradie Pro» → Run workflow** (هر بار که `main` عوض شود هم خودکار اجرا می‌شود).
نصب می‌کند، می‌سازد، **همهٔ تست‌ها را اجرا می‌کند (اگر یکی خراب باشد چیزی منتشر نمی‌شود)**، وجود دیتابیس و باکت شما (که در `cloudflare.resources.json` نوشته شده) را بررسی می‌کند و هرگز آن‌ها را نمی‌سازد، جایگزین نمی‌کند یا خالی نمی‌کند،
منتشر می‌کند و رمزهای شما را به‌صورت secret در Worker می‌گذارد. بعد از ۳ تا ۵ دقیقه آخر لاگ می‌نویسد
`Live at https://alert-tradie-pro.<نام-شما>.workers.dev`.

اگر می‌خواهید بدون GitHub Actions از کامپیوتر خودتان منتشر کنید، همین نام‌ها را به‌عنوان environment variable بگذارید و:

```bash
npm test && node scripts/deploy-cloudflare.mjs
```

### چک‌لیست روز اول

1. آدرس را باز کنید → **Team Sign In** → با ایمیل و رمز **Owner** وارد شوید (Team Code را خالی بگذارید).
2. **Owner → Settings**: **Team Code** شرکت را ببینید و به‌صورت خصوصی به کارکنان بدهید.
3. هر عضو تیم آدرس را باز می‌کند، Team Sign In، ایمیل + رمز + Team Code را یک‌بار وارد می‌کند.
   شما در **Owner → Access requests** او را تأیید و سمتش را مشخص می‌کنید.
4. یک درخواست آزمایشی از فرم عمومی بفرستید و مسیرش را Admin → Site Supervisor → Estimator → مشتری ببرید؛ بعد داده‌های واقعی را وارد کنید.
5. **Owner → Jarvis** را باز کنید: گزارش‌های کارکنان و نظرهای مشتری دیده می‌شوند؛ ایمیل تا قدم ۷ «not connected» است.
6. اولین بکاپ را بگیرید (پایین) و در تقویم خود یادآوری تکرارش بگذارید.
7. دامنهٔ خودتان را اضافه کنید (پایین) و آدرس جدید را به کارکنان بگویید.

### دامنهٔ خودتان، مثلاً `app.alertconstruction.com.au`

دامنه را به Cloudflare اضافه کنید (**Websites → Add a site** و تغییر name serverها نزد ثبت‌کنندهٔ دامنه)، بعد
**Workers & Pages → alert-tradie-pro → Settings → Domains & Routes → Add → Custom domain**. HTTPS خودکار است.

## قدم ۷ — فعال کردن Jarvis (اختیاری، می‌شود بعداً هم کرد)

راهنمای کامل: [`jarvis/README.md`](../jarvis/README.md). خلاصه:

1. **ایمیل:** در Google Cloud یک OAuth client (نوع Desktop app) بسازید، بعد برای هر mailbox این را اجرا کنید:
   `JARVIS_GMAIL_CLIENT_ID=… JARVIS_GMAIL_CLIENT_SECRET=… node jarvis/scripts/gmail-authorize.mjs info@yourcompany.com.au --allow-replies`
   (برای mailboxی که Jarvis فقط باید بخواند، `--allow-replies` را نگذارید). client ID، client secret و فهرست mailboxی که چاپ می‌شود را
   با نام‌های `JARVIS_GMAIL_CLIENT_ID`، `JARVIS_GMAIL_CLIENT_SECRET` و `JARVIS_GMAIL_ACCOUNTS` در GitHub secrets بگذارید.
2. **حالت هوشمند:** در <https://console.anthropic.com> یک کلید بسازید (همان‌جا سقف هزینهٔ ماهانه بگذارید) و با نام
   `JARVIS_ANTHROPIC_API_KEY` در GitHub secrets بگذارید. بدون آن Jarvis در «حالت ساده» کار می‌کند و چیزی از سیستم شما خارج نمی‌شود.
3. **اختیاری — Jarvis 2:** به‌جای هوش مصنوعی ابریِ Anthropic (یا کنارش) می‌توانید برنامهٔ متن‌باز [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) را روی کامپیوتر یا سرور خودتان
   اجرا کنید و در **Owner → Jarvis** انتخابش کنید. راهنما: [`JARVIS2-OPENJARVIS-FA.md`](JARVIS2-OPENJARVIS-FA.md). secretها: `JARVIS_OPENJARVIS_URL`، `JARVIS_OPENJARVIS_API_KEY`، `JARVIS_OPENJARVIS_MODEL`.
4. دوباره deploy کنید (**Actions → Run workflow**) تا secretهای جدید به Worker برسند. در **Owner → Jarvis** بررسی کنید.

Jarvis فقط داخل بخش Owner و فقط برای Owner واردشده کار می‌کند. کل برنامه را می‌تواند بخواند (به‌جز رمزها و کلیدها)، فقط وقتی **شما بپرسید** خبر می‌دهد،
و هیچ کاری — ارسال ایمیل، پیام به یک نفر، گذاشتن چیزی در تقویم — را تا دکمه‌اش را نزنید انجام نمی‌دهد. هر دو مغز (Jarvis 1 و Jarvis 2) همهٔ این کارها را می‌توانند.

## اگر Owner رمز را فراموش کرد

دستور `node scripts/security-setup.mjs` را اجرا کنید (گزینهٔ `owner`)، مقدار جدید `OWNER_PASSWORD_HASH` (و اگر ایمیل عوض می‌شود `OWNER_EMAIL`) را
در GitHub secrets بگذارید و **Actions → Run workflow** بزنید. بعد از deploy رمز جدید کار می‌کند، رمز قدیمی از کار می‌افتد و همه از حساب خارج می‌شوند.
(رمزی که داخل خود اپ در **Owner → Settings** عوض کنید تا وقتی secretها همان باشند حفظ می‌شود.)
عضو تیمی که رمزش را فراموش کرده: **Owner → Access requests → Reset access** و بعد با Team Code دوباره عضو می‌شود.

## بکاپ و بازگردانی

اطلاعات شما فقط در Cloudflare است؛ پس بکاپ بگیرید.

* **دیتابیس، هر وقت خواستید** (در ترمینال `CLOUDFLARE_API_TOKEN` و `CLOUDFLARE_ACCOUNT_ID` لازم است یا `npx wrangler login`):
  ```bash
  npx wrangler d1 export <database-name> --remote --output=backup-2026-10-20.sql
  ```
  هفته‌ای یک‌بار (بهتر است روزانه). فایل شامل اطلاعات مشتری است: جای خصوصی نگه دارید و **هرگز** در GitHub نگذارید.
* **برگشت کوتاه‌مدت:** D1 تاریخچهٔ اخیر را نگه می‌دارد و می‌شود به عقب برگشت: `npx wrangler d1 time-travel info <database-name>`
  (چقدر به عقب، به پلن شما بستگی دارد).
* `<database-name>` اسم دیتابیس D1 شماست (داشبورد Cloudflare ← Storage & databases ← D1؛ لاگ deploy هم خطی مثل `Using D1 database <name>` چاپ می‌کند).
* **فایل‌ها:** از باکتی که در `cloudflare.resources.json` نوشته شده (`test-at`) می‌شود با **R2 → Manage API tokens** و ابزاری مثل `rclone` کپی گرفت.
* **به‌روزرسانی بد؟** تغییر را در `main` revert کنید (خودش دوباره منتشر می‌شود) یا در Cloudflare
  **Workers & Pages → alert-tradie-pro → Deployments → Rollback**.

## به‌روزرسانی‌های بعدی

کد را عوض کنید (یا از Claude بخواهید)، به `main` merge کنید؛ همین workflow تست و منتشر می‌کند. داده‌ها و تنظیمات دست نمی‌خورند.
secret جدید: در GitHub اضافه کنید و یک‌بار **Run workflow** بزنید.

## اگر مشکلی پیش آمد

| چه می‌بینید | معنی |
|---|---|
| Deploy می‌گوید «Missing GitHub secrets» | یکی از secretهای الزامی قدم ۴ نیست یا اسمش غلط است |
| Deploy در «Build and test» خراب می‌شود | یک بررسی رد شده و چیزی منتشر نشده؛ لاگ را ببینید، درست کنید، دوباره push کنید |
| «Sign-in is not fully set up on the server» | `OWNER_EMAIL` یا `OWNER_PASSWORD_HASH` یا `OWNER_SESSION_SECRET` نیست؛ اضافه کنید و workflow را اجرا کنید |
| خطای R2 هنگام deploy | R2 در قدم ۲ (مورد ۲) فعال نشده |
| «Error 1102» / «Too many subrequests» | محدودیت پلن رایگان؛ به Workers Paid ارتقا دهید |
| Jarvis می‌گوید یک mailbox باید دوباره وصل شود | `gmail-authorize.mjs` را برای آن دوباره اجرا و `JARVIS_GMAIL_ACCOUNTS` را عوض کنید |
| هر چیز دیگر | Cloudflare → **Workers & Pages → alert-tradie-pro → Logs** علت دقیق را نشان می‌دهد |

قبل از اینکه به کارکنان بگویید زنده شده، یک‌بار دیگر `npm run verify` را روی همین فایل‌هایی که منتشر کرده‌اید اجرا کنید.
