# Release verification

Verified on 10 August 2026 with Node.js 22+.

## Passed checks

- ESLint source check: passed
- Production Vinext build: passed
- Cloudflare Worker artifact validation: passed
- Anonymous Owner/Admin API protection: passed
- Owner login, secure session and finance persistence: passed
- Public request, R2 file upload, tracking and customer message persistence: passed
- Staff pending approval, Owner role assignment and restricted Admin data: passed
- Development preview metadata: passed

Automated result: 5 tests passed, 0 failed.

Credential setup was corrected on 10 August 2026 to generate the required
Admin email and password hash as well as the Owner credentials and Team Code.

## Deployment-dependent checks

The production host must still be configured with the documented D1 and R2
bindings, fresh credentials, HTTPS and DNS. Those external settings cannot be
embedded safely in a distributable ZIP. Follow `DEPLOYMENT-GUIDE.md` and perform
its post-deployment checklist after upload.
