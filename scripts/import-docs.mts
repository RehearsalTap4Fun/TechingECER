/**
 * 批量导入一个目录下的文档，按正文内容自动分类入库。
 * 用于把散在各处的历史资料一次性收进资源库。
 *
 *   npm run import -- <目录路径> [--dry]
 *
 * --dry 只打印分类结果，不写入数据库、不复制文件。
 */
import fs from "node:fs";
import path from "node:path";
import { extractText, kindOf } from "@/lib/extract.ts";
import { classify } from "@/lib/classify.ts";
import { ingestFile } from "@/lib/ingest.ts";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const dir = args.find((a) => !a.startsWith("--"));

if (!dir) {
  console.error("用法: npm run import -- <目录路径> [--dry]");
  process.exit(1);
}
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error(`不是一个目录: ${dir}`);
  process.exit(1);
}

/** 递归收集文件，跳过隐藏文件和 Office 临时文件（~$ 开头） */
function walk(root: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name.startsWith("~$")) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(dir).filter((f) => kindOf(path.basename(f)) !== "unsupported");
if (files.length === 0) {
  console.log("没有找到可解析的文档（支持 docx / pptx / xlsx / pdf / txt / md / csv）");
  process.exit(0);
}

console.log(`${dry ? "[试运行] " : ""}发现 ${files.length} 个文档\n`);

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const byCategory = new Map<string, number>();
let failed = 0;

for (const full of files) {
  const name = path.basename(full);
  const bytes = new Uint8Array(fs.readFileSync(full));

  if (dry) {
    const r = await extractText(name, bytes);
    const c = classify(name, r.text);
    if (r.error) failed++;
    byCategory.set(c.category.value, (byCategory.get(c.category.value) ?? 0) + 1);
    console.log(`${c.category.value.padEnd(6)} ${pct(c.category.confidence).padStart(4)}  ${name}`);
    if (r.error) console.log(`${" ".repeat(13)}⚠ ${r.error}`);
  } else {
    const o = await ingestFile(name, bytes);
    if (o.error) failed++;
    byCategory.set(o.category, (byCategory.get(o.category) ?? 0) + 1);
    console.log(`${o.category.padEnd(6)} ${pct(o.confidence).padStart(4)}  ${o.fileName}`);
  }
}

console.log("\n── 分类统计 ──");
for (const [cat, n] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(6)} ${n}`);
}
if (failed > 0) console.log(`  ⚠ ${failed} 个文件正文解析失败，仅按文件名分类`);
if (!dry) console.log("\n已入库，到 /resources 复核分类结果。");
