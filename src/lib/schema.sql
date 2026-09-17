-- 学前教育教研平台 · 数据库结构
-- 引擎：Node.js 内置 node:sqlite（无原生依赖）

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

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

-- ── 教研活动 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
