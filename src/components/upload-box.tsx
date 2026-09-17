"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Card } from "@/components/ui";

const ACCEPT = ".docx,.pptx,.xlsx,.xlsm,.pdf,.txt,.md,.markdown,.csv,.tsv";

function SubmitButton({ count, onDone }: { count: number; onDone: () => void }) {
  const { pending } = useFormStatus();
  const was = useRef(false);

  // 提交完成（pending 由 true 变回 false）后再清空预览列表。
  // 不能在 onSubmit 里清，那会在 React 收集 FormData 之前动到表单。
  useEffect(() => {
    if (was.current && !pending) onDone();
    was.current = pending;
  }, [pending, onDone]);

  return (
    <button
      disabled={pending || count === 0}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
    >
      {pending ? "解析中…" : count > 0 ? `上传并分类 ${count} 个文件` : "上传并自动分类"}
    </button>
  );
}

export function UploadBox({ action }: { action: (fd: FormData) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  function setFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    // DataTransfer 是把拖入的文件塞进 <input type=file> 的唯一途径
    const dt = new DataTransfer();
    for (const f of Array.from(list)) dt.items.add(f);
    if (inputRef.current) inputRef.current.files = dt.files;
    setNames(Array.from(list).map((f) => f.name));
  }

  function clear() {
    setNames([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card className="no-print mb-6">
      <h2 className="mb-1 text-sm font-semibold">上传文档</h2>
      <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
        支持 Word / PPT / Excel / PDF / 文本。系统会读取<strong>正文内容</strong>判定分类、领域和年龄班，
        判定结果会标出依据供你复核——不做静默归档。文件和正文都只保存在本机。
      </p>

      {/* 直接把 server action 交给 form，保留无 JS 环境下的渐进增强 */}
      <form action={action}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            setFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition"
          style={{
            borderColor: dragging ? "var(--color-brand-400)" : "var(--border)",
            background: dragging ? "var(--color-brand-50)" : "transparent",
          }}
        >
          <p className="text-sm font-medium">把文件拖到这里，或点击选择</p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            可一次选多个，单个文件不超过 30 MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          name="files"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => setNames(Array.from(e.target.files ?? []).map((f) => f.name))}
        />

        {names.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--muted)" }}>
            {names.map((n) => (
              <li key={n} className="truncate">
                · {n}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <SubmitButton count={names.length} onDone={clear} />
        </div>
      </form>
    </Card>
  );
}
