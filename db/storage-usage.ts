import { runtimeBindings } from "./runtime";

// The company's files (chat attachments, project photos and documents, customer uploads) all live in one private R2 bucket.
// This keeps the total under a limit (8 GB unless FILES_LIMIT_GB says otherwise) so the bucket can never grow past what the Owner chose.
// Sizes come from the file records in the database (each upload stores its size), so counting is one cheap query, not a bucket scan.

const GB = 1024 ** 3;
export const DEFAULT_FILES_LIMIT_GB = 8;
const WARN_AT = 0.8;

export class StorageFullError extends Error {
  status = 507;
  constructor(message: string) {
    super(message);
    this.name = "StorageFullError";
  }
}

// Checked by name as well, so it still works if a bundler ever gives two copies of this module.
export function isStorageFull(error: unknown) {
  return error instanceof StorageFullError || (error instanceof Error && error.name === "StorageFullError");
}

export type StorageSummary = {
  usedBytes: number;
  limitBytes: number;
  freeBytes: number;
  percent: number;
  state: "ok" | "warn" | "full";
  message: string;
};

export function filesLimitBytes(raw = process.env.FILES_LIMIT_GB) {
  const gb = Number(String(raw ?? "").trim());
  return Math.round((Number.isFinite(gb) && gb > 0 ? gb : DEFAULT_FILES_LIMIT_GB) * GB);
}

export function formatBytes(bytes: number) {
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes >= 10 * GB ? 1 : 2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

// A table that has not been created yet simply holds nothing, so it counts as zero instead of failing the upload.
const SOURCES = [
  ["team_chat", "file_size"],
  ["workflow_files", "size_bytes"],
  ["request_files", "size"],
] as const;

export async function fileStorageBytes() {
  const env = await runtimeBindings();
  if (!env.DB) return 0;
  let total = 0;
  for (const [table, column] of SOURCES) {
    try {
      const row = await env.DB.prepare(`SELECT COALESCE(SUM(${column}),0) AS bytes FROM ${table}`).first<{ bytes: number }>();
      total += Math.max(0, Number(row?.bytes ?? 0));
    } catch {
      // table not created yet
    }
  }
  return total;
}

export function summarizeStorage(usedBytes: number, limitBytes = filesLimitBytes()): StorageSummary {
  const percent = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 1000) / 10) : 100;
  const freeBytes = Math.max(0, limitBytes - usedBytes);
  const state = usedBytes >= limitBytes ? "full" : usedBytes >= limitBytes * WARN_AT ? "warn" : "ok";
  const message = state === "full"
    ? `File storage is full (${formatBytes(usedBytes)} of ${formatBytes(limitBytes)}). Delete files you no longer need, or raise the limit.`
    : state === "warn"
      ? `File storage is ${percent}% full (${formatBytes(usedBytes)} of ${formatBytes(limitBytes)}).`
      : `${formatBytes(usedBytes)} of ${formatBytes(limitBytes)} used.`;
  return { usedBytes, limitBytes, freeBytes, percent, state, message };
}

export async function storageSummary() {
  return summarizeStorage(await fileStorageBytes());
}

// Call before every bucket write with the size of what is about to be stored. Throws StorageFullError if it would not fit.
export async function assertStorageRoom(extraBytes: number) {
  const extra = Math.max(0, Math.floor(Number(extraBytes) || 0));
  const limit = filesLimitBytes();
  const used = await fileStorageBytes();
  if (used + extra > limit) {
    throw new StorageFullError(`File storage is full: ${formatBytes(used)} of ${formatBytes(limit)} is used and this file needs ${formatBytes(extra)}. Delete files you no longer need, or ask the Owner to raise the limit.`);
  }
}
