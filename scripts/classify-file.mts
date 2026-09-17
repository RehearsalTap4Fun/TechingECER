/**
 * 单个文件的分类试跑，用于调词表：
 *   npm run classify -- <文件路径>
 */
import fs from "node:fs";
import path from "node:path";
import { extractText } from "@/lib/extract.ts";
import { classify } from "@/lib/classify.ts";

const target = process.argv[2];
if (!target) {
  console.error("用法: npm run classify -- <文件路径>");
  process.exit(1);
}

const name = path.basename(target);
const r = await extractText(name, new Uint8Array(fs.readFileSync(target)));
const c = classify(name, r.text);

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
console.log(`文件  ${name}`);
console.log(`解析  ${r.kind} · ${r.text.length} 字${r.error ? " · " + r.error : ""}`);
console.log(`分类  ${c.category.value}  ${pct(c.category.confidence)}  ← ${c.category.matched.join("、") || "无命中"}`);
console.log(`领域  ${c.domain ? `${c.domain.value}  ${pct(c.domain.confidence)}  ← ${c.domain.matched.join("、")}` : "未判定"}`);
console.log(`年龄  ${c.ageGroup ? `${c.ageGroup.value}  ${pct(c.ageGroup.confidence)}` : "未判定"}`);
console.log(`标签  ${c.tags.join("、") || "无"}`);
console.log(`摘要  ${c.summary.slice(0, 100)}…`);
