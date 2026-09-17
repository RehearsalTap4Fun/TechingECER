"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { RevealState } from "@/app/resources/actions";

/**
 * 本机模式下的资料条目入口：点标题在文件管理器里定位到这份文件。
 *
 * 只在浏览器与服务端同机时才渲染这个按钮——否则打开的是服务器那台机器的
 * 窗口。非本机由调用方渲染成普通的下载/预览链接。
 */
function Inner({ label, title }: { label: string; title: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      className="text-left font-medium text-brand-600 underline underline-offset-2 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? `${label} …` : label}
    </button>
  );
}

export function FileOpenButton({
  action,
  id,
  label,
  mode = "reveal",
  title = "在文件管理器中定位这份文件",
}: {
  action: (prev: RevealState, fd: FormData) => Promise<RevealState>;
  id: number;
  label: string;
  mode?: "reveal" | "open";
  title?: string;
}) {
  const [state, formAction] = useActionState<RevealState, FormData>(action, {});

  return (
    <span className="inline-flex flex-col">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="mode" value={mode} />
        <Inner label={label} title={title} />
      </form>
      {state.error && (
        <span className="mt-0.5 text-[11px]" style={{ color: "#f59e0b" }}>
          {state.error}
        </span>
      )}
      {state.ok && (
        <span className="mt-0.5 text-[11px]" style={{ color: "#10b981" }}>
          {state.ok}
        </span>
      )}
    </span>
  );
}
