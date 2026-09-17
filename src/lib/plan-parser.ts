import type { GoalKindKey, OutcomeKindKey, TopicKindKey } from "@/lib/domain";

/**
 * 从教研计划文档的正文解析出专题草稿。
 *
 * 园所的教研计划有相当规整的骨架：
 *   一、教研背景   二、教研目标（1.认识目标…4.成果目标）
 *   三、教研内容（主题一：… 主题四：…）   四、预期成果（（一）认识性…（三）操作性）
 *
 * 但各园、各类计划的章节编号和措辞并不统一（有的写「专题教研背景」，
 * 教师培养计划则是「编制依据」「培养目标」），所以按**表头关键词**匹配，
 * 而不是认死一、二、三的位置。解析不到的部分留空并在 missing 里报出来，
 * 由人在表单里补——这和文档分类一样，系统只给草稿，不替人做决定。
 */

export interface PlanDraft {
  title: string;
  subtitle: string | null;
  kind: TopicKindKey;
  school_year: string | null;
  term: string | null;
  background: string | null;
  theory_basis: string | null;
  goals: Record<string, string[]>;
  modules: string[];
  outcomes: Record<string, string[]>;
  /** 成功解析出的部分，展示给用户 */
  found: string[];
  /** 没解析到、需要手工补的部分 */
  missing: string[];
}

/** 一级章节表头：「一、教研背景」 */
const SECTION_RE = /^([一二三四五六七八九十]+)、\s*(.+?)\s*$/;
/** 二级表头：「（一）物化成果」 */
const SUBSECTION_RE = /^（([一二三四五六七八九十]+)）\s*(.+?)\s*$/;
/** 编号条目：「1. 认识目标：…」「2、…」 */
const NUMBERED_RE = /^(\d+)\s*[.、)]\s*(.+)$/;
/** 主题模块：「主题一：读懂经验——…」 */
const MODULE_RE = /^主题([一二三四五六七八九十]+)\s*[：:、]\s*(.+)$/;

interface Section {
  title: string;
  lines: string[];
}

function splitSections(lines: string[]): { head: string[]; sections: Section[] } {
  const head: string[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const m = SECTION_RE.exec(line);
    if (m) {
      current = { title: m[2], lines: [] };
      sections.push(current);
      continue;
    }
    if (current) current.lines.push(line);
    else head.push(line);
  }
  return { head, sections };
}

/** 按表头关键词找章节，靠前的关键词优先 */
function findSection(sections: Section[], keywords: string[]): Section | undefined {
  for (const kw of keywords) {
    const hit = sections.find((s) => s.title.includes(kw));
    if (hit) return hit;
  }
  return undefined;
}

/** 把章节正文按「（一）…」切成子块 */
function splitSubsections(section: Section): Array<{ title: string; lines: string[] }> {
  const out: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of section.lines) {
    const m = SUBSECTION_RE.exec(line);
    if (m) {
      current = { title: m[2], lines: [] };
      out.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }
  return out;
}

/**
 * 表格残渣。
 *
 * Word 表格被提取成一行一个单元格，「物化成果」若是用表格排的，
 * 「完成时间」「产出组别」列会混进条目里——一份汇总计划曾因此解析出
 * 22 条成果（11 个成果名 + 11 个日期）。这里按形态剔除。
 */
const TABLE_NOISE_RE = [
  /^\d{4}\s*[年./-]\s*\d{1,2}\s*月?$/, // 2027年1月
  /^\d{1,2}\s*月(底|初|中)?$/, // 1月底
  /^\d+$/, // 序号
  /^[\u4e00-\u9fa5]{1,4}组$/, // 语言组 / 大班组
  /^(序号|成果名称|产出组别|完成时间|负责人|备注|时间|内容)$/,
];

function isNoise(line: string): boolean {
  return TABLE_NOISE_RE.some((re) => re.test(line));
}

/**
 * 取一个块里的条目：优先按「1. 2. 3.」拆；没有编号就把每个自然段当一条。
 * 计划里的「认识性成果」常常是一整段话，这时整段就是一条。
 */
function itemsOf(lines: string[]): string[] {
  const clean = lines.filter((l) => !isNoise(l));
  const numbered = clean.map((l) => NUMBERED_RE.exec(l)).filter(Boolean);
  if (numbered.length > 0) return numbered.map((m) => m![2].trim()).filter(Boolean);
  return clean.filter((l) => l.length > 6);
}

const GOAL_KEYWORDS: Array<[GoalKindKey, string]> = [
  ["cognition", "认识目标"],
  ["ability", "能力目标"],
  ["practice", "实践目标"],
  ["outcome", "成果目标"],
];

