# Alert Tradie Pro — V69 Hardening Pack

این بسته برای تبدیل نسخه فعلی Alert Tradie Pro از یک GitHub demo محلی به یک **GitHub Pages frontend + Supabase central backend** آماده شده است.

هدف V69 این است که همان ظاهر و جریان فعلی حفظ شود، ولی داده‌ها و handoffها بین Customer، Admin، Owner و Site Supervisor واقعاً مشترک و قابل پیگیری باشند.

## داخل بسته چه هست؟

### `SUPABASE_UPDATE/`
- Migration کامل V69
- Edge Function مرکزی `atp-api`
- `config.toml` با `verify_jwt = false` برای custom ATP sessions
- Generator امن برای Owner password و Team Code

### `GITHUB_UPDATE/`
- Remote API adapter برای اتصال GitHub Pages به Supabase
- Customer Portal بدون اطلاعات fake/hard-coded
- Notification Bell واقعی برای Owner/Admin/Site Supervisor
- Service Worker امن‌تر که API/customer data را cache نمی‌کند
- GitHub Actions workflow برای build واقعی Vite و deploy Pages
- Vite/TypeScript package config
- Next/full-stack customer tracking page replacement برای نگه‌داشتن source tree تمیز

### `DOCS/`
- QA script
- Test matrix
- upload/deployment order
- changelog
- Production Next boundary برای مواردی که بعد از GitHub test باید روی دامنه واقعی بسته شوند


## شکل تحویل GitHub

`GITHUB_UPDATE/` یک **overlay کاملِ فایل‌های تغییرکرده V69** روی repo فعلی است، نه clone دوباره‌ی کل repository. فایل‌ها را با همان path روی نسخه فعلی قرار بده. این عمداً انجام شده تا تصاویر، assetها و فایل‌های قدیمی‌ای که تغییر نکرده‌اند بی‌دلیل دوباره کپی نشوند. ZIP جداگانه GitHub همین overlay + راهنمای نصب را دارد.

## معماری V69

```text
Customer / Staff Browser
        |
        v
GitHub Pages (Vite/React preview)
        |
        v
Supabase Edge Function: atp-api
        |
        +--> PostgreSQL/RLS-protected operational tables
        +--> Private Storage bucket
        +--> Session / Customer Access tokens
        +--> Handoffs / Notifications / Audit Events
        +--> Optional external notification webhook
```

در حالت `atp-config.json -> mode=remote`، GitHub Pages دیگر source-of-truth نیست. localStorage فقط برای نگه‌داری access token سمت preview استفاده می‌شود و داده پروژه داخل Supabase است.

اگر API URL هنوز تنظیم نشده باشد، frontend به demo mode قبلی برمی‌گردد تا سایت سفید نشود.

## وضعیت تست قبل از تحویل

- TypeScript syntax check روی Edge Function: PASS (به‌جز Deno/Supabase imports که فقط داخل Edge runtime resolve می‌شوند)
- TypeScript syntax check روی فایل‌های frontend جدید: PASS
- Static security/release checks: **36/36 PASS**
- Project Reference collision simulation:
  - 100 request: 0 collision
  - 10,000 request: 0 collision
  - 100,000 request: 0 collision

برای تأیید نهایی runtime باید migration و `atp-api` روی Supabase خود پروژه deploy شوند و سپس سناریوی end-to-end اجرا شود.


## مرز V69

این release برای تست چنددستگاهی GitHub Pages + Supabase طراحی شده است. برای production نهایی، موارد `DOCS/PRODUCTION_NEXT_FA.md` باید قبل از استفاده عملیاتی بسته شوند.
