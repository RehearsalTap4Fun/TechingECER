"use server";

import { revalidatePath } from "next/cache";
import { getDb, run, toJsonArray } from "@/lib/db";

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createResource(fd: FormData) {
  const title = text(fd, "title");
  if (!title) throw new Error("标题不能为空");

  run(
    "INSERT INTO resources (title, category, domain_key, age_group, url, description, tags) VALUES (?,?,?,?,?,?,?)",
    title,
    String(fd.get("category")),
    text(fd, "domain_key"),
    text(fd, "age_group"),
    text(fd, "url"),
    text(fd, "description"),
    toJsonArray((text(fd, "tags") ?? "").split(/[,，\s]+/).filter(Boolean)),
  );

  revalidatePath("/resources");
  revalidatePath("/");
}

export async function deleteResource(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  getDb().prepare("DELETE FROM resources WHERE id=?").run(id);
  revalidatePath("/resources");
}
