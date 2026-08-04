# Alert Tradie Pro — Multi-Agent Project Instructions

The full spec is in [`MASTER_PROMPT.md`](MASTER_PROMPT.md) at the repo root — read it before doing anything else. This file is the operating manual for how work is split across agents and merged back together.

## Which agent am I?

Run `git branch --show-current`. The branch name tells you your role:

| Branch | Agent | Scope (§ = MASTER_PROMPT.md section) |
|---|---|---|
| `main` | 001 — Main/Integration | Audits, assigns work, reviews, merges. §15 |
| `agent-002-customer-portal` | 002 | Customer Portal §4, Request Job form §5 |
| `agent-003-auth-permissions` | 003 | Auth, Team Codes, roles, sessions §6 |
| `agent-004-project-control-centre` | 004 | Request pipeline / Kanban §8, §9 stages 1-4 |
| `agent-005-projects-files` | 005 | Project workspace, notes, docs, photos §11 |
| `agent-006-site-supervisor` | 006 | Inspections, daily logs, delays §9 stage 5, §12 |
| `agent-007-estimates-quotes` | 007 | Estimating tools, quote records §9 stages 6-7 |
| `agent-008-scheduling-tasks` | 008 | Schedule, tasks, dependencies §9 stage 8 |
| `agent-009-team-workers` | 009 | Team Management, timesheets, worker dashboard |
| `agent-010-messaging-notifications` | 010 | Messaging, notification centre §13 |
| `agent-011-finance-invoices` | 011 | Finance, invoices, GST |
| `agent-012-homepage-design` | 012 | Public homepage, branding, responsive/dark-light §2 |
| `agent-013-database-storage` | 013 | Schema review, RLS, storage policies |
| `agent-014-security-testing` | 014 | Role/permission testing across everything §19 |
| `agent-015-integration-release` | 015 | Helps 001 package/ship §18 |

If you're not on `main`, you are that numbered agent. Introduce yourself as such and work only within your scope below.

## Non-negotiables (apply to every agent)

- This is a live, working app — never rebuild from scratch, never delete an existing feature/route/file/table/row to make something "clean." Hide, don't delete.
- No membership/subscription/paywall features, ever.
- Frontend is vanilla HTML/CSS/JS, no build step, no framework — match the existing style, don't introduce one.
- Backend is Supabase (Postgres/Auth/Storage/RPC). **You cannot apply or test migrations yourself** — there is no CLI/service-role access in this environment. Write migrations, explain them clearly, and tell the user (not another agent) to run them in the Supabase SQL editor.
- Follow the existing migration conventions exactly (see any file in `PRIVATE-SUPABASE/supabase/migrations/` for the pattern): additive only, `security definer` RPCs returning `jsonb`, `revoke all ... grant execute` per function, RLS enabled with no broad direct-table grants where the data is sensitive (route reads/writes through RPCs instead), `ac_audit_log` for history, project ids are `text` not `uuid` (see `ac_projects.id`).
- Test what you build before submitting — you have Bash and the Browser preview tooling. "It should work" is not a submission.

## File ownership

Work only inside your own files. If you need something in a **shared** file, don't edit it — write down exactly what you need in your submission and Agent 001 will make that specific change during integration.

| Owner | Files |
|---|---|
| 002 | `PUBLIC-WEBSITE/customer/**`, `PUBLIC-WEBSITE/request-a-job/**` |
| 003 | `PUBLIC-WEBSITE/login/**`, `PUBLIC-WEBSITE/shared/auth.js`, `PUBLIC-WEBSITE/shared/customer-auth.js` |
| 004 | `PUBLIC-WEBSITE/builder/requests*.{js,css}` (already exists from Phase 1 — extend it into the full Project Control Centre pipeline/Kanban) |
| 005 | New `PUBLIC-WEBSITE/builder/project-workspace*.{js,css}`; extends `PUBLIC-WEBSITE/builder/photo-timeline.js` |
| 006 | New `PUBLIC-WEBSITE/builder/inspections*.{js,css}` |
| 007 | `PUBLIC-WEBSITE/electrical/`, `plumbing/`, `cladding/`, `renovation-budget/`, `plan-ai/`, `quote-analysis/`, `catalogue/` (adding "save to project"); new `PUBLIC-WEBSITE/builder/quotes*.{js,css}` |
| 008 | New `PUBLIC-WEBSITE/builder/schedule*.{js,css}` (the real one — the existing generic calendar under the Schedule sidebar item is a different, older feature, don't confuse the two) |
| 009 | `PUBLIC-WEBSITE/builder/team-management.{js,css}` |
| 010 | `PUBLIC-WEBSITE/shared/team-chat.js`; new notification centre module |
| 011 | `PUBLIC-WEBSITE/builder/finance*.{js,css}`, `PUBLIC-WEBSITE/invoice/**` |
| 012 | `PUBLIC-WEBSITE/index.html`, `PUBLIC-WEBSITE/about/**`, `PUBLIC-WEBSITE/assets/services/` — **do not touch the `#buildScene` 3D slider markup/JS in index.html** |
| 013 | No files of its own — reviews every new migration from other agents for RLS/naming consistency before Agent 001 approves it |
| 014 | No files of its own — tests everyone else's merged work |
| 015 | Works alongside 001 on final integration, not a standing owner of anything mid-project |

**Shared/contested files — nobody edits these directly except 001/015**: `PUBLIC-WEBSITE/builder/index.html` (the sidebar + all view sections live in one file — propose your new sidebar entry and view section, 001 wires it in), `PUBLIC-WEBSITE/builder/app.js`, `PUBLIC-WEBSITE/shared/product-shell.js` / `product-shell-v43.js` / `global-shell-v43.js`, `PUBLIC-WEBSITE/shared/platform-config.js`.

## What's already built (don't redo this)

Phase 1 shipped: customer Request submission (`request-a-job/`), the Customer Portal request list/timeline (`customer/dashboard/`), the Operation Hub Requests module (`builder/requests.js` + `requests-api.js` — this **is** the seed of Agent 004's Project Control Centre), an Owner "receive public requests" toggle, and the `ac_requests` / `ac_projects` / `ac_project_assignments` / `ac_request_status_history` schema in `PRIVATE-SUPABASE/supabase/migrations/20260803_phase1_requests_projects.sql`. Projects created this way auto-sync into the pre-existing `ac_workspaces` JSON-blob project store so Finance/Photo Timeline/Team Management keep working unmodified — see that migration's header comment before changing anything about how projects are stored.

A separate nav/auth pass (see project memory / git log) trimmed the public header and changed Team Sign In to require the Team Code on every login, not just first join — check current `login/index.html` + `shared/auth.js` behavior before assuming the original V52 flow.

## Submitting your work

When you're done, write a short submission summary (work summary, changed/new files, database changes, tests completed, known issues, rollback notes — per MASTER_PROMPT.md §16) and tell the user. Agent 001 reviews and merges your branch into `main` — you don't merge it yourself.
