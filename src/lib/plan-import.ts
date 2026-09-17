import { readFile } from "node:fs/promises";
import { one } from "@/lib/db";
import { extractText } from "@/lib/extract";
import { resolveInLibrary } from "@/lib/library";
import { parsePlan, type PlanDraft } from "@/lib/plan-parser";
import type { TopicFormValues } from "@/components/topic-form";

/**
 * 从资源库里的一份文档解析出专题草稿。
 *
 * 优先用入库时已提取的正文（content_text），省掉重新解析文件；
 * 正文为空时（旧数据或超长截断）再回读原件。
 */
export async function draftFromResource(
  resourceId: number,
): Promise<{ draft: PlanDraft; fileName: string } | null> {
  const row = one<{
    file_name: string | null;
    title: string;
    rel_path: string | null;
    content_text: string | null;
  }>("SELECT file_name, title, rel_path, content_text FROM resources WHERE id = ?", resourceId);

  if (!row) return null;

  const fileName = row.file_name ?? row.title;
  let text = row.content_text ?? "";

  if (!text && row.rel_path) {
    const abs = resolveInLibrary(row.rel_path);
    if (!abs) return null;
    try {
      const buf = await readFile(abs);
      text = (await extractText(fileName, new Uint8Array(buf))).text;
    } catch {
      return null;
    }
  }
  if (!text) return null;

  return { draft: parsePlan(fileName, text), fileName };
}

/** 把草稿摊平成 TopicForm 的初值：每类目标/成果一个多行文本框 */
export function draftToFormValues(draft: PlanDraft, resourceId: number): TopicFormValues {
  const join = (rec: Record<string, string[]>) =>
    Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v.join("\n")]));

  return {
    title: draft.title,
    subtitle: draft.subtitle,
    kind: draft.kind,
    school_year: draft.school_year,
    term: draft.term,
    background: draft.background,
    theory_basis: draft.theory_basis,
    goals: join(draft.goals),
    outcomes: join(draft.outcomes),
    modules: draft.modules.join("\n"),
    doc_resource_id: resourceId,
  };
}
