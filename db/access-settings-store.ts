import { hashPbkdf2, isSupportedPbkdf2Hash, pbkdf2Iterations, verifyPbkdf2 } from "../app/secret-utils";

export type OwnerAccountRecord = {
  email: string;
  passwordHash: string;
  displayName: string;
  updatedAt: string;
};

export type TeamAccessSettings = {
  teamCode: string;
  updatedAt: string;
};

async function database() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("The access settings database is unavailable.");
  return env.DB;
}

function generateTeamCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `ATP-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

async function ensureAccessSettings() {
  const db = await database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS owner_accounts (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'Owner',
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_access_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      team_code TEXT NOT NULL,
      team_code_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
  ]);

  const now = new Date().toISOString();
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const ownerHash = process.env.OWNER_PASSWORD_HASH?.trim();
  if (!ownerEmail || !ownerHash) throw new Error("Owner credentials are not configured.");
  await db.prepare(`INSERT OR IGNORE INTO owner_accounts
    (id,email,password_hash,display_name,updated_at) VALUES (1,?,?,?,?)`)
    .bind(ownerEmail, ownerHash, process.env.OWNER_DISPLAY_NAME?.trim() || "Owner", now).run();

  const storedOwner = await db.prepare("SELECT password_hash AS passwordHash FROM owner_accounts WHERE id=1")
    .first<{ passwordHash: string }>();
  if (storedOwner && (pbkdf2Iterations(storedOwner.passwordHash) ?? 0) > 100_000 && isSupportedPbkdf2Hash(ownerHash)) {
    await db.prepare("UPDATE owner_accounts SET password_hash=?,updated_at=? WHERE id=1")
      .bind(ownerHash, now).run();
  }

  const existing = await db.prepare("SELECT id,team_code AS teamCode,team_code_hash AS teamCodeHash FROM team_access_settings WHERE id=1")
    .first<{ id: number; teamCode: string; teamCodeHash: string }>();
  if (!existing) {
    const teamCode = process.env.TEAM_CODE?.trim().toUpperCase() || generateTeamCode();
    const configuredHash = process.env.TEAM_CODE_HASH?.trim() || process.env.ADMIN_TEAM_CODE_HASH?.trim() || "";
    const teamCodeHash = isSupportedPbkdf2Hash(configuredHash) ? configuredHash : await hashPbkdf2(teamCode);
    await db.prepare(`INSERT INTO team_access_settings
      (id,team_code,team_code_hash,updated_at) VALUES (1,?,?,?)`)
      .bind(teamCode, teamCodeHash, now).run();
  } else if (!isSupportedPbkdf2Hash(existing.teamCodeHash)) {
    await db.prepare("UPDATE team_access_settings SET team_code_hash=?,updated_at=? WHERE id=1")
      .bind(await hashPbkdf2(existing.teamCode), now).run();
  }
}

export async function getOwnerAccountByEmail(email: string) {
  await ensureAccessSettings();
  const db = await database();
  return db.prepare(`SELECT email,password_hash AS passwordHash,display_name AS displayName,updated_at AS updatedAt
    FROM owner_accounts WHERE id=1 AND LOWER(email)=LOWER(?) LIMIT 1`)
    .bind(email.trim()).first<OwnerAccountRecord>();
}

export async function getPrimaryOwnerAccount() {
  await ensureAccessSettings();
  const db = await database();
  return db.prepare(`SELECT email,password_hash AS passwordHash,display_name AS displayName,updated_at AS updatedAt
    FROM owner_accounts WHERE id=1 LIMIT 1`).first<OwnerAccountRecord>();
}

export async function updateOwnerProfile(currentEmail: string, email: string, displayName: string) {
  await ensureAccessSettings();
  const db = await database();
  const now = new Date().toISOString();
  await db.prepare(`UPDATE owner_accounts SET email=?,display_name=?,updated_at=?
    WHERE id=1 AND LOWER(email)=LOWER(?)`)
    .bind(email.trim().toLowerCase(), displayName.trim() || "Owner", now, currentEmail.trim()).run();
  return getPrimaryOwnerAccount();
}

export async function updateOwnerPassword(email: string, password: string) {
  await ensureAccessSettings();
  const db = await database();
  await db.prepare("UPDATE owner_accounts SET password_hash=?,updated_at=? WHERE id=1 AND LOWER(email)=LOWER(?)")
    .bind(await hashPbkdf2(password), new Date().toISOString(), email.trim()).run();
}

export async function verifyStoredOwnerPassword(email: string, password: string) {
  const account = await getOwnerAccountByEmail(email);
  return Boolean(account && await verifyPbkdf2(password, account.passwordHash));
}

export async function getTeamAccessSettings() {
  await ensureAccessSettings();
  const db = await database();
  return db.prepare(`SELECT team_code AS teamCode,updated_at AS updatedAt
    FROM team_access_settings WHERE id=1 LIMIT 1`).first<TeamAccessSettings>();
}

export async function verifyCurrentTeamCode(teamCode: string) {
  await ensureAccessSettings();
  const db = await database();
  const row = await db.prepare("SELECT team_code_hash AS teamCodeHash FROM team_access_settings WHERE id=1")
    .first<{ teamCodeHash: string }>();
  return Boolean(row && await verifyPbkdf2(teamCode.trim().toUpperCase(), row.teamCodeHash));
}

export async function rotateTeamCode() {
  await ensureAccessSettings();
  const db = await database();
  const teamCode = generateTeamCode();
  await db.prepare("UPDATE team_access_settings SET team_code=?,team_code_hash=?,updated_at=? WHERE id=1")
    .bind(teamCode, await hashPbkdf2(teamCode), new Date().toISOString()).run();
  return getTeamAccessSettings();
}
