import { TopicForm } from "@/components/topic-form";
import { PageHeader } from "@/components/ui";
import { createTopic } from "../../topic-actions";

export default function NewTopicPage() {
  return (
    <>
      <PageHeader
        title="新建教研专题"
        description="按学期/学年组织的一条教研主线。先录背景、目标和月度主题模块，后续每次教研活动挂在模块下。"
      />
      <TopicForm action={createTopic} />
    </>
  );
}