const OUTCOME_KEYWORDS: Array<[OutcomeKindKey, string]> = [
  ["conceptual", "认识性"],
  ["material", "物化"],
  ["operational", "操作性"],
];

function detectKind(text: string): TopicKindKey {
  if (/小课题|课题研究|课题《/.test(text)) return "project";
  if (/培养计划|培训计划|梯队/.test(text)) return "training";
  return "topic";
}

function detectTerm(text: string): string | null {
  if (/上期|上学期/.test(text)) return "上期";
  if (/下期|下学期/.test(text)) return "下期";
  if (/研究周期为一年|周期为一年|全年|学年度/.test(text)) return "全年";
  return null;
}

export function parsePlan(fileName: string, rawText: string): PlanDraft {
  const lines = rawText.split("\n");
  const { head, sections } = splitSections(lines);

  const found: string[] = [];
  const missing: string[] = [];

  // ── 标题 ──
  // 计划文档通常两行：第一行是「XXXX学年（上期）专题教研计划」，
  // 第二行「——真正的研究主题」才是专题名
  const dashLine = head.find((l) => /^[—–-]{2,}/.test(l));
  const planLine = head[0] ?? "";
  const title = (dashLine ?? planLine)
    .replace(/^[—–-]+/, "")
    .replace(/^《|》$/g, "")
    .trim();
  const subtitle = dashLine && planLine !== dashLine ? planLine.trim() : null;
  if (title) found.push("标题");
  else missing.push("标题");

  const header = `${fileName} ${head.join(" ")}`;
  const yearMatch = /(\d{4})\s*[-—–~]\s*(\d{4})/.exec(header);
  const school_year = yearMatch ? `${yearMatch[1]}-${yearMatch[2]}` : null;
  // 学期标注常只出现在标题（「（上期）」），但课题类计划会把「研究周期为一年」
  // 写在正文里，所以正文开头也一并扫
  const term = detectTerm(header) ?? detectTerm(rawText.slice(0, 1500));
  const kind = detectKind(header);

  // ── 背景 ──
  const bgSection = findSection(sections, ["背景", "指导思想", "编制依据", "现状"]);
  const background = bgSection ? bgSection.lines.join("\n") : null;
  background ? found.push("背景") : missing.push("背景");

  // 理论支撑：背景段里被《》括起来的文献与文件
  const refs = [...new Set((background ?? "").match(/《[^《》]{2,40}》/g) ?? [])];
  const theory_basis = refs.length > 0 ? refs.join("、") : null;
  if (theory_basis) found.push("理论支撑");

  // ── 目标 ──
  const goalSection = findSection(sections, ["教研目标", "研究目标", "目标"]);
  const goals: Record<string, string[]> = {};
  if (goalSection) {
    const flat = goalSection.lines.join("\n");
    for (const [key, kw] of GOAL_KEYWORDS) {
      // 「2. 能力目标（核心目标）：提升…」——括号里的修饰要跳过
      const re = new RegExp(`${kw}[^：:]{0,12}[：:]\\s*([^\\n]+)`, "g");
      const hits = [...flat.matchAll(re)].map((m) => m[1].trim()).filter(Boolean);
      if (hits.length > 0) goals[key] = hits;
    }
  }
  Object.keys(goals).length > 0 ? found.push("教研目标") : missing.push("教研目标");

  // ── 主题模块 ──
  const contentSection = findSection(sections, ["教研内容", "研究内容", "内容"]);
  const modules = (contentSection?.lines ?? [])
    .map((l) => MODULE_RE.exec(l))
    .filter(Boolean)
    .map((m) => m![2].trim());
  modules.length > 0 ? found.push(`主题模块 ${modules.length} 个`) : missing.push("主题模块");

  // ── 预期成果 ──
  const outcomeSection = findSection(sections, ["预期成果", "研究成果", "成果"]);
  const outcomes: Record<string, string[]> = {};
  if (outcomeSection) {
    for (const sub of splitSubsections(outcomeSection)) {
      const hit = OUTCOME_KEYWORDS.find(([, kw]) => sub.title.includes(kw));
      if (!hit) continue;
      const items = itemsOf(sub.lines);
      if (items.length > 0) outcomes[hit[0]] = items;
    }
  }
  Object.keys(outcomes).length > 0 ? found.push("预期成果") : missing.push("预期成果");

  return {
    title: title || fileName.replace(/\.[^.]+$/, ""),
    subtitle,
    kind,
    school_year,
    term,
    background,
    theory_basis,
    goals,
    modules,
    outcomes,
    found,
    missing,
  };
}
