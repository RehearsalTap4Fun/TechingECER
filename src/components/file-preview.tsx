"use client";

import { useCallback, useEffect, useState } from "react";
import { fileHref } from "@/lib/files";
import type { PreviewData, RevealState } from "@/app/resources/actions";

const KIND_LABEL: Record<string, string> = {
  docx: "Word",
  pptx: "PPT",
  xlsx: "Excel",
  pdf: "PDF",
  text: "文本",
  unsupported: "未解析",
};

/**
 * 应用内的资料预览面板。
 *
 * 点条目在原页面上盖一层预览，关掉就回到列表——不再新开浏览器标签页，
 * 免得看完一份文档还要切标签才能回来。
 *
 * PDF 和图片交给浏览器直接渲染；Office 文档渲染不了，改为展示入库时
 * 提取的正文——复核分类时看正文就够了，不必开 Word。
 */
export function FilePreview({
  id,
  title,
  className,
  load,
  reveal,
  local = false,
}: {
  id: number;
  title: string;
  className?: string;
  load: (id: number) => Promise<PreviewData>;
  reveal?: (prev: RevealState, fd: FormData) => Promise<RevealState>;
  local?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setAction(null);
  }, []);

  // Esc 关闭；打开期间锁住页面滚动，否则背景会跟着滚
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  async function openPreview() {
    setOpen(true);
    if (data) return;
    setLoading(true);
    try {
      setData(await load(id));
    } finally {
      setLoading(false);
    }
  }

  /** 定位 / 打开：走服务端动作，结果就地提示 */
  async function runReveal(mode: "reveal" | "open") {
    if (!reveal) return;
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("mode", mode);
    setAction("处理中…");
    const r = await reveal({}, fd);
    setAction(r.error ?? r.ok ?? null);
  }

  const href = data?.relPath ? fileHref(data.relPath) : null;

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        title="在应用内预览"
        className={className ?? "text-left font-medium text-brand-600 underline underline-offset-2"}
      >
        {title}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.45)" }}
          onClick={close}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-2xl"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            // 面板内部的点击不该关掉面板
            onClick={(e) => e.stopPropagation()}
          >
            <header
              className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <h2 className="truncate font-medium">{data?.title ?? title}</h2>
                {data?.relPath && (
                  <p className="truncate font-mono text-[11px]" style={{ color: "var(--muted)" }}>
                    {data.relPath}
                    {data.kind && ` · ${KIND_LABEL[data.kind] ?? data.kind}`}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 text-xs">
                {local && reveal && (
                  <>
                    <button
                      type="button"
                      onClick={() => runReveal("reveal")}
                      className="rounded-md border px-2.5 py-1 transition hover:border-brand-400"
                      style={{ borderColor: "var(--border)" }}
                    >
                      在文件夹中定位
                    </button>
                    <button
                      type="button"
                      onClick={() => runReveal("open")}
                      className="rounded-md border px-2.5 py-1 transition hover:border-brand-400"
                      style={{ borderColor: "var(--border)" }}
                    >
                      用默认程序打开
                    </button>
                  </>
                )}
                {href && (
                  <a
                    href={`${href}?download=1`}
                    className="rounded-md border px-2.5 py-1 transition hover:border-brand-400"
                    style={{ borderColor: "var(--border)" }}
                  >
                    下载
                  </a>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md bg-brand-600 px-2.5 py-1 text-white"
                >
                  关闭
                </button>
              </div>
            </header>

            {action && (
              <p className="px-5 py-2 text-xs" style={{ color: "var(--muted)" }}>
                {action}
              </p>
            )}

            <div className="flex-1 overflow-auto">
              {loading && (
                <p className="p-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                  正在读取…
                </p>
              )}

              {!loading && data?.error && (
                <p className="p-8 text-center text-sm" style={{ color: "#ef4444" }}>
                  {data.error}
                </p>
              )}

              {!loading && data && !data.error && (
                <>
                  {data.note && (
                    <p
                      className="border-b px-5 py-2 text-xs"
                      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                    >
                      {data.note}
                    </p>
                  )}

                  {data.render === "pdf" && href && (
                    <iframe src={href} title={data.title} className="h-[70vh] w-full" />
                  )}

                  {data.render === "image" && href && (
                    // 预览的是用户本机文件，尺寸未知，用原生 img 避免 next/image 的域名与优化限制
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={href} alt={data.title} className="mx-auto max-h-[70vh] object-contain p-4" />
                  )}

                  {data.render === "text" && (
                    <pre className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed">
                      {data.text}
                    </pre>
                  )}

                  {data.render === "none" && !data.note && (
                    <p className="p-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                      这份资料无法在应用内预览，请下载后查看。
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
