import { notFound } from "next/navigation";
import Link from "next/link";
import { one, parseJsonArray } from "@/lib/db";
import { AGE_GROUP_MAP, DOMAIN_MAP, GOAL_MAP } from "@/lib/domain";
import { Button, Card, PageHeader, Tag } from "@/components/ui";
import { deleteLesson } from "../actions";

export const dynamic = "force-dynamic";

interface Lesson {
  id: number;
  title: string;
  domain_key: string;
  sub_domain_id: string | null;
  goal_ids: string;
  age_group: string;
  duration_min: number | null;
  objectives: string | null;
  preparation: string | null;
  process: string | null;
  extension: string | null;
  reflection: string | null;
  tags: string;
  author: string | null;
  status: string;
  updated_at: string;
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

export default async function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = one<Lesson>("SELECT * FROM lessons WHERE id = ?", Number(id));
  if (!lesson) notFound();

  const domain = DOMAIN_MAP.get(lesson.domain_key as never);
  const goals = parseJsonArray(lesson.goal_ids)
    .map((g) => GOAL_MAP.get(g))
    .filter(Boolean);
  const tags = parseJsonArray(lesson.tags);

  return (
    <>
      <PageHeader back={{ href: "/lessons", label: "教案与活动" }}
        title={lesson.title}
        description={`${lesson.author ?? "未署名"} · 更新于 ${lesson.updated_at.slice(0, 16)}`}
        action={
          <div className="no-print flex gap-2">
            <Link
              href={`/lessons/${lesson.id}/edit`}
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
              style={{ borderColor: "var(--border)" }}
            >
              编辑
            </Link>
            <form action={deleteLesson}>
              <input type="hidden" name="id" value={lesson.id} />
              <Button variant="ghost">删除</Button>
            </form>
          </div>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {domain && <Tag color={domain.color}>{domain.name}</Tag>}
          <Tag>{AGE_GROUP_MAP.get(lesson.age_group as never)?.label ?? lesson.age_group}</Tag>
          {lesson.duration_min && <Tag>{lesson.duration_min} 分钟</Tag>}
          {tags.map((t) => (
            <Tag key={t}>#{t}</Tag>
          ))}
        </div>

        {goals.length > 0 && (
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h2 className="mb-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>
              对应《指南》目标
            </h2>
            <ul className="space-y-1 text-sm">
              {goals.map((g) => (
                <li key={g!.id}>
                  {g!.domainName} · {g!.subDomainName} · 目标{g!.index} {g!.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="space-y-6">
        <Section title="活动目标" body={lesson.objectives} />
        <Section title="活动准备" body={lesson.preparation} />
        <Section title="活动过程" body={lesson.process} />
        <Section title="活动延伸" body={lesson.extension} />
        <Section title="活动反思" body={lesson.reflection} />
      </Card>
    </>
  );
}
