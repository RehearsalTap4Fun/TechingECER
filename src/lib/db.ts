import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * 单例数据库连接。
 *
 * Next.js 开发模式下模块会被反复求值，用 globalThis 缓存避免句柄泄漏。
 * 生产模式下 `node:sqlite` 是同步 API——对幼儿园规模的数据量（几千条记录）
 * 完全够用，且省掉了连接池与原生模块编译。
 */

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "teaching-ecer.db");
const SCHEMA_PATH = path.join(process.cwd(), "src", "lib", "schema.sql");

declare global {
  // eslint-disable-next-line no-var
  var __ecerDb: DatabaseSync | undefined;
}

/**
 * 补齐已有数据库缺失的列。
 *
 * schema.sql 用的是 CREATE TABLE IF NOT EXISTS，对已建好的库不会生效，
 * 所以新增列要单独 ALTER。这里做成幂等的：对照 PRAGMA table_info 只加缺的那些，
 * 不需要版本号表——列的有无本身就是状态。
 */
const ADDED_COLUMNS: Array<[table: string, column: string, ddl: string]> = [
  ["resources", "file_name", "TEXT"],
  ["resources", "file_size", "INTEGER"],
  ["resources", "extract_kind", "TEXT"],
  ["resources", "content_text", "TEXT"],
  ["resources", "auto_category", "TEXT"],
  ["resources", "auto_confidence", "REAL"],
  ["resources", "auto_matched", "TEXT NOT NULL DEFAULT '[]'"],
  ["resources", "reviewed", "INTEGER NOT NULL DEFAULT 0"],
];

function migrate(db: DatabaseSync): void {
  const tables = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>)
      .map((r) => r.name),
  );
  for (const [table, column, ddl] of ADDED_COLUMNS) {
    if (!tables.has(table)) continue;
    const cols = new Set(
      (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((r) => r.name),
    );
    if (!cols.has(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    }
  }
}

function open(): DatabaseSync {
  mkdirSync(DB_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(readFileSync(SCHEMA_PATH, "utf8"));
  migrate(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__ecerDb) {
    globalThis.__ecerDb = open();
  }
  return globalThis.__ecerDb;
}

/**
 * node:sqlite 返回的行是 null 原型对象（[Object: null prototype]），
 * React Server Components 拒绝把它们序列化给客户端组件。
 * 统一在这一层转成普通对象，调用点就不用各自记得处理。
 */
function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

/** 查询多行 */
export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return (getDb().prepare(sql).all(...(params as never[])) as unknown[]).map((r) => plain<T>(r));
}

/** 查询单行 */
export function one<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  const row = getDb().prepare(sql).get(...(params as never[]));
  return row === undefined ? undefined : plain<T>(row);
}

/** 写入，返回新行 id */
export function run(sql: string, ...params: unknown[]): number {
  const r = getDb().prepare(sql).run(...(params as never[]));
  return Number(r.lastInsertRowid);
}

/** 标量查询，用于 count(*) 这类 */
export function scalar(sql: string, ...params: unknown[]): number {
  const row = one<Record<string, number>>(sql, ...params);
  if (!row) return 0;
  return Number(Object.values(row)[0] ?? 0);
}

/** JSON 列的读写助手——SQLite 里没有数组类型，统一存成 JSON 文本 */
export function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function toJsonArray(value: FormDataEntryValue[] | string[] | undefined): string {
  if (!value) return "[]";
  return JSON.stringify(value.map(String).filter(Boolean));
}
