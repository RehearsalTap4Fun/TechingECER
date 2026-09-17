import { AGE_GROUPS, DOMAINS, RESOURCE_CATEGORIES, type AgeGroupKey, type DomainKey } from "@/lib/domain";

/**
 * 基于正文内容的文档自动分类。
 *
 * 用本地词表打分，不调用任何外部模型：园所文档里常含幼儿姓名、教师评价和
 * 内部管理信息，不应离开本机。学前教育的文本用词高度专门化
 * （前阅读、图画书、律动、环创、家长会…），词表法在这个领域已经相当准。
 *
 * 分类结果始终是「建议」——界面上会展示依据并允许教师改判，
 * 不做静默的自动归档。
 */

export interface Suggestion<T> {
  value: T;
  /** 0~1，由命中强度归一化而来，仅用于排序和提示，不代表统计意义上的概率 */
  confidence: number;
  /** 命中的关键词，展示给用户看"凭什么这么分" */
  matched: string[];
}

export interface Classification {
  category: Suggestion<string>;
  domain: Suggestion<DomainKey> | null;
  ageGroup: Suggestion<AgeGroupKey> | null;
  tags: string[];
  /** 摘要：正文开头的若干字，列表页用来预览 */
  summary: string;
}

type Lexicon = Record<string, Array<[string, number]>>;

/** 分类词表：[关键词, 权重]。权重高的是该类特有的强信号词 */
const CATEGORY_LEXICON: Lexicon = {
  课程方案: [
    ["活动目标", 3], ["活动准备", 3], ["活动过程", 3], ["活动延伸", 3], ["活动反思", 3],
    ["教案", 3], ["集体教学", 2], ["教学活动", 2], ["导入", 1], ["环节", 1],
    ["主题活动", 2], ["课程方案", 4], ["月计划", 2], ["周计划", 2], ["学期计划", 2],
  ],
  绘本书单: [
    ["绘本", 4], ["图画书", 4], ["书单", 4], ["阅读推荐", 3], ["故事书", 2],
    ["前阅读", 3], ["亲子阅读", 3], ["阅读区", 2], ["绘本馆", 2], ["童书", 3],
  ],
  环创素材: [
    ["环创", 5], ["环境创设", 5], ["主题墙", 4], ["区角", 3], ["区域布置", 3],
    ["material", 1], ["墙面", 2], ["班级环境", 3], ["自然角", 3], ["种植角", 3],
  ],
  音乐律动: [
    ["律动", 5], ["音乐活动", 4], ["歌曲", 3], ["韵律", 4], ["打击乐", 4],
    ["歌唱", 3], ["舞蹈", 3], ["奥尔夫", 4], ["节奏", 2], ["音乐游戏", 4],
  ],
  政策文件: [
    ["教育部", 4], ["通知", 2], ["办法", 2], ["规程", 4], ["条例", 4],
    ["指导意见", 4], ["工作方案", 2], ["评估指南", 4], ["保育教育质量", 3],
    ["幼儿园工作规程", 5], ["学前教育法", 5], ["文件", 1], ["印发", 3], ["实施意见", 4],
  ],
  培训资料: [
    ["培训", 4], ["教研", 4], ["专题教研", 5], ["园本培训", 5], ["讲座", 3],
    ["研讨", 3], ["课例", 3], ["磨课", 3], ["教师发展", 3], ["学习心得", 3],
    ["核心经验", 4], ["理论导读", 4], ["专业成长", 3], ["观摩", 2],
  ],
  家长材料: [
    ["家长", 4], ["家园共育", 5], ["家长会", 5], ["致家长", 5], ["家访", 4],
    ["入园须知", 4], ["温馨提示", 3], ["告家长书", 5], ["亲子", 2], ["家委会", 4],
  ],
};

/** 领域词表，对应《指南》五大领域 */
const DOMAIN_LEXICON: Record<DomainKey, Array<[string, number]>> = {
  health: [
    ["健康", 3], ["体能", 3], ["动作发展", 4], ["生活自理", 4], ["卫生习惯", 4],
    ["安全", 3], ["自我保护", 4], ["户外活动", 2], ["体育游戏", 4], ["营养", 3], ["午睡", 2],
  ],
  language: [
    ["语言", 3], ["前阅读", 5], ["阅读", 3], ["图画书", 4], ["绘本", 4],
    ["倾听", 4], ["表达", 3], ["讲述", 3], ["前书写", 5], ["前识字", 5],
    ["儿歌", 3], ["故事", 2], ["谈话活动", 4], ["文学作品", 3],
  ],
  social: [
    ["社会", 3], ["人际交往", 5], ["同伴", 3], ["合作", 2], ["规则意识", 4],
    ["自信", 2], ["归属感", 4], ["社会适应", 5], ["情绪", 2], ["分享", 2], ["角色游戏", 3],
  ],
  science: [
    ["科学", 3], ["探究", 4], ["数学", 4], ["数学认知", 5], ["点数", 4],
    ["测量", 3], ["分类", 2], ["排序", 3], ["图形", 3], ["空间", 2],
    ["自然", 2], ["观察记录", 2], ["实验", 3], ["种植", 2],
  ],
  art: [
    ["艺术", 3], ["美术", 4], ["绘画", 4], ["手工", 4], ["音乐", 3],
    ["律动", 4], ["歌唱", 3], ["欣赏", 2], ["创作", 2], ["泥工", 4], ["撕贴", 4], ["色彩", 2],
  ],
};

