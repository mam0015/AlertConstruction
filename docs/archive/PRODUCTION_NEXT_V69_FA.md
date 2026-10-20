# ATP — Production Next

این موارد عمداً از V69 GitHub-test hardening جدا نگه داشته شده‌اند تا preview فعلی پایدار و قابل تست بماند. هیچ‌کدام برای دیدن و تست کردن flow اصلی روی GitHub Pages + Supabase مانع نیستند، اما قبل از استفاده عملیاتی کامل روی دامنه نهایی باید بسته شوند.

## 1. Customer Email OTP / Magic Link
V69 برای preview از Customer Reference + email جهت صدور access token استفاده می‌کند. روی سایت واقعی، صدور مجدد token باید فقط بعد از اثبات مالکیت email با OTP یا Magic Link انجام شود.

## 2. Transactional Workflow RPC + Idempotency
V69 هر transition را server-side validate می‌کند و خطاهای database را surface می‌کند. برای production نهایی، transitionهای چندمرحله‌ای باید داخل PostgreSQL RPC/transaction اجرا شوند و idempotency key داشته باشند تا قطع شبکه یا retry نتواند نیمه-transition ایجاد کند.

## 3. External Notification Provider
Notification Centre و handoffهای داخل برنامه در V69 وجود دارند. Email/SMS/Push بیرونی فقط بعد از انتخاب provider و تنظیم `ATP_NOTIFICATION_WEBHOOK_URL` و secret مربوطه فعال می‌شود.

## 4. Offline Site Mode
Site Supervisor باید در نسخه نهایی بتواند report/photo/task را در اینترنت ضعیف draft کند و بعداً sync شود. V69 Service Worker عمداً API write را cache نمی‌کند و offline write queue هنوز اضافه نشده است.

## 5. Physical Device QA
قبل از production باید روی iPhone واقعی Safari/PWA، HEIC، camera upload، فایل‌های بزرگ، قطع 4G وسط upload، screen lock و reopen تست شوند.

## 6. Final WordPress/Domain Integration
WordPress باید shell/marketing layer باشد و Service Role یا business logic داخل PHP/theme/frontend قرار نگیرد. Supabase Edge Function و database همان backend مرکزی می‌مانند و فقط allowed origin/domain نهایی اضافه می‌شود.

## 7. Remaining Role-specific Product Work
Workspaceهای Manager/Worker/trade-specific، defect/warranty module و advanced offline scheduling قابلیت‌های product بعدی هستند و جزو defect fixes این V69 نیستند.
