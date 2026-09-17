/**
 * 分类器回归评测：跑 fixtures/classify 下的用例，比对 expected.json。
 *
 *   npm run classify:eval
 *
 * 词表是靠人工调的，改动一处很容易顾此失彼——每次动 classify.ts 都跑一遍。
 * expected.json 里 null 表示"应当判为未判定"，这和"判错"同样重要：
 * 政策文件不该被归到某个领域，覆盖全园的文件不该被归到某个年龄班。
 */
import fs from "node:fs";
import path from "node:path";
import { classify } from "@/lib/classify.ts";

interface Expected {
  file: string;
  category: string;
  domain: string | null;
  ageGroup: string | null;
}

const dir = path.join(process.cwd(), "fixtures", "classify");
const expected: Expected[] = JSON.parse(fs.readFileSync(path.join(dir, "expected.json"), "utf8"));

let pass = 0;
let fail = 0;
const failures: string[] = [];

const mark = (ok: boolean) => (ok ? "✓" : "✗");
const show = (v: string | null) => v ?? "未判定";

for (const e of expected) {
  const text = fs.readFileSync(path.join(dir, e.file), "utf8");
  const c = classify(e.file, text);

  const got = {
    category: c.category.value,
    domain: c.domain?.value ?? null,
    ageGroup: c.ageGroup?.value ?? null,
  };

  const okCat = got.category === e.category;
  const okDom = got.domain === e.domain;
  const okAge = got.ageGroup === e.ageGroup;
  const ok = okCat && okDom && okAge;

  ok ? pass++ : fail++;
  if (!ok) failures.push(e.file);

  console.log(
    `${mark(ok)} ${e.file.replace(/\.md$/, "")}\n` +
      `    分类 ${mark(okCat)} ${got.category}${okCat ? "" : ` (期望 ${e.category})`}` +
      `   领域 ${mark(okDom)} ${show(got.domain)}${okDom ? "" : ` (期望 ${show(e.domain)})`}` +
      `   年龄 ${mark(okAge)} ${show(got.ageGroup)}${okAge ? "" : ` (期望 ${show(e.ageGroup)})`}`,
  );
}

const total = pass + fail;
console.log(`\n${pass}/${total} 通过`);
if (fail > 0) {
  console.log(`失败: ${failures.join("、")}`);
  process.exit(1);
}
