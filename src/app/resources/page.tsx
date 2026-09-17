import Link from "next/link";
import { all, parseJsonArray, scalar } from "@/lib/db";
import { RESOURCE_CATEGORIES } from "@/lib/domain";
import { syncLibrary } from "@/lib/library";
import { getLibraryDir } from "@/lib/settings";
import { isLocalRequest } from "@/lib/reveal";
import { Button, Card, EmptyState, PageHeader, Tag } from "@/components/ui";
import { LibrarySetup } from "@/components/library-setup";
import { ResourceCard, type ResourceView } from "@/components/resource-card";
import {
  archiveResource,
  bindLibrary,
  exportAllToLibrary,
  locateDroppedDir,
  revealResource,
  purgeMissing,
  reclassifyResource,
  rescanLibrary,
  unarchiveResource,
  unbindLibrary,
} from "./actions";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  title: string;
  category: string;
  domain_key: string | null;
  age_group: string | null;
  url: string | null;
  rel_path: string | null;
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
  missing: number;
}

function snippetAround(text: string | null, q: string): string | null {
  if (!text || !q) return null;
  const i = text.indexOf(q);
  if (i === -1) return null;
  return text.slice(Math.max(0, i - 40), Math.max(0, i - 40) + 140).replace(/\s+/g, " ");
}

function toView(r: Row, q?: string): ResourceView {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    domain_key: r.domain_key,
    age_group: r.age_group,
    url: r.url,
    rel_path: r.rel_path,
    file_name: r.file_name,
    file_size: r.file_size,
    extract_kind: r.extract_kind,
    description: r.description,
    tags: parseJsonArray(r.tags),
    auto_category: r.auto_category,
    auto_confidence: r.auto_confidence,
    auto_matched: parseJsonArray(r.auto_matched),
    reviewed: r.reviewed,
    missing: r.missing,
    snippet: q ? snippetAround(r.content_text, q) : null,
  };
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tab?: string }>;
}) {
  const { q, category, tab } = await searchParams;

  const dir = getLibraryDir();
  // 同机访问才提供「在文件管理器中定位」，否则打开的是服务器那台机器
  const local = await isLocalRequest();
  // 进入本页即自动索引；内部按 size+mtime 跳过没变的文件，日常几乎不花时间
  const sync = dir ? await syncLibrary() : null;

  if (!dir) {
    return (
      <>
        <PageHeader
          title="资源库"
          description="这是一个本地工具——绑定你自己的资料目录，文档放进去就会被自动索引和分类，文件始终留在原处。"
        />
        <LibrarySetup action={bindLibrary} locate={locateDroppedDir} canLocate={local} />
      </>
    );
  }

  const view = tab === "archived" ? "archived" : tab === "missing" ? "missing" : "pending";

  const where: string[] = ["rel_path IS NOT NULL"];
  const params: unknown[] = [];

  if (view === "missing") {
    where.push("missing = 1");
  } else {
    where.push("missing = 0");
    where.push(view === "archived" ? "reviewed = 1" : "reviewed = 0");
  }
  if (q) {
    where.push("(title LIKE ? OR description LIKE ? OR tags LIKE ? OR content_text LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) {
    where.push("category = ?");
    params.push(category);
  }

  const rows = all<Row>(
    `SELECT * FROM resources WHERE ${where.join(" AND ")} ORDER BY id DESC`,
    ...params,
  );

  const pendingCount = scalar(
    "SELECT count(*) FROM resources WHERE rel_path IS NOT NULL AND missing = 0 AND reviewed = 0",
  );
  const archivedCount = scalar(
    "SELECT count(*) FROM resources WHERE rel_path IS NOT NULL AND missing = 0 AND reviewed = 1",
  );
  const missingCount = scalar("SELECT count(*) FROM resources WHERE rel_path IS NOT NULL AND missing = 1");

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category, tab, ...patch })) if (v) p.set(k, v);
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
        description="索引自你绑定的资料目录。待归档的文档在这里等待确认分类，归档后会出现在对应模块的「相关资料」中。"
        action={
          <div className="no-print flex gap-2">
            <form action={rescanLibrary}>
              <Button variant="ghost">重新扫描</Button>
            </form>
            <form action={exportAllToLibrary}>
              <Button variant="ghost">重新导出应用内容</Button>
            </form>
          </div>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              资料目录
            </p>
            <p className="truncate font-mono text-xs">{dir}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              应用里创建的教案、教研、观察记录等会同时导出到该目录的「应用导出」子目录（单向，不再索引回来）
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
            {sync && (sync.added > 0 || sync.updated > 0 || sync.restored > 0) && (
              <span>
                本次扫描：新增 {sync.added} · 更新 {sync.updated}
                {sync.restored > 0 && ` · 恢复 ${sync.restored}`}
              </span>
            )}
            {sync?.error && <span style={{ color: "#ef4444" }}>{sync.error}</span>}
            <details className="no-print">
              <summary className="cursor-pointer underline">更换目录</summary>
              <div className="mt-3 w-[min(90vw,32rem)]">
                <LibrarySetup
                  action={bindLibrary}
                  locate={locateDroppedDir}
                  current={dir}
                  canLocate={local}
                />
                <form action={unbindLibrary} className="mt-2">
                  <button className="text-xs underline" style={{ color: "var(--muted)" }}>
                    解除绑定（只清索引，不动你的文件）
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <form action="/resources" className="mb-4">
          {category && <input type="hidden" name="category" value={category} />}
          {tab && <input type="hidden" name="tab" value={tab} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            className="field"
            placeholder="搜索标题、标签，或文档正文内容…"
          />
        </form>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {chip(`待归档 ${pendingCount}`, qs({ tab: undefined }), view === "pending")}
          {chip(`已归档 ${archivedCount}`, qs({ tab: "archived" }), view === "archived")}
          {missingCount > 0 && chip(`已失联 ${missingCount}`, qs({ tab: "missing" }), view === "missing")}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chip("全部分类", qs({ category: undefined }), !category)}
          {RESOURCE_CATEGORIES.map((c) => chip(c, qs({ category: c }), category === c))}
        </div>
      </Card>

      {view === "missing" && missingCount > 0 && (
        <Card className="mb-6">
          <p className="text-sm">
            这些文件已不在资料目录里（被删除、改名或移走）。索引记录保留着，
            以免只是临时移动就丢掉已做的分类——文件放回原处后会自动恢复。
          </p>
          <form action={purgeMissing} className="no-print mt-3">
            <Button variant="ghost">确认清理这 {missingCount} 条记录</Button>
          </form>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title={
            q || category
              ? "没有符合条件的资料"
              : view === "archived"
                ? "还没有归档的资料"
                : view === "missing"
                  ? "没有失联的文件"
                  : "待归档队列是空的"
          }
          hint={
            q || category
              ? "换个条件试试。"
              : view === "pending"
                ? `把文档放进 ${dir}，回到本页就会自动索引并给出分类建议。`
                : "在「待归档」里确认分类后，资料会出现在这里，并同步到对应模块。"
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <ResourceCard
              key={r.id}
              r={toView(r, q)}
              onArchive={archiveResource}
              onReclassify={reclassifyResource}
              onUnarchive={unarchiveResource}
              onReveal={revealResource}
              local={local}
            />
          ))}
        </div>
      )}
    </>
  );
}
