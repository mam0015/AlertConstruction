// In-memory stand-ins for Cloudflare D1 / R2 so the built Worker can be exercised end to end in Node.
import { DatabaseSync } from "node:sqlite";

export class PreparedStatement {
  constructor(db, sql, params = []) { this.db = db; this.sql = sql; this.params = params; }
  bind(...params) { return new PreparedStatement(this.db, this.sql, params); }
  run() {
    const result = this.db.prepare(this.sql).run(...this.params);
    return Promise.resolve({ success: true, meta: { changes: Number(result.changes ?? 0), last_row_id: Number(result.lastInsertRowid ?? 0) } });
  }
  first(column) {
    const row = this.db.prepare(this.sql).get(...this.params) ?? null;
    return Promise.resolve(column && row ? row[column] ?? null : row);
  }
  all() { return Promise.resolve({ success: true, results: this.db.prepare(this.sql).all(...this.params) }); }
  batchResult() {
    const statement = this.db.prepare(this.sql);
    if (/^\s*(select|pragma|with)\b/i.test(this.sql)) return { success: true, results: statement.all(...this.params) };
    const result = statement.run(...this.params);
    return { success: true, results: [], meta: { changes: Number(result.changes ?? 0), last_row_id: Number(result.lastInsertRowid ?? 0) } };
  }
}

export class TestD1 {
  constructor() { this.sqlite = new DatabaseSync(":memory:"); }
  prepare(sql) { return new PreparedStatement(this.sqlite, sql); }
  async batch(statements) { return statements.map((statement) => statement.batchResult()); }
  close() { this.sqlite.close(); }
}

export class TestR2 {
  constructor() { this.objects = new Map(); }
  async put(key, value, options) { this.objects.set(key, { value: Buffer.from(value), options }); }
  async delete(key) { this.objects.delete(key); }
}
