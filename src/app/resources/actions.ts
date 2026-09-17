"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { checkDir, resolveInLibrary, syncLibrary } from "@/lib/library";
import { isLocalRequest, revealPath, type RevealMode } from "@/lib/reveal";
import { LIBRARY_DIR, clearSetting, setSetting } from "@/lib/settings";
import { one } from "@/lib/db";

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

export interface RevealState {
  error?: string;
  ok?: string;
}

/**
 * 在本机文件管理器里定位（reveal）或直接打开（open）一份资料。
 *
 * 非本机请求一律拒绝——那样打开的是服务器那台机器的窗口。界面在渲染时
 * 就已经按是否本机决定了展示方式，这里再挡一次，防止动作被直接调用。
 */
export async function revealResource(_prev: RevealState, fd: FormData): Promise<RevealState> {
  if (!(await isLocalRequest())) {
    return { error: "只有在运行本应用的那台机器上才能定位文件，请改用下载" };
  }

  const id = Number(fd.get("id"));
  const mode = (String(fd.get("mode") || "reveal") === "open" ? "open" : "reveal") as RevealMode;
  if (!id) return { error: "缺少资料 id" };

  const row = one<{ rel_path: string | null }>(
    "SELECT rel_path FROM resources WHERE id = ?",
    id,
  );
  if (!row?.rel_path) return { error: "这条资料没有关联本地文件" };

  const abs = resolveInLibrary(row.rel_path);
  if (!abs) return { error: "资料目录未绑定，或路径已失效" };

  const r = await revealPath(abs, mode);
  if (!r.ok) return { error: r.error };
  return { ok: mode === "reveal" ? "已在文件管理器中定位" : "已用默认程序打开" };
}
