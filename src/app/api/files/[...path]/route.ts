import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { UPLOAD_ROOT } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * 上传文件的取回入口。
 *
 * 为什么不放 public/ 直接静态托管：Next.js 在**构建时**扫描 public/ 生成静态
 * 清单，运行时新写入的文件不在清单里，一律 404。上传是运行时行为，所以必须
 * 走路由处理器按请求读盘。文件因此存在 data/uploads/，和数据库放在一起，
 * 备份只需要拷 data/ 一个目录。
 */

/** 浏览器能直接渲染的类型内联打开，其余一律下载 */
const INLINE_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".markdown": "text/plain; charset=utf-8",
  ".csv": "text/plain; charset=utf-8",
  ".tsv": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const DOWNLOAD_TYPES: Record<string, string> = {
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
  ".xls": "application/vnd.ms-excel",
};

/** 落盘时加了时间戳前缀防重名，给用户的文件名要去掉 */
function displayName(stored: string): string {
  return stored.replace(/^\d{10,}-/, "");
}

/** RFC 5987：中文文件名必须编码，同时给不支持的老浏览器留一个 ASCII 回退 */
function contentDisposition(kind: "inline" | "attachment", name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;

  // 目录穿越防护：拼接后必须仍在 UPLOAD_ROOT 之内
  const rel = segments.map((s) => decodeURIComponent(s)).join("/");
  const abs = path.resolve(UPLOAD_ROOT, rel);
  if (abs !== UPLOAD_ROOT && !abs.startsWith(UPLOAD_ROOT + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }

  let info;
  try {
    info = await stat(abs);
  } catch {
    return new Response("Not Found", { status: 404 });
  }
  if (!info.isFile()) return new Response("Not Found", { status: 404 });

  const ext = path.extname(abs).toLowerCase();
  const stored = path.basename(abs);
  const name = displayName(stored);

  // ?download=1 强制下载，用于「即便是 PDF 也想存下来」的场景
  const forceDownload = req.nextUrl.searchParams.get("download") === "1";
  const inlineType = INLINE_TYPES[ext];
  const kind = inlineType && !forceDownload ? "inline" : "attachment";
  const type = inlineType ?? DOWNLOAD_TYPES[ext] ?? "application/octet-stream";

  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(info.size),
      "Content-Disposition": contentDisposition(kind, name),
      // 文件名带时间戳、内容不会变，可长期缓存；但只在本机/内网，保守些
      "Cache-Control": "private, max-age=3600",
    },
  });
}
