import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import { TopicForm, type TopicFormValues } from "@/components/topic-form";
import { PageHeader } from "@/components/ui";
import { updateTopic } from "../../../topic-actions";

export const dynamic = "force-dynamic";

/** 把分行存储的目标/成果还原成每类一个多行文本框的内容 */
function group(rows: Array<{ kind: string; content: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    out[r.kind] = out[r.kind] ? `${out[r.kind]}\n${r.content}` : r.content;
  }
  return out;
}

export default async function EditTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = Number(id);

  const topic = one<TopicFormValues>("SELECT * FROM research_topics WHERE id = ?", tid);
  if (!topic) notFound();

  const goals = all<{ kind: string; content: string }>(
    "SELECT kind, content FROM research_goals WHERE topic_id=? ORDER BY kind, seq",
    tid,
  );
  const outcomes = all<{ kind: string; content: string }>(
    "SELECT kind, title AS content FROM research_outcomes WHERE topic_id=? ORDER BY kind, seq",
    tid,
  );
  const modules = all<{ title: string }>(
    "SELECT title FROM research_modules WHERE topic_id=? ORDER BY seq",
    tid,
  );

  return (
    <>
      <PageHeader
        title="编辑教研专题"
        description="改动模块标题会新建模块，已挂靠的教研活动按标题匹配保留归属；删掉某行则该模块下的活动变为「未指定模块」。"
      />
      <TopicForm
        action={updateTopic}
        submitLabel="保存修改"
        initial={{
          ...topic,
          goals: group(goals),
          outcomes: group(outcomes),
          modules: modules.map((m) => m.title).join("\n"),
        }}
      />
    </>
  );
}
