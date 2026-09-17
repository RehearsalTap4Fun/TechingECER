"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { checkDir, syncLibrary } from "@/lib/library";
import { LIBRARY_DIR, clearSetting, setSetting } from "@/lib/settings";

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export interface BindState {
  error?: string;
  ok?: string;
}

/** 首次使用：绑定资料目录，并立刻做一次全量扫描 */
export async function bindLibrary(_prev: BindState, fd: FormData): Promise<BindState> {
  const dir = text(fd, "dir") ?? "";
  const check = await checkDir(dir);
  if (!check.ok) return { error: check.error };

  setSetting(LIBRARY_DIR, dir.trim());
  const r = await syncLibrary({ force: true });

  revalidatePath("/resources");
  revalidatePath("/");
  return { ok: `已绑定，索引到 ${r.added} 份文档` };
}

export async function unbindLibrary() {
  clearSetting(LIBRARY_DIR);
  // 索引随之作废：文件本身没动，只是应用不再跟踪它们
  getDb().prepare("DELETE FROM resources WHERE rel_path IS NOT NULL").run();
  revalidatePath("/resources");
  revalidatePath("/");
}

/** 手动重新扫描，用于刚往目录里放了文件、不想等页面缓存的场景 */
export async function rescanLibrary() {
  await syncLibrary({ force: true });
  revalidatePath("/resources");
  revalidatePath("/");
}

/** 归档：确认系统给的分类 */
export async function archiveResource(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  getDb().prepare("UPDATE resources SET reviewed = 1 WHERE id = ?").run(id);
  revalidatePath("/resources");
  revalidatePath("/");
}

/** 改判分类并归档 */
export async function reclassifyResource(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;

  getDb()
    .prepare("UPDATE resources SET category=?, domain_key=?, age_group=?, reviewed=1 WHERE id=?")
    .run(
      String(fd.get("category")),
      (fd.get("domain_key") as string) || null,
      (fd.get("age_group") as string) || null,
      id,
    );

  revalidatePath("/resources");
  revalidatePath("/");
}

/** 撤回归档，退回待归档队列 */
export async function unarchiveResource(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  getDb().prepare("UPDATE resources SET reviewed = 0 WHERE id = ?").run(id);
  revalidatePath("/resources");
}

/** 清理已失联的索引记录（文件已从目录中删除） */
export async function purgeMissing() {
  getDb().prepare("DELETE FROM resources WHERE missing = 1").run();
  revalidatePath("/resources");
  revalidatePath("/");
}
