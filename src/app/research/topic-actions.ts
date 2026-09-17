"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, run } from "@/lib/db";
import { GOAL_KINDS, OUTCOME_KINDS } from "@/lib/domain";

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

/** 多行文本框按行拆成条目——目标和成果都是一条一行录入的 */
function lines(fd: FormData, key: string): string[] {
  return (text(fd, key) ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*[\d]+[.、)]\s*/, "").trim())
    .filter(Boolean);
}

/** 把四类目标 / 三类成果整批重写，避免逐条增删的繁琐 UI */
function rewriteGoals(topicId: number, fd: FormData) {
  const db = getDb();
  db.prepare("DELETE FROM research_goals WHERE topic_id=?").run(topicId);
  const ins = db.prepare(
    "INSERT INTO research_goals (topic_id, kind, content, seq) VALUES (?,?,?,?)",
  );
  for (const k of GOAL_KINDS) {
    lines(fd, `goal_${k.key}`).forEach((content, i) => ins.run(topicId, k.key, content, i));
  }
}

function rewriteOutcomes(topicId: number, fd: FormData) {
  const db = getDb();
  // 重写会丢掉 done 标记，所以先记下已完成的成果标题再还原
  const doneTitles = new Set(
    (
      db
        .prepare("SELECT title FROM research_outcomes WHERE topic_id=? AND done=1")
        .all(topicId) as Array<{ title: string }>
    ).map((r) => r.title),
  );

  db.prepare("DELETE FROM research_outcomes WHERE topic_id=?").run(topicId);
  const ins = db.prepare(
    "INSERT INTO research_outcomes (topic_id, kind, title, done, seq) VALUES (?,?,?,?,?)",
  );
  for (const k of OUTCOME_KINDS) {
    lines(fd, `outcome_${k.key}`).forEach((title, i) =>
      ins.run(topicId, k.key, title, doneTitles.has(title) ? 1 : 0, i),
    );
  }
}

function rewriteModules(topicId: number, fd: FormData) {
  const db = getDb();
  // 模块被教研活动以 ON DELETE SET NULL 引用：整批重写会让已挂靠的活动
  // 失去归属，所以按标题匹配保留原 id
  const existing = db
    .prepare("SELECT id, title FROM research_modules WHERE topic_id=?")
    .all(topicId) as Array<{ id: number; title: string }>;
  const byTitle = new Map(existing.map((m) => [m.title, m.id]));

  const titles = lines(fd, "modules");
  const keep = new Set<number>();

  const upd = db.prepare("UPDATE research_modules SET seq=? WHERE id=?");
  const ins = db.prepare(
    "INSERT INTO research_modules (topic_id, seq, title) VALUES (?,?,?)",
  );
  titles.forEach((title, i) => {
    const id = byTitle.get(title);
    if (id) {
      upd.run(i, id);
      keep.add(id);
    } else {
      keep.add(Number(ins.run(topicId, i, title).lastInsertRowid));
    }
  });

  const del = db.prepare("DELETE FROM research_modules WHERE id=?");
  for (const m of existing) if (!keep.has(m.id)) del.run(m.id);
}

export async function createTopic(fd: FormData) {
  const title = text(fd, "title");
  if (!title) throw new Error("专题名称不能为空");

  const db = getDb();
  db.exec("BEGIN");
  let id: number;
  try {
    id = run(
      `INSERT INTO research_topics
         (title, subtitle, kind, school_year, term, leader, team,
          background, theory_basis, start_on, end_on, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'active')`,
      title,
      text(fd, "subtitle"),
      String(fd.get("kind") ?? "topic"),
      text(fd, "school_year"),
      text(fd, "term"),
      text(fd, "leader"),
      text(fd, "team"),
      text(fd, "background"),
      text(fd, "theory_basis"),
      text(fd, "start_on"),
      text(fd, "end_on"),
    );
    rewriteGoals(id, fd);
    rewriteOutcomes(id, fd);
    rewriteModules(id, fd);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  revalidatePath("/research");
  redirect(`/research/topics/${id}`);
}

export async function updateTopic(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) throw new Error("缺少专题 id");

  const db = getDb();
  db.exec("BEGIN");
  try {
    db.prepare(
      `UPDATE research_topics SET
         title=?, subtitle=?, kind=?, school_year=?, term=?, leader=?, team=?,
         background=?, theory_basis=?, start_on=?, end_on=?, status=?
       WHERE id=?`,
    ).run(
      text(fd, "title") ?? "未命名专题",
      text(fd, "subtitle"),
      String(fd.get("kind") ?? "topic"),
      text(fd, "school_year"),
      text(fd, "term"),
      text(fd, "leader"),
      text(fd, "team"),
      text(fd, "background"),
      text(fd, "theory_basis"),
      text(fd, "start_on"),
      text(fd, "end_on"),
      String(fd.get("status") ?? "active"),
      id,
    );
    rewriteGoals(id, fd);
    rewriteOutcomes(id, fd);
    rewriteModules(id, fd);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  revalidatePath(`/research/topics/${id}`);
  revalidatePath("/research");
  redirect(`/research/topics/${id}`);
}

export async function deleteTopic(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  // 目标/成果/模块随专题 CASCADE 删除；教研活动是 SET NULL，
  // 只会变成「未归属专题」而不会丢失
  getDb().prepare("DELETE FROM research_topics WHERE id=?").run(id);
  revalidatePath("/research");
  redirect("/research");
}

/** 勾掉一项预期成果 */
export async function toggleOutcome(fd: FormData) {
  const id = Number(fd.get("outcome_id"));
  const topicId = Number(fd.get("topic_id"));
  if (!id) return;
  getDb().prepare("UPDATE research_outcomes SET done = 1 - done WHERE id=?").run(id);
  if (topicId) revalidatePath(`/research/topics/${topicId}`);
}

/** 补充模块的说明与计划月份（新建专题时只录了标题） */
export async function updateModule(fd: FormData) {
  const id = Number(fd.get("module_id"));
  const topicId = Number(fd.get("topic_id"));
  if (!id) return;

  getDb()
    .prepare("UPDATE research_modules SET summary=?, methods=?, plan_month=? WHERE id=?")
    .run(text(fd, "summary"), text(fd, "methods"), text(fd, "plan_month"), id);

  if (topicId) revalidatePath(`/research/topics/${topicId}`);
}