/** 年龄班词表，含《指南》里的年龄段表述 */
const AGE_LEXICON: Record<AgeGroupKey, string[]> = {
  nursery: ["托班", "2-3岁", "2—3岁", "2~3岁"],
  junior: ["小班", "3-4岁", "3—4岁", "3~4岁"],
  middle: ["中班", "4-5岁", "4—5岁", "4~5岁"],
  senior: ["大班", "5-6岁", "5—6岁", "5~6岁"],
};

/** 统计关键词出现次数。中文没有词边界，直接子串计数即可 */
function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

/**
 * 打分：命中次数用 1+log 压缩，避免一个高频词淹没其他信号；
 * 文件名和正文开头（标题区）里的命中额外加权。
 */
function score(text: string, head: string, fileName: string, terms: Array<[string, number]>) {
  let total = 0;
  const matched: string[] = [];
  for (const [term, weight] of terms) {
    const inBody = countOccurrences(text, term);
    const inHead = countOccurrences(head, term);
    const inName = countOccurrences(fileName, term);
    if (inBody === 0 && inName === 0) continue;
    const hit = weight * (1 + Math.log1p(inBody)) + weight * 1.5 * inHead + weight * 3 * inName;
    total += hit;
    matched.push(term);
  }
  return { total, matched };
}

function pick<T extends string>(
  entries: Array<{ key: T; total: number; matched: string[] }>,
  minScore: number,
): Suggestion<T> | null {
  const sorted = [...entries].sort((a, b) => b.total - a.total);
  const best = sorted[0];
  if (!best || best.total < minScore) return null;

  const runnerUp = sorted[1]?.total ?? 0;
  // 置信度看的是"领先程度"而非绝对分：第二名越接近，越该让人来定夺
  const margin = best.total === 0 ? 0 : (best.total - runnerUp) / best.total;
  const strength = Math.min(1, best.total / (minScore * 4));
  const confidence = Math.max(0.05, Math.min(0.99, 0.35 * strength + 0.65 * margin));

  return { value: best.key, confidence, matched: best.matched.slice(0, 6) };
}

/**
 * 词表 + 分类名自身。
 *
 * 分类名本身就是最强的信号词——一个叫「政策文件扫描件.pdf」的文件
 * 理应判为政策文件，哪怕正文一个关键词都没命中。
 */
function termsFor(category: string): Array<[string, number]> {
  return [[category, 5], ...(CATEGORY_LEXICON[category] ?? [])];
}

export function classify(fileName: string, rawText: string): Classification {
  const text = rawText.slice(0, 20000);
  const head = text.slice(0, 400);

  const catEntries = RESOURCE_CATEGORIES.filter((c) => c !== "其他").map((c) => {
    const { total, matched } = score(text, head, fileName, termsFor(c));
    return { key: c as string, total, matched };
  });
  const category =
    pick(catEntries, 8) ?? { value: "其他", confidence: 0.1, matched: [] as string[] };

  const domainEntries = DOMAINS.map((d) => {
    // 领域名（健康/语言/社会/科学/艺术）已包含在各自词表首位，此处不再重复注入
    const { total, matched } = score(text, head, fileName, DOMAIN_LEXICON[d.key]);
    return { key: d.key, total, matched };
  });
  const domain = pick(domainEntries, 10);

  const ageEntries = AGE_GROUPS.map((g) => {
    const terms = AGE_LEXICON[g.key].map((t) => [t, 4] as [string, number]);
    const { total, matched } = score(text, head, fileName, terms);
    return { key: g.key, total, matched };
  });
  const ageGroup = pick(ageEntries, 6);

  // 标签取所有命中的强信号词，按在正文中出现的次数排序
  const pool = new Set<string>([...category.matched, ...(domain?.matched ?? [])]);
  const tags = [...pool]
    .map((t) => ({ t, n: countOccurrences(text, t) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((x) => x.t);

  const summary = text.replace(/\s+/g, " ").slice(0, 160).trim();

  return { category, domain, ageGroup, tags, summary };
}
