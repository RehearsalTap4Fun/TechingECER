import { ResearchForm } from "@/components/research-form";
import { PageHeader } from "@/components/ui";
import { createSession } from "../actions";

export default function NewResearchPage() {
  return (
    <>
      <PageHeader title="新建教研活动" description="会前先填主题和流程，会后补研讨记录、结论与行动项。" />
      <ResearchForm action={createSession} />
    </>
  );
}
