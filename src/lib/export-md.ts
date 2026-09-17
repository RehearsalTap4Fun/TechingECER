import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { all, one, parseJsonArray } from "@/lib/db";
import {
  AGE_GROUP_MAP,
  DOMAIN_MAP,
  FAMILY_NOTE_KINDS,
  GOAL_KINDS,
  GOAL_MAP,
  OBSERVATION_METHODS,
  OUTCOME_KINDS,
  RESEARCH_TYPES,
  TOPIC_KINDS,
} from "@/lib/domain";
import { ECERS_SUBSCALES, qualityLevel, subscaleAverage, totalAverage } from "@/lib/ecers";
import { getLibraryDir } from "@/lib/settings";

/**
 * 把应用里创建的内容同时写一份 Markdown 到资料目录。
 *
 * 单向导出：**应用是唯一的写入方**，导出的文件供在访达里查看、发给同事、
 * 随你原有的备份方式一起备份。直接编辑导出文件不会回流到应用，下次保存会被
 * 覆盖——所以每个文件顶部都写明了这一点。
 *
 * 导出目录被扫描器跳过（见 library.ts 的 SKIP_DIRS），否则应用写出的文件
 * 会被自己当成新资料索引进待归档队列，自己喂自己。
 *
 * 导出失败不影响数据本身：数据在数据库里，文件只是副本。
 */

export const EXPORT_DIR_NAME = "应用导出";

export type ExportKind =
  | "lesson"
  | "topic"
  | "session"
  | "observation"
  | "family"
  | "assessment";

const SUBDIR: Record<ExportKind, string> = {
  lesson: "教案",
  topic: path.join("教研", "专题"),
  session: path.join("教研", "活动"),
  observation: "观察记录",
  family: "家园共育",
  assessment: "ECERS评估",
};

const ILLEGAL = new Set(["<", ">", ":", '"', "|", "?", "*", "/", "\\"]);

