"use server";

import { revalidatePath } from "next/cache";
import { getDb, run } from "@/lib/db";

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createFamilyNote(fd: FormData) {
  const title = text(fd, "title");
  if (!title) throw new Error("标题不能为空");

  run(
    "INSERT INTO family_notes (child_id, kind_key, noted_on, title, content, author) VALUES (?,?,?,?,?,?)",
    Number(fd.get("child_id")) || null,
    String(fd.get("kind_key")),
    String(fd.get("noted_on")),
    title,
    text(fd, "content"),
    text(fd, "author"),
  );

  revalidatePath("/family");
}

export async function deleteFamilyNote(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  getDb().prepare("DELETE FROM family_notes WHERE id=?").run(id);
  revalidatePath("/family");
}
