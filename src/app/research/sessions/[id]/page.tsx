import { notFound } from "next/navigation";
import Link from "next/link";
import { all, one } from "@/lib/db";
import { RESEARCH_TYPES } from "@/lib/domain";
import { Button, Card, Field, PageHeader, Tag } from "@/components/ui";
import { addClassReview, deleteClassReview, deleteSession } from "../../actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL = new Map(RESEARCH_TYPES.map((t) => [t.key, t.label]));
const CN_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

interface Session {
  id: number;
  topic_id: number | null;
  module_id: number | null;
  topic_title: string | null;
  module_title: string | null;
  module_seq: number | null;
  title: string;
  type_key: string;
  held_on: string;
  host: string | null;
  participants: string | null;
  topic: string | null;
  agenda: string | null;
  discussion: string | null;
  conclusion: string | null;
  action_items: string | null;
}

interface Review {
  id: number;
  teacher: string;
  observer: string;
  observed_on: string;
  highlights: string | null;
  suggestions: string | null;
  score: number | null;
  class_name: string | null;
}

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
    </div>
  );
}

export default async function ResearchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = Number(id);
  const session = one<Session>(
    `SELECT s.*, t.title AS topic_title, m.title AS module_title, m.seq AS module_seq
       FROM research_sessions s
       LEFT JOIN research_topics t ON t.id = s.topic_id
       LEFT JOIN research_modules m ON m.id = s.module_id
      WHERE s.id = ?`,
    sid,
  );
  if (!session) notFound();

  // 专题目标随活动一起展示：回看这次研讨对准了哪一条
  const topicGoals = session.topic_id
    ? all<{ kind: string; content: string }>(
        "SELECT kind, content FROM research_goals WHERE topic_id=? ORDER BY kind, seq",
        session.topic_id,
      )
    : [];

  const reviews = all<Review>(
    `SELECT r.*, c.name AS class_name
       FROM class_reviews r LEFT JOIN classes c ON c.id = r.class_id
      WHERE r.session_id = ? ORDER BY r.observed_on DESC`,
    sid,
  );
  const classes = all<{ id: number; name: string }>("SELECT id, name FROM classes ORDER BY name");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        back={
          session.topic_id
            ? { href: `/research/topics/${session.topic_id}`, label: session.topic_title ?? "返回专题" }
            : { href: "/research", label: "教研管理" }
        }
        title={session.title}
        description={`${TYPE_LABEL.get(session.type_key as never) ?? session.type_key} · ${session.held_on}${session.host ? ` · 主持 ${session.host}` : ""}`}
        action={
          <div className="no-print flex gap-2">
            <Link
              href={`/research/sessions/${session.id}/edit`}
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
              style={{ borderColor: "var(--border)" }}
            >
              编辑
            </Link>
            <form action={deleteSession}>
              <input type="hidden" name="id" value={session.id} />
              <Button variant="ghost">删除</Button>
            </form>
          </div>
        }
      />

      {session.topic_id && (session.module_title || topicGoals.length > 0) && (
        <Card className="mb-6">
          {session.module_title && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span style={{ color: "var(--muted)" }}>主题模块</span>
              <span className="font-medium">
                主题{CN_NUM[session.module_seq ?? 0] ?? (session.module_seq ?? 0) + 1}：{session.module_title}
              </span>
            </div>
          )}

          {topicGoals.length > 0 && (
            <div
              className={session.module_title ? "mt-3 border-t pt-3" : ""}
              style={session.module_title ? { borderColor: "var(--border)" } : undefined}
            >
              <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
                本专题目标
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-xs" style={{ color: "var(--muted)" }}>
                {topicGoals.map((g, i) => (
                  <li key={i}>{g.content}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {session.participants && (
        <Card className="mb-6">
          <p className="text-sm">
            <span style={{ color: "var(--muted)" }}>参与人员：</span>
            {session.participants}
          </p>
        </Card>
      )}

      <Card className="mb-6 space-y-6">
        <Section title="研讨的真问题" body={session.topic} />
        <Section title="活动流程" body={session.agenda} />
        <Section title="研讨记录" body={session.discussion} />
        <Section title="结论与共识" body={session.conclusion} />
        <Section title="后续行动" body={session.action_items} />
      </Card>

      <h2 className="mb-3 text-lg font-semibold">听评课记录</h2>

      {reviews.length > 0 && (
        <div className="mb-6 space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.teacher}</span>
                  <Tag>听课人 {r.observer}</Tag>
                  <Tag>{r.observed_on}</Tag>
                  {r.class_name && <Tag>{r.class_name}</Tag>}
                  {r.score !== null && <Tag>{r.score} 分</Tag>}
                </div>
                <form action={deleteClassReview} className="no-print">
                  <input type="hidden" name="review_id" value={r.id} />
                  <input type="hidden" name="session_id" value={sid} />
                  <button className="text-xs underline" style={{ color: "var(--muted)" }}>
                    删除
                  </button>
                </form>
              </div>
              {r.highlights && (
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  <span className="font-medium">亮点：</span>
                  {r.highlights}
                </p>
              )}
              {r.suggestions && (
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  <span className="font-medium">建议：</span>
                  {r.suggestions}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="no-print">
        <h3 className="mb-4 text-sm font-semibold">添加一条听评课记录</h3>
        <form action={addClassReview} className="space-y-4">
          <input type="hidden" name="session_id" value={sid} />
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="执教教师">
              <input name="teacher" required className="field" />
            </Field>
            <Field label="听课人">
              <input name="observer" required className="field" />
            </Field>
            <Field label="班级">
              <select name="class_id" className="field" defaultValue="">
                <option value="">不指定</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="日期">
              <input name="observed_on" type="date" required defaultValue={today} className="field" />
            </Field>
          </div>
          <Field label="亮点">
            <textarea name="highlights" rows={3} className="field" placeholder="具体到行为：提问开放、给了幼儿充分试误时间…" />
          </Field>
          <Field label="改进建议" hint="对事不对人，给出可操作的替代做法。">
            <textarea name="suggestions" rows={3} className="field" />
          </Field>
          <Field label="综合评分（选填，0~5）">
            <input name="score" type="number" step="0.5" min={0} max={5} className="field sm:w-40" />
          </Field>
          <Button>添加记录</Button>
        </form>
      </Card>
    </>
  );
}
