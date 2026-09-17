import Link from "next/link";
import { all, parseJsonArray } from "@/lib/db";
import { GOAL_MAP, OBSERVATION_METHODS, DOMAIN_MAP } from "@/lib/domain";
import { Card, EmptyState, LinkButton, PageHeader, Tag } from "@/components/ui";
import { deleteObservation } from "./actions";

export const dynamic = "force-dynamic";

const METHOD_LABEL = new Map(OBSERVATION_METHODS.map((m) => [m.key, m.label]));

interface Row {
  id: number;
  child_name: string | null;
  class_name: string | null;
  observer: string;
  observed_at: string;
  scene: string | null;
  method_key: string;
  record: string;
  analysis: string | null;
  support: string | null;
  goal_ids: string;
}

export default async function ObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child } = await searchParams;

  const rows = all<Row>(
    `SELECT o.*, c.name AS child_name, cl.name AS class_name
       FROM observations o
       LEFT JOIN children c ON c.id = o.child_id
       LEFT JOIN classes cl ON cl.id = c.class_id
      ${child ? "WHERE o.child_id = ?" : ""}
      ORDER BY o.observed_at DESC, o.id DESC`,
    ...(child ? [Number(child)] : []),
  );

  const children = all<{ id: number; name: string }>("SELECT id, name FROM children ORDER BY name");

  return (
    <>
      <PageHeader
        title="儿童观察记录"
        description="客观记录 → 分析解读 → 支持策略，三段式对照《指南》目标。"
        action={<LinkButton href="/observations/new">＋ 新建记录</LinkButton>}
      />

      {children.length > 0 && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: "var(--muted)" }}>按幼儿筛选</span>
            <Link
              href="/observations"
              className={`rounded-lg px-3 py-1.5 text-sm transition ${!child ? "bg-brand-600 text-white" : "border"}`}
              style={!child ? undefined : { borderColor: "var(--border)", color: "var(--muted)" }}
            >
              全部
            </Link>
            {children.map((c) => (
              <Link
                key={c.id}
                href={`/observations?child=${c.id}`}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  child === String(c.id) ? "bg-brand-600 text-white" : "border"
                }`}
                style={child === String(c.id) ? undefined : { borderColor: "var(--border)", color: "var(--muted)" }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="还没有观察记录"
          hint="先在「班级与幼儿」里建好班级和幼儿名单，再回来记录第一条观察。"
          action={<LinkButton href="/observations/new" variant="ghost">＋ 新建记录</LinkButton>}
        />
      ) : (
        <div className="space-y-4">
          {rows.map((o) => {
            const goals = parseJsonArray(o.goal_ids)
              .map((g) => GOAL_MAP.get(g))
              .filter(Boolean);
            return (
              <Card key={o.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{o.child_name ?? "未指定幼儿"}</span>
                    {o.class_name && <Tag>{o.class_name}</Tag>}
                    <Tag>{o.observed_at}</Tag>
                    {o.scene && <Tag>{o.scene}</Tag>}
                    <Tag>{METHOD_LABEL.get(o.method_key as never) ?? o.method_key}</Tag>
                  </div>
                  <form action={deleteObservation} className="no-print">
                    <input type="hidden" name="id" value={o.id} />
                    <button className="text-xs underline" style={{ color: "var(--muted)" }}>
                      删除
                    </button>
                  </form>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{o.record}</p>

                {o.analysis && (
                  <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: "var(--bg)" }}>
                    <span className="font-medium">分析：</span>
                    <span className="whitespace-pre-wrap">{o.analysis}</span>
                  </div>
                )}
                {o.support && (
                  <div className="mt-2 rounded-lg p-3 text-sm" style={{ background: "var(--bg)" }}>
                    <span className="font-medium">支持策略：</span>
                    <span className="whitespace-pre-wrap">{o.support}</span>
                  </div>
                )}

                {goals.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {goals.map((g) => (
                      <Tag key={g!.id} color={DOMAIN_MAP.get(g!.domainKey)?.color}>
                        {g!.domainName}·{g!.title}
                      </Tag>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
                  观察者：{o.observer}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
