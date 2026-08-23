import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }), code: text("code").notNull().unique(), name: text("name").notNull(), service: text("service").notNull(), stage: text("stage").notNull(), progress: integer("progress").notNull().default(0), contractValue: integer("contract_value").notNull().default(0), balance: integer("balance").notNull().default(0), customerName: text("customer_name").notNull().default(""), suburb: text("suburb").notNull().default(""), startDate: text("start_date").notNull().default(""), notes: text("notes").notNull().default(""), updatedAt: text("updated_at").notNull(),
});
export const financeEntries = sqliteTable("finance_entries", { id: integer("id").primaryKey({ autoIncrement: true }), type: text("type").notNull(), category: text("category").notNull(), projectCode: text("project_code").notNull().default("Business / General"), amount: integer("amount").notNull(), entryDate: text("entry_date").notNull(), note: text("note").notNull().default(""), createdAt: text("created_at").notNull() });
export const scheduleEvents = sqliteTable("schedule_events", { id: integer("id").primaryKey({ autoIncrement: true }), eventDate: text("event_date").notNull(), startTime: text("start_time").notNull(), title: text("title").notNull(), assignee: text("assignee").notNull(), projectCode: text("project_code").notNull().default("Business / General"), tone: text("tone").notNull().default("gold"), notes: text("notes").notNull().default("") });
export const eodReports = sqliteTable("eod_reports", { id: integer("id").primaryKey({ autoIncrement: true }), person: text("person").notNull(), role: text("role").notNull(), projectCode: text("project_code").notNull(), summary: text("summary").notNull(), submittedAt: text("submitted_at").notNull(), status: text("status").notNull().default("Pending"), ownerNote: text("owner_note").notNull().default("") });
export const teamMessages = sqliteTable("team_messages", { id: integer("id").primaryKey({ autoIncrement: true }), sender: text("sender").notNull(), recipient: text("recipient").notNull(), body: text("body").notNull(), sentAt: text("sent_at").notNull() });
export const rolePermissions = sqliteTable("role_permissions", { role: text("role").primaryKey(), projects: integer("projects", { mode: "boolean" }).notNull().default(true), schedule: integer("schedule", { mode: "boolean" }).notNull().default(true), finance: integer("finance", { mode: "boolean" }).notNull().default(false), financeExport: integer("finance_export", { mode: "boolean" }).notNull().default(false), updatedAt: text("updated_at").notNull() });
export const loginAttempts = sqliteTable("login_attempts", { key: text("key").primaryKey(), failedCount: integer("failed_count").notNull().default(0), lockedUntil: integer("locked_until").notNull().default(0), updatedAt: integer("updated_at").notNull() });
export const jobRequests = sqliteTable("job_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  requestType: text("request_type").notNull(),
  customerName: text("customer_name").notNull(),
  contact: text("contact").notNull().default(""),
  service: text("service").notNull(),
  suburb: text("suburb").notNull().default(""),
  submittedAt: text("submitted_at").notNull(),
  status: text("status").notNull().default("New"),
  priority: text("priority").notNull().default("Normal"),
  summary: text("summary").notNull().default(""),
  assignedTo: text("assigned_to").notNull().default("Unassigned"),
  updatedAt: text("updated_at").notNull(),
});

export const staffAccessRequests = sqliteTable("staff_access_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("Pending"),
  role: text("role").notNull().default("Unassigned"),
  tradeTitle: text("trade_title").notNull().default(""),
  requestedAt: text("requested_at").notNull(),
  reviewedAt: text("reviewed_at").notNull().default(""),
  lastSeenAt: text("last_seen_at").notNull(),
});

export const ownerAccounts = sqliteTable("owner_accounts", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull().default("Owner"),
  updatedAt: text("updated_at").notNull(),
});

