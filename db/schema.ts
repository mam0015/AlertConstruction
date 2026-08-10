import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const requestFiles = sqliteTable("request_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestCode: text("request_code").notNull(),
  objectKey: text("object_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
}, (table) => [index("request_files_code_idx").on(table.requestCode)]);
