"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card, Field } from "@/components/ui";
import type { BindState } from "@/app/resources/actions";

function SubmitButton({ label }: { label: string }) {
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
 * 首次使用时绑定资料目录。
 *
 * 只能让用户手填路径——网页的文件选择框出于安全考虑拿不到真实的目录路径，
 * 浏览器不会把它交给页面。所以这里给出取路径的操作提示，并在服务端校验。
 */
export function LibrarySetup({
  action,
  current,
}: {
  action: (prev: BindState, fd: FormData) => Promise<BindState>;
  current?: string | null;
}) {
  const [state, formAction] = useActionState<BindState, FormData>(action, {});

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold">
        {current ? "更换资料目录" : "绑定资料目录"}
      </h2>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
        选一个你平时放园所资料的文件夹。往里放文档，进入本页时会自动索引并给出分类建议，
        <strong>文件始终留在原处，应用不复制、不改名、不移动</strong>。
        <br />
        取路径的方法：在访达里选中文件夹 → 按 <kbd>⌥⌘C</kbd> 拷贝路径 → 粘贴到下面。
        Windows 可在资源管理器地址栏复制。
      </p>

      <form action={formAction} className="space-y-3">
        <Field label="目录绝对路径">
          <input
            name="dir"
            required
            defaultValue={current ?? ""}
            className="field font-mono text-xs"
            placeholder="/Users/你的用户名/Documents/幼儿园资料"
          />
        </Field>

        {state.error && (
          <p className="text-xs" style={{ color: "#ef4444" }}>
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="text-xs" style={{ color: "#10b981" }}>
            {state.ok}
          </p>
        )}

        <SubmitButton label={current ? "保存并重新扫描" : "绑定并开始索引"} />
      </form>
    </Card>
  );
}
