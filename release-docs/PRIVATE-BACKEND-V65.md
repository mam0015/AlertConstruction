# V65 Private Backend

The private backend must not be copied into the public GitHub Pages output with real secrets.

## Required private services

- `DB`: structured workflow records and complete activity audit.
- `BUCKET`: Site Visit and progress photos.
- Existing secure environment values for Owner/Admin email, password hashes, Team Code hash and session secrets.

## New private records

- `workflow_cases`
- `site_visit_reports`
- `workflow_files`
- `workflow_estimates`
- `project_updates`
- `workflow_events`

The checked-in migration is `drizzle/0003_breezy_kabuki.sql`.

The older Supabase private files are not automatically executed by GitHub Pages and should not be placed in the public root. This V65 full-stack build currently uses the private `DB` and `BUCKET` bindings. A future Supabase deployment must map these six workflow tables, file storage and role policies before replacing this backend; uploading the older private files alone will not create the V65 workflow.