export const teamAccessSettings = sqliteTable("team_access_settings", {
  id: integer("id").primaryKey(),
  teamCode: text("team_code").notNull(),
  teamCodeHash: text("team_code_hash").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workflowCases = sqliteTable("workflow_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestCode: text("request_code").notNull().unique(),
  projectCode: text("project_code").notNull().default(""),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  service: text("service").notNull(),
  suburb: text("suburb").notNull().default(""),
  description: text("description").notNull().default(""),
  timeframe: text("timeframe").notNull().default(""),
  budget: text("budget").notNull().default(""),
  stage: text("stage").notNull().default("request_submitted"),
  assignedSupervisorEmail: text("assigned_supervisor_email").notNull().default(""),
  assignedSupervisorName: text("assigned_supervisor_name").notNull().default(""),
  siteVisitAt: text("site_visit_at").notNull().default(""),
  projectFolder: text("project_folder").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const customerContactIndex = sqliteTable("customer_contact_index", {
  caseId: integer("case_id").notNull(),
  kind: text("kind").notNull(),
  contactHash: text("contact_hash").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.caseId, table.kind] }),
  index("customer_contact_lookup_idx").on(table.kind, table.contactHash),
]);

export const siteVisitReports = sqliteTable("site_visit_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  supervisorEmail: text("supervisor_email").notNull(),
  visitDate: text("visit_date").notNull(),
  summary: text("summary").notNull(),
  findings: text("findings").notNull(),
  recommendations: text("recommendations").notNull(),
  internalNotes: text("internal_notes").notNull().default(""),
  status: text("status").notNull().default("submitted"),
  adminNote: text("admin_note").notNull().default(""),
  submittedAt: text("submitted_at").notNull(),
  reviewedAt: text("reviewed_at").notNull().default(""),
});

export const workflowFiles = sqliteTable("workflow_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  updateId: integer("update_id").notNull().default(0),
  category: text("category").notNull(),
  objectKey: text("object_key").notNull().unique(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  visibility: text("visibility").notNull().default("internal"),
  uploadedAt: text("uploaded_at").notNull(),
  publishedAt: text("published_at").notNull().default(""),
});

export const workflowEstimates = sqliteTable("workflow_estimates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  scope: text("scope").notNull(),
  terms: text("terms").notNull().default(""),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  sentAt: text("sent_at").notNull().default(""),
  customerDecidedAt: text("customer_decided_at").notNull().default(""),
  confirmedAt: text("confirmed_at").notNull().default(""),
});

export const projectUpdates = sqliteTable("project_updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  workDate: text("work_date").notNull(),
  supervisorEmail: text("supervisor_email").notNull(),
  internalUpdate: text("internal_update").notNull(),
  customerUpdate: text("customer_update").notNull(),
  status: text("status").notNull().default("pending_admin"),
  adminNote: text("admin_note").notNull().default(""),
  ownerNote: text("owner_note").notNull().default(""),
  createdAt: text("created_at").notNull(),
  adminReviewedAt: text("admin_reviewed_at").notNull().default(""),
  ownerReviewedAt: text("owner_reviewed_at").notNull().default(""),
  publishedAt: text("published_at").notNull().default(""),
});

export const workflowEvents = sqliteTable("workflow_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  actorRole: text("actor_role").notNull(),
  actorEmail: text("actor_email").notNull().default(""),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  audience: text("audience").notNull().default("internal"),
  createdAt: text("created_at").notNull(),
});

export const workerProjectAssignments = sqliteTable("worker_project_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  workerEmail: text("worker_email").notNull(),
  tradeTitle: text("trade_title").notNull().default("Worker"),
  status: text("status").notNull().default("active"),
  assignedBy: text("assigned_by").notNull(),
  assignedAt: text("assigned_at").notNull(),
  removedAt: text("removed_at").notNull().default(""),
}, (table) => [
  uniqueIndex("worker_project_assignments_case_email_unique").on(table.caseId, table.workerEmail),
  index("worker_project_assignments_email_idx").on(table.workerEmail, table.status),
]);

export const workerTasks = sqliteTable("worker_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  workerEmail: text("worker_email").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull().default(""),
  status: text("status").notNull().default("assigned"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  completedAt: text("completed_at").notNull().default(""),
}, (table) => [index("worker_tasks_email_idx").on(table.workerEmail, table.caseId, table.status)]);

export const workerFileAccess = sqliteTable("worker_file_access", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileId: integer("file_id").notNull(),
  caseId: integer("case_id").notNull(),
  workerEmail: text("worker_email").notNull(),
  grantedBy: text("granted_by").notNull(),
  grantedAt: text("granted_at").notNull(),
}, (table) => [
  uniqueIndex("worker_file_access_file_email_unique").on(table.fileId, table.workerEmail),
  index("worker_file_access_email_idx").on(table.workerEmail, table.caseId),
]);

