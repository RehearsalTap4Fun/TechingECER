import { notFound } from "next/navigation";
import Link from "next/link";
import { all, one } from "@/lib/db";
import { GOAL_KINDS, OUTCOME_KINDS, RESEARCH_TYPES, TOPIC_KINDS } from "@/lib/domain";
import { Button, Card, Field, PageHeader, Tag } from "@/components/ui";
import { deleteTopic, toggleOutcome, updateModule } from "../../topic-actions";

export const dynamic = "force-dynamic";

const KIND_LABEL = new Map<string, string>(TOPIC_KINDS.map((k) => [k.key, k.label]));
const TYPE_LABEL = new Map(RESEARCH_TYPES.map((t) => [t.key, t.label]));

interface Topic {
  id: number;
  title: string;
  subtitle: string | null;
  kind: string;
  school_year: string | null;
  term: string | null;
  leader: string | null;
  team: string | null;
  background: string | null;
  theory_basis: string | null;
  start_on: string | null;
  end_on: string | null;
  doc_resource_id: number | null;
  status: string;
}

interface Goal {
  id: number;
  kind: string;
  content: string;
}

interface Outcome {
  id: number;
  kind: string;
  title: string;
  done: number;
}

interface Module {
  id: number;
  seq: number;
  title: string;
  summary: string | null;
  methods: string | null;
  plan_month: string | null;
}

interface Session {
  id: number;
  module_id: number | null;
  title: string;
  type_key: string;
  held_on: string;
  host: string | null;
  conclusion: string | null;
  review_count: number;
}

const CN_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

