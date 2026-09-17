"use server";

import { revalidatePath } from "next/cache";
import { getDb, run } from "@/lib/db";

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createClass(fd: FormData) {
  const name = text(fd, "name");
  if (!name) throw new Error("班级名称不能为空");

  run(
    "INSERT INTO classes (name, age_group, head_teacher, school_year) VALUES (?,?,?,?)",
    name,
    String(fd.get("age_group")),
    text(fd, "head_teacher"),
    text(fd, "school_year"),
  );

  revalidatePath("/classes");
}

export async function createChild(fd: FormData) {
  const name = text(fd, "name");
  if (!name) throw new Error("幼儿姓名不能为空");

  run(
    "INSERT INTO children (class_id, name, gender, birth_date, guardian, note) VALUES (?,?,?,?,?,?)",
    Number(fd.get("class_id")) || null,
    name,
    text(fd, "gender"),
    text(fd, "birth_date"),
    text(fd, "guardian"),
    text(fd, "note"),
  );

  revalidatePath("/classes");
  revalidatePath("/");
}

export async function deleteChild(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  // children 被 observations / family_notes 以 ON DELETE CASCADE 引用：
  // 删除幼儿会连带删掉其观察记录与家园沟通记录，这是刻意的（个人信息应一并清除）
  getDb().prepare("DELETE FROM children WHERE id=?").run(id);
  revalidatePath("/classes");
  revalidatePath("/");
}

export async function deleteClass(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  // classes 被 children 以 ON DELETE SET NULL 引用，幼儿会变成「未分班」而不会被删
  getDb().prepare("DELETE FROM classes WHERE id=?").run(id);
  revalidatePath("/classes");
}
