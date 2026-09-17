/**
 * 教研计划解析试跑：
 *   npm run parse -- <文件路径>
 */
import fs from "node:fs";
import path from "node:path";
import { extractText } from "@/lib/extract.ts";
import { parsePlan } from "@/lib/plan-parser.ts";
import { GOAL_KINDS, OUTCOME_KINDS, TOPIC_KINDS } from "@/lib/domain.ts";

const target = process.argv[2];
if (!target) {
  console.error("用法: npm run parse -- <文件路径>");
  process.exit(1);
}

const name = path.basename(target);
const r = await extractText(name, new Uint8Array(fs.readFileSync(target)));
const d = parsePlan(name, r.text);

const kindLabel = TOPIC_KINDS.find((k) => k.key === d.kind)?.label ?? d.kind;
console.log(`标题  ${d.title}`);
if (d.subtitle) console.log(`副题  ${d.subtitle}`);
console.log(`类型  ${kindLabel}   学年 ${d.school_year ?? "—"}   学期 ${d.term ?? "—"}`);
console.log(`背景  ${d.background ? d.background.replace(/\s+/g, " ").slice(0, 60) + "…" : "未解析到"}`);
console.log(`依据  ${d.theory_basis ?? "未解析到"}`);

console.log("目标");
for (const k of GOAL_KINDS) {
  const items = d.goals[k.key] ?? [];
  if (items.length === 0) continue;
  for (const it of items) console.log(`  ${k.label}  ${it.slice(0, 54)}…`);
}
if (Object.keys(d.goals).length === 0) console.log("  （未解析到）");

console.log(`模块  ${d.modules.length} 个`);
d.modules.forEach((m, i) => console.log(`  ${i + 1}. ${m.slice(0, 50)}`));

console.log("成果");
for (const k of OUTCOME_KINDS) {
  const items = d.outcomes[k.key] ?? [];
  if (items.length === 0) continue;
  console.log(`  ${k.label}（${items.length}）`);
  for (const it of items) console.log(`      ${it.slice(0, 46)}…`);
}
if (Object.keys(d.outcomes).length === 0) console.log("  （未解析到）");

console.log(`\n✓ 解析到：${d.found.join("、") || "无"}`);
console.log(`✗ 需手填：${d.missing.join("、") || "无"}`);
