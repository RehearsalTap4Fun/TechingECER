"use server";

import { revalidatePath } from "next/cache";
import { getDb, run, toJsonArray } from "@/lib/db";
import { MAX_FILE_BYTES, ingestFile } from "@/lib/ingest";

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

/**
 * 上传文档并按正文内容自动分类。
 *
 * 支持多选，逐个处理：一个文件解析失败不应连累其他文件，
 * 失败的那个仍然入库（只是没有正文和分类依据），由教师手工归类。
 */
export async function uploadDocuments(fd: FormData) {
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) continue;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await ingestFile(file.name, bytes);
  }

  revalidatePath("/resources");
  revalidatePath("/");
}

/** 人工改判分类，同时标记为已复核 */
export async function reclassifyResource(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;

  getDb()
    .prepare(
      "UPDATE resources SET category=?, domain_key=?, age_group=?, reviewed=1 WHERE id=?",
    )
    .run(
      String(fd.get("category")),
      (fd.get("domain_key") as string) || null,
      (fd.get("age_group") as string) || null,
      id,
    );

  revalidatePath("/resources");
}

/** 确认系统判定无误 */
export async function confirmResource(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  getDb().prepare("UPDATE resources SET reviewed=1 WHERE id=?").run(id);
  revalidatePath("/resources");
}
