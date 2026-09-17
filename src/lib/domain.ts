/**
 * 领域参考数据：《3—6岁儿童学习与发展指南》(教育部, 2012) 的领域—子领域—目标结构。
 *
 * 这些数据刻意放在代码里而非数据库：它们是国家文件规定的固定框架，
 * 需要跟随版本管理、被类型系统约束，而不是由用户随意增删。
 */

export type AgeGroupKey = "nursery" | "junior" | "middle" | "senior";

export interface AgeGroup {
  key: AgeGroupKey;
  /** 班级名称 */
  label: string;
  /** 《指南》中的年龄段表述 */
  ageRange: string;
}

export const AGE_GROUPS: AgeGroup[] = [
  { key: "nursery", label: "托班", ageRange: "2~3岁" },
  { key: "junior", label: "小班", ageRange: "3~4岁" },
  { key: "middle", label: "中班", ageRange: "4~5岁" },
  { key: "senior", label: "大班", ageRange: "5~6岁" },
];

export const AGE_GROUP_MAP = new Map(AGE_GROUPS.map((g) => [g.key, g]));

export type DomainKey = "health" | "language" | "social" | "science" | "art";

export interface DomainGoal {
  /** 形如 health-1-1，可稳定引用 */
  id: string;
  /** 目标序号，对应《指南》中"目标1/2/3" */
  index: number;
  title: string;
}

export interface SubDomain {
  id: string;
  name: string;
  goals: DomainGoal[];
}

export interface Domain {
  key: DomainKey;
  name: string;
  /** 配色用于图表与标签，取自 Tailwind 调色板 */
  color: string;
  subDomains: SubDomain[];
}

export const DOMAINS: Domain[] = [
  {
    key: "health",
    name: "健康",
    color: "#10b981",
    subDomains: [
      {
        id: "health-1",
        name: "身心状况",
        goals: [
          { id: "health-1-1", index: 1, title: "具有健康的体态" },
          { id: "health-1-2", index: 2, title: "情绪安定愉快" },
          { id: "health-1-3", index: 3, title: "具有一定的适应能力" },
        ],
      },
      {
        id: "health-2",
        name: "动作发展",
        goals: [
          { id: "health-2-1", index: 1, title: "具有一定的平衡能力，动作协调、灵敏" },
          { id: "health-2-2", index: 2, title: "具有一定的力量和耐力" },
          { id: "health-2-3", index: 3, title: "手的动作灵活协调" },
        ],
      },
      {
        id: "health-3",
        name: "生活习惯与生活能力",
        goals: [
          { id: "health-3-1", index: 1, title: "具有良好的生活与卫生习惯" },
          { id: "health-3-2", index: 2, title: "具有基本的生活自理能力" },
          { id: "health-3-3", index: 3, title: "具备基本的安全知识和自我保护能力" },
        ],
      },
    ],
  },
  {
    key: "language",
    name: "语言",
    color: "#3b82f6",
    subDomains: [
      {
        id: "language-1",
        name: "倾听与表达",
        goals: [
          { id: "language-1-1", index: 1, title: "认真听并能听懂常用语言" },
          { id: "language-1-2", index: 2, title: "愿意讲话并能清楚地表达" },
          { id: "language-1-3", index: 3, title: "具有文明的语言习惯" },
        ],
      },
      {
        id: "language-2",
        name: "阅读与书写准备",
        goals: [
          { id: "language-2-1", index: 1, title: "喜欢听故事，看图书" },
          { id: "language-2-2", index: 2, title: "具有初步的阅读理解能力" },
          { id: "language-2-3", index: 3, title: "具有书面表达的愿望和初步技能" },
        ],
      },
    ],
  },
  {
    key: "social",
    name: "社会",
    color: "#f59e0b",
    subDomains: [
      {
        id: "social-1",
        name: "人际交往",
        goals: [
          { id: "social-1-1", index: 1, title: "愿意与人交往" },
          { id: "social-1-2", index: 2, title: "能与同伴友好相处" },
          { id: "social-1-3", index: 3, title: "具有自尊、自信、自主的表现" },
          { id: "social-1-4", index: 4, title: "关心尊重他人" },
        ],
      },
      {
        id: "social-2",
        name: "社会适应",
        goals: [
          { id: "social-2-1", index: 1, title: "喜欢并适应群体生活" },
          { id: "social-2-2", index: 2, title: "遵守基本的行为规范" },
          { id: "social-2-3", index: 3, title: "具有初步的归属感" },
        ],
      },
    ],
  },
  {
    key: "science",
    name: "科学",
    color: "#8b5cf6",
    subDomains: [
      {
        id: "science-1",
        name: "科学探究",
        goals: [
          { id: "science-1-1", index: 1, title: "亲近自然，喜欢探究" },
          { id: "science-1-2", index: 2, title: "具有初步的探究能力" },
          { id: "science-1-3", index: 3, title: "在探究中认识周围事物和现象" },
        ],
      },
      {
        id: "science-2",
        name: "数学认知",
        goals: [
          { id: "science-2-1", index: 1, title: "初步感知生活中数学的有用和有趣" },
          { id: "science-2-2", index: 2, title: "感知和理解数、量及数量关系" },
          { id: "science-2-3", index: 3, title: "感知形状与空间关系" },
        ],
      },
    ],
  },
  {
    key: "art",
    name: "艺术",
    color: "#ec4899",
    subDomains: [
      {
        id: "art-1",
        name: "感受与欣赏",
        goals: [
          { id: "art-1-1", index: 1, title: "喜欢自然界与生活中美的事物" },
          { id: "art-1-2", index: 2, title: "喜欢欣赏多种多样的艺术形式和作品" },
        ],
      },
      {
        id: "art-2",
        name: "表现与创造",
        goals: [
          { id: "art-2-1", index: 1, title: "喜欢进行艺术活动并大胆表现" },
          { id: "art-2-2", index: 2, title: "具有初步的艺术表现与创造能力" },
        ],
      },
    ],
  },
];

