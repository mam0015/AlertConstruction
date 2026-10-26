import { ITEM_KEYS } from "../app/estimate-tools/catalogue";
import { ALLOWANCE_KEYS } from "../app/estimate-tools/renovation-data.mjs";
import { memoizePerDatabase, runtimeBindings } from "./runtime";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;

// The company's own price list for the estimate tools. The older calculators shipped with no prices at all ("Secure verified rate required"):
// the company types its own rates here, once, and every calculator uses them. Rates are kept in cents, per item key ("electrical:0").
const ALLOWANCE_SET = new Set<string>(ALLOWANCE_KEYS);
// Every price in the list belongs to a known item: the three trades' items, or one of the renovation planning allowances.
export const isRateKey = (key: string) => ITEM_KEYS.has(key) || ALLOWANCE_SET.has(key);
export const MAX_RATE_CENTS = 100_000_000; // $1,000,000.00 per unit is far above any real line and stops typing slips
export const DEFAULT_MARGIN = 20;

async function database(): Promise<D1> {
  const env = await runtimeBindings();
  if (!env.DB) throw new Error("The estimate database is unavailable.");
  return env.DB;
}

async function ensureEstimateTablesOnce() {
  const db = await database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS estimate_rates (item_key TEXT PRIMARY KEY,rate_cents INTEGER NOT NULL,updated_by TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS estimate_settings (name TEXT PRIMARY KEY,value TEXT NOT NULL,updated_by TEXT NOT NULL,updated_at TEXT NOT NULL)"),
  ]);
}
export const ensureEstimateTables = memoizePerDatabase(ensureEstimateTablesOnce);

export type EstimatePrices = { rates: Record<string, number>; margin: number; updatedAt: string };

export async function getEstimatePrices(): Promise<EstimatePrices> {
  await ensureEstimateTables();
  const db = await database();
  const [rates, settings] = await Promise.all([
    db.prepare("SELECT item_key AS key, rate_cents AS cents, updated_at AS updatedAt FROM estimate_rates").all<{ key: string; cents: number; updatedAt: string }>(),
    db.prepare("SELECT name, value, updated_at AS updatedAt FROM estimate_settings").all<{ name: string; value: string; updatedAt: string }>(),
  ]);
  const margin = Number(settings.results.find((row) => row.name === "margin")?.value);
  const stamps = [...rates.results, ...settings.results].map((row) => row.updatedAt).sort();
  return {
    rates: Object.fromEntries(rates.results.filter((row) => isRateKey(row.key)).map((row) => [row.key, Number(row.cents)])),
    margin: Number.isFinite(margin) && margin >= 0 ? margin : DEFAULT_MARGIN,
    updatedAt: stamps.at(-1) ?? "",
  };
}

// changes: item key -> dollars (a number), or null to remove the saved rate. Anything that is not a listed item, or not a sensible amount, is refused.
export function parseRateChanges(input: unknown): Record<string, number | null> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Send the rates as a list of item keys and amounts.");
  const entries = Object.entries(input as Record<string, unknown>);
  if (!entries.length) throw new Error("There are no rates to save.");
  if (entries.length > 200) throw new Error("Too many rates in one save.");
  const out: Record<string, number | null> = {};
  for (const [key, value] of entries) {
    if (!isRateKey(key)) throw new Error(`"${key.slice(0, 40)}" is not an item in the price list.`);
    if (value === null || value === "") { out[key] = null; continue; }
    const dollars = typeof value === "number" ? value : typeof value === "string" && /^\d{1,7}(\.\d{1,2})?$/.test(value.trim()) ? Number(value) : NaN;
    const cents = Math.round(dollars * 100);
    if (!Number.isFinite(dollars) || dollars < 0 || cents > MAX_RATE_CENTS) throw new Error("A rate must be an amount in dollars, from 0 up to 1,000,000.");
    out[key] = cents / 100;
  }
  return out;
}

export function parseMargin(value: unknown) {
  const margin = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(margin) || margin < 0 || margin > 200) throw new Error("The builder margin must be a percentage from 0 to 200.");
  return Math.round(margin * 100) / 100;
}

export async function saveEstimatePrices(email: string, changes: { rates?: Record<string, number | null>; margin?: number }) {
  await ensureEstimateTables();
  const db = await database();
  const now = new Date().toISOString();
  const statements = [
    ...Object.entries(changes.rates ?? {}).map(([key, dollars]) => dollars === null
      ? db.prepare("DELETE FROM estimate_rates WHERE item_key = ?").bind(key)
      : db.prepare("INSERT INTO estimate_rates (item_key,rate_cents,updated_by,updated_at) VALUES (?1,?2,?3,?4) ON CONFLICT(item_key) DO UPDATE SET rate_cents=?2,updated_by=?3,updated_at=?4").bind(key, Math.round(dollars * 100), email, now)),
    ...(changes.margin === undefined ? [] : [db.prepare("INSERT INTO estimate_settings (name,value,updated_by,updated_at) VALUES ('margin',?1,?2,?3) ON CONFLICT(name) DO UPDATE SET value=?1,updated_by=?2,updated_at=?3").bind(String(changes.margin), email, now)]),
  ];
  if (statements.length) await db.batch(statements);
  return getEstimatePrices();
}
