"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, run } from "@/lib/db";
import { exportEntry, removeExport } from "@/lib/export-md";

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createSession(fd: FormData) {
  const title = text(fd, "title");
  if (!title) throw new Error("教研主题不能为空");

  const id = run(
    `INSERT INTO research_sessions
       (topic_id, module_id, title, type_key, held_on, host, participants,
        topic, agenda, discussion, conclusion, action_items)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    Number(fd.get("topic_id")) || null,
    Number(fd.get("module_id")) || null,
    title,
    String(fd.get("type_key")),
    String(fd.get("held_on")),
    text(fd, "host"),
    text(fd, "participants"),
    text(fd, "topic"),
    text(fd, "agenda"),
    text(fd, "discussion"),
    text(fd, "conclusion"),
    text(fd, "action_items"),
  );

  await exportEntry("session", id);
  revalidatePath("/research");
  revalidatePath("/");
  redirect(`/research/sessions/${id}`);
}

export async function updateSession(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) throw new Error("缺少教研 id");

  getDb()
    .prepare(
      `UPDATE research_sessions SET
         topic_id=?, module_id=?, title=?, type_key=?, held_on=?, host=?, participants=?,
         topic=?, agenda=?, discussion=?, conclusion=?, action_items=?
       WHERE id=?`,
    )
    .run(
      Number(fd.get("topic_id")) || null,
      Number(fd.get("module_id")) || null,
      text(fd, "title") ?? "未命名教研",
      String(fd.get("type_key")),
      String(fd.get("held_on")),
      text(fd, "host"),
      text(fd, "participants"),
      text(fd, "topic"),
      text(fd, "agenda"),
      text(fd, "discussion"),
      text(fd, "conclusion"),
      text(fd, "action_items"),
      id,
    );

  await exportEntry("session", id);
  revalidatePath(`/research/sessions/${id}`);
  revalidatePath("/research");
  redirect(`/research/sessions/${id}`);
}

export async function deleteSession(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  getDb().prepare("DELETE FROM research_sessions WHERE id=?").run(id);
  await removeExport("session", id);
  revalidatePath("/research");
  redirect("/research");
}

/** 听评课记录挂在某次教研活动下 */
export async function addClassReview(fd: FormData) {
  const sessionId = Number(fd.get("session_id")) || null;
  const teacher = text(fd, "teacher");
  const observer = text(fd, "observer");
  if (!teacher || !observer) throw new Error("执教教师和听课人不能为空");

  run(
    `INSERT INTO class_reviews
       (session_id, class_id, teacher, observer, observed_on, highlights, suggestions, score)
     VALUES (?,?,?,?,?,?,?,?)`,
    sessionId,
    Number(fd.get("class_id")) || null,
    teacher,
    observer,
    String(fd.get("observed_on")),
    text(fd, "highlights"),
    text(fd, "suggestions"),
    text(fd, "score") ? Number(text(fd, "score")) : null,
  );

  if (sessionId) {
    await exportEntry("session", sessionId);
    revalidatePath(`/research/sessions/${sessionId}`);
  }
  revalidatePath("/research");
}

export async function deleteClassReview(fd: FormData) {
  const id = Number(fd.get("review_id"));
  const sessionId = Number(fd.get("session_id")) || null;
  if (!id) return;
  getDb().prepare("DELETE FROM class_reviews WHERE id=?").run(id);
  if (sessionId) {
    await exportEntry("session", sessionId);
    revalidatePath(`/research/sessions/${sessionId}`);
  }
}