export const DOMAIN_MAP = new Map(DOMAINS.map((d) => [d.key, d]));

/** 所有目标的扁平索引，供观察记录按目标打标签 */
export const ALL_GOALS: Array<DomainGoal & { domainKey: DomainKey; domainName: string; subDomainName: string }> =
  DOMAINS.flatMap((d) =>
    d.subDomains.flatMap((s) =>
      s.goals.map((g) => ({ ...g, domainKey: d.key, domainName: d.name, subDomainName: s.name })),
    ),
  );

export const GOAL_MAP = new Map(ALL_GOALS.map((g) => [g.id, g]));

/** 幼儿行为观察的常用方法，来自学前教育观察与评价的通行做法 */
export const OBSERVATION_METHODS = [
  { key: "anecdotal", label: "轶事记录法", hint: "事后简要记录有价值的偶发事件" },
  { key: "running", label: "实况详录法", hint: "连续、详尽地记录一段时间内的全部行为" },
  { key: "time-sampling", label: "时间取样法", hint: "按固定时间间隔记录特定行为是否出现" },
  { key: "event-sampling", label: "事件取样法", hint: "只在目标事件发生时记录其前因后果" },
  { key: "checklist", label: "检核表法", hint: "对照预设条目勾选幼儿的表现" },
  { key: "artifact", label: "作品分析法", hint: "通过幼儿的绘画、建构等作品推断发展水平" },
] as const;

export type ObservationMethodKey = (typeof OBSERVATION_METHODS)[number]["key"];

/** 一日生活环节，观察记录与 ECERS 评估都会用到 */
export const DAILY_SCENES = [
  "晨间接待",
  "生活活动",
  "集体教学",
  "区域游戏",
  "户外活动",
  "自由游戏",
  "过渡环节",
  "餐点",
  "午睡",
  "离园",
] as const;

/** 教研专题的类型 */
export const TOPIC_KINDS = [
  { key: "topic", label: "专题教研", hint: "围绕一条主线的学期/学年教研" },
  { key: "project", label: "小课题", hint: "有研究周期与结题成果的课题研究" },
  { key: "training", label: "教师培养", hint: "分层梯队的园本培养计划" },
] as const;

export type TopicKindKey = (typeof TOPIC_KINDS)[number]["key"];

/**
 * 教研目标的四个层次。
 * 园所的专题教研计划普遍按这四类写，逐条落到具体的教研活动上才不会流于口号。
 */
export const GOAL_KINDS = [
  { key: "cognition", label: "认识目标", hint: "教师要澄清哪些概念、改变哪些认识" },
  { key: "ability", label: "能力目标", hint: "教师要掌握哪些可操作的方法" },
  { key: "practice", label: "实践目标", hint: "每位教师要完成哪些实践任务" },
  { key: "outcome", label: "成果目标", hint: "要形成哪些可沉淀的产物" },
] as const;

export type GoalKindKey = (typeof GOAL_KINDS)[number]["key"];

/** 预期成果的三种形态 */
export const OUTCOME_KINDS = [
  { key: "conceptual", label: "认识性成果", hint: "达成的共识与判断标准" },
  { key: "material", label: "物化成果", hint: "手册、案例集、课例等实物产出" },
  { key: "operational", label: "操作性成果", hint: "可复用的操作路径与推进节奏" },
] as const;

export type OutcomeKindKey = (typeof OUTCOME_KINDS)[number]["key"];

/** 教研活动类型 */
export const RESEARCH_TYPES = [
  { key: "open-class", label: "公开课/观摩课" },
  { key: "case-study", label: "案例研讨" },
  { key: "reading", label: "共读与理论学习" },
  { key: "topic", label: "课题研究" },
  { key: "training", label: "园本培训" },
  { key: "review", label: "保教质量复盘" },
] as const;

export type ResearchTypeKey = (typeof RESEARCH_TYPES)[number]["key"];

/** 家园共育记录类型 */
export const FAMILY_NOTE_KINDS = [
  { key: "home-visit", label: "家访" },
  { key: "conference", label: "家长会/面谈" },
  { key: "daily", label: "日常沟通" },
  { key: "growth", label: "成长反馈" },
  { key: "incident", label: "特殊情况告知" },
] as const;

/** 资源库分类 */
export const RESOURCE_CATEGORIES = [
  "课程方案",
  "绘本书单",
  "环创素材",
  "音乐律动",
  "政策文件",
  "培训资料",
  "家长材料",
  "其他",
] as const;
