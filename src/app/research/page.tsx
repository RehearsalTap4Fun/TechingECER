import Link from "next/link";
import { all } from "@/lib/db";
import { RESEARCH_TYPES, TOPIC_KINDS } from "@/lib/domain";
import { Card, EmptyState, LinkButton, PageHeader, Tag } from "@/components/ui";

export const dynamic = "force-dynamic";

const TYPE_LABEL = new Map(RESEARCH_TYPES.map((t) => [t.key, t.label]));
const KIND_LABEL = new Map<string, string>(TOPIC_KINDS.map((k) => [k.key, k.label]));

interface TopicRow {
  id: number;
  title: string;
  subtitle: string | null;
  kind: string;
  school_year: string | null;
  term: string | null;
  leader: string | null;
  status: string;
  module_count: number;
  session_count: number;
  outcome_total: number;
  outcome_done: number;
}

interface LooseSession {
  id: number;
  title: string;
  type_key: string;
  held_on: string;
  host: string | null;
  review_count: number;
}

export default function ResearchPage() {
  const topics = all<TopicRow>(
    `SELECT t.*,
            (SELECT count(*) FROM research_modules m WHERE m.topic_id = t.id) AS module_count,
            (SELECT count(*) FROM research_sessions s WHERE s.topic_id = t.id) AS session_count,
            (SELECT count(*) FROM research_outcomes o WHERE o.topic_id = t.id) AS outcome_total,
            (SELECT count(*) FROM research_outcomes o WHERE o.topic_id = t.id AND o.done = 1) AS outcome_done
       FROM research_topics t
      ORDER BY CASE t.status WHEN 'active' THEN 0 WHEN 'done' THEN 1 ELSE 2 END,
               t.school_year DESC, t.id DESC`,
  );

  // 没挂到专题下的活动单独列出——不强制归属，但要看得见
  const loose = all<LooseSession>(
    `SELECT s.id, s.title, s.type_key, s.held_on, s.host,
            (SELECT count(*) FROM class_reviews r WHERE r.session_id = s.id) AS review_count
       FROM research_sessions s
      WHERE s.topic_id IS NULL
      ORDER BY s.held_on DESC, s.id DESC`,
  );

  return (
    <>
      <PageHeader
        title="教研管理"
        description="以专题为主线组织：专题 → 月度主题模块 → 教研活动 → 课例实践。每次活动都能追溯到它服务的目标。"
        action={
          <div className="flex gap-2">
            <LinkButton href="/research/topics/new">＋ 新建专题</LinkButton>
            <LinkButton href="/research/sessions/new" variant="ghost">
              ＋ 单次教研
            </LinkButton>
          </div>
        }
      />

      {topics.length === 0 && loose.length === 0 ? (
        <EmptyState
          title="还没有教研记录"
          hint="先建一个学期专题（背景、四类目标、月度主题模块、预期成果），之后每次教研活动挂在对应模块下，学期末就能直接对账。"
          action={
            <LinkButton href="/research/topics/new" variant="ghost">
              ＋ 新建专题
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {topics.map((t) => {
            const pct =
              t.outcome_total === 0 ? 0 : Math.round((t.outcome_done / t.outcome_total) * 100);
            return (
              <Link key={t.id} href={`/research/topics/${t.id}`}>
                <Card className="transition hover:border-brand-400">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{t.title}</h3>
                      {t.subtitle && (
                        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                          {t.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Tag>{KIND_LABEL.get(t.kind) ?? t.kind}</Tag>
                      {t.school_year && (
                        <Tag>
                          {t.school_year}
                          {t.term ? ` ${t.term}` : ""}
                        </Tag>
                      )}
                      <Tag>
                        {t.status === "done" ? "已结题" : t.status === "archived" ? "已归档" : "进行中"}
                      </Tag>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--muted)" }}>
                    <span>主题模块 {t.module_count}</span>
                    <span>教研活动 {t.session_count}</span>
                    <span>
                      预期成果 {t.outcome_done}/{t.outcome_total}
                    </span>
                    {t.leader && <span>主持 {t.leader}</span>}
                  </div>

                  {t.outcome_total > 0 && (
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full"
                      style={{ background: "var(--bg)" }}
                    >
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {loose.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">未归属专题的教研活动</h2>
          <div className="space-y-3">
            {loose.map((s) => (
              <Link key={s.id} href={`/research/sessions/${s.id}`}>
                <Card className="transition hover:border-brand-400">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-medium">{s.title}</span>
                    <div className="flex items-center gap-2">
                      <Tag>{TYPE_LABEL.get(s.type_key as never) ?? s.type_key}</Tag>
                      <Tag>{s.held_on}</Tag>
                      {s.review_count > 0 && <Tag>课例 {s.review_count}</Tag>}
                    </div>
                  </div>
                  {s.host && (
                    <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                      主持：{s.host}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
