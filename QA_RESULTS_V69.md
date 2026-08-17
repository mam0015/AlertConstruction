# ATP V69 QA Results — 16 August 2026

## Completed in this package

### Source/static checks
36/36 checks passed using `DOCS/v69_static_qa.py`.

Checked:
- fake customer progress removed
- fake trade dates removed
- separate customer token
- random reference generation
- collision retry
- revocable staff session
- login rate limit
- customer-access rate limit
- public request spam rate limit
- evidence ownership validation
- published update reject protection
- file access ownership check
- customer published-file gate
- handoff schema
- notification schema
- notification recipient ownership on Read/Actioned
- overdue escalation
- real customer message persistence
- customer activity strips internal Admin notes
- Owner-only project completion publication
- Owner-gated customer schedule publication
- customer token alias continuity between request/project references
- Service Worker API cache exclusion
- RLS on operational/session tables
- safe GitHub remote/demo fallback
- multipart customer request attachments reach the private workflow storage path
- stale Homepage demo/sample-code text is removed by the fail-safe build patch
- direct GitHub Pages route refresh shells are generated after Vite build
- critical Edge Function database mutations surface errors instead of silently succeeding

### Reference generator stress simulation

| Generated | Unique | Collisions |
|---:|---:|---:|
| 100 | 100 | 0 |
| 10,000 | 10,000 | 0 |
| 100,000 | 100,000 | 0 |

The API also retries a database insert up to 5 times if a unique-code collision ever occurs.

### Syntax checks
- `supabase/functions/atp-api/index.ts`: TypeScript parse/type pass apart from expected unresolved Deno/Supabase runtime imports outside Supabase Edge runtime.
- New GitHub/React TypeScript files: syntax pass.

## Not truthfully testable before deployment

These require the user's actual Supabase environment or physical devices:

- real PostgreSQL migration execution on the target project
- Supabase Storage upload/download runtime
- Edge Function environment secrets
- cross-device Customer → Admin → Supervisor flow against deployed API
- iPhone Safari HEIC/camera upload
- weak 4G / network interruption during upload
- PWA Add to Home Screen behaviour on physical iPhone
- external Email/Push webhook provider because no provider credentials were supplied

Run the 20-step end-to-end test in `UPLOAD_ORDER_FA.md` immediately after deployment.


## Scope note

V69 is the GitHub-test hardening release. Email OTP/Magic Link, transactional PostgreSQL RPC/idempotency, external Email/SMS/Push provider wiring and offline write queue are intentionally tracked in `PRODUCTION_NEXT_FA.md`, not falsely marked as already runtime-verified.
