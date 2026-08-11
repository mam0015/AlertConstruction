# Alert Tradie Pro V64 — architecture and roadmap

## Product direction

Alert Tradie Pro is now a customer request, project tracking and project management platform. The previous estimating and builder tools remain part of the product, but they are private role-based capabilities rather than public Homepage features.

## Package structure

### `GITHUB-PAGES-UPLOAD`

The exact static site that GitHub Pages can publish. It contains the redesigned Homepage and Operation Hub-style Owner, Admin, Site Supervisor, customer tracking and pending staff pages. Demo records are stored only in the current browser.

### `FULL-STACK-SOURCE`

The secure application source. It contains server-side Owner/Admin authentication, API routes, database schema, staff approval logic and the full-stack versions of the new pages.

### `PRIVATE-SUPABASE`

The preserved V60 database migrations, functions, verification tests and deployment documentation. This folder must never be placed in a public GitHub Pages upload.

## Preserved foundation

V60 is the protected baseline for all earlier features. The new V64 UI is applied above that baseline. Old tools are retained and hidden, not removed or rebuilt.

## Role structure

| Role | Visible workspace | Restricted data |
|---|---|---|
| Owner | Executive overview, projects, Finance, schedule, people, New Staff, EOD approvals, messages, permissions | None inside Owner authority |
| Admin | Projects, new project/job requests, schedule, Site Supervisor direction, team messages | Finance, profit, contract balances, Team Management, Owner controls |
| Site Supervisor | Assigned projects, schedule, checklist, site updates, EOD report, team messages | Finance, quotes, profit, markup, supplier costs, Owner/Admin controls |
| Worker / Trade | Future My Day page, assigned tasks, time, photos and EOD | All management and financial information |
| Customer | Own request/project status, approved schedule, approved files and messages | Every internal project, tool and management record |

## Staff approval flow

1. Staff enters email, password and Team Code.
2. The account becomes `Pending`.
3. Owner receives a `New Staff` notification.
4. Owner chooses Admin, Manager, Site Supervisor, Worker or a trade role such as Electrician, Plumber, Cleaner, Carpenter, Plasterer or Tiler.
5. Owner approves or rejects the request.
6. Approved staff opens only the workspace assigned to that role.

This flow is implemented in the Full-Stack source. The GitHub Pages version shows the same visual structure but cannot secure it without a server.

## Deployment roadmap

### Phase 1 — correct GitHub demonstration

- Publish `GITHUB-PAGES-UPLOAD` from `main /(root)`.
- Confirm the new Homepage and all four visible portals.
- Use `force-update.html` once to remove old PWA caches.
- Keep legacy tools hidden from public navigation.

### Phase 2 — secure production application

- Deploy `FULL-STACK-SOURCE` to a full-stack host.
- Set Owner credentials as server environment variables; never place them in JavaScript or GitHub Pages.
- Connect the database and storage.
- Enable request creation, file uploads, customer tracking and staff approval.
- Test every role and direct URL server-side.

### Phase 3 — reconnect preserved tools by role

- Owner: Finance, Company Pricing, Invoice, reports and all management tools.
- Admin: approved operational tools only.
- Estimator: estimate, quote analysis, price catalogue and AI plan tools.
- Site Supervisor: checklist, assigned projects, schedule, photos and reports.
- Worker/trade: My Day, assigned tasks, time and EOD only.

### Phase 4 — production verification

- Test request-to-project conversion.
- Test customer-visible versus internal updates.
- Test password reset, account lockout and staff approval.
- Test iPhone upload, refresh, new device sign-in and cross-device persistence.
- Confirm no financial response is sent to Admin, Site Supervisor, Worker or Customer browsers.
- Confirm every hidden tool is also blocked by server permissions.
