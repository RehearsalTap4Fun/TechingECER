"use client";

import { useState } from "react";
import { DOMAINS, AGE_GROUPS, type DomainKey } from "@/lib/domain";
import { Button, Card, Field } from "@/components/ui";

export interface LessonFormValues {
  id?: number;
  title?: string;
  domain_key?: string;
  sub_domain_id?: string | null;
  goal_ids?: string[];
  age_group?: string;
  duration_min?: number | null;
  objectives?: string | null;
  preparation?: string | null;
  process?: string | null;
  extension?: string | null;
  reflection?: string | null;
  tags?: string[];
  author?: string | null;
  status?: string;
}

export function LessonForm({
  action,
  initial = {},
  submitLabel = "保存教案",
}: {
  action: (fd: FormData) => void;
  initial?: LessonFormValues;
  submitLabel?: string;
}) {
  const [domainKey, setDomainKey] = useState<DomainKey>(
    (initial.domain_key as DomainKey) ?? "health",
  );
  const [subDomainId, setSubDomainId] = useState<string>(
    initial.sub_domain_id ?? DOMAINS.find((d) => d.key === (initial.domain_key ?? "health"))!.subDomains[0].id,
  );

  const domain = DOMAINS.find((d) => d.key === domainKey)!;
  const subDomain = domain.subDomains.find((s) => s.id === subDomainId) ?? domain.subDomains[0];

  function onDomainChange(key: DomainKey) {
    setDomainKey(key);
    // 换领域后原子领域必然失效，自动落到第一个，避免提交出不一致的组合
    setSubDomainId(DOMAINS.find((d) => d.key === key)!.subDomains[0].id);
  }

  return (
    <form action={action} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="活动名称">
              <input name="title" defaultValue={initial.title ?? ""} required className="field" placeholder="如：有趣的影子" />
            </Field>
          </div>

          <Field label="领域">
            <select
              name="domain_key"
              value={domainKey}
              onChange={(e) => onDomainChange(e.target.value as DomainKey)}
              className="field"
            >
              {DOMAINS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="子领域">
            <select
              name="sub_domain_id"
              value={subDomainId}
              onChange={(e) => setSubDomainId(e.target.value)}
              className="field"
            >
              {domain.subDomains.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="适用年龄班">
            <select name="age_group" defaultValue={initial.age_group ?? "middle"} className="field">
              {AGE_GROUPS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}（{g.ageRange}）
                </option>
              ))}
            </select>
          </Field>

          <Field label="活动时长（分钟）">
            <input
              name="duration_min"
              type="number"
              min={5}
              max={120}
              defaultValue={initial.duration_min ?? 30}
              className="field"
            />
          </Field>
        </div>

        <div className="mt-5">
          <label className="label">对应《3—6岁儿童学习与发展指南》目标</label>
          <div className="flex flex-wrap gap-2">
            {subDomain.goals.map((g) => (
              <label
                key={g.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:border-brand-400"
                style={{ borderColor: "var(--border)" }}
              >
                <input
                  type="checkbox"
                  name="goal_ids"
                  value={g.id}
                  defaultChecked={initial.goal_ids?.includes(g.id)}
                  className="accent-brand-600"
                />
                <span>
                  目标{g.index} · {g.title}
                </span>
              </label>
            ))}
          </div>
          <p className="hint">勾选后，这份教案会出现在按目标检索的结果里，便于教研时核对课程覆盖面。</p>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <Field label="活动目标" hint="建议分条写，覆盖认知、能力、情感三个层面。">
            <textarea name="objectives" rows={4} defaultValue={initial.objectives ?? ""} className="field" />
          </Field>
          <Field label="活动准备" hint="材料准备 + 经验准备。">
            <textarea name="preparation" rows={3} defaultValue={initial.preparation ?? ""} className="field" />
          </Field>
          <Field label="活动过程" hint="导入 → 展开 → 分享 → 结束，注明每个环节的关键提问。">
            <textarea name="process" rows={10} defaultValue={initial.process ?? ""} className="field" />
          </Field>
          <Field label="活动延伸">
            <textarea name="extension" rows={3} defaultValue={initial.extension ?? ""} className="field" />
          </Field>
          <Field label="活动反思" hint="实施后填写：幼儿的真实反应、目标达成度、下次如何调整。">
            <textarea name="reflection" rows={4} defaultValue={initial.reflection ?? ""} className="field" />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="设计者">
            <input name="author" defaultValue={initial.author ?? ""} className="field" />
          </Field>
          <Field label="标签" hint="逗号或空格分隔">
            <input name="tags" defaultValue={initial.tags?.join(" ") ?? ""} className="field" placeholder="光影 户外 科学探究" />
          </Field>
          <Field label="状态">
            <select name="status" defaultValue={initial.status ?? "draft"} className="field">
              <option value="draft">草稿</option>
              <option value="ready">可实施</option>
              <option value="archived">归档</option>
            </select>
          </Field>
        </div>
      </Card>

      <Button>{submitLabel}</Button>
    </form>
  );
}
