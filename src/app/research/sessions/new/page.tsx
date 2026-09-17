import { ResearchForm } from "@/components/research-form";
import { PageHeader } from "@/components/ui";
import { loadTopicOptions } from "@/lib/topic-options";
import { createSession } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; module?: string }>;
}) {
  const { topic, module } = await searchParams;
  const topics = loadTopicOptions();

  return (
    <>
      <PageHeader
        title="新建教研活动"
        description="会前先填归属、主题和流程，会后补研讨记录、结论与行动项。"
      />
      <ResearchForm
        action={createSession}
        topics={topics}
        initial={{
          topic_id: topic ? Number(topic) : null,
          module_id: module ? Number(module) : null,
        }}
      />
    </>
  );
}
