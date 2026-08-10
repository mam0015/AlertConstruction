import { ensureOwnerDatabase, getOwnerSnapshot } from "./owner-store";
import { runtimeBindings } from "./runtime";

type AdminResource = "project" | "request" | "schedule" | "message";

async function database() {
  const env = await runtimeBindings();
  if (!env.DB) throw new Error("The operations database is unavailable.");
  return env.DB;
}

async function seedAdminRequests() {
  await ensureOwnerDatabase();
  const db = await database();
  const existing = await db.prepare("SELECT COUNT(*) AS total FROM job_requests").first<{ total?: number }>();
  if (Number(existing?.total ?? 0) > 0) return;

  const now = new Date().toISOString();
  const rows = [
    ["REQ-2026-0148", "Project Request", "Customer 148", "0400 000 148", "Home Extension", "Glen Waverley", "2026-08-09T08:42:00+10:00", "New", "High", "Ground-floor extension, new family area and internal reconfiguration.", "Admin 01"],
    ["JOB-2026-0221", "Job Request", "Customer 221", "customer221@example.com", "Building Inspection", "Rowville", "2026-08-09T09:18:00+10:00", "Contacted", "Normal", "Pre-purchase building inspection requested for this week.", "Admin 01"],
    ["REQ-2026-0151", "Project Request", "Customer 151", "0400 000 151", "Engineering", "Wantirna", "2026-08-09T10:06:00+10:00", "Needs review", "Urgent", "Structural advice required after movement was noticed near the rear opening.", "Site Supervisor 01"],
    ["JOB-2026-0224", "Job Request", "Customer 224", "customer224@example.com", "Bathroom Renovation", "Wheelers Hill", "2026-08-09T10:34:00+10:00", "New", "Normal", "Bathroom renovation enquiry with photos ready to upload.", "Unassigned"],
  ];
  await db.batch(rows.map((row) => db.prepare("INSERT INTO job_requests (code,request_type,customer_name,contact,service,suburb,submitted_at,status,priority,summary,assigned_to,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(...row, now)));
}

async function adminPermissions() {
  const db = await database();
  return (await db.prepare("SELECT role,projects,schedule,finance,finance_export AS financeExport FROM role_permissions WHERE role='Admin' LIMIT 1").first<{ role: string; projects: number; schedule: number; finance: number; financeExport: number }>()) ?? { role: "Admin", projects: 1, schedule: 1, finance: 0, financeExport: 0 };
}

export async function getAdminSnapshot() {
  await getOwnerSnapshot();
  await seedAdminRequests();
  const db = await database();
  const permissions = await adminPermissions();
  const results = await db.batch([
    db.prepare("SELECT id,code,name,service,stage,progress,customer_name AS customerName,suburb,start_date AS startDate,notes,updated_at AS updatedAt FROM projects ORDER BY updated_at DESC,id DESC"),
    db.prepare("SELECT id,code,request_type AS requestType,customer_name AS customerName,contact,service,suburb,submitted_at AS submittedAt,status,priority,summary,assigned_to AS assignedTo,updated_at AS updatedAt,(SELECT COUNT(*) FROM request_files WHERE request_code=job_requests.code) AS attachmentCount FROM job_requests ORDER BY submitted_at DESC,id DESC"),
    db.prepare("SELECT id,event_date AS eventDate,start_time AS startTime,title,assignee,project_code AS projectCode,tone,notes FROM schedule_events ORDER BY event_date,start_time"),
    db.prepare("SELECT id,sender,recipient,body,sent_at AS sentAt FROM team_messages ORDER BY sent_at,id"),
  ]);
  return {
    projects: permissions.projects ? results[0].results : [],
    requests: results[1].results,
    scheduleEvents: permissions.schedule ? results[2].results : [],
    messages: results[3].results,
    permissions,
  };
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function requirePermission(resource: AdminResource) {
  const permissions = await adminPermissions();
  if (resource === "project" && !permissions.projects) throw new Error("Project access has been disabled by Owner.");
  if (resource === "schedule" && !permissions.schedule) throw new Error("Schedule access has been disabled by Owner.");
}

export async function createAdminRecord(resource: AdminResource, payload: Record<string, unknown>) {
  await getOwnerSnapshot();
  await seedAdminRequests();
  await requirePermission(resource);
  const db = await database();
  const now = new Date().toISOString();

  if (resource === "project") {
    await db.prepare("INSERT INTO projects (code,name,service,stage,progress,contract_value,balance,customer_name,suburb,start_date,notes,updated_at) VALUES (?,?,?,?,?,0,0,?,?,?,?,?)")
      .bind(text(payload.code).toUpperCase(), text(payload.name), text(payload.service), text(payload.stage, "Admin review"), Math.min(100, Math.max(0, number(payload.progress))), text(payload.customerName), text(payload.suburb), text(payload.startDate), text(payload.notes), now).run();
    return;
  }
  if (resource === "request") {
    await db.prepare("INSERT INTO job_requests (code,request_type,customer_name,contact,service,suburb,submitted_at,status,priority,summary,assigned_to,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(text(payload.code).toUpperCase(), text(payload.requestType, "Job Request"), text(payload.customerName), text(payload.contact), text(payload.service), text(payload.suburb), text(payload.submittedAt, now), text(payload.status, "New"), text(payload.priority, "Normal"), text(payload.summary), text(payload.assignedTo, "Unassigned"), now).run();
    return;
  }
  if (resource === "schedule") {
    await db.prepare("INSERT INTO schedule_events (event_date,start_time,title,assignee,project_code,tone,notes) VALUES (?,?,?,?,?,?,?)")
      .bind(text(payload.eventDate), text(payload.startTime), text(payload.title), text(payload.assignee, "Site Supervisor 01"), text(payload.projectCode, "Business / General"), text(payload.tone, "gold"), text(payload.notes)).run();
    return;
  }
  if (resource === "message") {
    await db.prepare("INSERT INTO team_messages (sender,recipient,body,sent_at) VALUES (?,?,?,?)")
      .bind("Admin", text(payload.recipient, "Site Supervisor 01"), text(payload.body), now).run();
    return;
  }
}

export async function updateAdminRecord(resource: AdminResource, id: number, payload: Record<string, unknown>) {
  await getOwnerSnapshot();
  await seedAdminRequests();
  await requirePermission(resource);
  const db = await database();
  const now = new Date().toISOString();

  if (resource === "project") {
    await db.prepare("UPDATE projects SET code=?,name=?,service=?,stage=?,progress=?,customer_name=?,suburb=?,start_date=?,notes=?,updated_at=? WHERE id=?")
      .bind(text(payload.code).toUpperCase(), text(payload.name), text(payload.service), text(payload.stage), Math.min(100, Math.max(0, number(payload.progress))), text(payload.customerName), text(payload.suburb), text(payload.startDate), text(payload.notes), now, id).run();
    return;
  }
  if (resource === "request") {
    await db.prepare("UPDATE job_requests SET status=?,priority=?,assigned_to=?,summary=?,updated_at=? WHERE id=?")
      .bind(text(payload.status), text(payload.priority), text(payload.assignedTo), text(payload.summary), now, id).run();
    return;
  }
  if (resource === "schedule") {
    await db.prepare("UPDATE schedule_events SET event_date=?,start_time=?,title=?,assignee=?,project_code=?,tone=?,notes=? WHERE id=?")
      .bind(text(payload.eventDate), text(payload.startTime), text(payload.title), text(payload.assignee), text(payload.projectCode), text(payload.tone, "gold"), text(payload.notes), id).run();
  }
}

export async function deleteAdminRecord(resource: AdminResource, id: number) {
  await requirePermission(resource);
  if (resource !== "schedule") throw new Error("Admin can only remove schedule items.");
  const db = await database();
  await db.prepare("DELETE FROM schedule_events WHERE id=?").bind(id).run();
}
