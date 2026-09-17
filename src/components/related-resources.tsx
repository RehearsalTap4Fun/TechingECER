import Link from "next/link";
import { all, parseJsonArray } from "@/lib/db";
import { AGE_GROUP_MAP, DOMAIN_MAP } from "@/lib/domain";
import { Card, Tag } from "@/components/ui";
import { fileHref } from "@/lib/files";
import { isLocalRequest } from "@/lib/reveal";
import { FileOpenButton } from "@/components/file-open-button";
import { revealResource } from "@/app/resources/actions";

/**
 * 某个模块下的「相关资料」。
 *
 * 只显示**已归档**的资料——待归档的还停在资源页等人确认分类，
 * 让没归过档的资料散到各模块里会让人以为分类已经确定了。
 */
export async function RelatedResources({
  categories,
  title = "相关资料",
  limit = 8,
}: {
  categories: string[];
  title?: string;
  limit?: number;
}) {
  if (categories.length === 0) return null;

  // 同机访问时点击是「在文件管理器中定位」，远程访问退回下载
  const local = await isLocalRequest();

  const rows = all<{
    id: number;
    title: string;
    category: string;
    domain_key: string | null;
    age_group: string | null;
    rel_path: string | null;
    extract_kind: string | null;
  }>(
    `SELECT id, title, category, domain_key, age_group, rel_path, extract_kind
       FROM resources
      WHERE reviewed = 1 AND missing = 0 AND rel_path IS NOT NULL
        AND category IN (${categories.map(() => "?").join(",")})
      ORDER BY id DESC LIMIT ?`,
    ...categories,
    limit,
  );

  if (rows.length === 0) return null;

  return (
    <Card className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link href="/resources?tab=archived" className="text-xs underline" style={{ color: "var(--muted)" }}>
          去资源库
        </Link>
      </div>
      <ul className="space-y-1">
        {rows.map((r) => {
          const d = r.domain_key ? DOMAIN_MAP.get(r.domain_key as never) : undefined;
          const tags = (
            <span className="flex shrink-0 items-center gap-1.5">
              <Tag>{r.category}</Tag>
              {d && <Tag color={d.color}>{d.name}</Tag>}
              {r.age_group && <Tag>{AGE_GROUP_MAP.get(r.age_group as never)?.label}</Tag>}
            </span>
          );

          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
            >
              {local && r.rel_path ? (
                <FileOpenButton action={revealResource} id={r.id} label={r.title} />
              ) : (
                <a
                  href={r.rel_path ? fileHref(r.rel_path) : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-brand-600 underline underline-offset-2"
                >
                  {r.title}
                </a>
              )}
              {tags}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
