import { all, parseJsonArray } from "@/lib/db";
import { AGE_GROUPS, AGE_GROUP_MAP, DOMAINS, DOMAIN_MAP, RESOURCE_CATEGORIES } from "@/lib/domain";
import { Button, Card, EmptyState, Field, PageHeader, Tag } from "@/components/ui";
import { createResource, deleteResource } from "./actions";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  title: string;
  category: string;
  domain_key: string | null;
  age_group: string | null;
  url: string | null;
  description: string | null;
  tags: string;
}

export default function ResourcesPage() {
  const rows = all<Row>("SELECT * FROM resources ORDER BY category, id DESC");

  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }

  return (
    <>
      <PageHeader
        title="资源库"
        description="课程方案、绘本书单、环创素材、政策文件——把散在各人电脑里的资料沉淀成园所资产。"
      />

      <Card className="no-print mb-6">
        <h2 className="mb-4 text-sm font-semibold">添加资源</h2>
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
              <Field label="链接" hint="外部网址，或园所共享盘路径。">
                <input name="url" className="field" placeholder="https:// 或 \\\\nas\\share\\..." />
              </Field>
            </div>
            <Field label="标签" hint="逗号或空格分隔">
              <input name="tags" className="field" />
            </Field>
          </div>
          <Field label="说明">
            <textarea name="description" rows={2} className="field" />
          </Field>
          <Button>添加</Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="资源库还是空的" hint="先把常用的绘本书单和政策文件放进来。" />
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold">
                {category}
                <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>
                  {items.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((r) => {
                  const d = r.domain_key ? DOMAIN_MAP.get(r.domain_key as never) : undefined;
                  const tags = parseJsonArray(r.tags);
                  return (
                    <Card key={r.id}>
                      <div className="flex items-start justify-between gap-3">
                        {r.url ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand-600 underline underline-offset-2"
                          >
                            {r.title}
                          </a>
                        ) : (
                          <span className="font-medium">{r.title}</span>
                        )}
                        <form action={deleteResource} className="no-print">
                          <input type="hidden" name="id" value={r.id} />
                          <button className="shrink-0 text-xs underline" style={{ color: "var(--muted)" }}>
                            删除
                          </button>
                        </form>
                      </div>
                      {r.description && (
                        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                          {r.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {d && <Tag color={d.color}>{d.name}</Tag>}
                        {r.age_group && <Tag>{AGE_GROUP_MAP.get(r.age_group as never)?.label}</Tag>}
                        {tags.map((t) => (
                          <Tag key={t}>#{t}</Tag>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
