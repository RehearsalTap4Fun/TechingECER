import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { getDb, one, run } from "@/lib/db";
import { extractText, kindOf } from "@/lib/extract";
import { classify } from "@/lib/classify";
import { getLibraryDir } from "@/lib/settings";

/**
 * 资料目录索引。
 *
 * 文件系统是唯一真相：用户把文档放进自己绑定的目录，应用**原地索引**，
 * 不复制副本、不改动原文件。删了文件就是删了，改了文件下次扫描会重新解析。
 *
 * 归档状态（resources.reviewed）是应用自己的账：
 *   0 = 待归档，系统给了分类建议但没人确认过，停在资源页等着处理
 *   1 = 已归档，分类经人确认，会出现在对应模块的「相关资料」里
 */

/** 会被索引的文档类型。其余文件（压缩包、视频、系统文件…）跳过并计数 */
const DOCUMENT_EXTS = new Set([
  ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xlsm", ".xls",
  ".pdf", ".txt", ".md", ".markdown", ".csv", ".tsv", ".rtf",
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
]);

/** 扫描时跳过的目录：系统目录与常见的同步软件副本目录 */
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".svn", "__MACOSX", ".Trash", "$RECYCLE.BIN",
  "System Volume Information",
]);

export interface DirCheck {
  ok: boolean;
  error?: string;
  /** 目录里有多少个可索引的文档，绑定前给用户一个预期 */
  documentCount?: number;
}

/** 绑定前校验：存在、是目录、可读 */
export async function checkDir(dir: string): Promise<DirCheck> {
  const trimmed = dir.trim();
  if (!trimmed) return { ok: false, error: "请填写目录路径" };
  if (!path.isAbsolute(trimmed)) return { ok: false, error: "请填写绝对路径，如 /Users/你的用户名/幼儿园资料" };

  let info;
  try {
    info = await stat(trimmed);
  } catch {
    return { ok: false, error: "目录不存在，或应用没有权限访问" };
  }
  if (!info.isDirectory()) return { ok: false, error: "这是一个文件，不是目录" };

  try {
    const files = await walk(trimmed, trimmed, 0);
    return { ok: true, documentCount: files.length };
  } catch {
    return { ok: false, error: "目录无法读取，请检查权限" };
  }
}

interface FoundFile {
  rel: string;
  abs: string;
  size: number;
  mtime: number;
}

/** 递归收集可索引文档。限制深度，避免用户误绑到根目录时扫穿整块盘 */
async function walk(root: string, dir: string, depth: number): Promise<FoundFile[]> {
  if (depth > 8) return [];

  const out: FoundFile[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const e of entries) {
    // 隐藏文件与 Office 编辑时产生的 ~$ 临时文件一律跳过
    if (e.name.startsWith(".") || e.name.startsWith("~$")) continue;
    const abs = path.join(dir, e.name);

    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...(await walk(root, abs, depth + 1)));
      continue;
    }
    if (!e.isFile()) continue;
    if (!DOCUMENT_EXTS.has(path.extname(e.name).toLowerCase())) continue;

    try {
      const info = await stat(abs);
      out.push({ rel: path.relative(root, abs), abs, size: info.size, mtime: Math.floor(info.mtimeMs) });
    } catch {
      // 扫描过程中文件被删/被锁，跳过即可，下次扫描再说
    }
  }
  return out;
}

export interface SyncResult {
  bound: boolean;
  dir?: string;
  added: number;
  updated: number;
  unchanged: number;
  /** 记录还在、文件已不在目录里 */
  missing: number;
  /** 文件回来了 */
  restored: number;
  error?: string;
}

const EMPTY: SyncResult = { bound: false, added: 0, updated: 0, unchanged: 0, missing: 0, restored: 0 };

/** 同一次页面渲染可能触发多次，做个极简节流，避免重复扫盘 */
let lastSyncAt = 0;
let lastResult: SyncResult = EMPTY;

/**
 * 扫描资料目录并同步到 resources 表。
 *
 * 只对**新文件和改动过的文件**做解析——提取正文（尤其 PDF）是这里唯一昂贵的
 * 操作，靠 size + mtime 指纹跳过没变的文件，日常进页面时几乎不花时间。
 */
