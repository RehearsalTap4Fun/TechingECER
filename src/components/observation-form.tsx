"use client";

import { useState } from "react";
import { DOMAINS, DAILY_SCENES, OBSERVATION_METHODS, type DomainKey } from "@/lib/domain";
import { Button, Card, Field } from "@/components/ui";

export function ObservationForm({
  action,
  childOptions,
}: {
  action: (fd: FormData) => void;
  childOptions: Array<{ id: number; name: string; class_name: string | null }>;
}) {
  const [domainKey, setDomainKey] = useState<DomainKey>("health");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="观察对象">
            <select name="child_id" className="field" defaultValue="">
              <option value="">未指定</option>
              {childOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.class_name ? `（${c.class_name}）` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="观察者">
            <input name="observer" className="field" placeholder="教师姓名" />
          </Field>
          <Field label="观察日期">
            <input name="observed_at" type="date" required defaultValue={today} className="field" />
          </Field>
          <Field label="生活环节">
            <select name="scene" className="field" defaultValue="区域游戏">
              {DAILY_SCENES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <label className="label">观察方法</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {OBSERVATION_METHODS.map((m, i) => (
              <label
                key={m.key}
                className="cursor-pointer rounded-lg border px-3 py-2 text-sm transition hover:border-brand-400"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="method_key"
                    value={m.key}
                    defaultChecked={i === 0}
                    className="accent-brand-600"
                  />
                  <span className="font-medium">{m.label}</span>
                </span>
                <span className="mt-1 block text-xs" style={{ color: "var(--muted)" }}>
                  {m.hint}
                </span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <Field
          label="客观记录"
          hint="只写看到和听到的事实：幼儿说了什么、做了什么、持续多久。不要在这里下judgment（如「他很内向」）。"
        >
          <textarea name="record" rows={8} required className="field" />
        </Field>
        <Field label="分析解读" hint="对照《指南》相应目标，分析行为背后的发展水平与原因。">
          <textarea name="analysis" rows={5} className="field" />
        </Field>
        <Field label="支持策略" hint="下一步教师可以怎么做：调整材料、增加挑战、个别引导…">
          <textarea name="support" rows={4} className="field" />
        </Field>
      </Card>

      <Card>
        <label className="label">关联《指南》发展目标</label>
        <div className="mb-3 flex flex-wrap gap-2">
          {DOMAINS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDomainKey(d.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                domainKey === d.key ? "text-white" : "border"
              }`}
              style={
                domainKey === d.key
                  ? { background: d.color }
                  : { borderColor: "var(--border)", color: "var(--muted)" }
              }
            >
              {d.name}
            </button>
          ))}
        </div>
        {/* 所有领域始终挂载，仅用 CSS 隐藏——否则切换标签会卸载复选框、丢掉已勾选的目标 */}
        {DOMAINS.map((d) => (
          <div key={d.key} className={`space-y-3 ${d.key === domainKey ? "" : "hidden"}`}>
            {d.subDomains.map((s) => (
              <div key={s.id}>
                <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
                  {s.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {s.goals.map((g) => (
                    <label
                      key={g.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition hover:border-brand-400"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <input type="checkbox" name="goal_ids" value={g.id} className="accent-brand-600" />
                      <span>{g.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        <p className="hint">切换领域标签只影响显示，已勾选的目标会一起提交。</p>
      </Card>

      <Button>保存观察记录</Button>
    </form>
  );
}
