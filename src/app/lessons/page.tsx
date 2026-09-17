import Link from "next/link";
import { all, parseJsonArray } from "@/lib/db";
import { AGE_GROUPS, AGE_GROUP_MAP, DOMAINS, DOMAIN_MAP } from "@/lib/domain";
import { Card, EmptyState, LinkButton, PageHeader, Tag } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  ready: "可实施",
  archived: "归档",
};

interface Row {
  id: number;
  title: string;
  domain_key: string;
  age_group: string;
  duration_min: number | null;
  author: string | null;
  status: string;
  tags: string;
  updated_at: string;
}

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; age?: string; q?: string }>;
}) {
  const { domain, age, q } = await searchParams;

  const where: string[] = [];
  const params: unknown[] = [];
  if (domain) {
    where.push("domain_key = ?");
    params.push(domain);
  }
  if (age) {
    where.push("age_group = ?");
    params.push(age);
  }
  if (q) {
    where.push("(title LIKE ? OR objectives LIKE ? OR tags LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const rows = all<Row>(
    `SELECT id, title, domain_key, age_group, duration_min, author, status, tags, updated_at
       FROM lessons
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC`,
    ...params,
  );

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        active ? "bg-brand-600 text-white" : "border hover:border-brand-400"
      }`}
      style={active ? undefined : { borderColor: "var(--border)", color: "var(--muted)" }}
    >
      {label}
    </Link>
  );

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { domain, age, q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/lessons?${s}` : "/lessons";
  };

  return (
    <>
      <PageHeader
        title="教案与活动设计"
        description="按《指南》五大领域组织，可按领域、年龄班和关键词筛选。"
        action={<LinkButton href="/lessons/new">＋ 新建教案</LinkButton>}
      />

      <Card className="mb-6">
        <form className="mb-4" action="/lessons">
          {domain && <input type="hidden" name="domain" value={domain} />}
          {age && <input type="hidden" name="age" value={age} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            className="field"
            placeholder="搜索活动名称、目标或标签…"
          />
        </form>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs" style={{ color: "var(--muted)" }}>领域</span>
            {chip("全部", qs({ domain: undefined }), !domain)}
            {DOMAINS.map((d) => chip(d.name, qs({ domain: d.key }), domain === d.key))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs" style={{ color: "var(--muted)" }}>年龄班</span>
            {chip("全部", qs({ age: undefined }), !age)}
            {AGE_GROUPS.map((g) => chip(g.label, qs({ age: g.key }), age === g.key))}
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="没有符合条件的教案"
          hint="换个筛选条件，或者直接新建一份活动设计。"
          action={<LinkButton href="/lessons/new" variant="ghost">＋ 新建教案</LinkButton>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((l) => {
            const d = DOMAIN_MAP.get(l.domain_key as never);
            const tags = parseJsonArray(l.tags);
            return (
              <Link key={l.id} href={`/lessons/${l.id}`}>
                <Card className="h-full transition hover:border-brand-400">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{l.title}</h3>
                    <Tag>{STATUS_LABEL[l.status] ?? l.status}</Tag>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {d && <Tag color={d.color}>{d.name}</Tag>}
                    <Tag>{AGE_GROUP_MAP.get(l.age_group as never)?.label ?? l.age_group}</Tag>
                    {l.duration_min && <Tag>{l.duration_min} 分钟</Tag>}
                  </div>
                  {tags.length > 0 && (
                    <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
                      {tags.map((t) => `#${t}`).join("  ")}
                    </p>
                  )}
                  <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
                    {l.author ?? "未署名"} · 更新于 {l.updated_at.slice(0, 10)}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
