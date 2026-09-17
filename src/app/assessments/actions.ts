"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, run } from "@/lib/db";
import { ECERS_ITEMS } from "@/lib/ecers";

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createAssessment(fd: FormData) {
  const assessor = text(fd, "assessor");
  if (!assessor) throw new Error("评估者不能为空");

  const id = run(
    "INSERT INTO ecers_assessments (class_id, assessor, assessed_on, status, note) VALUES (?,?,?,?,?)",
    Number(fd.get("class_id")) || null,
    assessor,
    String(fd.get("assessed_on")),
    "draft",
    text(fd, "note"),
  );

  revalidatePath("/assessments");
  revalidatePath("/");
  redirect(`/assessments/${id}`);
}

/**
 * 保存整份评分表。
 *
 * 35 个条目一次性提交，用事务写入：要么全成，要么不动，
 * 避免评估者填到一半网络中断留下半张表。
 */
export async function saveScores(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) throw new Error("缺少评估 id");

  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO ecers_scores (assessment_id, item_no, score, evidence)
     VALUES (?,?,?,?)
     ON CONFLICT(assessment_id, item_no) DO UPDATE SET score=excluded.score, evidence=excluded.evidence`,
  );

  db.exec("BEGIN");
  try {
    for (const item of ECERS_ITEMS) {
      const raw = fd.get(`score_${item.no}`);
      // 空字符串 = NA（不适用），按 ECERS 规则不计入均分
      const score = raw === null || raw === "" || raw === "NA" ? null : Number(raw);
      const evidence = text(fd, `evidence_${item.no}`);
      upsert.run(id, item.no, score, evidence);
    }
    db.prepare("UPDATE ecers_assessments SET status=?, note=? WHERE id=?").run(
      String(fd.get("status") ?? "draft"),
      text(fd, "note"),
      id,
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  revalidatePath(`/assessments/${id}`);
  revalidatePath("/assessments");
  redirect(`/assessments/${id}`);
}

export async function deleteAssessment(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  getDb().prepare("DELETE FROM ecers_assessments WHERE id=?").run(id);
  revalidatePath("/assessments");
  redirect("/assessments");
}
