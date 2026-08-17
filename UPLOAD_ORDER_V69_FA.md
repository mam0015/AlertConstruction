# ترتیب دقیق نصب V69

## A — اول Supabase

### 1. Backup
قبل از migration از database فعلی backup بگیر.

### 2. Migration
در Supabase > SQL Editor فایل زیر را کامل اجرا کن:

`SUPABASE_UPDATE/supabase/migrations/20260816_atp_v69_workflow_hardening.sql`

این migration جداول V69، RLS و private Storage bucket را ایجاد می‌کند.

### 3. Owner password و Team Code
روی کامپیوتر:

```bash
node SUPABASE_UPDATE/generate-v69-secrets.mjs
```

خروجی plain Owner password و Team Code را در Password Manager ذخیره کن. Hashها را برای Supabase secrets استفاده کن.

### 4. Supabase Edge Function secrets
حداقل این موارد لازم‌اند:

```text
ATP_OWNER_EMAIL=<OWNER EMAIL>
ATP_OWNER_PASSWORD_HASH=<GENERATED HASH>
ATP_TEAM_CODE_HASH=<GENERATED HASH>
ATP_ALLOWED_ORIGINS=https://mam0015.github.io,http://localhost:4173,http://127.0.0.1:4173
```

`SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` باید در Edge runtime موجود باشند. Service Role Key را هرگز داخل GitHub frontend نگذار.

اختیاری برای Email/Push provider آینده:

```text
ATP_NOTIFICATION_WEBHOOK_URL=
ATP_NOTIFICATION_WEBHOOK_KEY=
```

### 5. Edge Function
فولدر زیر را به Supabase Edge Functions منتقل/deploy کن:

`SUPABASE_UPDATE/supabase/functions/atp-api/`

و config را طوری نگه دار که:

```toml
[functions.atp-api]
verify_jwt = false
```

این `false` عمدی است چون V69 session خودش را server-side در `atp_sessions` validate می‌کند. Endpoint همچنان public data بدون Customer token یا team session نمی‌دهد.

### 6. Health check
بعد از deploy این مسیر باید `ok:true` برگرداند:

```text
<ATP_API_FUNCTION_URL>?route=health
```

API URL را کپی کن.

---

## B — بعد GitHub

فایل‌های داخل `GITHUB_UPDATE/` را با همان path داخل repo قرار بده/replace کن. این پوشه overlay فایل‌های V69 است و قرار نیست کل repo فعلی را پاک یا replace کنی.

مهم‌ترین‌ها:

```text
.github/workflows/atp-v69-pages.yml
github-pages-spa/package.json
github-pages-spa/tsconfig.json
github-pages-spa/vite.config.ts
github-pages-spa/src/main.tsx
github-pages-spa/src/remote-api.ts
github-pages-spa/scripts/apply-v69-home-patch.mjs
github-pages-spa/scripts/copy-route-shells.mjs
github-pages-spa/src/App.tsx
github-pages-spa/src/NotificationBell.tsx
github-pages-spa/src/notification-bell.module.css
github-pages-spa/src/router.tsx
github-pages-spa/src/track/ProjectStatusPage.tsx
github-pages-spa/public/sw.js
github-pages-spa/public/atp-config.json
app/workflow/CustomerWorkflowPanel.tsx
app/workflow/customer-workflow.module.css
app/track/[code]/page.tsx
```

### 7. `atp-config.json`
قبل از commit نهایی:

```json
{
  "mode": "remote",
  "apiBase": "https://YOUR_PROJECT.supabase.co/functions/v1/atp-api",
  "anonKey": "",
  "build": "V69-2026-08-16"
}
```

`anonKey` برای custom V69 API لازم نیست و می‌تواند خالی بماند.


### Customer Reference در V69
Reference تصادفی `REQ-...` تاریخ انقضا ندارد و شناسه دائمی customer tracking است. Token دسترسی مرورگر 30 روزه است؛ بعد از انقضا Customer با همان Reference + email دوباره token می‌گیرد. `ATP-...` شناسه داخلی پروژه است و برای customer access پذیرفته نمی‌شود.

### Homepage compatibility patch
برای اینکه ظاهر Homepage فعلی دست‌نخورده بماند، فایل `apply-v69-home-patch.mjs` در build همان `Home.tsx` فعلی را فقط در نقاط لازم اصلاح می‌کند: demo text، sample tracking code، request error و multipart file upload. اگر ساختار Home با نسخه فعلی فرق کرده باشد script عمداً build را fail می‌کند تا patch اشتباه روی UI اعمال نشود.

### نکته Build گیت‌هاب
فایل‌های `assets/main-*.js` را دستی نساز یا کپی نکن. Workflow جدید سورس `github-pages-spa/` را با Vite build می‌کند و خودش artifact نهایی Pages را می‌سازد. این کار مشکل نسخه‌های قدیمی و hashهای asset را کم می‌کند.

### 8. GitHub Pages
در Repository > Settings > Pages، Source را روی **GitHub Actions** قرار بده.

سپس commit/push کن. Workflow `ATP V69 GitHub Pages` باید:

1. dependencies install
2. TypeScript typecheck
3. Vite build
4. Pages artifact upload
5. Deploy

را انجام دهد.

---

## C — اولین حساب‌ها

### Owner
Homepage > Team Sign In

- Email = `ATP_OWNER_EMAIL`
- Password = plain Owner password generated earlier
- Team Code = خالی

### Admin اولیه
با email/password دلخواه و Team Code وارد شود. اولین بار Pending می‌شود.

Owner > New Staff → role = Admin → Approve.

Admin دوباره sign in کند.

### Site Supervisor
همین جریان را انجام بده ولی Owner role را `Site Supervisor` قرار دهد.

---

## D — End-to-End test الزامی

1. Customer یک Request واقعی تستی ثبت کند.
2. Customer code را بگیرد و portal باز شود.
3. Admin notification `New customer request` را ببیند.
4. Admin review را Start کند.
5. Customer را Contacted ثبت کند.
6. Intake approve شود و Project Code ساخته شود.
7. Site Supervisor assign شود.
8. Supervisor در دستگاه دیگر login کند و فقط پروژه assigned خودش را ببیند.
9. Supervisor عکس واقعی upload کند و Site Report submit کند.
10. Admin report را approve کند.
11. Estimate ساخته و send شود.
12. Customer Estimate را accept کند.
13. Admin project را activate کند.
14. Supervisor progress photo/update ثبت کند.
15. Admin approve کند.
16. Owner approve کند.
17. فقط حالا Customer متن و عکس publish‌شده را ببیند.
18. Customer message بفرستد؛ Owner/Admin notification بگیرند.
19. Owner یک staff را Revoke کند؛ همان session روی دستگاه staff باید در request بعدی قطع شود.
20. یک file ID از پروژه دیگر امتحان شود؛ باید 403 بدهد.

تا این 20 مرحله پاس نشده، V69 را production-ready اعلام نکن.
