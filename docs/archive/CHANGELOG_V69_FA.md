# V69 — چه چیزی عوض شد؟

| قبل | V69 |
|---|---|
| GitHub workflow/demo data داخل localStorage هر مرورگر | GitHub frontend می‌تواند به Supabase central backend وصل شود و همه دستگاه‌ها یک source-of-truth دارند |
| Customer Portal شامل 62%، Plumbing، Electrical و تاریخ‌های نمونه | تمام اطلاعات fake حذف شد؛ فقط data تأییدشده از backend نمایش داده می‌شود |
| Tracking code قابل حدس/زمان‌محور | Reference تصادفی 16 کاراکتری + retry روی collision |
| Reference خودش credential بود | Customer Reference تصادفی 16 کاراکتری ثابت می‌ماند؛ session token جدا و 30 روزه دارد و بعداً با همان Reference + email دوباره صادر می‌شود |
| تغییر دستگاه مشکل access ایجاد می‌کرد | Customer با Reference + همان email می‌تواند token جدید بگیرد؛ برای production بعداً همین exchange به OTP تبدیل می‌شود |
| workflow event بود ولی notification delivery واقعی نبود | Notification table + bell UI + unread/read/actioned + optional webhook delivery |
| handoff صرفاً stage change بود | Handoff entity با assignee، role، due time، status، completion و overdue escalation |
| staff session تا 8 ساعت حتی بعد از revoke قابل ادامه بود | session در DB است و هر request وضعیت فعلی staff/role/revocation را دوباره چک می‌کند |
| Site report فقط `fileIds.length` را چک می‌کرد | photo IDs باید واقعاً وجود داشته باشند و متعلق به همان case/category/uploader باشند |
| authenticated user ممکن بود با تغییر file ID فایل پروژه دیگر را بخواند | download permission بر اساس Owner/Admin/assigned Supervisor/verified Customer دوباره کنترل می‌شود |
| published update می‌توانست بعداً reject شود و فایل‌ها published بمانند | `reject_update` فقط قبل از publish مجاز است |
| customer message فقط design preview بود | پیام واقعاً در database ذخیره می‌شود و Admin/Owner notification می‌گیرند |
| Service Worker GET responseها را خیلی گسترده cache می‌کرد | V69 فقط same-origin static assets را cache می‌کند، نه API/Supabase/customer data |
| Admin requests و workflow خطر جدا شدن از هم داشتند | Admin request list از همان `atp_workflow_cases` ساخته می‌شود |
| Admin schedule می‌توانست بدون publication gate با Customer data قاطی شود | هر schedule به workflow case لینک می‌شود؛ تغییر Admin آن را internal می‌کند و Owner approval آن را customer-visible می‌کند |
| Stage تغییر در Admin request editor می‌توانست workflow را دور بزند | فقط New/Review/Contacted از editor پشتیبانی می‌شود؛ Site Visit و مراحل بعد فقط از Project Workflow |
| GitHub Pages build صرفاً branch/Jekyll بود | workflow جدید GitHub Actions، SPA را با Vite typecheck/build/deploy می‌کند |
| operational tables مستقیم قابل اتکا نبودند | تمام V69 tables با RLS روشن و بدون anon policies؛ دسترسی از service-role Edge Function با RBAC |

## Notification external delivery

In-app notification کامل است. اگر بعداً Email/Push/SMS provider انتخاب شود، فقط دو secret زیر را تنظیم می‌کنیم و core workflow تغییر نمی‌کند:

- `ATP_NOTIFICATION_WEBHOOK_URL`
- `ATP_NOTIFICATION_WEBHOOK_KEY`

Edge Function payload notification را به آن endpoint می‌فرستد و Sent/Failed را داخل database ثبت می‌کند.

| مشکل تکمیلی | اصلاح V69 |
|---|---|
| Request form فایل نشان می‌داد ولی workflow JSON فایل را ذخیره نمی‌کرد | Request attachments با multipart تا ۵ فایل، ۱۲MB هر فایل و ۲۵MB مجموع داخل private Supabase Storage ذخیره می‌شوند |
| Refresh مستقیم `/owner/` یا `/track/` بعد از Vite build می‌توانست 404 شود | post-build route shells برای routeهای اصلی ساخته می‌شود |
| Homepage استاتیک متن demo و sample code قدیمی داشت | build-time compatibility patch متن‌ها و فرم را بدون بازطراحی Homepage اصلاح می‌کند |
| Project Code داخلی قابل حدس بود | Customer access فقط Reference تصادفی 16 کاراکتری `REQ-...` را قبول می‌کند؛ `ATP-...` فقط internal/display است |
