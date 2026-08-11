import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