export default async function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = Number(id);

  const topic = one<Topic>("SELECT * FROM research_topics WHERE id = ?", tid);
  if (!topic) notFound();

  const goals = all<Goal>(
    "SELECT id, kind, content FROM research_goals WHERE topic_id=? ORDER BY kind, seq",
    tid,
  );
  const outcomes = all<Outcome>(
    "SELECT id, kind, title, done FROM research_outcomes WHERE topic_id=? ORDER BY kind, seq",
    tid,
  );
  const modules = all<Module>(
    "SELECT * FROM research_modules WHERE topic_id=? ORDER BY seq",
    tid,
  );
  const sessions = all<Session>(
    `SELECT s.id, s.module_id, s.title, s.type_key, s.held_on, s.host, s.conclusion,
            (SELECT count(*) FROM class_reviews r WHERE r.session_id = s.id) AS review_count
       FROM research_sessions s
      WHERE s.topic_id = ?
      ORDER BY s.held_on DESC, s.id DESC`,
    tid,
  );

  const byModule = new Map<number | null, Session[]>();
  for (const s of sessions) {
    const list = byModule.get(s.module_id) ?? [];
    list.push(s);
    byModule.set(s.module_id, list);
  }

  const doneOutcomes = outcomes.filter((o) => o.done === 1).length;
  const totalReviews = sessions.reduce((n, s) => n + s.review_count, 0);
  const modulesWithSession = modules.filter((m) => (byModule.get(m.id) ?? []).length > 0).length;

  const progress = [
    { label: "主题模块", value: `${modulesWithSession}/${modules.length}`, hint: "已开展教研" },
    { label: "教研活动", value: String(sessions.length), hint: "累计场次" },
    { label: "课例实践", value: String(totalReviews), hint: "听评课记录" },
    { label: "预期成果", value: `${doneOutcomes}/${outcomes.length}`, hint: "已达成" },
  ];

  return (
    <>
      <PageHeader back={{ href: "/research", label: "教研管理" }}
        title={topic.title}
        description={topic.subtitle ?? undefined}
        action={
          <div className="no-print flex gap-2">
            <Link
              href={`/research/sessions/new?topic=${topic.id}`}
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              ＋ 本专题下新建教研
            </Link>
            <Link
              href={`/research/topics/${topic.id}/edit`}
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
              style={{ borderColor: "var(--border)" }}
            >
              编辑
            </Link>
            <form action={deleteTopic}>
              <input type="hidden" name="id" value={topic.id} />
              <Button variant="ghost">删除</Button>
            </form>
          </div>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Tag>{KIND_LABEL.get(topic.kind) ?? topic.kind}</Tag>
          {topic.school_year && <Tag>{topic.school_year}</Tag>}
          {topic.term && <Tag>{topic.term}</Tag>}
          <Tag>{topic.status === "done" ? "已结题" : topic.status === "archived" ? "已归档" : "进行中"}</Tag>
          {topic.leader && <Tag>主持 {topic.leader}</Tag>}
          {topic.start_on && topic.end_on && (
            <Tag>
              {topic.start_on} ~ {topic.end_on}
            </Tag>
          )}
        </div>
        {topic.team && (
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            参与：{topic.team}
          </p>
        )}
        {topic.doc_resource_id && (
          <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            由计划文档导入 ·{" "}
            <Link href="/resources" className="text-brand-600 underline">
              在资源库中查看原件
            </Link>
          </p>
        )}
      </Card>

      {/* 进度概览 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {progress.map((p) => (
          <Card key={p.label}>
            <div className="text-2xl font-semibold tabular-nums">{p.value}</div>
            <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              {p.label} · {p.hint}
            </div>
          </Card>
        ))}
      </div>

      {(topic.background || topic.theory_basis) && (
        <Card className="mb-6 space-y-5">
          {topic.background && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">教研背景</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{topic.background}</p>
            </div>
          )}
          {topic.theory_basis && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">理论支撑</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{topic.theory_basis}</p>
            </div>
          )}
        </Card>
      )}

      {goals.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold">教研目标</h2>
          <div className="space-y-4">
            {GOAL_KINDS.map((k) => {
              const items = goals.filter((g) => g.kind === k.key);
              if (items.length === 0) return null;
              return (
                <div key={k.key}>
                  <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {k.label}
                  </p>
                  <ol className="list-inside list-decimal space-y-1 text-sm">
                    {items.map((g) => (
                      <li key={g.id}>{g.content}</li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 主题模块 → 教研活动 → 课例实践 的层级主体 */}
      <h2 className="mb-3 text-lg font-semibold">主题模块与教研活动</h2>

      {modules.length === 0 ? (
        <Card className="mb-6">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            还没有划分主题模块。<Link href={`/research/topics/${topic.id}/edit`} className="text-brand-600 underline">去编辑</Link>，
            一条一行录入本学期的几个月度主题。
          </p>
        </Card>
      ) : (
        <div className="mb-6 space-y-4">
          {modules.map((m) => {
            const list = byModule.get(m.id) ?? [];
            return (
              <Card key={m.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">
                      主题{CN_NUM[m.seq] ?? m.seq + 1}：{m.title}
                    </h3>
                    {m.summary && (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm" style={{ color: "var(--muted)" }}>
                        {m.summary}
                      </p>
                    )}
                    {m.methods && (
                      <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                        组织方式：{m.methods}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.plan_month && <Tag>{m.plan_month}</Tag>}
                    <Tag>{list.length > 0 ? `已开展 ${list.length} 次` : "未开展"}</Tag>
                  </div>
                </div>

                {list.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    {list.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/research/sessions/${s.id}`}
                          className="block rounded-lg px-2 py-2 transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium">{s.title}</span>
                            <Tag>{TYPE_LABEL.get(s.type_key as never) ?? s.type_key}</Tag>
                            <Tag>{s.held_on}</Tag>
                            {s.review_count > 0 && <Tag>课例 {s.review_count}</Tag>}
                          </div>
                          {s.conclusion && (
                            <p className="mt-1 line-clamp-1 text-xs" style={{ color: "var(--muted)" }}>
                              共识：{s.conclusion}
                            </p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {/* 模块的补充信息：新建专题时只录了标题 */}
                <details className="no-print mt-3">
                  <summary className="cursor-pointer text-xs" style={{ color: "var(--muted)" }}>
                    补充说明与计划月份
                  </summary>
                  <form action={updateModule} className="mt-3 space-y-3">
                    <input type="hidden" name="module_id" value={m.id} />
                    <input type="hidden" name="topic_id" value={topic.id} />
                    <Field label="本模块要解决什么">
                      <textarea name="summary" rows={2} defaultValue={m.summary ?? ""} className="field" />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="组织方式">
                        <input
                          name="methods"
                          defaultValue={m.methods ?? ""}
                          className="field"
                          placeholder="理论导读＋关键概念集体建构"
                        />
                      </Field>
                      <Field label="计划月份">
                        <input
                          name="plan_month"
                          type="month"
                          defaultValue={m.plan_month ?? ""}
                          className="field"
                        />
                      </Field>
                    </div>
                    <Button>保存</Button>
                  </form>
                </details>
              </Card>
            );
          })}
        </div>
      )}

      {/* 挂在专题下但没指定模块的活动 */}
      {(byModule.get(null) ?? []).length > 0 && (
        <Card className="mb-6">
          <h3 className="mb-3 text-sm font-semibold">未指定模块的教研活动</h3>
          <ul className="space-y-1">
            {(byModule.get(null) ?? []).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/research/sessions/${s.id}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
                >
                  <span className="font-medium">{s.title}</span>
                  <Tag>{s.held_on}</Tag>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {outcomes.length > 0 && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold">预期成果</h2>
          <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
            学期末逐条对账，点一下切换完成状态。
          </p>
          <div className="space-y-4">
            {OUTCOME_KINDS.map((k) => {
              const items = outcomes.filter((o) => o.kind === k.key);
              if (items.length === 0) return null;
              return (
                <div key={k.key}>
                  <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {k.label}
                  </p>
                  <ul className="space-y-1">
                    {items.map((o) => (
                      <li key={o.id}>
                        <form action={toggleOutcome}>
                          <input type="hidden" name="outcome_id" value={o.id} />
                          <input type="hidden" name="topic_id" value={topic.id} />
                          <button
                            className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
                            style={o.done ? { color: "var(--muted)" } : undefined}
                          >
                            <span className="mt-0.5 shrink-0">{o.done ? "☑" : "☐"}</span>
                            <span className={o.done ? "line-through" : undefined}>{o.title}</span>
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