export const workerAttendance = sqliteTable("worker_attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workerEmail: text("worker_email").notNull(),
  workDate: text("work_date").notNull(),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
}, (table) => [uniqueIndex("worker_attendance_email_date_unique").on(table.workerEmail, table.workDate)]);

export const workerReports = sqliteTable("worker_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  workerEmail: text("worker_email").notNull(),
  workDate: text("work_date").notNull(),
  completedWork: text("completed_work").notNull(),
  nextStep: text("next_step").notNull(),
  issuesDelays: text("issues_delays").notNull().default(""),
  status: text("status").notNull().default("submitted"),
  submittedAt: text("submitted_at").notNull(),
  reviewedBy: text("reviewed_by").notNull().default(""),
  reviewedAt: text("reviewed_at").notNull().default(""),
  reviewNote: text("review_note").notNull().default(""),
}, (table) => [
  uniqueIndex("worker_reports_case_email_date_unique").on(table.caseId, table.workerEmail, table.workDate),
  index("worker_reports_email_idx").on(table.workerEmail, table.workDate),
]);

export const teamTasks = sqliteTable("team_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull().default(0),
  assigneeEmail: text("assignee_email").notNull(),
  assigneeRole: text("assignee_role").notNull(),
  assigneeTitle: text("assignee_title").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull().default(""),
  priority: text("priority").notNull().default("Normal"),
  status: text("status").notNull().default("assigned"),
  createdByRole: text("created_by_role").notNull(),
  createdByEmail: text("created_by_email").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  completedAt: text("completed_at").notNull().default(""),
}, (table) => [
  index("team_tasks_assignee_idx").on(table.assigneeEmail, table.status, table.updatedAt),
  index("team_tasks_case_idx").on(table.caseId, table.status),
]);

export const siteIssueReports = sqliteTable("site_issue_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  projectCode: text("project_code").notNull(),
  projectName: text("project_name").notNull().default(""),
  siteLocation: text("site_location").notNull(),
  affectedTrade: text("affected_trade").notNull(),
  issueType: text("issue_type").notNull(),
  severity: text("severity").notNull().default("High"),
  summary: text("summary").notNull(),
  details: text("details").notNull().default(""),
  impact: text("impact").notNull().default(""),
  contactedPerson: text("contacted_person").notNull().default(""),
  contactedAt: text("contacted_at").notNull().default(""),
  expectedDate: text("expected_date").notNull().default(""),
  reporterEmail: text("reporter_email").notNull(),
  reporterName: text("reporter_name").notNull(),
  status: text("status").notNull().default("reported"),
  adminAction: text("admin_action").notNull().default(""),
  rescheduledDate: text("rescheduled_date").notNull().default(""),
  rescheduledTime: text("rescheduled_time").notNull().default(""),
  rescheduledAssignee: text("rescheduled_assignee").notNull().default(""),
  adminEmail: text("admin_email").notNull().default(""),
  adminReviewedAt: text("admin_reviewed_at").notNull().default(""),
  ownerNote: text("owner_note").notNull().default(""),
  reportedAt: text("reported_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  resolvedAt: text("resolved_at").notNull().default(""),
}, (table) => [
  index("site_issue_reports_status_idx").on(table.status, table.severity, table.reportedAt),
  index("site_issue_reports_case_idx").on(table.caseId, table.status),
  index("site_issue_reports_reporter_idx").on(table.reporterEmail, table.status),
]);

export const followUpItems = sqliteTable("follow_up_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personEmail: text("person_email").notNull(),
  personRole: text("person_role").notNull(),
  personName: text("person_name").notNull(),
  projectCode: text("project_code").notNull().default("Business / General"),
  title: text("title").notNull(),
  details: text("details").notNull().default(""),
  targetDate: text("target_date").notNull(),
  source: text("source").notNull().default("manual"),
  dedupeKey: text("dedupe_key").unique(),
  status: text("status").notNull().default("open"),
  createdByEmail: text("created_by_email").notNull(),
  createdByRole: text("created_by_role").notNull(),
  workDate: text("work_date").notNull().default(""),
  clockedOutAt: text("clocked_out_at").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  completedAt: text("completed_at").notNull().default(""),
}, (table) => [
  index("follow_up_items_person_idx").on(table.personEmail, table.status, table.targetDate),
  index("follow_up_items_target_idx").on(table.targetDate, table.status),
]);
