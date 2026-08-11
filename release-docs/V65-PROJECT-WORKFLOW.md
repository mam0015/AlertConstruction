# Alert Tradie Pro V65 — Project Workflow

## What changed

V65 adds one controlled workflow shared by Customer, Admin, Site Supervisor and Owner without removing the existing Operation Hub pages or legacy tool source.

1. Customer submits a request and receives a unique `REQ` reference.
2. Admin starts review and records customer contact.
3. Admin approves intake; the app creates an `ATP` project code and logical project folder.
4. Admin assigns a Site Supervisor and Site Visit date/time.
5. Site Supervisor uploads at least one site photo and submits findings, recommendations and internal notes.
6. Admin approves the Site Visit or returns it with a required note.
7. Admin prepares and sends the estimate.
8. Customer accepts or declines inside Project Tracking.
9. Admin confirms accepted work as an Active Project.
10. Site Supervisor submits two daily updates: internal management copy and customer-safe copy, with at least one progress photo.
11. Admin approves the customer copy first.
12. Owner approves second; only then are the customer text and attached photos published.
13. Every action creates an Owner Activity Event.

## Role boundaries

- Customer sees only the estimate sent to them, their decision, approved milestones and published customer updates/photos.
- Site Supervisor sees assigned projects only. Customer contact details, budget, estimate amount, Finance and profit are removed from the Supervisor response.
- Admin controls intake, assignment, Site Visit review, estimate preparation and first-level update approval. Finance and Owner controls stay restricted.
- Owner sees all workflow events and is the final customer-publication authority.

## Durable storage

- Structured workflow records use the private database binding `DB`.
- Project photos use the private object-storage binding `BUCKET`.
- Migration: `drizzle/0003_breezy_kabuki.sql`.
- Public GitHub Pages uses a browser-local demo adapter so the complete interaction can be previewed without exposing private credentials. It does not synchronize across devices.

## Verification

- Production build passes.
- GitHub Pages build passes.
- Lint passes.
- Eight automated tests pass, including workflow transitions, mandatory photo evidence, Admin-before-Owner publication and Owner audit logging.
