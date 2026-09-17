/**
 * 初始化数据库并写入一份可用的示例数据。
 * 运行：npm run db:init（重置请用 npm run db:reset）
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbDir = path.join(root, "data");
mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(path.join(dbDir, "teaching-ecer.db"));
db.exec(readFileSync(path.join(root, "src", "lib", "schema.sql"), "utf8"));

const count = (t: string) =>
  Number(Object.values(db.prepare(`SELECT count(*) AS c FROM ${t}`).get() as object)[0]);

if (count("classes") > 0) {
  console.log("数据库已存在数据，跳过示例数据写入。");
  console.log(`  班级 ${count("classes")} · 幼儿 ${count("children")} · 教案 ${count("lessons")}`);
  process.exit(0);
}

const insertClass = db.prepare(
  "INSERT INTO classes (name, age_group, head_teacher, school_year) VALUES (?, ?, ?, ?)",
);
const seniorId = Number(insertClass.run("大一班", "senior", "李老师", "2026-2027").lastInsertRowid);
const middleId = Number(insertClass.run("中二班", "middle", "王老师", "2026-2027").lastInsertRowid);
insertClass.run("小三班", "junior", "张老师", "2026-2027");

const insertChild = db.prepare(
  "INSERT INTO children (class_id, name, gender, birth_date, guardian) VALUES (?, ?, ?, ?, ?)",
);
insertChild.run(seniorId, "示例·小满", "女", "2020-06-12", "母亲 138****0001");
insertChild.run(seniorId, "示例·朵朵", "女", "2020-09-03", "父亲 139****0002");
insertChild.run(middleId, "示例·一一", "男", "2021-04-21", "祖母 137****0003");

db.prepare(
  `INSERT INTO lessons
     (title, domain_key, sub_domain_id, goal_ids, age_group, duration_min,
      objectives, preparation, process, extension, tags, author, status)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
).run(
  "有趣的影子",
  "science",
  "science-1",
  JSON.stringify(["science-1-1", "science-1-2"]),
  "senior",
  30,
  "1. 对影子的变化产生好奇，愿意动手探究。\n2. 发现影子的产生需要光源和不透明物体。\n3. 能用简单的语言和图画记录自己的发现。",
  "手电筒每组一只、白纸、各种小玩偶、记录表、户外场地。",
  "一、导入：讲述《影子的故事》，引出问题「影子是怎么来的？」\n二、探究一：分组用手电筒照玩偶，观察影子。\n三、探究二：移动手电筒，发现影子大小和方向的变化。\n四、记录：把发现画在记录表上。\n五、分享：请 2~3 组说说自己的发现。",
  "户外活动时观察自己的影子，中午和下午各量一次长度，做成对比图。",
  JSON.stringify(["科学探究", "光影", "户外延伸"]),
  "李老师",
  "ready",
);

const sessionId = Number(
  db
    .prepare(
      `INSERT INTO research_sessions
         (title, type_key, held_on, host, participants, topic, agenda, discussion, conclusion, action_items)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      "大班科学区材料投放的适宜性研讨",
      "case-study",
      "2026-09-10",
      "教研组长 · 周老师",
      "大班组全体教师（6 人）、保教主任",
      "科学区材料投放层次不清，幼儿操作 3 分钟就离开，如何提高材料的探究性？",
      "1. 观看科学区实录片段（10 分钟）\n2. 分组分析幼儿行为（20 分钟）\n3. 对照《指南》科学领域目标研讨（30 分钟）\n4. 形成调整方案（20 分钟）",
      "教师普遍观察到：现有材料答案唯一、缺少可变量，幼儿完成一次即失去兴趣。对照《指南》「具有初步的探究能力」，材料应支持幼儿自己提出问题、反复试误。",
      "材料投放应保证「同一材料至少支持三种玩法」，并配置记录工具让幼儿留下探究痕迹。",
      "1. 各班本周内完成科学区材料清点与分层（负责人：各班班主任，9/17 前）\n2. 下次教研带一份幼儿探究记录表实物（全体，9/24）",
    ).lastInsertRowid,
);

db.prepare(
  `INSERT INTO class_reviews
     (session_id, class_id, teacher, observer, observed_on, highlights, suggestions, score)
   VALUES (?,?,?,?,?,?,?,?)`,
).run(
  sessionId,
  seniorId,
  "李老师",
  "周老师",
  "2026-09-10",
  "提问开放，给了幼儿充分的试误时间；能蹲下来与幼儿平视交流。",
  "集体分享环节偏长，建议压缩到 5 分钟，把时间还给操作；个别幼儿全程未发言，可增加小组内轮流表达的环节。",
  4.5,
);

console.log("✅ 数据库初始化完成");
console.log(`   ${path.join(dbDir, "teaching-ecer.db")}`);
console.log(`   班级 ${count("classes")} · 幼儿 ${count("children")} · 教案 ${count("lessons")} · 教研 ${count("research_sessions")}`);
