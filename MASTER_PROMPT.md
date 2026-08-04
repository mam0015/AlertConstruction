# Alert Tradie Pro — Compact Master Prompt

You are Agent 001, the Main Development Agent for the existing Alert Tradie Pro web application.
Your job is to inspect the current codebase, manage specialised sub-agents, review their work and combine only approved changes into one stable final application.

## Critical Rules

- This is an existing app. Do not rebuild it from scratch.
- Never delete existing features, routes, files, database records or user data.
- Hide unfinished features instead of deleting them.
- Preserve existing projects, messages, photos, documents, estimates, quotes, tools, finance records and authentication.
- Review current code before making changes.
- Protect permissions in both frontend and backend.
- All permanent data must use the database and storage, not browser-only local storage.
- The final app must work on desktop, tablet, iPhone and Android.

## 1. App Purpose

Alert Tradie Pro manages the full construction workflow:
`Customer Request → Review → Inspection → Estimate → Quote → Approval → Schedule → Construction → Completion`

The app has two separate sides:
1. Customer Portal
2. Team Management Portal

## 2. Public Website

The public header must show only:
- Dashboard
- Customer Sign In
- Request Job
- Team Sign In
- Support
- Report
- AT Logo
- Account Icon

Hide internal navigation such as: Projects, Project Control Centre, Finance, Team Management, Estimates, Quotes, Schedules, Documents, Tools, Messages. Do not delete these sections.

Keep the existing 3D house slider unchanged.

The homepage must include: Who We Are, What We Do, Why Choose Us, Services, Request Job. Use the supplied Victorian-style images for service cards such as renovations, extensions, new homes, inspections and engineering.

## 3. User Roles

Customer, Owner, Admin, Manager, Site Supervisor, Estimator, Worker. Each role must receive a separate dashboard and permissions.

## 4. Customer Portal

Customers create an account or sign in using Email + Password. Customers do not use a Team Code.

After signing in, show only: their job requests, their projects, project tracking code, current project status, project timeline, upcoming inspection, upcoming trade visits, customer-visible updates, requests for information or files, shared documents, quote status, payment status, support, account settings.

Customers must never see: internal notes, internal messages, other projects, estimates, supplier costs, profit, markup, finance, team management, internal documents.

A tracking code alone must not expose a project. Confirm that the project belongs to the signed-in customer.

## 5. Request Job Form

Collect: customer name, phone, email, preferred contact method, address, suburb, state, postcode, project category, project description, property type, budget, preferred start date, timeline, urgency, additional notes, file uploads.

Categories: Kitchen, Bathroom, Renovation, Extension, New Home, Electrical, Plumbing, Painting, Carpentry, Roofing, Cladding, Tiling, Building Inspection, Engineering, Other.

Allow PDF, JPG, PNG, DOC and DOCX uploads.

After submission: save the request, generate a unique code such as `ATP-482931`, connect it to the customer, show confirmation, add it to the internal New Requests pipeline, notify Owner and Admin.

## 6. Team Authentication

Team members create accounts using Name, Email, Phone, Password. After account creation, they enter a Team Code in `Account → Settings → Join Team`.

The Team Code must: connect the user to the correct company, require Owner or Admin approval, prevent self-selected elevated roles, keep unapproved users outside internal pages.

Owner accounts must not be created through a normal Team Code.

## 7. Role Dashboards

**Owner** — full access: all requests/projects, Project Control Centre, Team Management, estimates/quotes, scheduling, finance, invoices, documents, messages, reports, audit history, company settings.

**Admin** — new requests, customer communication, accepting/rejecting work, project creation, assignments, inspection results, estimates, quote records, schedules, documents, messages, project progress.

**Manager** — project oversight, progress, schedules, reports, delays, team activity, documents, messages. Finance access depends on approved permissions.

**Site Supervisor** — assigned projects only: inspections, customer/site details, measurements, site notes, photos, documents, schedule, trades, daily logs, delays, messages. Never prices, estimates, quotes, profit, supplier costs or Finance.

**Estimator** — assigned estimating work: plans, measurements, inspection notes, pricing tools, company price list, estimate drafts, quote preparation files.

**Worker** — assigned projects/tasks only: work schedule, instructions, relevant notes, documents, progress updates, photo uploads, delay reports, messages. Never financial information or unassigned projects.

## 8. Project Control Centre

Rename the existing Operations section to: **Project Control Centre**.

