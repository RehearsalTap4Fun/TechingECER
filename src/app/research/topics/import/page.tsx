import Link from "next/link";
import { all } from "@/lib/db";
import { parsePlan } from "@/lib/plan-parser";
import { Card, EmptyState, LinkButton, PageHeader, Tag } from "@/components/ui";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  title: string;
  file_name: string | null;
  category: string;
  content_text: string | null;
  topic_id: number | null;
  topic_title: string | null;
}

export default function ImportPlanPage() {
  // 只看有正文的文档；已经建过专题的标出来，避免重复导入
  const rows = all<Row>(
    `SELECT r.id, r.title, r.file_name, r.category, r.content_text,
            t.id AS topic_id, t.title AS topic_title
       FROM resources r
       LEFT JOIN research_topics t ON t.doc_resource_id = r.id
      WHERE r.content_text IS NOT NULL AND length(r.content_text) > 200
        AND r.missing = 0
      ORDER BY r.id DESC`,
  );

  const candidates = rows
    .map((r) => {
      const draft = parsePlan(r.file_name ?? r.title, r.content_text ?? "");
      return { row: r, draft };
    })
    // 至少要解析出目标或主题模块，才算得上是一份计划
    .filter(
      ({ draft }) =>
        Object.keys(draft.goals).length > 0 ||
        draft.modules.length > 0 ||
        Object.keys(draft.outcomes).length > 0,
    );

  return (
    <>
      <PageHeader
        title="从计划文档建专题"
        description="解析资源库里的教研计划，抽出背景、四类目标、主题模块与预期成果。解析结果只是草稿，确认后才入库。"
        action={<LinkButton href="/research/topics/new" variant="ghost">手工新建</LinkButton>}
      />

      {candidates.length === 0 ? (
        <EmptyState
          title="资源库里没有可解析的教研计划"
          hint="先到「资源库」上传教研计划文档（Word / PDF 均可），系统提取正文后这里就会列出来。"
          action={<LinkButton href="/resources" variant="ghost">去上传</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {candidates.map(({ row, draft }) => (
            <Card key={row.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{draft.title}</h3>
                  <p className="mt-1 truncate text-xs" style={{ color: "var(--muted)" }}>
                    来源：{row.file_name ?? row.title}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {row.topic_id ? (
                    <Link
                      href={`/research/topics/${row.topic_id}`}
                      className="rounded-lg border px-3 py-1.5 text-sm transition hover:border-brand-400"
                      style={{ borderColor: "var(--border)" }}
                    >
                      已建专题，去查看
                    </Link>
                  ) : (
                    <Link
                      href={`/research/topics/new?from=${row.id}`}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
                    >
                      导入为专题
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {draft.school_year && <Tag>{draft.school_year}</Tag>}
                {draft.term && <Tag>{draft.term}</Tag>}
                {draft.found.map((f) => (
                  <Tag key={f} color="#10b981">
                    ✓ {f}
                  </Tag>
                ))}
                {draft.missing.map((m) => (
                  <Tag key={m} color="#f59e0b">
                    需手填 {m}
                  </Tag>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