/** 文件名消毒：去掉路径分隔符与系统保留字符，保留中文 */
function safe(name: string): string {
  const cleaned = [...name]
    .filter((ch) => ch.codePointAt(0)! > 31 && !ILLEGAL.has(ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "未命名";
}

function header(title: string, meta: string[]): string {
  return [
    `# ${title}`,
    "",
    "> 本文件由「学前教育教研平台」自动导出，仅供查看与分发。",
    "> 直接修改本文件不会回流到应用，下次在应用里保存时会被覆盖。",
    "",
    ...meta.filter(Boolean).map((m) => `- ${m}`),
    "",
  ].join("\n");
}

function section(title: string, body: string | null | undefined): string {
  if (!body) return "";
  return `\n## ${title}\n\n${body}\n`;
}

/** 导出目录的绝对路径；未绑定资料目录时返回 null */
function exportRoot(): string | null {
  const dir = getLibraryDir();
  return dir ? path.join(dir, EXPORT_DIR_NAME) : null;
}

/**
 * 写出一个条目。
 *
 * 文件名带 id 前缀（如 `0007-有趣的影子.md`）：改标题后文件名会变，
 * 靠 id 前缀找到并删掉旧文件，不会在目录里留下一堆同一条目的历史版本。
 */
async function writeEntry(kind: ExportKind, id: number, title: string, content: string) {
  const root = exportRoot();
  if (!root) return;

  const dir = path.join(root, SUBDIR[kind]);
  await mkdir(dir, { recursive: true });

  const prefix = String(id).padStart(4, "0");
  const fileName = `${prefix}-${safe(title)}.md`;

  // 同一条目的旧文件（改过标题的）先清掉
  try {
    for (const existing of await readdir(dir)) {
      if (existing.startsWith(`${prefix}-`) && existing !== fileName) {
        await rm(path.join(dir, existing), { force: true });
      }
    }
  } catch {
    // 目录刚建好、还读不到，忽略
  }

  await writeFile(path.join(dir, fileName), content, "utf8");
}

/** 删除某个条目的导出文件 */
export async function removeExport(kind: ExportKind, id: number) {
  const root = exportRoot();
  if (!root) return;

  const dir = path.join(root, SUBDIR[kind]);
  const prefix = `${String(id).padStart(4, "0")}-`;
  try {
    for (const existing of await readdir(dir)) {
      if (existing.startsWith(prefix)) await rm(path.join(dir, existing), { force: true });
    }
  } catch {
    // 目录不存在就没什么好删的
  }
}

// ── 各类型的正文拼装 ──────────────────────────────────────────

async function buildLesson(id: number): Promise<{ title: string; content: string } | null> {
  const l = one<Record<string, never>>("SELECT * FROM lessons WHERE id = ?", id);
  if (!l) return null;

  const domain = DOMAIN_MAP.get(String(l.domain_key) as never);
  const age = AGE_GROUP_MAP.get(String(l.age_group) as never);
  const goals = parseJsonArray(l.goal_ids)
    .map((g) => GOAL_MAP.get(g))
    .filter(Boolean);
  const tags = parseJsonArray(l.tags);

  const title = String(l.title);
  const content =
    header(title, [
      `领域：${domain?.name ?? l.domain_key}`,
      `适用年龄班：${age ? `${age.label}（${age.ageRange}）` : l.age_group}`,
      l.duration_min ? `时长：${l.duration_min} 分钟` : "",
      l.author ? `设计者：${l.author}` : "",
      tags.length ? `标签：${tags.join("、")}` : "",
      `更新于：${l.updated_at}`,
    ]) +
    (goals.length
      ? `\n## 对应《3—6岁儿童学习与发展指南》目标\n\n${goals
          .map((g) => `- ${g!.domainName} · ${g!.subDomainName} · 目标${g!.index} ${g!.title}`)
          .join("\n")}\n`
      : "") +
    section("活动目标", l.objectives) +
    section("活动准备", l.preparation) +
    section("活动过程", l.process) +
    section("活动延伸", l.extension) +
    section("活动反思", l.reflection);

  return { title, content };
}

async function buildTopic(id: number): Promise<{ title: string; content: string } | null> {
  const t = one<Record<string, never>>("SELECT * FROM research_topics WHERE id = ?", id);
  if (!t) return null;

  const goals = all<{ kind: string; content: string }>(
    "SELECT kind, content FROM research_goals WHERE topic_id=? ORDER BY kind, seq",
    id,
  );
  const outcomes = all<{ kind: string; title: string; done: number }>(
    "SELECT kind, title, done FROM research_outcomes WHERE topic_id=? ORDER BY kind, seq",
    id,
  );
  const modules = all<{
    id: number;
    seq: number;
    title: string;
    summary: string | null;
    methods: string | null;
    plan_month: string | null;
  }>(
    "SELECT id, seq, title, summary, methods, plan_month FROM research_modules WHERE topic_id=? ORDER BY seq",
    id,
  );
  const sessions = all<{ id: number; title: string; held_on: string; module_id: number | null }>(
    "SELECT id, title, held_on, module_id FROM research_sessions WHERE topic_id=? ORDER BY held_on",
    id,
  );

  const kindLabel = TOPIC_KINDS.find((k) => k.key === String(t.kind))?.label ?? String(t.kind);
  const title = String(t.title);

  const goalBlock = GOAL_KINDS.map((k) => {
    const items = goals.filter((g) => g.kind === k.key);
    if (!items.length) return "";
    return `### ${k.label}\n\n${items.map((g, i) => `${i + 1}. ${g.content}`).join("\n")}\n`;
  })
    .filter(Boolean)
    .join("\n");

  const moduleBlock = modules
    .map((m) => {
      const own = sessions.filter((s) => s.module_id === m.id);
      return [
        `### 主题${m.seq + 1}：${m.title}`,
        m.plan_month ? `\n计划月份：${m.plan_month}` : "",
        m.summary ? `\n${m.summary}` : "",
        m.methods ? `\n组织方式：${m.methods}` : "",
        own.length ? `\n已开展教研：\n${own.map((s) => `- ${s.held_on} ${s.title}`).join("\n")}` : "\n（尚未开展）",
        "",
      ].join("\n");
    })
    .join("\n");

  const outcomeBlock = OUTCOME_KINDS.map((k) => {
    const items = outcomes.filter((o) => o.kind === k.key);
    if (!items.length) return "";
    return `### ${k.label}\n\n${items.map((o) => `- [${o.done ? "x" : " "}] ${o.title}`).join("\n")}\n`;
  })
    .filter(Boolean)
    .join("\n");

  const content =
    header(title, [
      t.subtitle ? `副标题：${t.subtitle}` : "",
      `类型：${kindLabel}`,
      t.school_year ? `学年：${t.school_year}${t.term ? ` ${t.term}` : ""}` : "",
      t.leader ? `主持人：${t.leader}` : "",
      t.team ? `参与：${t.team}` : "",
      `状态：${t.status === "done" ? "已结题" : t.status === "archived" ? "已归档" : "进行中"}`,
    ]) +
    section("教研背景", t.background) +
    section("理论支撑", t.theory_basis) +
    (goalBlock ? `\n## 教研目标\n\n${goalBlock}` : "") +
    (moduleBlock ? `\n## 月度主题模块\n\n${moduleBlock}` : "") +
    (outcomeBlock ? `\n## 预期成果\n\n${outcomeBlock}` : "");

  return { title, content };
}

async function buildSession(id: number): Promise<{ title: string; content: string } | null> {
  const s = one<Record<string, never>>(
    `SELECT s.*, t.title AS topic_title, m.title AS module_title, m.seq AS module_seq
       FROM research_sessions s
       LEFT JOIN research_topics t ON t.id = s.topic_id
       LEFT JOIN research_modules m ON m.id = s.module_id
      WHERE s.id = ?`,
    id,
  );
  if (!s) return null;

  const reviews = all<{
    teacher: string;
    observer: string;
    observed_on: string;
    highlights: string | null;
    suggestions: string | null;
    score: number | null;
    class_name: string | null;
  }>(
    `SELECT r.teacher, r.observer, r.observed_on, r.highlights, r.suggestions, r.score, c.name AS class_name
       FROM class_reviews r LEFT JOIN classes c ON c.id = r.class_id
      WHERE r.session_id = ? ORDER BY r.observed_on`,
    id,
  );

  const typeLabel = RESEARCH_TYPES.find((t) => t.key === String(s.type_key))?.label ?? String(s.type_key);
  const title = String(s.title);

  const reviewBlock = reviews
    .map((r) =>
      [
        `### ${r.teacher}（听课人：${r.observer}，${r.observed_on}${r.class_name ? `，${r.class_name}` : ""}${r.score !== null ? `，${r.score} 分` : ""}）`,
        r.highlights ? `\n**亮点：**${r.highlights}` : "",
        r.suggestions ? `\n**建议：**${r.suggestions}` : "",
        "",
      ].join("\n"),
    )
    .join("\n");

  const content =
    header(title, [
      s.topic_title ? `所属专题：${s.topic_title}` : "",
      s.module_title ? `主题模块：主题${Number(s.module_seq) + 1}　${s.module_title}` : "",
      `类型：${typeLabel}`,
      `日期：${s.held_on}`,
      s.host ? `主持人：${s.host}` : "",
      s.participants ? `参与人员：${s.participants}` : "",
    ]) +
    section("研讨的真问题", s.topic) +
    section("活动流程", s.agenda) +
    section("研讨记录", s.discussion) +
    section("结论与共识", s.conclusion) +
    section("后续行动", s.action_items) +
    (reviewBlock ? `\n## 课例实践（听评课）\n\n${reviewBlock}` : "");

  return { title, content };
}

async function buildObservation(id: number): Promise<{ title: string; content: string } | null> {
  const o = one<Record<string, never>>(
    `SELECT o.*, c.name AS child_name, cl.name AS class_name
       FROM observations o
       LEFT JOIN children c ON c.id = o.child_id
       LEFT JOIN classes cl ON cl.id = c.class_id
      WHERE o.id = ?`,
    id,
  );
  if (!o) return null;

  const method = OBSERVATION_METHODS.find((m) => m.key === String(o.method_key));
  const goals = parseJsonArray(o.goal_ids)
    .map((g) => GOAL_MAP.get(g))
    .filter(Boolean);

  const child = o.child_name ? String(o.child_name) : "未指定幼儿";
  const title = `${child} ${o.observed_at}`;

  const content =
    header(title, [
      `观察对象：${child}${o.class_name ? `（${o.class_name}）` : ""}`,
      `观察日期：${o.observed_at}`,
      `观察者：${o.observer}`,
      o.scene ? `生活环节：${o.scene}` : "",
      `观察方法：${method?.label ?? o.method_key}`,
    ]) +
    section("客观记录", o.record) +
    section("分析解读", o.analysis) +
    section("支持策略", o.support) +
    (goals.length
      ? `\n## 关联发展目标\n\n${goals.map((g) => `- ${g!.domainName} · ${g!.title}`).join("\n")}\n`
      : "");

  return { title, content };
}

async function buildFamily(id: number): Promise<{ title: string; content: string } | null> {
  const f = one<Record<string, never>>(
    `SELECT f.*, c.name AS child_name, cl.name AS class_name
       FROM family_notes f
       LEFT JOIN children c ON c.id = f.child_id
       LEFT JOIN classes cl ON cl.id = c.class_id
      WHERE f.id = ?`,
    id,
  );
  if (!f) return null;

  const kind = FAMILY_NOTE_KINDS.find((k) => k.key === String(f.kind_key))?.label ?? String(f.kind_key);
  const title = String(f.title);

  const content =
    header(title, [
      f.child_name ? `幼儿：${f.child_name}${f.class_name ? `（${f.class_name}）` : ""}` : "",
      `类型：${kind}`,
      `日期：${f.noted_on}`,
      f.author ? `记录人：${f.author}` : "",
    ]) + section("沟通内容", f.content);

  return { title, content };
}

async function buildAssessment(id: number): Promise<{ title: string; content: string } | null> {
  const a = one<Record<string, never>>(
    `SELECT a.*, c.name AS class_name
       FROM ecers_assessments a LEFT JOIN classes c ON c.id = a.class_id
      WHERE a.id = ?`,
    id,
  );
  if (!a) return null;

  const rows = all<{ item_no: number; score: number | null; evidence: string | null }>(
    "SELECT item_no, score, evidence FROM ecers_scores WHERE assessment_id = ?",
    id,
  );
  const scores = new Map<number, number | null>(rows.map((r) => [r.item_no, r.score]));
  const evidence = new Map(rows.filter((r) => r.evidence).map((r) => [r.item_no, r.evidence!]));
  const total = totalAverage(scores);

  const className = a.class_name ? String(a.class_name) : "未指定班级";
  const title = `${className} ECERS-3 ${a.assessed_on}`;

  const body = ECERS_SUBSCALES.map((s) => {
    const avg = subscaleAverage(s, scores);
    const items = s.items
      .map((i) => {
        const sc = scores.get(i.no);
        const ev = evidence.get(i.no);
        return `| ${i.no} | ${i.zh} | ${sc ?? "NA"} |${ev ? ` ${ev} |` : " |"}`;
      })
      .join("\n");
    return [
      `### ${s.zh}（${s.en}）　均分：${avg === null ? "未评" : avg.toFixed(2)}`,
      "",
      "| 条目 | 名称 | 评分 | 观察证据 |",
      "| --- | --- | --- | --- |",
      items,
      "",
    ].join("\n");
  }).join("\n");

  const content =
    header(title, [
      `班级：${className}`,
      `评估日期：${a.assessed_on}`,
      `评估者：${a.assessor}`,
      `总均分：${total === null ? "未评" : `${total.toFixed(2)}（${qualityLevel(total)}）`}`,
      `状态：${a.status === "done" ? "已完成" : "进行中"}`,
      "说明：ECERS-3 评分指标受版权保护，本文件只记录条目编号、名称与评分结果。",
    ]) +
    `\n## 各子量表评分\n\n${body}` +
    section("评估备注", a.note);

  return { title, content };
}

const BUILDERS: Record<ExportKind, (id: number) => Promise<{ title: string; content: string } | null>> = {
  lesson: buildLesson,
  topic: buildTopic,
  session: buildSession,
  observation: buildObservation,
  family: buildFamily,
  assessment: buildAssessment,
};

/**
 * 导出一个条目。
 *
 * 任何失败都只记日志不抛出——数据已经在数据库里了，导出文件只是副本，
 * 不能因为资料目录被拔掉（U 盘、网络盘）就让教师保存不了教案。
 */
export async function exportEntry(kind: ExportKind, id: number): Promise<void> {
  if (!getLibraryDir()) return;
  try {
    const built = await BUILDERS[kind](id);
    if (!built) return;
    await writeEntry(kind, id, built.title, built.content);
  } catch (e) {
    console.warn(`[export] ${kind}#${id} 导出失败：`, e instanceof Error ? e.message : e);
  }
}

export interface ExportAllResult {
  bound: boolean;
  counts: Partial<Record<ExportKind, number>>;
  total: number;
}

/** 全量导出：首次绑定目录后，或想修复导出文件时用 */
export async function exportAll(): Promise<ExportAllResult> {
  if (!getLibraryDir()) return { bound: false, counts: {}, total: 0 };

  const tables: Array<[ExportKind, string]> = [
    ["lesson", "lessons"],
    ["topic", "research_topics"],
    ["session", "research_sessions"],
    ["observation", "observations"],
    ["family", "family_notes"],
    ["assessment", "ecers_assessments"],
  ];

  const counts: Partial<Record<ExportKind, number>> = {};
  let total = 0;

  for (const [kind, table] of tables) {
    const ids = all<{ id: number }>(`SELECT id FROM ${table} ORDER BY id`);
    for (const { id } of ids) await exportEntry(kind, id);
    counts[kind] = ids.length;
    total += ids.length;
  }

  return { bound: true, counts, total };
}
