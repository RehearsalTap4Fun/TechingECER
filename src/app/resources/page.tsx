import Link from "next/link";
import { all, parseJsonArray, scalar } from "@/lib/db";
import { AGE_GROUPS, DOMAINS, RESOURCE_CATEGORIES } from "@/lib/domain";
import { Button, Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { UploadBox } from "@/components/upload-box";
import { ResourceCard, type ResourceView } from "@/components/resource-card";
import {
  confirmResource,
  createResource,
  deleteResource,
  reclassifyResource,
  uploadDocuments,
} from "./actions";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  title: string;
  category: string;
  domain_key: string | null;
  age_group: string | null;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  extract_kind: string | null;
  description: string | null;
  tags: string;
  content_text: string | null;
  auto_category: string | null;
  auto_confidence: number | null;
  auto_matched: string;
  reviewed: number;
}

/** 从正文里截取命中检索词前后的一段，用于结果预览 */
function snippetAround(text: string | null, q: string): string | null {
  if (!text || !q) return null;
  const i = text.indexOf(q);
  if (i === -1) return null;
  const start = Math.max(0, i - 40);
  return text.slice(start, start + 140).replace(/\s+/g, " ");
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; pending?: string }>;
}) {
  const { q, category, pending } = await searchParams;

  const where: string[] = [];
  const params: unknown[] = [];
  if (q) {
    // 正文一并参与检索——这正是自动提取文本的附带收益
    where.push("(title LIKE ? OR description LIKE ? OR tags LIKE ? OR content_text LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) {
    where.push("category = ?");
    params.push(category);
  }
  if (pending === "1") {
    where.push("reviewed = 0 AND auto_category IS NOT NULL");
  }

  const rows = all<Row>(
    `SELECT * FROM resources ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY reviewed ASC, id DESC`,
    ...params,
  );

  const pendingCount = scalar(
    "SELECT count(*) FROM resources WHERE reviewed = 0 AND auto_category IS NOT NULL",
  );

  const views: ResourceView[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    domain_key: r.domain_key,
    age_group: r.age_group,
    url: r.url,
    file_path: r.file_path,
    file_name: r.file_name,
    file_size: r.file_size,
    extract_kind: r.extract_kind,
    description: r.description,
    tags: parseJsonArray(r.tags),
    auto_category: r.auto_category,
    auto_confidence: r.auto_confidence,
    auto_matched: parseJsonArray(r.auto_matched),
    reviewed: r.reviewed,
    snippet: q ? snippetAround(r.content_text, q) : null,
  }));

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category, pending, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/resources?${s}` : "/resources";
  };

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={href + label}
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        active ? "bg-brand-600 text-white" : "border hover:border-brand-400"
      }`}
      style={active ? undefined : { borderColor: "var(--border)", color: "var(--muted)" }}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="资源库"
        description="上传的文档会按正文内容自动判定分类、领域和年龄班，检索可直接命中文档正文。"
      />

      <UploadBox action={uploadDocuments} />

      <Card className="mb-6">
        <form action="/resources" className="mb-4">
          {category && <input type="hidden" name="category" value={category} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            className="field"
            placeholder="搜索标题、标签，或文档正文内容…"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {chip("全部", qs({ category: undefined, pending: undefined }), !category && pending !== "1")}
          {pendingCount > 0 &&
            chip(`待复核 ${pendingCount}`, qs({ pending: "1", category: undefined }), pending === "1")}
          {RESOURCE_CATEGORIES.map((c) =>
            chip(c, qs({ category: c, pending: undefined }), category === c),
          )}
        </div>
      </Card>

      {views.length === 0 ? (
        <EmptyState
          title={q || category || pending ? "没有符合条件的资源" : "资源库还是空的"}
          hint={
            q || category || pending
              ? "换个条件试试。"
              : "把常用的教研计划、绘本书单、政策文件拖进上面的上传区，系统会自动归类。批量导入历史资料可用 npm run import -- <目录>。"
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {views.map((r) => (
            <ResourceCard
              key={r.id}
              r={r}
              onReclassify={reclassifyResource}
              onConfirm={confirmResource}
              onDelete={deleteResource}
            />
          ))}
        </div>
      )}

      {/* 没有文件、只有一个外链的资源仍然可以手工登记 */}
      <details className="no-print mt-8">
        <summary className="cursor-pointer text-sm" style={{ color: "var(--muted)" }}>
          手工登记一条外链资源（无文件）
        </summary>
        <Card className="mt-3">
          <form action={createResource} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Field label="标题">
                  <input name="title" required className="field" />
                </Field>
              </div>
              <Field label="分类">
                <select name="category" className="field" defaultValue="课程方案">
                  {RESOURCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="领域">
                <select name="domain_key" className="field" defaultValue="">
                  <option value="">不限</option>
                  {DOMAINS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="年龄班">
                <select name="age_group" className="field" defaultValue="">
                  <option value="">不限</option>
                  {AGE_GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="链接">
                  <input name="url" className="field" placeholder="https://…" />
                </Field>
              </div>
              <Field label="标签">
                <input name="tags" className="field" />
              </Field>
            </div>
            <Field label="说明">
              <textarea name="description" rows={2} className="field" />
            </Field>
            <Button>添加</Button>
          </form>
        </Card>
      </details>
    </>
  );
}
