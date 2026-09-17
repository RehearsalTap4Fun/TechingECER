import { notFound } from "next/navigation";
import { one, parseJsonArray } from "@/lib/db";
import { LessonForm } from "@/components/lesson-form";
import { PageHeader } from "@/components/ui";
import { updateLesson } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = one<Record<string, never>>("SELECT * FROM lessons WHERE id = ?", Number(id));
  if (!row) notFound();

  return (
    <>
      <PageHeader
        back={{ href: `/lessons/${id}`, label: String(row.title) }}
        title="编辑教案"
        description={String(row.title)}
      />
      <LessonForm
        action={updateLesson}
        submitLabel="保存修改"
        initial={{
          id: Number(row.id),
          title: String(row.title),
          domain_key: String(row.domain_key),
          sub_domain_id: row.sub_domain_id ? String(row.sub_domain_id) : null,
          goal_ids: parseJsonArray(row.goal_ids),
          age_group: String(row.age_group),
          duration_min: row.duration_min ? Number(row.duration_min) : null,
          objectives: row.objectives ? String(row.objectives) : null,
          preparation: row.preparation ? String(row.preparation) : null,
          process: row.process ? String(row.process) : null,
          extension: row.extension ? String(row.extension) : null,
          reflection: row.reflection ? String(row.reflection) : null,
          tags: parseJsonArray(row.tags),
          author: row.author ? String(row.author) : null,
          status: String(row.status),
        }}
      />
    </>
  );
}
