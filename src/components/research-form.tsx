"use client";

import { useState } from "react";
import { RESEARCH_TYPES } from "@/lib/domain";
import { Button, Card, Field } from "@/components/ui";

export interface SessionValues {
  id?: number;
  topic_id?: number | null;
  module_id?: number | null;
  title?: string;
  type_key?: string;
  held_on?: string;
  host?: string | null;
  participants?: string | null;
  topic?: string | null;
  agenda?: string | null;
  discussion?: string | null;
  conclusion?: string | null;
  action_items?: string | null;
}

export interface TopicOption {
  id: number;
  title: string;
  modules: Array<{ id: number; seq: number; title: string }>;
  /** 该专题的目标，选中后展示，提醒本次研讨对准哪一条 */
  goals: string[];
}

const CN_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

export function ResearchForm({
  action,
  initial = {},
  topics = [],
  submitLabel = "保存教研纪要",
}: {
  action: (fd: FormData) => void;
  initial?: SessionValues;
  topics?: TopicOption[];
  submitLabel?: string;
}) {
  const [topicId, setTopicId] = useState<string>(
    initial.topic_id ? String(initial.topic_id) : "",
  );
  const [moduleId, setModuleId] = useState<string>(
    initial.module_id ? String(initial.module_id) : "",
  );

  const today = new Date().toISOString().slice(0, 10);
  const selected = topics.find((t) => String(t.id) === topicId);

  function onTopicChange(value: string) {
    setTopicId(value);
    // 换专题后原模块必然失效，清空以免提交出跨专题的错误组合
    setModuleId("");
  }

  return (
    <form action={action} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      {topics.length > 0 && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold">归属</h2>
          <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
            挂到专题的某个主题模块下，这次教研就能被计入专题进度；不选也可以，会显示在「未归属专题」里。
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="所属专题">
              <select
                name="topic_id"
                value={topicId}
                onChange={(e) => onTopicChange(e.target.value)}
                className="field"
              >
                <option value="">不归属专题</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="主题模块">
              <select
                name="module_id"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="field"
                disabled={!selected || selected.modules.length === 0}
              >
                <option value="">
                  {selected && selected.modules.length === 0 ? "该专题未划分模块" : "不指定模块"}
                </option>
                {selected?.modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    主题{CN_NUM[m.seq] ?? m.seq + 1}：{m.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selected && selected.goals.length > 0 && (
            <div className="mt-4 rounded-lg p-3" style={{ background: "var(--bg)" }}>
              <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
                本专题的目标 —— 写研讨记录时对照着看
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-xs" style={{ color: "var(--muted)" }}>
                {selected.goals.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="教研主题">
              <input
                name="title"
                required
                defaultValue={initial.title ?? ""}
                className="field"
                placeholder="如：大班科学区材料投放的适宜性研讨"
              />
            </Field>
          </div>
          <Field label="类型">
            <select name="type_key" defaultValue={initial.type_key ?? "case-study"} className="field">
              {RESEARCH_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="日期">
            <input
              name="held_on"
              type="date"
              required
              defaultValue={initial.held_on ?? today}
              className="field"
            />
          </Field>
          <Field label="主持人">
            <input name="host" defaultValue={initial.host ?? ""} className="field" />
          </Field>
          <Field label="参与人员">
            <input
              name="participants"
              defaultValue={initial.participants ?? ""}
              className="field"
              placeholder="大班组全体教师（6 人）、保教主任"
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <Field label="研讨的真问题" hint="写具体的现象，不要写口号。例：幼儿在科学区只待 3 分钟就离开。">
          <textarea name="topic" rows={3} defaultValue={initial.topic ?? ""} className="field" />
        </Field>
        <Field label="活动流程">
          <textarea name="agenda" rows={4} defaultValue={initial.agenda ?? ""} className="field" />
        </Field>
        <Field label="研讨记录" hint="谁提出了什么观点、有哪些分歧。">
          <textarea name="discussion" rows={8} defaultValue={initial.discussion ?? ""} className="field" />
        </Field>
        <Field label="结论与共识">
          <textarea name="conclusion" rows={4} defaultValue={initial.conclusion ?? ""} className="field" />
        </Field>
        <Field label="后续行动" hint="一条一行：做什么 · 谁负责 · 什么时候前完成。">
          <textarea
            name="action_items"
            rows={4}
            defaultValue={initial.action_items ?? ""}
            className="field"
          />
        </Field>
      </Card>

      <Button>{submitLabel}</Button>
    </form>
  );
}
