import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { ResearchForm, type SessionValues } from "@/components/research-form";
import { PageHeader } from "@/components/ui";
import { loadTopicOptions } from "@/lib/topic-options";
import { updateSession } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = one<SessionValues>("SELECT * FROM research_sessions WHERE id = ?", Number(id));
  if (!row) notFound();

  return (
    <>
      <PageHeader title="编辑教研纪要" description={row.title} />
      <ResearchForm
        action={updateSession}
        initial={row}
        topics={loadTopicOptions()}
        submitLabel="保存修改"
      />
    </>
  );
}