export async function syncLibrary(opts: { force?: boolean } = {}): Promise<SyncResult> {
  const dir = getLibraryDir();
  if (!dir) return EMPTY;

  if (!opts.force && Date.now() - lastSyncAt < 3000) return lastResult;

  const result: SyncResult = { ...EMPTY, bound: true, dir };

  let files: FoundFile[];
  try {
    files = await walk(dir, dir, 0);
  } catch {
    lastSyncAt = Date.now();
    lastResult = { ...result, error: "资料目录无法读取，请检查路径是否还在、是否有权限" };
    return lastResult;
  }

  const db = getDb();
  const existing = new Map(
    (
      db
        .prepare("SELECT id, rel_path, file_size, file_mtime, missing, reviewed FROM resources WHERE rel_path IS NOT NULL")
        .all() as Array<{
        id: number;
        rel_path: string;
        file_size: number | null;
        file_mtime: number | null;
        missing: number;
        reviewed: number;
      }>
    ).map((r) => [r.rel_path, r]),
  );

  const seen = new Set<string>();

  for (const f of files) {
    seen.add(f.rel);
    const prev = existing.get(f.rel);

    if (prev && prev.file_size === f.size && prev.file_mtime === f.mtime) {
      if (prev.missing === 1) {
        db.prepare("UPDATE resources SET missing = 0 WHERE id = ?").run(prev.id);
        result.restored++;
      } else {
        result.unchanged++;
      }
      continue;
    }

    const fileName = path.basename(f.rel);
    let text = "";
    let kind = kindOf(fileName);
    if (kind !== "unsupported") {
      try {
        const buf = await readFile(f.abs);
        const ex = await extractText(fileName, new Uint8Array(buf));
        text = ex.text;
        kind = ex.kind;
      } catch {
        // 读不了就当没正文，仍按文件名分类
      }
    }
    const c = classify(fileName, text);
    const title = fileName.replace(/\.[^.]+$/, "") || fileName;

    if (prev) {
      // 已归档的文件改动后保留人工分类，只刷新正文与系统建议
      const keepHuman = prev.reviewed === 1;
      db.prepare(
        `UPDATE resources SET
           title = CASE WHEN ? THEN title ELSE ? END,
           category = CASE WHEN ? THEN category ELSE ? END,
           domain_key = CASE WHEN ? THEN domain_key ELSE ? END,
           age_group = CASE WHEN ? THEN age_group ELSE ? END,
           tags = ?, file_name = ?, file_size = ?, file_mtime = ?, extract_kind = ?,
           content_text = ?, auto_category = ?, auto_confidence = ?, auto_matched = ?,
           missing = 0
         WHERE id = ?`,
      ).run(
        keepHuman ? 1 : 0, title,
        keepHuman ? 1 : 0, c.category.value,
        keepHuman ? 1 : 0, c.domain?.value ?? null,
        keepHuman ? 1 : 0, c.ageGroup?.value ?? null,
        JSON.stringify(c.tags),
        fileName, f.size, f.mtime, kind,
        text.slice(0, 200_000),
        c.category.value, c.category.confidence, JSON.stringify(c.category.matched),
        prev.id,
      );
      result.updated++;
    } else {
      run(
        `INSERT INTO resources
           (title, category, domain_key, age_group, url, file_path, rel_path, description, tags,
            file_name, file_size, file_mtime, extract_kind, content_text,
            auto_category, auto_confidence, auto_matched, reviewed, missing)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0)`,
        title,
        c.category.value,
        c.domain?.value ?? null,
        c.ageGroup?.value ?? null,
        null,
        f.rel,
        f.rel,
        c.summary || null,
        JSON.stringify(c.tags),
        fileName,
        f.size,
        f.mtime,
        kind,
        text.slice(0, 200_000),
        c.category.value,
        c.category.confidence,
        JSON.stringify(c.category.matched),
      );
      result.added++;
    }
  }

  // 目录里不见了的：标记而不是删除，人工做过的分类不能因为文件临时移走就丢掉
  const gone = [...existing.values()].filter((r) => !seen.has(r.rel_path) && r.missing === 0);
  if (gone.length > 0) {
    const mark = db.prepare("UPDATE resources SET missing = 1 WHERE id = ?");
    for (const r of gone) mark.run(r.id);
    result.missing = gone.length;
  }

  lastSyncAt = Date.now();
  lastResult = result;
  return result;
}

/** 把索引里的相对路径还原成绝对路径，取回文件时用 */
export function resolveInLibrary(relPath: string): string | null {
  const dir = getLibraryDir();
  if (!dir) return null;
  const abs = path.resolve(dir, relPath);
  // 目录穿越防护：拼接后必须仍在资料目录内
  if (abs !== dir && !abs.startsWith(dir + path.sep)) return null;
  return abs;
}
