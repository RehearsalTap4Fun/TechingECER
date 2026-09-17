"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Card, Field } from "@/components/ui";
import type { BindState, LocateState } from "@/app/resources/actions";

const MAX_SAMPLES = 24;

interface Sample {
  rel: string;
  size: number;
}

/** 浏览器不给绝对路径，只能交出文件夹名和内部相对路径 + 大小，由服务端反查 */
interface Dropped {
  name: string;
  samples: Sample[];
}

/** 递归读取拖入目录的条目，数量和深度都设上限——只是取指纹，不需要读全 */
async function readEntries(
  dir: FileSystemDirectoryEntry,
  prefix: string,
  out: Sample[],
  depth: number,
): Promise<void> {
  if (out.length >= MAX_SAMPLES || depth > 3) return;

  const reader = dir.createReader();
  // readEntries 一次最多返回 100 条，必须反复调用直到返回空数组
  for (;;) {
    const batch: FileSystemEntry[] = await new Promise((resolve) =>
      reader.readEntries(
        (e) => resolve(e),
        () => resolve([]),
      ),
    );
    if (batch.length === 0) break;

    for (const entry of batch) {
      if (out.length >= MAX_SAMPLES) return;
      if (entry.name.startsWith(".") || entry.name.startsWith("~$")) continue;

      if (entry.isFile) {
        const file: File | null = await new Promise((resolve) =>
          (entry as FileSystemFileEntry).file(
            (f) => resolve(f),
            () => resolve(null),
          ),
        );
        if (file) out.push({ rel: prefix + entry.name, size: file.size });
      } else if (entry.isDirectory) {
        await readEntries(entry as FileSystemDirectoryEntry, `${prefix}${entry.name}/`, out, depth + 1);
      }
    }
  }
}

async function fromDrop(dt: DataTransfer): Promise<Dropped | null> {
  for (const item of Array.from(dt.items)) {
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.();
    if (!entry?.isDirectory) continue;

    const samples: Sample[] = [];
    await readEntries(entry as FileSystemDirectoryEntry, "", samples, 0);
    return { name: entry.name, samples };
  }
  return null;
}

/** 点击选择走 <input webkitdirectory>，它给的 webkitRelativePath 形如「文件夹名/子目录/文件」 */
function fromInput(files: FileList): Dropped | null {
  const first = files[0];
  if (!first) return null;
  const rel = (first as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
  const name = rel.split("/")[0];
  if (!name) return null;

  const samples: Sample[] = [];
  for (const f of Array.from(files)) {
    if (samples.length >= MAX_SAMPLES) break;
    const r = (f as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
    const inner = r.slice(name.length + 1);
    if (!inner || f.name.startsWith(".") || f.name.startsWith("~$")) continue;
    samples.push({ rel: inner, size: f.size });
  }
  return { name, samples };
}

function LocateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 inline-flex items-center rounded-lg border px-3 py-1.5 text-xs transition hover:border-brand-400 disabled:opacity-50"
      style={{ borderColor: "var(--border)" }}
    >
      {pending ? "正在本机查找这个目录…" : "重新识别"}
    </button>
  );
}

function BindButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
    >
      {pending ? "正在扫描目录…" : label}
    </button>
  );
}

/**
 * 绑定资料目录。
 *
 * 拖入文件夹时，浏览器只交得出文件夹名和内部文件的相对路径 + 大小——真实的
 * 绝对路径是拿不到的（所有浏览器都不给）。所以由服务端拿这些信息在本机的
 * 常用位置反查同名目录，再用文件大小确认是哪一个。找不到就退回手填。
 */
