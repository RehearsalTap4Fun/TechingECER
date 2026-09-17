"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { checkDir, resolveInLibrary, syncLibrary } from "@/lib/library";
import { isLocalRequest, revealPath, type RevealMode } from "@/lib/reveal";
import { locateDirectory, type DirSample, type LocateMatch } from "@/lib/locate-dir";
import { exportAll } from "@/lib/export-md";
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
  // 绑定后把应用里已有的内容导一份过去，新目录里不至于只有别人的文档
  const e = await exportAll();

  revalidatePath("/resources");
  revalidatePath("/");
  return {
    ok: `已绑定，索引到 ${r.added} 份文档${e.total > 0 ? `，并导出了 ${e.total} 条应用内记录` : ""}`,
  };
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

export interface LocateState {
  matches?: LocateMatch[];
  error?: string;
  /** 用户拖入的文件夹名，找不到时用于提示 */
  name?: string;
}

/**
 * 根据浏览器交出的「文件夹名 + 抽样文件」在本机定位这个目录。
 *
 * 浏览器不给绝对路径，只能由服务端反查——所以同样只在本机请求时可用。
 */
export async function locateDroppedDir(
  _prev: LocateState,
  fd: FormData,
): Promise<LocateState> {
  if (!(await isLocalRequest())) {
    return { error: "只有在运行本应用的那台机器上才能自动识别目录，请手动填写路径" };
  }

  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "没有读到文件夹名" };

  let samples: DirSample[] = [];
  try {
    const raw = JSON.parse(String(fd.get("samples") ?? "[]"));
    if (Array.isArray(raw)) {
      samples = raw
        .filter((s) => s && typeof s.rel === "string" && Number.isFinite(s.size))
        .slice(0, 30)
        .map((s) => ({ rel: String(s.rel), size: Number(s.size) }));
    }
  } catch {
    // 抽样解析失败就只按名字找
  }

  const r = await locateDirectory(name, samples);
  if (r.matches.length === 0) {
    return {
      name,
      error: r.truncated
        ? `在常用位置里没找到「${name}」（搜索已达上限）。请手动填写它的完整路径。`
        : `在桌面、文稿、下载等常用位置里没找到「${name}」。请手动填写它的完整路径。`,
    };
  }
  return { name, matches: r.matches };
}

/** 把应用里的全部内容重新导出一遍到资料目录，用于修复或补齐 */
export async function exportAllToLibrary() {
  await exportAll();
  revalidatePath("/resources");
}

export interface PreviewData {
  id: number;
  title: string;
  relPath: string | null;
  /** docx | pptx | xlsx | pdf | text | unsupported */
  kind: string;
  /** 可内嵌渲染的方式 */
  render: "pdf" | "image" | "text" | "none";
  /** render === "text" 时的正文 */
  text?: string;
  /** 为什么只能看到这些 */
  note?: string;
  error?: string;
}

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

/**
 * 取一份资料的预览内容。
 *
 * PDF 和图片浏览器能直接渲染，交给 iframe/img；Office 文档渲染不了，
 * 但入库时已经把正文提取出来了，直接拿来当纯文本预览——复核分类时
 * 看正文就够了，不必开 Word。
 */
export async function loadPreview(id: number): Promise<PreviewData> {
  const row = one<{
    id: number;
    title: string;
    rel_path: string | null;
    extract_kind: string | null;
    content_text: string | null;
    missing: number;
  }>(
    "SELECT id, title, rel_path, extract_kind, content_text, missing FROM resources WHERE id = ?",
    id,
  );

  if (!row) return { id, title: "", relPath: null, kind: "", render: "none", error: "找不到这份资料" };
  if (row.missing === 1) {
    return {
      id,
      title: row.title,
      relPath: row.rel_path,
      kind: row.extract_kind ?? "",
      render: "none",
      error: "文件已不在资料目录里",
    };
  }

  const kind = row.extract_kind ?? "unsupported";
  const lower = (row.rel_path ?? "").toLowerCase();
  const isImage = IMAGE_EXTS.some((e) => lower.endsWith(e));

  if (isImage) {
    return { id, title: row.title, relPath: row.rel_path, kind, render: "image" };
  }
  if (kind === "pdf") {
    return { id, title: row.title, relPath: row.rel_path, kind, render: "pdf" };
  }

  const text = (row.content_text ?? "").trim();
  if (!text) {
    return {
      id,
      title: row.title,
      relPath: row.rel_path,
      kind,
      render: "none",
      note: kind === "unsupported" ? "这种文件类型无法提取正文，请下载后查看。" : "没能提取出正文。",
    };
  }

  return {
    id,
    title: row.title,
    relPath: row.rel_path,
    kind,
    render: "text",
    text: text.slice(0, 60_000),
    note:
      kind === "text"
        ? undefined
        : "浏览器无法渲染 Office 文档，以下是入库时提取的纯文本（不含排版与图片）。",
  };
}
