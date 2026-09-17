import { unzipSync } from "fflate";

/**
 * 从上传的文档中提取纯文本，供自动分类与全文检索使用。
 *
 * 全部走纯 JS 解析，不引入原生依赖，也不把文件发往任何外部服务——
 * 文档内容可能包含幼儿姓名和园所内部信息，必须留在本机。
 */

export type ExtractKind = "docx" | "pptx" | "xlsx" | "pdf" | "text" | "unsupported";

export interface ExtractResult {
  kind: ExtractKind;
  text: string;
  /** 解析失败时的原因，用于在界面上告诉用户为什么没能自动分类 */
  error?: string;
}

const TEXT_EXT = new Set([".txt", ".md", ".markdown", ".csv", ".tsv", ".json", ".xml", ".html", ".htm"]);

export function kindOf(fileName: string): ExtractKind {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot === -1 ? "" : lower.slice(dot);
  if (ext === ".docx") return "docx";
  if (ext === ".pptx") return "pptx";
  if (ext === ".xlsx" || ext === ".xlsm") return "xlsx";
  if (ext === ".pdf") return "pdf";
  if (TEXT_EXT.has(ext)) return "text";
  return "unsupported";
}

/** 去掉 XML 标签并还原实体，OOXML 三种格式共用 */
function xmlToText(xml: string, blockTags: RegExp): string {
  return xml
    // 段落/单元格/幻灯片行结束处补换行，否则所有文字会黏成一长串
    .replace(blockTags, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readZip(buf: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(buf);
}

function decode(bytes: Uint8Array | undefined): string {
  return bytes ? new TextDecoder("utf-8").decode(bytes) : "";
}

function fromDocx(buf: Uint8Array): string {
  const files = readZip(buf);
  // 正文 + 页眉页脚（园所文档常把标题放页眉）
  const parts = Object.keys(files)
    .filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))
    .sort((a) => (a === "word/document.xml" ? -1 : 1));
  return parts.map((n) => xmlToText(decode(files[n]), /<\/w:p>/g)).join("\n").trim();
}

function fromPptx(buf: Uint8Array): string {
  const files = readZip(buf);
  const slides = Object.keys(files)
    .filter((n) => /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/.test(n))
    // slide2 要排在 slide10 前面，按数字而非字典序
    .sort((a, b) => (Number(a.match(/\d+/)?.[0]) || 0) - (Number(b.match(/\d+/)?.[0]) || 0));
  return slides.map((n) => xmlToText(decode(files[n]), /<\/a:p>/g)).join("\n").trim();
}

function fromXlsx(buf: Uint8Array): string {
  const files = readZip(buf);
  // 绝大多数文本存在共享字符串表里，工作表本身只存索引
  const shared = xmlToText(decode(files["xl/sharedStrings.xml"]), /<\/si>/g);
  const sheets = Object.keys(files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .map((n) => xmlToText(decode(files[n]), /<\/row>/g))
    .join("\n");
  return [shared, sheets].filter(Boolean).join("\n").trim();
}

async function fromPdf(buf: Uint8Array): Promise<string> {
  // legacy 构建不需要 canvas，只做文本提取
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: buf, useSystemFonts: false });

  try {
    const doc = await task.promise;
    const pages: string[] = [];
    // 政策文件可能上百页，只取前 40 页——分类和检索都够用了
    const max = Math.min(doc.numPages, 40);
    for (let i = 1; i <= max; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      pages.push(
        tc.items
          .map((it) => ("str" in it ? it.str : ""))
          .join("")
          .trim(),
      );
    }
    return pages.filter(Boolean).join("\n").trim();
  } finally {
    // destroy() 在 loadingTask 上，不在 document 上；
    // 放 finally 里确保解析异常时 worker 也会被释放，否则进程不退出
    await task.destroy();
  }
}

export async function extractText(fileName: string, buf: Uint8Array): Promise<ExtractResult> {
  const kind = kindOf(fileName);
  try {
    switch (kind) {
      case "docx":
        return { kind, text: fromDocx(buf) };
      case "pptx":
        return { kind, text: fromPptx(buf) };
      case "xlsx":
        return { kind, text: fromXlsx(buf) };
      case "pdf":
        return { kind, text: await fromPdf(buf) };
      case "text":
        return { kind, text: new TextDecoder("utf-8").decode(buf).trim() };
      default:
        return { kind, text: "", error: "不支持的文件类型，将仅按文件名分类" };
    }
  } catch (e) {
    return { kind, text: "", error: e instanceof Error ? e.message : "解析失败" };
  }
}
