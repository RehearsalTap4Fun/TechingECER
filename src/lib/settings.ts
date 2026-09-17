import { getDb, one } from "@/lib/db";

/** 用户绑定的资料目录：文档放在这里，应用原地索引，不复制副本 */
export const LIBRARY_DIR = "library_dir";

export function getSetting(key: string): string | null {
  const row = one<{ value: string }>("SELECT value FROM settings WHERE key = ?", key);
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                      updated_at = datetime('now','localtime')`,
    )
    .run(key, value);
}

export function clearSetting(key: string): void {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}

export function getLibraryDir(): string | null {
  // 环境变量优先，便于多台机器共用一份代码但各指各的目录
  return process.env.ECER_LIBRARY_DIR?.trim() || getSetting(LIBRARY_DIR);
}