export function LibrarySetup({
  action,
  locate,
  current,
  canLocate = false,
}: {
  action: (prev: BindState, fd: FormData) => Promise<BindState>;
  locate: (prev: LocateState, fd: FormData) => Promise<LocateState>;
  current?: string | null;
  /** 仅本机访问时才能反查目录 */
  canLocate?: boolean;
}) {
  const [bindState, bindAction] = useActionState<BindState, FormData>(action, {});
  const [locState, locAction] = useActionState<LocateState, FormData>(locate, {});

  const [dropped, setDropped] = useState<Dropped | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pathValue, setPathValue] = useState(current ?? "");

  const locFormRef = useRef<HTMLFormElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  /** 拿到文件夹信息后立即请服务端反查 */
  function submitLocate(d: Dropped) {
    setDropped(d);
    // 表单的隐藏域由 state 驱动，要等 React 提交完这次渲染再触发
    queueMicrotask(() => locFormRef.current?.requestSubmit());
  }

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold">{current ? "更换资料目录" : "绑定资料目录"}</h2>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
        选一个你平时放园所资料的文件夹。往里放文档，进入本页时会自动索引并给出分类建议，
        <strong>文件始终留在原处，应用不复制、不改名、不移动</strong>。
      </p>

      {canLocate && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragging(false);
              const d = await fromDrop(e.dataTransfer);
              if (d) submitLocate(d);
            }}
            onClick={() => dirInputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed px-6 py-7 text-center transition"
            style={{
              borderColor: dragging ? "var(--color-brand-400)" : "var(--border)",
              background: dragging ? "var(--color-brand-50)" : "transparent",
            }}
          >
            <p className="text-sm font-medium">把文件夹拖到这里，或点击选择</p>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              系统会在本机的桌面、文稿、下载等位置自动找到它的完整路径
            </p>
          </div>

          <input
            ref={dirInputRef}
            type="file"
            className="hidden"
            // @ts-expect-error webkitdirectory 是浏览器扩展属性，React 的类型里没有
            webkitdirectory=""
            directory=""
            multiple
            onChange={(e) => {
              const d = e.target.files && fromInput(e.target.files);
              if (d) submitLocate(d);
            }}
          />

          {/* 反查请求：隐藏表单，拿到文件夹信息后自动提交 */}
          <form action={locAction} ref={locFormRef} className="hidden">
            <input type="hidden" name="name" value={dropped?.name ?? ""} />
            <input type="hidden" name="samples" value={JSON.stringify(dropped?.samples ?? [])} />
          </form>

          {dropped && (
            <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
              已读取文件夹「{dropped.name}」，抽取了 {dropped.samples.length} 个文件用于比对。
            </p>
          )}

          {locState.matches && locState.matches.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs" style={{ color: "#10b981" }}>
                在本机找到{locState.matches.length > 1 ? ` ${locState.matches.length} 个同名目录，请选一个` : "了"}：
              </p>
              {locState.matches.map((m) => (
                <button
                  key={m.dir}
                  type="button"
                  onClick={() => setPathValue(m.dir)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left font-mono text-xs transition hover:border-brand-400 ${
                    pathValue === m.dir ? "border-brand-500" : ""
                  }`}
                  style={pathValue === m.dir ? undefined : { borderColor: "var(--border)" }}
                >
                  {m.dir}
                  {m.total > 0 && (
                    <span className="ml-2 font-sans" style={{ color: "var(--muted)" }}>
                      比对 {m.matched}/{m.total} 个文件一致
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {locState.error && (
            <div className="mt-3">
              <p className="text-xs" style={{ color: "#f59e0b" }}>
                {locState.error}
              </p>
              {dropped && <LocateButton />}
            </div>
          )}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              或直接填写路径
            </span>
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          </div>
        </>
      )}

      <form action={bindAction} className="space-y-3">
        <Field label="目录完整路径">
          <input
            name="dir"
            required
            value={pathValue}
            onChange={(e) => setPathValue(e.target.value)}
            className="field font-mono text-xs"
            placeholder="/Users/你的用户名/Documents/幼儿园资料　或　C:\Users\你的用户名\Documents\幼儿园资料"
          />
        </Field>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          取路径：macOS 在访达里选中文件夹按 <kbd>⌥⌘C</kbd> 拷贝路径；
          Windows 在资源管理器里按住 <kbd>Shift</kbd> 右键文件夹 →「复制为路径」。
        </p>

        {bindState.error && (
          <p className="text-xs" style={{ color: "#ef4444" }}>
            {bindState.error}
          </p>
        )}
        {bindState.ok && (
          <p className="text-xs" style={{ color: "#10b981" }}>
            {bindState.ok}
          </p>
        )}

        <BindButton label={current ? "保存并重新扫描" : "绑定并开始索引"} />
      </form>
    </Card>
  );
}