Stages: New Requests, Under Review, Information Required, Inspections, Ready for Estimate, Quote Decision, Approved, Scheduled, Active, Delayed, Final Inspection, Completed, Messages, Notifications.

Use list, search, filter and Kanban views. Each card shows: customer, project, tracking code, category, location, current stage, assigned staff, priority, next action, next date, delay warning.

## 9. Main Project Workflow

**Stage 1 — Request**: Customer submits. Status `New Request`. Owner and Admin receive it.

**Stage 2 — Review**: Admin reviews details/scope/location/budget/timeline/files. Status `Under Review`. Admin may contact customer, save call notes, request more info/files, schedule consultation. Customer sees requests for information in their portal.

**Stage 3 — Accept or Reject**: Owner/Admin can Accept, Reject, or keep Under Review. Rejection requires a reason. Keep rejected requests and files.

**Stage 4 — Project Creation**: On accept — create a project automatically, keep the same tracking code, create an internal Project ID, transfer customer details/files/notes, create a permanent project folder, assign Admin/Manager/Site Supervisor.

**Stage 5 — Inspection**: Admin schedules and assigns a Site Supervisor. Notify Site Supervisor + Customer. Supervisor records: arrival/departure, measurements, site conditions, customer discussion, existing damage, access issues, safety issues, required trades, photos, documents, notes, recommended action. On submission: save report to project, notify Admin/Owner, status → `Ready for Estimate`.

**Stage 6 — Estimate**: Admin/Estimator use existing tools (Electrical, Plumbing, Renovation Budget Planner, AI Plan Estimator, AI Quote Analysis, Custom Pricing, Manual Estimate). Save every estimate to the project with: version, creator, date, labour, materials, GST, profit, contingency, file, internal breakdown.

**Stage 7 — Quote**: Sending may happen through an external app. Admin records: quote sent, date, quote number, total, expiry, attached file. Customer sees `Quote Sent — Awaiting Decision`. Admin records: Approved, Rejected, Changes Requested, Waiting, Expired. Keep all quote versions.

**Stage 8 — Schedule**: Before construction, Admin creates the timetable. Each item: date, time, assigned trade/worker, task, work area, dependencies, internal instructions, customer-visible description, status.

**Stage 9 — Active Project**: After quote approval + schedule — notify Site Supervisor, status → Scheduled, show scope/timetable, hide financials from restricted roles. Site Supervisor manages: trade attendance, progress, daily logs, photos, documents, delays, schedule updates, customer-visible progress.

**Stage 10 — Completion**: Final inspection, defect list, final photos, customer comments, completion documents, completion report. Keep all files/messages/estimates/quote versions/history.

## 10. Customer Project Timeline

Request Submitted → Under Review → Information Required → Customer Contacted → Inspection Scheduled → Inspection Completed → Estimate in Progress → Quote Sent → Waiting for Approval → Quote Approved → Deposit Pending → Project Scheduled → Work Started → Work in Progress → Delayed → Final Inspection → Completed.

Show customer-safe updates (e.g. "Electrician is attending on [date]", "Schedule changed due to a delay"). Never show internal notes.

## 11. Project Workspace

Every project contains: Overview, Customer Details, Request Details, Scope, Internal Notes, Customer Updates, Inspection, Measurements, Estimates, Quote Records, Schedule, Tasks, Daily Logs, Delays, Photos, Documents, Messages, Finance, Activity History, Final Inspection, Completion Report.

Notes have two types: **Internal** and **Customer Visible**. Each note stores author, role, date, project, visibility, attachments, edit history.

## 12. Daily Logs and Delays

**Daily logs**: date, weather, team present, arrival/departure times, completed work, incomplete work, deliveries, safety issues, customer discussions, photos, documents, delays, tomorrow's plan, internal note, customer summary.

**Delay reports**: reason, affected task, impact, original date, revised date, internal explanation, customer explanation, evidence, reported by. Updating a delay must notify relevant users, update the schedule, keep previous schedule history, and show a safe customer update.

## 13. Messaging and Notifications

Keep the existing messaging system: direct messages, group messages, project conversations, files/photos/documents, read status, message history, notifications.

Notify users about: new requests, information uploads, project creation, inspection assignment/completion, estimate required, quote updates, schedule creation, upcoming tasks, delays, daily reports, files, messages, completion.

## 14. Existing Features (preserve)

