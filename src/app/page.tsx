import { all, scalar } from "@/lib/db";
import { Card, LinkButton, PageHeader, Tag } from "@/components/ui";
import { DOMAIN_MAP, AGE_GROUP_MAP } from "@/lib/domain";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface RecentLesson {
  id: number;
  title: string;
  domain_key: string;
  age_group: string;
  updated_at: string;
}

interface RecentObservation {
  id: number;
  child_name: string | null;
  observed_at: string;
  scene: string | null;
  record: string;
}

export default function HomePage() {
  const stats = [
    { label: "教案与活动", value: scalar("SELECT count(*) FROM lessons"), href: "/lessons" },
    { label: "教研活动", value: scalar("SELECT count(*) FROM research_sessions"), href: "/research" },
    { label: "观察记录", value: scalar("SELECT count(*) FROM observations"), href: "/observations" },
    { label: "ECERS 评估", value: scalar("SELECT count(*) FROM ecers_assessments"), href: "/assessments" },
    { label: "在册幼儿", value: scalar("SELECT count(*) FROM children"), href: "/classes" },
    { label: "资源条目", value: scalar("SELECT count(*) FROM resources"), href: "/resources" },
  ];

  const lessons = all<RecentLesson>(
    "SELECT id, title, domain_key, age_group, updated_at FROM lessons ORDER BY updated_at DESC LIMIT 5",
  );

  const observations = all<RecentObservation>(
    `SELECT o.id, c.name AS child_name, o.observed_at, o.scene, o.record
       FROM observations o LEFT JOIN children c ON c.id = o.child_id
      ORDER BY o.observed_at DESC, o.id DESC LIMIT 5`,
  );

  // 按领域统计教案分布，看课程结构是否均衡——这是教研最常问的第一个问题
  const byDomain = all<{ domain_key: string; c: number }>(
    "SELECT domain_key, count(*) AS c FROM lessons GROUP BY domain_key",
  );
  const totalLessons = byDomain.reduce((sum, d) => sum + d.c, 0);

  return (
    <>
      <PageHeader
        title="教研工作台"
        description="一个地方管住教案、教研、观察与评估——数据留在园所本机。"
        action={<LinkButton href="/lessons/new">＋ 新建教案</LinkButton>}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition hover:border-brand-400">
              <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
              <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                {s.label}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">最近的教案</h2>
          {lessons.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              还没有教案，<Link href="/lessons/new" className="text-brand-600 underline">去新建一个</Link>
            </p>
          ) : (
            <ul className="space-y-1">
              {lessons.map((l) => {
                const domain = DOMAIN_MAP.get(l.domain_key as never);
                return (
                  <li key={l.id}>
                    <Link
                      href={`/lessons/${l.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
                    >
                      <span className="truncate font-medium">{l.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {domain && <Tag color={domain.color}>{domain.name}</Tag>}
                        <Tag>{AGE_GROUP_MAP.get(l.age_group as never)?.label ?? l.age_group}</Tag>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">五大领域分布</h2>
          {totalLessons === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              暂无数据
            </p>
          ) : (
            <ul className="space-y-3">
              {[...DOMAIN_MAP.values()].map((d) => {
                const c = byDomain.find((x) => x.domain_key === d.key)?.c ?? 0;
                const pct = Math.round((c / totalLessons) * 100);
                return (
                  <li key={d.key}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{d.name}</span>
                      <span style={{ color: "var(--muted)" }}>
                        {c} 篇 · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-semibold">最近的观察记录</h2>
        {observations.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            还没有观察记录，<Link href="/observations/new" className="text-brand-600 underline">去记一笔</Link>
          </p>
        ) : (
          <ul className="space-y-3">
            {observations.map((o) => (
              <li key={o.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{o.child_name ?? "（幼儿已移除）"}</span>
                  <Tag>{o.observed_at}</Tag>
                  {o.scene && <Tag>{o.scene}</Tag>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--muted)" }}>
                  {o.record}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
