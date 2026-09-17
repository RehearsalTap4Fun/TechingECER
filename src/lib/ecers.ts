/**
 * ECERS-3（Early Childhood Environment Rating Scale, Third Edition）条目框架。
 *
 * ⚠️ 版权说明：ECERS-3 的评分指标（1/3/5/7 分下的具体 indicator）与观察说明受版权保护，
 * 本项目**只收录子量表与条目的编号和名称**，用于组织评估结果与生成报告。
 * 实际打分时必须对照正式出版的《幼儿学习环境评量表（第三版）》手册，
 * 由受过训练的评估者进行观察评分。请勿在本仓库中录入手册原文。
 */

export interface EcersItem {
  no: number;
  /** 英文原名，便于与官方手册对照 */
  en: string;
  /** 中文译名（通用译法，仅作参考） */
  zh: string;
}

export interface EcersSubscale {
  key: string;
  en: string;
  zh: string;
  items: EcersItem[];
}

export const ECERS_SUBSCALES: EcersSubscale[] = [
  {
    key: "space",
    en: "Space and Furnishings",
    zh: "空间和设施",
    items: [
      { no: 1, en: "Indoor space", zh: "室内空间" },
      { no: 2, en: "Furniture for care, play and learning", zh: "日常照料、游戏和学习所需的家具" },
      { no: 3, en: "Room arrangement for play and learning", zh: "游戏和学习的空间布置" },
      { no: 4, en: "Space for privacy", zh: "供独处的空间" },
      { no: 5, en: "Child-related display", zh: "与儿童有关的展示" },
      { no: 6, en: "Space for gross motor play", zh: "大肌肉游戏空间" },
      { no: 7, en: "Gross motor equipment", zh: "大肌肉活动设备" },
    ],
  },
  {
    key: "care",
    en: "Personal Care Routines",
    zh: "个人日常照料",
    items: [
      { no: 8, en: "Meals/snacks", zh: "正餐/点心" },
      { no: 9, en: "Toileting/diapering", zh: "如厕/盥洗" },
      { no: 10, en: "Health practices", zh: "健康保健措施" },
      { no: 11, en: "Safety practices", zh: "安全防护措施" },
    ],
  },
  {
    key: "language",
    en: "Language and Literacy",
    zh: "语言和读写",
    items: [
      { no: 12, en: "Helping children expand vocabulary", zh: "帮助儿童扩展词汇" },
      { no: 13, en: "Encouraging children to use language", zh: "鼓励儿童使用语言" },
      { no: 14, en: "Staff use of books with children", zh: "教师与儿童一起使用图书" },
      { no: 15, en: "Encouraging children's use of books", zh: "鼓励儿童使用图书" },
      { no: 16, en: "Becoming familiar with print", zh: "熟悉印刷文字" },
    ],
  },
  {
    key: "activities",
    en: "Learning Activities",
    zh: "学习活动",
    items: [
      { no: 17, en: "Fine motor", zh: "精细动作" },
      { no: 18, en: "Art", zh: "美术" },
      { no: 19, en: "Music and movement", zh: "音乐和律动" },
      { no: 20, en: "Blocks", zh: "积木" },
      { no: 21, en: "Dramatic play", zh: "戏剧游戏" },
      { no: 22, en: "Nature/science", zh: "自然/科学" },
      { no: 23, en: "Math materials and activities", zh: "数学材料和活动" },
      { no: 24, en: "Math in daily events", zh: "日常活动中的数学" },
      { no: 25, en: "Understanding written numbers", zh: "理解书面数字" },
      { no: 26, en: "Promoting acceptance of diversity", zh: "促进对多样性的接纳" },
      { no: 27, en: "Appropriate use of technology", zh: "恰当使用电子设备" },
    ],
  },
  {
    key: "interaction",
    en: "Interaction",
    zh: "互动",
    items: [
      { no: 28, en: "Supervision of gross motor", zh: "大肌肉活动的看护" },
      { no: 29, en: "Individualized teaching and learning", zh: "个别化的教与学" },
      { no: 30, en: "Staff-child interaction", zh: "师幼互动" },
      { no: 31, en: "Peer interaction", zh: "同伴互动" },
      { no: 32, en: "Discipline", zh: "常规与行为引导" },
    ],
  },
  {
    key: "structure",
    en: "Program Structure",
    zh: "活动组织",
    items: [
      { no: 33, en: "Transitions and waiting times", zh: "过渡与等待时间" },
      { no: 34, en: "Free play", zh: "自由游戏" },
      { no: 35, en: "Whole-group activities for play and learning", zh: "集体游戏和学习活动" },
    ],
  },
];

export const ECERS_ITEMS: Array<EcersItem & { subscaleKey: string; subscaleZh: string }> =
  ECERS_SUBSCALES.flatMap((s) =>
    s.items.map((i) => ({ ...i, subscaleKey: s.key, subscaleZh: s.zh })),
  );

export const ECERS_ITEM_MAP = new Map(ECERS_ITEMS.map((i) => [i.no, i]));

export const ECERS_ITEM_COUNT = ECERS_ITEMS.length; // 35

/** ECERS 采用 1~7 分，1=不适宜，3=最低限度，5=良好，7=优秀；NA 表示不适用 */
export const ECERS_SCORE_LABELS: Record<number, string> = {
  1: "不适宜",
  3: "最低限度",
  5: "良好",
  7: "优秀",
};

export type EcersScore = number | null; // null = NA（不适用）

/**
 * 子量表均分：按 ECERS 规则，NA 条目不计入分母；若整个子量表全为 NA 则返回 null。
 */
export function subscaleAverage(
  subscale: EcersSubscale,
  scores: Map<number, EcersScore>,
): number | null {
  const valid = subscale.items
    .map((i) => scores.get(i.no))
    .filter((s): s is number => typeof s === "number");
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * 总均分：ECERS-3 的总分是所有已评条目的算术平均，而不是子量表均分的平均。
 */
export function totalAverage(scores: Map<number, EcersScore>): number | null {
  const valid = [...scores.values()].filter((s): s is number => typeof s === "number");
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** 依据均分给出质量水平描述 */
export function qualityLevel(avg: number | null): string {
  if (avg === null) return "未评";
  if (avg < 3) return "不适宜";
  if (avg < 5) return "最低限度";
  if (avg < 6) return "良好";
  return "优秀";
}
