"use client";

import { useState } from "react";
import { AGE_GROUPS, AGE_GROUP_MAP, DOMAINS, DOMAIN_MAP, RESOURCE_CATEGORIES } from "@/lib/domain";
import { Card, Tag } from "@/components/ui";
import { fileHref } from "@/lib/files";
import { FilePreview } from "@/components/file-preview";
import type { PreviewData, RevealState } from "@/app/resources/actions";

export interface ResourceView {
  id: number;
  title: string;
  category: string;
  domain_key: string | null;
  age_group: string | null;
  url: string | null;
  /** 相对资料目录的路径，也是文件在索引里的身份 */
  rel_path: string | null;
  file_name: string | null;
  file_size: number | null;
  extract_kind: string | null;
  description: string | null;
  tags: string[];
  auto_category: string | null;
  auto_confidence: number | null;
  auto_matched: string[];
  /** 1 = 已归档（分类经人确认） */
  reviewed: number;
  missing: number;
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
  onArchive,
  onReclassify,
  onUnarchive,
  onReveal,
  onPreview,
  local = false,
}: {
  r: ResourceView;
  onArchive?: (fd: FormData) => void;
  onReclassify?: (fd: FormData) => void;
  onUnarchive?: (fd: FormData) => void;
  /** 在本机文件管理器里定位/打开 */
  onReveal?: (prev: RevealState, fd: FormData) => Promise<RevealState>;
  /** 读取预览内容 */
  onPreview?: (id: number) => Promise<PreviewData>;
  /** 浏览器与服务端是否在同一台机器 */
  local?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  const domain = r.domain_key ? DOMAIN_MAP.get(r.domain_key as never) : undefined;
  const confidence = r.auto_confidence ?? 0;
  const archived = r.reviewed === 1;
  // 待归档且系统把握不大的，优先让人看到
  const lowConfidence = !archived && confidence < 0.5;

  const href = r.rel_path ? fileHref(r.rel_path) : r.url;
  // 有本地文件、文件还在、且提供了预览动作，才用内嵌预览
  const canPreview = !!onPreview && !!r.rel_path && r.missing === 0;

  return (
    <Card
      className={
        r.missing === 1 ? "opacity-60" : lowConfidence ? "border-amber-400/60" : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        {canPreview ? (
          // 点标题在应用内盖一层预览，关掉即回到列表——不再新开浏览器标签页
          <FilePreview
            id={r.id}
            title={r.title}
            load={onPreview!}
            reveal={onReveal}
            local={local}
          />
        ) : href && r.missing === 0 ? (
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
          {href && r.missing === 0 && (
            <a href={`${href}?download=1`} className="text-xs underline" style={{ color: "var(--muted)" }}>
              下载
            </a>
          )}
          {archived && onUnarchive && (
            <form action={onUnarchive} className="no-print">
              <input type="hidden" name="id" value={r.id} />
              <button className="text-xs underline" style={{ color: "var(--muted)" }}>
                撤回归档
              </button>
            </form>
          )}
        </div>
      </div>

      {r.rel_path && (
        <p className="mt-1 truncate font-mono text-[11px]" style={{ color: "var(--muted)" }}>
          {r.rel_path}
        </p>
      )}

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
        {r.missing === 1 && <Tag color="#ef4444">已失联</Tag>}
        <Tag>{r.category}</Tag>
        {domain && <Tag color={domain.color}>{domain.name}</Tag>}
        {r.age_group && <Tag>{AGE_GROUP_MAP.get(r.age_group as never)?.label}</Tag>}
        {r.extract_kind && (
          <Tag>
            {KIND_LABEL[r.extract_kind] ?? r.extract_kind}
            {r.missing === 1 ? "" : canPreview ? " · 点击预览" : href ? " · 点击下载" : ""}
          </Tag>
        )}
        {r.file_size !== null && <Tag>{sizeLabel(r.file_size)}</Tag>}
        {r.tags.map((t) => (
          <Tag key={t}>#{t}</Tag>
        ))}
      </div>

      {/* 待归档：展示判定依据，让人确认或改判 */}
      {!archived && r.missing === 0 && !editing && onArchive && (
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
            <form action={onArchive}>
              <input type="hidden" name="id" value={r.id} />
              <button className="rounded-md bg-brand-600 px-2.5 py-1 text-xs text-white">
                分类正确，归档
              </button>
            </form>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border px-2.5 py-1 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              改判后归档
            </button>
          </div>
        </div>
      )}

      {editing && onReclassify && (
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
            <button className="rounded-md bg-brand-600 px-2.5 py-1 text-xs text-white">
              保存并归档
            </button>
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
