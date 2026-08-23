import { listStaffAccessRequests, reviewStaffAccessRequest } from "./staff-store";
import { staffRoles, type StaffRole } from "../app/admin-auth";

type Resource = "project" | "finance" | "schedule" | "report" | "message" | "permission" | "staff";
async function database() { const { env } = await import("cloudflare:workers"); if (!env.DB) throw new Error("The owner database is unavailable."); return env.DB; }
export async function ensureOwnerDatabase() { const db = await database(); await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, service TEXT NOT NULL, stage TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, contract_value INTEGER NOT NULL DEFAULT 0, balance INTEGER NOT NULL DEFAULT 0, customer_name TEXT NOT NULL DEFAULT '', suburb TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS finance_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, category TEXT NOT NULL, project_code TEXT NOT NULL DEFAULT 'Business / General', amount INTEGER NOT NULL, entry_date TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS schedule_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event_date TEXT NOT NULL, start_time TEXT NOT NULL, title TEXT NOT NULL, assignee TEXT NOT NULL, project_code TEXT NOT NULL DEFAULT 'Business / General', tone TEXT NOT NULL DEFAULT 'gold', notes TEXT NOT NULL DEFAULT '')`),
  db.prepare(`CREATE TABLE IF NOT EXISTS eod_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, person TEXT NOT NULL, role TEXT NOT NULL, project_code TEXT NOT NULL, summary TEXT NOT NULL, submitted_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', owner_note TEXT NOT NULL DEFAULT '')`),
  db.prepare(`CREATE TABLE IF NOT EXISTS team_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT NOT NULL, recipient TEXT NOT NULL, body TEXT NOT NULL, sent_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS role_permissions (role TEXT PRIMARY KEY, projects INTEGER NOT NULL DEFAULT 1, schedule INTEGER NOT NULL DEFAULT 1, finance INTEGER NOT NULL DEFAULT 0, finance_export INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, failed_count INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS job_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, request_type TEXT NOT NULL, customer_name TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '', service TEXT NOT NULL, suburb TEXT NOT NULL DEFAULT '', submitted_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'New', priority TEXT NOT NULL DEFAULT 'Normal', summary TEXT NOT NULL DEFAULT '', assigned_to TEXT NOT NULL DEFAULT 'Unassigned', updated_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS staff_access_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', role TEXT NOT NULL DEFAULT 'Unassigned', trade_title TEXT NOT NULL DEFAULT '', requested_at TEXT NOT NULL, reviewed_at TEXT NOT NULL DEFAULT '', last_seen_at TEXT NOT NULL)`),
]); }
async function removeLegacyDemoRecords() {
  if (process.env.NODE_ENV === "development") return;
  const db = await database();
  await db.prepare(`CREATE TABLE IF NOT EXISTS app_migrations (
    migration_key TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`).run();
  const applied = await db.prepare("SELECT migration_key FROM app_migrations WHERE migration_key=?")
    .bind("remove_seed_records_v72").first<{ migration_key: string }>();
  if (applied) return;
  await db.batch([
    db.prepare(`DELETE FROM projects
      WHERE code IN ('ATP-2026-00124','ATP-2026-00131','ATP-2026-00136','ATP-2026-00141')
      AND customer_name LIKE 'Customer %'
      AND updated_at='2026-08-09T12:00:36.421Z'`),
    db.prepare(`DELETE FROM finance_entries
      WHERE created_at='2026-08-09T12:00:36.421Z'
      AND project_code IN ('ATP-2026-00124','ATP-2026-00131')`),
    db.prepare(`DELETE FROM schedule_events
      WHERE title IN ('Owner project review','Plumbing rough-in','Framing inspection','Electrical rough-in','Wall lining begins')
      AND project_code='ATP-2026-00124'`),
    db.prepare(`DELETE FROM eod_reports
      WHERE person IN ('Site Supervisor 01','Admin 01','Worker 01')
      AND submitted_at LIKE '2026-08-09%'`),
    db.prepare(`DELETE FROM team_messages
      WHERE sent_at LIKE '2026-08-09%'`),
    db.prepare(`DELETE FROM job_requests
      WHERE (code='REQ-2026-0148' AND customer_name='Customer 148')
         OR (code='JOB-2026-0221' AND customer_name='Customer 221' AND contact='customer221@example.com')
         OR (code='REQ-2026-0151' AND customer_name='Customer 151')
         OR (code='JOB-2026-0224' AND customer_name='Customer 224' AND contact='customer224@example.com')`),
    db.prepare(`DELETE FROM staff_access_requests
      WHERE email LIKE '%@alerttradiepro.demo' AND password_hash='preview'`),
    db.prepare("INSERT INTO app_migrations (migration_key,applied_at) VALUES (?,?)")
      .bind("remove_seed_records_v72", new Date().toISOString()),
  ]);
}
export async function getOwnerSnapshot(){await ensureOwnerDatabase();await removeLegacyDemoRecords();const db=await database();const r=await db.batch([db.prepare(`SELECT id,code,name,service,stage,progress,contract_value AS contractValue,balance,customer_name AS customerName,suburb,start_date AS startDate,notes,updated_at AS updatedAt FROM projects ORDER BY updated_at DESC,id DESC`),db.prepare(`SELECT id,type,category,project_code AS projectCode,amount,entry_date AS entryDate,note,created_at AS createdAt FROM finance_entries ORDER BY entry_date DESC,id DESC`),db.prepare(`SELECT id,event_date AS eventDate,start_time AS startTime,title,assignee,project_code AS projectCode,tone,notes FROM schedule_events ORDER BY event_date,start_time`),db.prepare(`SELECT id,person,role,project_code AS projectCode,summary,submitted_at AS submittedAt,status,owner_note AS ownerNote FROM eod_reports ORDER BY submitted_at DESC,id DESC`),db.prepare(`SELECT id,sender,recipient,body,sent_at AS sentAt FROM team_messages ORDER BY sent_at,id`),db.prepare(`SELECT role,projects,schedule,finance,finance_export AS financeExport,updated_at AS updatedAt FROM role_permissions WHERE role='Admin' LIMIT 1`)]);return{projects:r[0].results,financeEntries:r[1].results,scheduleEvents:r[2].results,eodReports:r[3].results,messages:r[4].results,permissions:r[5].results[0]??{role:"Admin",projects:1,schedule:1,finance:0,financeExport:0},staffRequests:await listStaffAccessRequests()};}
function txt(v:unknown,f=""){return typeof v==="string"?v.trim():f} function num(v:unknown,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
export async function createOwnerRecord(resource:Resource,p:Record<string,unknown>){await ensureOwnerDatabase();const db=await database(),now=new Date().toISOString();if(resource==="project")await db.prepare("INSERT INTO projects (code,name,service,stage,progress,contract_value,balance,customer_name,suburb,start_date,notes,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(txt(p.code).toUpperCase(),txt(p.name),txt(p.service),txt(p.stage,"Admin review"),Math.min(100,Math.max(0,num(p.progress))),Math.max(0,num(p.contractValue)),Math.max(0,num(p.balance)),txt(p.customerName),txt(p.suburb),txt(p.startDate),txt(p.notes),now).run();else if(resource==="finance")await db.prepare("INSERT INTO finance_entries (type,category,project_code,amount,entry_date,note,created_at) VALUES (?,?,?,?,?,?,?)").bind(txt(p.type),txt(p.category),txt(p.projectCode,"Business / General"),Math.max(1,num(p.amount)),txt(p.entryDate,now.slice(0,10)),txt(p.note),now).run();else if(resource==="schedule")await db.prepare("INSERT INTO schedule_events (event_date,start_time,title,assignee,project_code,tone,notes) VALUES (?,?,?,?,?,?,?)").bind(txt(p.eventDate),txt(p.startTime),txt(p.title),txt(p.assignee),txt(p.projectCode,"Business / General"),txt(p.tone,"gold"),txt(p.notes)).run();else if(resource==="message")await db.prepare("INSERT INTO team_messages (sender,recipient,body,sent_at) VALUES (?,?,?,?)").bind("Owner",txt(p.recipient,"Site Supervisor 01"),txt(p.body),now).run();else throw new Error("This record type cannot be created.");}
export async function updateOwnerRecord(resource:Resource,id:number|string,p:Record<string,unknown>){await ensureOwnerDatabase();const db=await database(),now=new Date().toISOString();if(resource==="project")await db.prepare("UPDATE projects SET code=?,name=?,service=?,stage=?,progress=?,contract_value=?,balance=?,customer_name=?,suburb=?,start_date=?,notes=?,updated_at=? WHERE id=?").bind(txt(p.code).toUpperCase(),txt(p.name),txt(p.service),txt(p.stage),Math.min(100,Math.max(0,num(p.progress))),Math.max(0,num(p.contractValue)),Math.max(0,num(p.balance)),txt(p.customerName),txt(p.suburb),txt(p.startDate),txt(p.notes),now,num(id)).run();else if(resource==="finance")await db.prepare("UPDATE finance_entries SET type=?,category=?,project_code=?,amount=?,entry_date=?,note=? WHERE id=?").bind(txt(p.type),txt(p.category),txt(p.projectCode,"Business / General"),Math.max(1,num(p.amount)),txt(p.entryDate),txt(p.note),num(id)).run();else if(resource==="schedule")await db.prepare("UPDATE schedule_events SET event_date=?,start_time=?,title=?,assignee=?,project_code=?,tone=?,notes=? WHERE id=?").bind(txt(p.eventDate),txt(p.startTime),txt(p.title),txt(p.assignee),txt(p.projectCode),txt(p.tone,"gold"),txt(p.notes),num(id)).run();else if(resource==="report")await db.prepare("UPDATE eod_reports SET status=?,owner_note=? WHERE id=?").bind(txt(p.status),txt(p.ownerNote),num(id)).run();else if(resource==="permission")await db.prepare("UPDATE role_permissions SET projects=?,schedule=?,finance=?,finance_export=?,updated_at=? WHERE role='Admin'").bind(num(p.projects)?1:0,num(p.schedule)?1:0,num(p.finance)?1:0,num(p.financeExport)?1:0,now).run();else if(resource==="staff"){const role=txt(p.role,"Unassigned");if(role!=="Unassigned"&&!staffRoles.includes(role as StaffRole))throw new Error("Select a valid staff role.");const status=txt(p.status,"Pending");if(!["Pending","Approved","Rejected"].includes(status))throw new Error("Select a valid access status.");await reviewStaffAccessRequest(num(id),status as "Pending"|"Approved"|"Rejected",role as StaffRole|"Unassigned",txt(p.tradeTitle));}else throw new Error("This record type cannot be updated.");}
export async function deleteOwnerRecord(resource:Resource,id:number){await ensureOwnerDatabase();const table=resource==="project"?"projects":resource==="finance"?"finance_entries":resource==="schedule"?"schedule_events":null;if(!table)throw new Error("This record type cannot be deleted.");const db=await database();await db.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();}
export async function getLoginAttempt(key:string){await ensureOwnerDatabase();const db=await database();return db.prepare("SELECT failed_count AS failedCount,locked_until AS lockedUntil FROM login_attempts WHERE key=?").bind(key).first<{failedCount:number;lockedUntil:number}>();}
export async function recordLoginFailure(key:string,failedCount:number,lockedUntil:number){await ensureOwnerDatabase();const db=await database();await db.prepare("INSERT INTO login_attempts (key,failed_count,locked_until,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET failed_count=excluded.failed_count,locked_until=excluded.locked_until,updated_at=excluded.updated_at").bind(key,failedCount,lockedUntil,Date.now()).run();}
export async function clearLoginFailures(key:string){await ensureOwnerDatabase();const db=await database();await db.prepare("DELETE FROM login_attempts WHERE key=?").bind(key).run();}
