import Link from "next/link";
import { all } from "@/lib/db";
import { RESEARCH_TYPES } from "@/lib/domain";
import { Card, EmptyState, LinkButton, PageHeader, Tag } from "@/components/ui";

export const dynamic = "force-dynamic";

const TYPE_LABEL = new Map(RESEARCH_TYPES.map((t) => [t.key, t.label]));

interface Row {
  id: number;
  title: string;
  type_key: string;
  held_on: string;
  host: string | null;
  topic: string | null;
  review_count: number;
}

export default function ResearchPage() {
  const rows = all<Row>(
    `SELECT s.*, (SELECT count(*) FROM class_reviews r WHERE r.session_id = s.id) AS review_count
       FROM research_sessions s
      ORDER BY s.held_on DESC, s.id DESC`,
  );

  return (
    <>
      <PageHeader
        title="教研管理"
        description="教研活动纪要与听评课记录。每次教研都落到「结论」和「后续行动」，避免开完就散。"
        action={<LinkButton href="/research/new">＋ 新建教研</LinkButton>}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="还没有教研记录"
          hint="记录一次教研活动：主题、研讨过程、达成的共识和下一步谁在什么时候做什么。"
          action={<LinkButton href="/research/new" variant="ghost">＋ 新建教研</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <Link key={s.id} href={`/research/${s.id}`}>
              <Card className="transition hover:border-brand-400">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium">{s.title}</h3>
                  <div className="flex items-center gap-2">
                    <Tag>{TYPE_LABEL.get(s.type_key as never) ?? s.type_key}</Tag>
                    <Tag>{s.held_on}</Tag>
                    {s.review_count > 0 && <Tag>听评课 {s.review_count}</Tag>}
                  </div>
                </div>
                {s.topic && (
                  <p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--muted)" }}>
                    {s.topic}
                  </p>
                )}
                {s.host && (
                  <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                    主持：{s.host}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
