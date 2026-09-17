import { TopicForm } from "@/components/topic-form";
import { Card, PageHeader, Tag } from "@/components/ui";
import { draftFromResource, draftToFormValues } from "@/lib/plan-import";
import { createTopic } from "../../topic-actions";

export const dynamic = "force-dynamic";

export default async function NewTopicPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const imported = from ? await draftFromResource(Number(from)) : null;

  return (
    <>
      <PageHeader
        title={imported ? "导入教研专题" : "新建教研专题"}
        description={
          imported
            ? "以下内容由计划文档自动解析，请逐项核对后再保存——系统只给草稿，不替你做决定。"
            : "按学期/学年组织的一条教研主线。先录背景、目标和月度主题模块，后续每次教研活动挂在模块下。"
        }
      />

      {imported && (
        <Card className="mb-6">
          <p className="text-sm">
            来源文档：<span className="font-medium">{imported.fileName}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {imported.draft.found.map((f) => (
              <Tag key={f} color="#10b981">
                ✓ 已解析 {f}
              </Tag>
            ))}
            {imported.draft.missing.map((m) => (
              <Tag key={m} color="#f59e0b">
                ⚠ 未解析到 {m}，需手填
              </Tag>
            ))}
          </div>
        </Card>
      )}

      <TopicForm
        action={createTopic}
        initial={imported ? draftToFormValues(imported.draft, Number(from)) : {}}
        submitLabel={imported ? "核对无误，创建专题" : "保存专题"}
      />
    </>
  );
}
