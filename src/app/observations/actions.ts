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

export async function createObservation(fd: FormData) {
  const record = text(fd, "record");
  if (!record) throw new Error("观察记录正文不能为空");

  const id = run(
    `INSERT INTO observations
       (child_id, observer, observed_at, scene, method_key, record, analysis, support, goal_ids)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    Number(fd.get("child_id")) || null,
    text(fd, "observer") ?? "未署名",
    String(fd.get("observed_at")),
    text(fd, "scene"),
    String(fd.get("method_key")),
    record,
    text(fd, "analysis"),
    text(fd, "support"),
    toJsonArray(fd.getAll("goal_ids")),
  );

  await exportEntry("observation", id);
  revalidatePath("/observations");
  revalidatePath("/");
  redirect("/observations");
}

export async function deleteObservation(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  getDb().prepare("DELETE FROM observations WHERE id=?").run(id);
  await removeExport("observation", id);
  revalidatePath("/observations");
  revalidatePath("/");
}
