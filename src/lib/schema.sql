-- 学前教育教研平台 · 数据库结构
-- 引擎：Node.js 内置 node:sqlite（无原生依赖）

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── 应用设置 ──────────────────────────────────────────────────
-- 目前只存一项：用户绑定的资料目录。做成 key/value 而不是单行配置表，
-- 是为了后面加「园所名称」「默认学年」这类设置时不用改表结构。
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ── 班级与幼儿 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,                -- 如「大一班」
  age_group   TEXT NOT NULL,                -- AgeGroupKey
  head_teacher TEXT,                        -- 班主任
  school_year TEXT,                         -- 如「2026-2027」
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS children (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  gender      TEXT,                          -- 男/女
  birth_date  TEXT,                          -- YYYY-MM-DD
  guardian    TEXT,                          -- 主要监护人及联系方式
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_children_class ON children(class_id);

-- ── 教案 / 活动设计 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  domain_key   TEXT NOT NULL,               -- DomainKey
  sub_domain_id TEXT,                       -- SubDomain.id
  goal_ids     TEXT NOT NULL DEFAULT '[]',  -- JSON 数组，指向《指南》目标
  age_group    TEXT NOT NULL,               -- AgeGroupKey
  duration_min INTEGER,                     -- 活动时长（分钟）
  objectives   TEXT,                        -- 活动目标
  preparation  TEXT,                        -- 活动准备（材料/经验）
  process      TEXT,                        -- 活动过程
  extension    TEXT,                        -- 活动延伸
  reflection   TEXT,                        -- 活动反思
  tags         TEXT NOT NULL DEFAULT '[]',  -- JSON 数组
  author       TEXT,
  status       TEXT NOT NULL DEFAULT 'draft', -- draft | ready | archived
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_lessons_domain ON lessons(domain_key);
CREATE INDEX IF NOT EXISTS idx_lessons_age ON lessons(age_group);

-- ── 教研专题 / 小课题 ────────────────────────────────────────
-- 园所的教研是以学期或学年为周期的「专题」组织的：一条主线下分几个月度
-- 主题模块，每个模块开一次大教研，再落到课例实践。单次教研活动脱离专题
-- 就失去了参照系，所以 research_sessions 挂在模块（进而挂在专题）之下。
CREATE TABLE IF NOT EXISTS research_topics (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,               -- 如「促进学前儿童前阅读核心经验获得的教学实践研究」
  subtitle      TEXT,                        -- 副标题 / 研究方向
  kind          TEXT NOT NULL DEFAULT 'topic', -- topic 专题教研 | project 小课题 | training 教师培养
  school_year   TEXT,                        -- 如「2026-2027」
  term          TEXT,                        -- 上期 | 下期 | 全年
  leader        TEXT,                        -- 主持人 / 负责人
  team          TEXT,                        -- 参与组别，如「语言组全体教师」
  background    TEXT,                        -- 教研背景：要解决的真问题
  theory_basis  TEXT,                        -- 理论支撑 / 依据文件
  start_on      TEXT,
  end_on        TEXT,
  doc_resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL, -- 关联的计划原文
  status        TEXT NOT NULL DEFAULT 'active', -- active 进行中 | done 已结题 | archived
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_topics_year ON research_topics(school_year, status);

-- 教研目标。园所计划里固定分认识/能力/实践/成果四类，单列一张表便于
-- 在每次教研活动里回看「这次研讨对应哪条目标」。
CREATE TABLE IF NOT EXISTS research_goals (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id  INTEGER NOT NULL REFERENCES research_topics(id) ON DELETE CASCADE,
  kind      TEXT NOT NULL,                   -- cognition 认识 | ability 能力 | practice 实践 | outcome 成果
  content   TEXT NOT NULL,
  seq       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_goals_topic ON research_goals(topic_id);

-- 预期成果。分认识性 / 物化 / 操作性三类，带完成标记，学期末对账用。
CREATE TABLE IF NOT EXISTS research_outcomes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id    INTEGER NOT NULL REFERENCES research_topics(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,                 -- conceptual 认识性 | material 物化 | operational 操作性
  title       TEXT NOT NULL,                 -- 如「《前阅读教学案例集》」
  description TEXT,                          -- 如「不少于 12 个案例」
  done        INTEGER NOT NULL DEFAULT 0,
  seq         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_outcomes_topic ON research_outcomes(topic_id);

-- 月度主题模块：专题下的递进式小主题，一般一月一个。
CREATE TABLE IF NOT EXISTS research_modules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id    INTEGER NOT NULL REFERENCES research_topics(id) ON DELETE CASCADE,
  seq         INTEGER NOT NULL DEFAULT 0,    -- 主题一 / 二 / 三 / 四
  title       TEXT NOT NULL,                 -- 如「读懂经验——前阅读核心经验的内涵与发展阶段」
  summary     TEXT,                          -- 本模块要解决什么
  methods     TEXT,                          -- 组织方式，如「理论导读＋关键概念集体建构」
  plan_month  TEXT,                          -- 计划月份 YYYY-MM
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_modules_topic ON research_modules(topic_id, seq);

-- ── 教研活动 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id     INTEGER REFERENCES research_topics(id) ON DELETE SET NULL,
  module_id    INTEGER REFERENCES research_modules(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  type_key     TEXT NOT NULL,               -- ResearchTypeKey
  held_on      TEXT NOT NULL,               -- YYYY-MM-DD
  host         TEXT,                        -- 主持人
  participants TEXT,                        -- 参与人员
  topic        TEXT,                        -- 研讨主题/问题
  agenda       TEXT,                        -- 活动流程
  discussion   TEXT,                        -- 研讨记录
  conclusion   TEXT,                        -- 结论与共识
  action_items TEXT,                        -- 后续行动
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_research_date ON research_sessions(held_on DESC);
-- 依赖 topic_id / module_id 的索引建在 db.ts 的迁移之后：对已存在的表
-- CREATE TABLE IF NOT EXISTS 是空操作，这两列此刻可能还没被 ALTER 加上。

-- 听评课记录，可挂在某次教研活动下
CREATE TABLE IF NOT EXISTS class_reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL,
  lesson_id   INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  teacher     TEXT NOT NULL,                -- 执教教师
  observer    TEXT NOT NULL,                -- 听课人
  observed_on TEXT NOT NULL,
  highlights  TEXT,                         -- 亮点
  suggestions TEXT,                         -- 改进建议
  score       REAL,                         -- 综合评分，可空
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_session ON class_reviews(session_id);

-- ── 儿童观察记录 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id      INTEGER REFERENCES children(id) ON DELETE CASCADE,
  observer      TEXT NOT NULL,
  observed_at   TEXT NOT NULL,              -- YYYY-MM-DD
  scene         TEXT,                       -- 一日生活环节
  method_key    TEXT NOT NULL,              -- ObservationMethodKey
  record        TEXT NOT NULL,              -- 客观记录（只写看到听到的）
  analysis      TEXT,                       -- 分析解读（对照《指南》）
  support       TEXT,                       -- 支持策略
  goal_ids      TEXT NOT NULL DEFAULT '[]', -- JSON 数组，关联发展目标
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_obs_child ON observations(child_id);
CREATE INDEX IF NOT EXISTS idx_obs_date ON observations(observed_at DESC);

-- ── ECERS-3 环境评估 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ecers_assessments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  assessor    TEXT NOT NULL,
  assessed_on TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft', -- draft | done
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_ecers_class ON ecers_assessments(class_id);

CREATE TABLE IF NOT EXISTS ecers_scores (
  assessment_id INTEGER NOT NULL REFERENCES ecers_assessments(id) ON DELETE CASCADE,
  item_no       INTEGER NOT NULL,           -- 1..35
  score         INTEGER,                    -- 1..7，NULL 表示 NA（不适用）
  evidence      TEXT,                       -- 观察证据
  PRIMARY KEY (assessment_id, item_no)
);

-- ── 家园共育 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id   INTEGER REFERENCES children(id) ON DELETE CASCADE,
  kind_key   TEXT NOT NULL,                 -- FAMILY_NOTE_KINDS
  noted_on   TEXT NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT,
  author     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_family_child ON family_notes(child_id);

-- ── 资源库 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  domain_key  TEXT,
  age_group   TEXT,
  url         TEXT,                          -- 外链
  file_path   TEXT,                          -- public/uploads 下的相对路径
  description TEXT,
  tags        TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  -- ── 上传文件与自动分类 ──
  file_name   TEXT,                          -- 原始文件名
  file_size   INTEGER,
  extract_kind TEXT,                         -- docx | pptx | xlsx | pdf | text | unsupported
  content_text TEXT,                         -- 提取的正文，供全文检索
  auto_category TEXT,                        -- 系统判定的分类（category 为最终采用值，可能被人工改判）
  auto_confidence REAL,                      -- 0~1
  auto_matched TEXT NOT NULL DEFAULT '[]',   -- 判定依据的命中关键词 JSON
  reviewed    INTEGER NOT NULL DEFAULT 0     -- 1 = 已被人工确认或改判
);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
