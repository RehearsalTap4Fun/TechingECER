"use server";

import { revalidatePath } from "next/cache";
import { exportEntry, removeExport } from "@/lib/export-md";
import { redirect } from "next/navigation";
import { getDb, run, toJsonArray } from "@/lib/db";

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createLesson(fd: FormData) {
  const title = text(fd, "title");
  if (!title) throw new Error("活动名称不能为空");

  const id = run(
    `INSERT INTO lessons
       (title, domain_key, sub_domain_id, goal_ids, age_group, duration_min,
        objectives, preparation, process, extension, reflection, tags, author, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    title,
    fd.get("domain_key"),
    text(fd, "sub_domain_id"),
    toJsonArray(fd.getAll("goal_ids")),
    fd.get("age_group"),
    text(fd, "duration_min") ? Number(text(fd, "duration_min")) : null,
    text(fd, "objectives"),
    text(fd, "preparation"),
    text(fd, "process"),
    text(fd, "extension"),
    text(fd, "reflection"),
    toJsonArray(
      (text(fd, "tags") ?? "")
        .split(/[,，\s]+/)
        .filter(Boolean),
    ),
    text(fd, "author"),
    String(fd.get("status") ?? "draft"),
  );

  await exportEntry("lesson", id);
  revalidatePath("/lessons");
  revalidatePath("/");
  redirect(`/lessons/${id}`);
}

export async function updateLesson(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) throw new Error("缺少教案 id");

  getDb()
    .prepare(
      `UPDATE lessons SET
         title=?, domain_key=?, sub_domain_id=?, goal_ids=?, age_group=?, duration_min=?,
         objectives=?, preparation=?, process=?, extension=?, reflection=?, tags=?, author=?, status=?,
         updated_at=datetime('now','localtime')
       WHERE id=?`,
    )
    .run(
      text(fd, "title") ?? "未命名活动",
      String(fd.get("domain_key")),
      text(fd, "sub_domain_id"),
      toJsonArray(fd.getAll("goal_ids")),
      String(fd.get("age_group")),
      text(fd, "duration_min") ? Number(text(fd, "duration_min")) : null,
      text(fd, "objectives"),
      text(fd, "preparation"),
      text(fd, "process"),
      text(fd, "extension"),
      text(fd, "reflection"),
      toJsonArray((text(fd, "tags") ?? "").split(/[,，\s]+/).filter(Boolean)),
      text(fd, "author"),
      String(fd.get("status") ?? "draft"),
      id,
    );

  await exportEntry("lesson", id);
  revalidatePath(`/lessons/${id}`);
  revalidatePath("/lessons");
  redirect(`/lessons/${id}`);
}

export async function deleteLesson(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  getDb().prepare("DELETE FROM lessons WHERE id=?").run(id);
  await removeExport("lesson", id);
  revalidatePath("/lessons");
  revalidatePath("/");
  redirect("/lessons");
}