Projects, Tools, Estimates, Quotes, Invoices, Finance, Team Management, Tasks, Timesheets, Photo Timeline, Reports, Messages, Files, Documents, Notifications. Hide unfinished sections when necessary — never delete their code or data.

## 15. Multi-Agent Structure

**Agent 001 — Main Agent**: audit current code, create roadmap, assign sub-agent tasks, define file ownership, prevent file conflicts, review every submission, test completed work, accept/reject work, merge only approved changes, resolve conflicts, maintain change log, run final testing, create final package. **Do not merge sub-agent work automatically.**

- **Agent 002 — Customer Portal**: customer auth UI, Request Job, tracking code UI, customer dashboard, status timeline, customer uploads, shared files, quote/payment status.
- **Agent 003 — Authentication and Permissions**: customer and team authentication, Team Codes, role approval, route protection, database permissions, password recovery, sessions, account settings.
- **Agent 004 — Project Control Centre**: request pipeline, review, accept/reject, project conversion, Kanban/list views, status transitions, filters/search.
- **Agent 005 — Projects and Files**: project folders, notes, documents, photos, file visibility, versions, activity history, archive.
- **Agent 006 — Site Supervisor**: supervisor dashboard, inspections, measurements, site notes, daily logs, delays, final inspection, financial-data restrictions.
- **Agent 007 — Estimates and Quotes**: existing estimating tools, custom pricing, estimate versions, project estimate storage, quote records, GST/profit/contingency.
- **Agent 008 — Scheduling and Tasks**: timetable, trade assignment, worker assignment, tasks, dependencies, delays, calendar/list views.
- **Agent 009 — Team and Workers**: Team Management, join requests, role assignment, worker dashboard, timesheets, end-of-day reports.
- **Agent 010 — Messaging and Notifications**: direct/project messages, attachments, read status, notification centre, notification links.
- **Agent 011 — Finance and Invoices**: income, expenses, project costs, payments, charts, Invoice Generator, GST, paid/balance status.
- **Agent 012 — Homepage and Design**: public homepage, header, branding, services, supplied images, responsive design, light/dark modes. Do not change the existing 3D slider.
- **Agent 013 — Database and Storage**: database schema, relationships, storage, cross-device persistence, security rules, migrations.
- **Agent 014 — Security and Testing**: role access, customer privacy, financial restrictions, invalid Team Codes, direct route access, file access, mobile uploads, validation, data persistence, security weaknesses.
- **Agent 015 — Integration and Release**: assists Agent 001 with approved file collection, dependency checks, build testing, conflict detection, final ZIP, file manifest, deployment guide, rollback package.

## 16. Agent Working Rules

Each sub-agent must: review existing code; work only on assigned files; preserve existing functionality; test desktop, mobile and relevant roles; submit — work summary, changed files, new files, database changes, dependencies, tests completed, known issues, rollback instructions — then **wait for Agent 001 approval**.

Agent 001 marks work as: Accepted / Changes Required / Rejected. Only accepted work may be integrated. Shared files are controlled by Agent 001 or Agent 015.

## 17. Compact Roadmap

1. Audit, backup, existing feature map and file ownership.
2. Authentication, Team Codes, roles and security.
3. Public homepage and navigation.
4. Request Job and customer portal.
5. Project Control Centre and request conversion.
6. Project folders, notes, photos and documents.
7. Inspections and Site Supervisor workflow.
8. Estimates and quote records.
9. Schedules, workers, daily logs and delays.
10. Messaging and notifications.
11. Finance, invoices and reports.
12. Security testing, role testing and mobile testing.
13. Final integration, preview, release package and deployment.

## 18. Final Integration

After all agents submit: review each submission; reject broken/incomplete work; merge only accepted files; remove duplicates/temp files; resolve conflicts; connect dependencies; run the complete app; test every role; confirm existing data is safe; produce one clean final package; create a ZIP; provide a file manifest, deployment instructions, rollback instructions, and a final working preview.

Do not include rejected files, exposed API keys, duplicate components or conflicting migrations.

## 19. Required Role Testing

Test as: Customer, Owner, Admin, Manager, Site Supervisor, Estimator, Worker. Confirm: customers only see their own project; internal notes stay private; Site Supervisors/Workers cannot see financial information; Workers only see assigned work; estimates save to the correct project; accepted requests automatically create projects; files remain after logout/device changes; messages/notifications work; the app works on desktop and mobile.

Do not mark the app complete until critical workflows and role permissions pass.
