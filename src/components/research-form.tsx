import { RESEARCH_TYPES } from "@/lib/domain";
import { Button, Card, Field } from "@/components/ui";

export interface SessionValues {
  id?: number;
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

export function ResearchForm({
  action,
  initial = {},
  submitLabel = "保存教研纪要",
}: {
  action: (fd: FormData) => void;
  initial?: SessionValues;
  submitLabel?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="教研主题">
              <input name="title" required defaultValue={initial.title ?? ""} className="field" placeholder="如：大班科学区材料投放的适宜性研讨" />
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
            <input name="held_on" type="date" required defaultValue={initial.held_on ?? today} className="field" />
          </Field>
          <Field label="主持人">
            <input name="host" defaultValue={initial.host ?? ""} className="field" />
          </Field>
          <Field label="参与人员">
            <input name="participants" defaultValue={initial.participants ?? ""} className="field" placeholder="大班组全体教师（6 人）、保教主任" />
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
          <textarea name="action_items" rows={4} defaultValue={initial.action_items ?? ""} className="field" />
        </Field>
      </Card>

      <Button>{submitLabel}</Button>
    </form>
  );
}
