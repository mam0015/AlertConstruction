import { ensureOwnerDatabase } from "./owner-store";
import { memoizePerDatabase, runtimeBindings } from "./runtime";
import { assertStorageRoom } from "./storage-usage";

export type PublicRequestInput = {
  service: string;
  customerName: string;
  phone: string;
  email: string;
  location: string;
  timeframe: string;
  budget: string;
  material: string;
  otherService: string;
  details: string;
};

export type TrackingRecord = {
  code: string;
  recordType: "project" | "request";
  name: string;
  service: string;
  stage: string;
  progress: number;
  suburb: string;
  notes: string;
  updatedAt: string;
  attachmentCount: number;
};

async function database() {
  const env = await runtimeBindings();
  if (!env.DB) throw new Error("The request database is unavailable.");
  return env.DB;
}

async function ensureRequestFilesTableOnce() {
  await ensureOwnerDatabase();
  const db = await database();
  await db.prepare(`CREATE TABLE IF NOT EXISTS request_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_code TEXT NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL
  )`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS request_files_code_idx ON request_files(request_code)").run();
}

function requestCode() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] % 100000;
  return `ATP-${new Date().getUTCFullYear()}-${String(random).padStart(5, "0")}`;
}

async function uniqueRequestCode() {
  const db = await database();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = requestCode();
    const existing = await db.prepare("SELECT code FROM job_requests WHERE code=? UNION SELECT code FROM projects WHERE code=? LIMIT 1")
      .bind(code, code).first();
    if (!existing) return code;
  }
  return `ATP-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createPublicRequest(input: PublicRequestInput, files: File[]) {
  await ensureRequestFilesTable();
  const db = await database();
  const env = await runtimeBindings();
  if (files.length && !env.BUCKET) throw new Error("File storage is unavailable.");
  if (files.length) await assertStorageRoom(files.reduce((sum, file) => sum + file.size, 0));

  const code = await uniqueRequestCode();
  const now = new Date().toISOString();
  const service = input.service === "Other" ? input.otherService : input.service;
  const summary = [
    input.details,
    `Timeframe: ${input.timeframe}`,
    `Budget: ${input.budget}`,
    `Finish: ${input.material}`,
  ].filter(Boolean).join("\n");
  const uploadedKeys: string[] = [];

  try {
    await db.prepare(`INSERT INTO job_requests
      (code,request_type,customer_name,contact,service,suburb,submitted_at,status,priority,summary,assigned_to,updated_at)
      VALUES (?,?,?,?,?,?,?,'New','Normal',?,'Unassigned',?)`)
      .bind(code, "Job Request", input.customerName, `${input.phone} · ${input.email}`, service, input.location, now, summary, now).run();

    if (files.length && env.BUCKET) {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
        const objectKey = `requests/${code}/${crypto.randomUUID()}-${safeName}`;
        await env.BUCKET.put(objectKey, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" },
          customMetadata: { requestCode: code, originalName: file.name },
        });
        uploadedKeys.push(objectKey);
        await db.prepare(`INSERT INTO request_files
          (request_code,object_key,original_name,content_type,size,uploaded_at)
          VALUES (?,?,?,?,?,?)`)
          .bind(code, objectKey, file.name, file.type || "application/octet-stream", file.size, now).run();
      }
    }
  } catch (error) {
    const bucket = env.BUCKET;
    if (bucket) await Promise.all(uploadedKeys.map((key) => bucket.delete(key).catch(() => undefined)));
    await db.prepare("DELETE FROM request_files WHERE request_code=?").bind(code).run().catch(() => undefined);
    await db.prepare("DELETE FROM job_requests WHERE code=?").bind(code).run().catch(() => undefined);
    throw error;
  }

  return { code, submittedAt: now };
}

// The old public tracking page. Its codes are only five digits, so it must say very little: no project lookup (project records
// hold the Owner's private notes), and none of the customer's name, address or summary. The private customer portal uses the
// long REQ- reference instead (db/workflow-store.ts).
export async function getTrackingRecord(codeInput: string): Promise<TrackingRecord | null> {
  await ensureRequestFilesTable();
  const db = await database();
  const code = codeInput.trim().toUpperCase();
  if (!/^ATP-\d{4}-[A-Z0-9-]{3,40}$/.test(code)) return null;
  const request = await db.prepare(`SELECT code,service,status AS stage,updated_at AS updatedAt,
    (SELECT COUNT(*) FROM request_files WHERE request_code=job_requests.code) AS attachmentCount
    FROM job_requests WHERE code=? LIMIT 1`).bind(code).first<{ code: string; service: string; stage: string; updatedAt: string; attachmentCount: number }>();
  if (!request) return null;
  return { ...request, recordType: "request", name: "Your request", suburb: "", notes: "", progress: request.stage === "New" ? 5 : request.stage === "Contacted" ? 12 : 18 };
}

export async function createCustomerMessage(codeInput: string, subject: string, message: string) {
  const record = await getTrackingRecord(codeInput);
  if (!record) throw new Error("Project reference not found.");
  const db = await database();
  await db.prepare("INSERT INTO team_messages (sender,recipient,body,sent_at) VALUES (?,?,?,?)")
    .bind(`Customer · ${record.code}`, "Admin", `${subject.trim()}\n${message.trim()}`, new Date().toISOString()).run();
}

export const ensureRequestFilesTable = memoizePerDatabase(ensureRequestFilesTableOnce);
