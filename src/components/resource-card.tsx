"use client";

import { useState } from "react";
import { AGE_GROUPS, AGE_GROUP_MAP, DOMAINS, DOMAIN_MAP, RESOURCE_CATEGORIES } from "@/lib/domain";
import { Card, Tag } from "@/components/ui";

export interface ResourceView {
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
  tags: string[];
  auto_category: string | null;
  auto_confidence: number | null;
  auto_matched: string[];
  reviewed: number;
  /** 命中检索词的正文片段，仅在搜索时有值 */
  snippet?: string | null;
}

function sizeLabel(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const KIND_LABEL: Record<string, string> = {
  docx: "Word",
  pptx: "PPT",
  xlsx: "Excel",
  pdf: "PDF",
  text: "文本",
  unsupported: "未解析",
};

export function ResourceCard({
  r,
  onReclassify,
  onConfirm,
  onDelete,
}: {
  r: ResourceView;
  onReclassify: (fd: FormData) => void;
  onConfirm: (fd: FormData) => void;
  onDelete: (fd: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);

  const domain = r.domain_key ? DOMAIN_MAP.get(r.domain_key as never) : undefined;
  const pending = r.reviewed === 0 && r.auto_category !== null;
  const confidence = r.auto_confidence ?? 0;
  // 低置信度的判定要显眼一些，教师优先复核这些
  const lowConfidence = pending && confidence < 0.5;

  // 上传的文件走 /api/files（public/ 不托管运行时写入的文件）
  const fileHref = r.file_path
    ? `/api/files/${r.file_path.split("/").map(encodeURIComponent).join("/")}`
    : null;
  const href = fileHref ?? r.url;
  // Office 文档浏览器无法渲染，点开就是下载；PDF / 文本 / 图片能直接预览
  const previewable = ["pdf", "text"].includes(r.extract_kind ?? "");

  return (
    <Card className={lowConfidence ? "border-amber-400/60" : undefined}>
      <div className="flex items-start justify-between gap-3">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-600 underline underline-offset-2"
          >
            {r.title}
          </a>
        ) : (
          <span className="font-medium">{r.title}</span>
        )}
        <div className="flex shrink-0 items-center gap-3">
          {fileHref && (
            <a
              href={`${fileHref}?download=1`}
              className="text-xs underline"
              style={{ color: "var(--muted)" }}
            >
              下载
            </a>
          )}
          <form action={onDelete} className="no-print">
            <input type="hidden" name="id" value={r.id} />
            <button className="text-xs underline" style={{ color: "var(--muted)" }}>
              删除
            </button>
          </form>
        </div>
      </div>

      {r.description && (
        <p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--muted)" }}>
          {r.description}
        </p>
      )}

      {r.snippet && (
        <p
          className="mt-2 rounded-lg p-2 text-xs leading-relaxed"
          style={{ background: "var(--bg)", color: "var(--muted)" }}
        >
          …{r.snippet}…
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Tag>{r.category}</Tag>
        {domain && <Tag color={domain.color}>{domain.name}</Tag>}
        {r.age_group && <Tag>{AGE_GROUP_MAP.get(r.age_group as never)?.label}</Tag>}
        {r.extract_kind && (
          <Tag>
            {KIND_LABEL[r.extract_kind] ?? r.extract_kind}
            {fileHref ? (previewable ? " · 可预览" : " · 点击下载") : ""}
          </Tag>
        )}
        {r.file_size !== null && <Tag>{sizeLabel(r.file_size)}</Tag>}
        {r.tags.map((t) => (
          <Tag key={t}>#{t}</Tag>
        ))}
      </div>

      {/* 自动分类的依据与复核入口 */}
      {pending && !editing && (
        <div
          className="no-print mt-3 rounded-lg border border-dashed p-3 text-xs"
          style={{ borderColor: lowConfidence ? "#f59e0b" : "var(--border)" }}
        >
          <p style={{ color: "var(--muted)" }}>
            系统按正文判定为<strong style={{ color: "var(--text)" }}>「{r.auto_category}」</strong>
            （置信度 {(confidence * 100).toFixed(0)}%）
            {r.auto_matched.length > 0 && <> · 依据：{r.auto_matched.join("、")}</>}
            {lowConfidence && <>　⚠ 把握不大，建议人工确认</>}
          </p>
          <div className="mt-2 flex gap-2">
            <form action={onConfirm}>
              <input type="hidden" name="id" value={r.id} />
              <button className="rounded-md bg-brand-600 px-2.5 py-1 text-xs text-white">
                分类正确
              </button>
            </form>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border px-2.5 py-1 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              改判
            </button>
          </div>
        </div>
      )}

      {editing && (
        <form
          action={onReclassify}
          onSubmit={() => setEditing(false)}
          className="no-print mt-3 rounded-lg border p-3"
          style={{ borderColor: "var(--border)" }}
        >
          <input type="hidden" name="id" value={r.id} />
          <div className="grid gap-2 sm:grid-cols-3">
            <select name="category" defaultValue={r.category} className="field">
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select name="domain_key" defaultValue={r.domain_key ?? ""} className="field">
              <option value="">领域不限</option>
              {DOMAINS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.name}
                </option>
              ))}
            </select>
            <select name="age_group" defaultValue={r.age_group ?? ""} className="field">
              <option value="">年龄班不限</option>
              {AGE_GROUPS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex gap-2">
            <button className="rounded-md bg-brand-600 px-2.5 py-1 text-xs text-white">保存</button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border px-2.5 py-1 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              取消
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
