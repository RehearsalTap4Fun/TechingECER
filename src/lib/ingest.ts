import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractText } from "@/lib/extract";
import { classify } from "@/lib/classify";
import { run } from "@/lib/db";

/** 上传目录：public/uploads，按年月分子目录，避免单目录堆上万个文件 */
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/** 单个文件大小上限，防止误传大视频撑爆磁盘 */
export const MAX_FILE_BYTES = 30 * 1024 * 1024;

const ILLEGAL_NAME_CHARS = new Set(['<', '>', ':', '"', '|', '?', '*']);

/** 文件名消毒：去掉路径分隔符、控制字符和 Windows 保留字符，保留中文 */
export function safeName(name: string): string {
  const cleaned = [...name.replace(/[/\\]/g, "_")]
    .filter((ch) => ch.codePointAt(0)! > 31 && !ILLEGAL_NAME_CHARS.has(ch))
    .join("")
    .replace(/^\.+/, "")
    .slice(0, 180);
  return cleaned || "未命名文件";
}

export interface IngestOutcome {
  id: number;
  title: string;
  fileName: string;
  category: string;
  confidence: number;
  matched: string[];
  domainKey: string | null;
  ageGroup: string | null;
  tags: string[];
  chars: number;
  kind: string;
  error?: string;
}

/**
 * 把一个文件收进资源库：落盘 → 提取正文 → 内容分类 → 入库。
 *
 * 分类结果写进 auto_* 列，同时作为 category/domain_key/age_group 的初值。
 * reviewed=0 表示尚未经人工确认，界面上会标出来让教师复核。
 */
export async function ingestFile(
  originalName: string,
  bytes: Uint8Array,
  opts: { description?: string | null } = {},
): Promise<IngestOutcome> {
  const fileName = safeName(originalName);

  const now = new Date();
  const subDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await mkdir(path.join(UPLOAD_ROOT, subDir), { recursive: true });

  // 同名文件不覆盖：加时间戳前缀
  const stored = `${now.getTime()}-${fileName}`;
  const relPath = `uploads/${subDir}/${stored}`;
  await writeFile(path.join(UPLOAD_ROOT, subDir, stored), bytes);

  const extracted = await extractText(fileName, bytes);
  const result = classify(fileName, extracted.text);

  // 标题取文件名去掉扩展名——教师给文件起的名字通常比正文首行更贴切
  const title = fileName.replace(/\.[^.]+$/, "") || fileName;

  const id = run(
    `INSERT INTO resources
       (title, category, domain_key, age_group, url, file_path, description, tags,
        file_name, file_size, extract_kind, content_text,
        auto_category, auto_confidence, auto_matched, reviewed)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
    title,
    result.category.value,
    result.domain?.value ?? null,
    result.ageGroup?.value ?? null,
    null,
    relPath,
    opts.description ?? (result.summary || null),
    JSON.stringify(result.tags),
    fileName,
    bytes.byteLength,
    extracted.kind,
    // 正文最多留 200KB，够检索用，也不会把数据库撑大
    extracted.text.slice(0, 200_000),
    result.category.value,
    result.category.confidence,
    JSON.stringify(result.category.matched),
  );

  return {
    id,
    title,
    fileName,
    category: result.category.value,
    confidence: result.category.confidence,
    matched: result.category.matched,
    domainKey: result.domain?.value ?? null,
    ageGroup: result.ageGroup?.value ?? null,
    tags: result.tags,
    chars: extracted.text.length,
    kind: extracted.kind,
    error: extracted.error,
  };
}
