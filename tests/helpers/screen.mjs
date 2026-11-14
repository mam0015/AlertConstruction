// What the screens send with a decision: the exact version they are showing. Tests use these to act like a real page that was just
// opened (an old page is simulated by reading the version earlier, before something else changes it).

// A portfolio project as the Owner/Admin editor receives it (and sends it back as `opened`).
export function openedProject(sqlite, id) {
  const row = sqlite.prepare("SELECT code,name,service,stage,progress,contract_value AS contractValue,balance,customer_name AS customerName,suburb,start_date AS startDate,notes,updated_at AS updatedAt FROM projects WHERE id=?").get(id);
  return row ? { id, ...row } : null;
}

// The version of a job's estimate / site visit report / quality inspection, exactly as the board shows it (record_revisions, or the
// record's own timestamp for records saved before revisions existed, or "" when there is no record yet).
function revisionOf(sqlite, kind, caseId, fallback) {
  const saved = (() => {
    try { return sqlite.prepare("SELECT revision FROM record_revisions WHERE kind=? AND case_id=?").get(kind, caseId)?.revision; } catch { return undefined; }
  })();
  if (saved !== undefined) return saved;
  return fallback() ?? "";
}

// The estimate draft the Admin board shows next to "Send estimate".
export function estimateDraft(sqlite, caseId) {
  const row = sqlite.prepare("SELECT created_at AS createdAt,amount_cents AS amountCents,scope FROM workflow_estimates WHERE case_id=?").get(caseId);
  return row ? { revision: estimateVersion(sqlite, caseId), amountCents: row.amountCents, scope: row.scope } : {};
}
export function estimateVersion(sqlite, caseId) {
  return revisionOf(sqlite, "estimate", caseId, () => sqlite.prepare("SELECT created_at AS v FROM workflow_estimates WHERE case_id=?").get(caseId)?.v);
}

// The current site visit report / quality inspection the Admin is reviewing (and the Site Supervisor's form replaces).
export function visitVersion(sqlite, caseId) {
  return revisionOf(sqlite, "site_visit", caseId, () => sqlite.prepare("SELECT submitted_at AS v FROM site_visit_reports WHERE case_id=? ORDER BY id DESC LIMIT 1").get(caseId)?.v);
}
export function inspectionVersion(sqlite, caseId) {
  return revisionOf(sqlite, "quality", caseId, () => sqlite.prepare("SELECT submitted_at AS v FROM quality_inspections WHERE case_id=?").get(caseId)?.v);
}

// The decision key of the quote the customer portal shows (Accept / Decline name it): a new random value on every Send, or the send
// time for quotes sent before keys existed.
export function sentVersion(sqlite, caseId) {
  return revisionOf(sqlite, "sent", caseId, () => sqlite.prepare("SELECT sent_at AS v FROM workflow_estimates WHERE case_id=?").get(caseId)?.v);
}

// The stage and the customer-status draft the Owner/Admin panel shows (what its forms name when saving).
function caseStatus(sqlite, caseId) {
  try { return sqlite.prepare("SELECT status_label AS label, draft_title AS title, draft_detail AS detail FROM case_status WHERE case_id=?").get(caseId) ?? {}; } catch { return {}; }
}

// A workflow action as the board sends it: when the test does not name a version, the one on screen right now is used.
export function asScreen(sqlite, caseId, action, payload = {}) {
  if (action === "set_status_label" && !("openedLabel" in payload)) return { ...payload, openedLabel: caseStatus(sqlite, caseId).label ?? "" };
  if (action === "save_customer_status" && !("openedTitle" in payload)) { const row = caseStatus(sqlite, caseId); return { ...payload, openedTitle: row.title ?? "", openedDetail: row.detail ?? "" }; }
  if (action === "save_estimate" && !("replacing" in payload)) return { ...payload, replacing: estimateVersion(sqlite, caseId) };
  if (action === "submit_site_visit" && !("replacing" in payload)) return { ...payload, replacing: visitVersion(sqlite, caseId) };
  if (action === "submit_quality_inspection" && !("replacing" in payload)) return { ...payload, replacing: inspectionVersion(sqlite, caseId) };
  if (action === "send_estimate" && !("revision" in payload)) return { ...estimateDraft(sqlite, caseId), ...payload };
  if (action === "review_site_visit" && !("revision" in payload)) return { ...payload, revision: visitVersion(sqlite, caseId) };
  if (action === "review_quality_inspection" && !("revision" in payload)) return { ...payload, revision: inspectionVersion(sqlite, caseId) };
  return payload;
}
