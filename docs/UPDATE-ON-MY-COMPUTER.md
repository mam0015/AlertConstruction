# Update and run Alert Tradie Pro on your own computer

Nobody (including Claude) can reach into your computer from GitHub — you pull the new version yourself. It takes four commands.
You need **Node.js 22.13 or newer** (`node -v` shows it; get it from <https://nodejs.org>).

## 1. Get the newest files

**If you cloned the repository with git** (a folder with a hidden `.git` inside):

```bash
cd path/to/AlertConstruction
git fetch origin
git checkout claude/quirky-archimedes-j36ll5     # use `main` once this branch has been merged
git pull
```

**If you only have a downloaded folder** (no `.git`): on GitHub open the branch, press **Code → Download ZIP**, unzip it
into a *new* folder, and copy your private `.dev.vars` file (if you made one) from the old folder into the new one.

## 2. Install and check

```bash
npm ci          # installs exactly the versions in package-lock.json
npm test        # builds the app and runs every check — the summary at the end should say "fail 0"
```

## 3. First time only — your private settings

```bash
npm run setup:credentials
```

Press Enter to choose `all`, then type the Owner email, a display name and a password of at least 10 characters. It prints lines like
`OWNER_EMAIL=…`, `OWNER_PASSWORD_HASH=…`, `OWNER_SESSION_SECRET=…`. Copy **just those `NAME=value` lines** into a new text file named
**`.dev.vars`** in the project folder. This file stays on your computer — it is in `.gitignore` and must never be uploaded.
(The company Team Code is created automatically on first start; the Owner reads it in Owner → Settings.)

## 4. Run the app

```bash
npm run preview:local
```

Open <http://localhost:8787>, choose **Team Sign In**, enter the Owner email and password (leave Team Code empty).
In the Owner app the new **Jarvis** item is in the menu (and the phone bottom bar).

The data here is a local test database (kept in `.wrangler/state`); it is separate from your live company data.
Delete that folder to start fresh.

### Why not `npm run dev`?

The repository root also holds the GitHub Pages copy of the site (`index.html`, `owner/index.html`, …). The dev server serves
those files before the app's own pages, so `/owner` and friends show the wrong thing. `preview:local` runs the built Worker
the way Cloudflare does and is not affected. (`docs/REPO_MAP.md` explains the permanent fix.)

## Updating the live website

* **Cloudflare (the real app, with database and Jarvis):** follow `release-docs/DEPLOY-GITHUB-TO-CLOUDFLARE-FA.md`. Jarvis needs the
  database, so it only works on the Cloudflare app — not on the GitHub Pages copy.
* **GitHub Pages (the static copy):** unchanged by this work.

To let Jarvis read company email, follow "Connect company email" in `jarvis/README.md`; it needs three Cloudflare secrets.

---

## فارسی (خلاصه)

۱. فایل‌های جدید را بگیرید: اگر `git` دارید `git pull` (روی شاخهٔ `claude/quirky-archimedes-j36ll5` تا وقتی با `main` ادغام شود)؛ اگر فقط پوشه دارید، از GitHub گزینهٔ **Download ZIP** را بزنید و فایل `.dev.vars` قدیمی را به پوشهٔ جدید کپی کنید.
۲. `npm ci` سپس `npm test` (آخرش باید `fail 0` باشد).
۳. فقط بار اول: `npm run setup:credentials` — خطوطی که چاپ می‌کند را در فایلی به نام `.dev.vars` بگذارید (هرگز آپلودش نکنید).
۴. `npm run preview:local` و بعد <http://localhost:8787> را باز کنید؛ با ایمیل و رمز Owner وارد شوید (Team Code خالی). منوی **Jarvis** داخل برنامهٔ Owner است.

به جای `npm run dev` از `npm run preview:local` استفاده کنید؛ چون فایل‌های HTML گیت‌هاب‌پیجز در ریشهٔ پروژه جلوی صفحه‌های اصلی برنامه را می‌گیرند.
