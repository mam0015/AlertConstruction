AC PLAN ESTIMATOR — FAST SCAN + SMART AI UPDATE

BACKEND HOTFIX

The included analyse-plan/index.ts removes the image-only detail option from
PDF input_file payloads. Redeploy this corrected file if an earlier deployment
returned "The file could not be analysed reliably" for PDF quotes or plans.

WHAT THIS UPDATE ADDS

1. One shared two-mode selector for all currently active trades:
   - Electrical
   - Plumbing
   - Cladding

2. Fast Scan
   - Runs in the user's browser.
   - Does not call OpenAI or Supabase.
   - Reads searchable PDF text and uses on-device OCR for images/scanned PDFs.
   - Searches schedules, legends, labels and repeated tags, then maps matches to
     the existing trade calculator catalogue.
   - Results are deliberately marked as medium/low confidence and are editable.

3. Smart AI
   - Uses the existing Supabase analyse-plan Edge Function.
   - Reads symbols, legends, notes and plan context more deeply.
   - Requires the Supabase function and OPENAI_API_KEY to be configured.

4. Shared review workflow
   - Both methods return the same editable result card.
   - Builder and customer totals update when quantities are edited.
   - The Open Calculator button transfers quantities into the existing
     Electrical, Plumbing or Cladding calculator.

5. Hidden future Carpentry module
   - Carpentry scaffolding exists in plan-ai/app.js, plan-ai/local-analyser.js
     and the Supabase function.
   - It is disabled and has no visible button.
   - It cannot be selected or called until a verified Carpentry catalogue and
     detection rules are added later.

UPLOAD TO GITHUB

Copy the plan-ai folder in this update over the existing plan-ai folder in the
root of the Alert-Construction repository. Keep all other existing folders.

Required final paths:

plan-ai/index.html
plan-ai/styles.css
plan-ai/app.js
plan-ai/config.js
plan-ai/local-analyser.js
sw.js

The Fast Scan loads pinned PDF.js and Tesseract.js browser libraries from
jsDelivr. The first use therefore needs an internet connection.

Replace the root sw.js with the included version so existing installed/PWA
copies refresh to the new Plan Estimator code and cache local-analyser.js.

SMART AI BACKEND

Deploy this file as the Supabase Edge Function named exactly analyse-plan:

supabase/functions/analyse-plan/index.ts

Keep OPENAI_API_KEY only in Supabase Edge Function Secrets. Never place it in
GitHub, config.js or HTML. If the function is not deployed, Smart AI will return
AI service error (404), while Fast Scan can still operate.

IMPORTANT ESTIMATING LIMITS

- Fast Scan cannot reliably interpret every graphical symbol or unusual legend.
- Electrical replacement work is only classified when the plan explicitly says
  existing, replacement or similar.
- Plumbing room names do not prove rough-in or fit-off scope.
- Cladding quantities require usable elevations, dimensions or schedules.
- Every result must be checked by the Builder and relevant licensed trade.

This is an update package. It does not replace or repair missing Quote Analysis,
Projects, calculator, shared, checklist or asset folders.
