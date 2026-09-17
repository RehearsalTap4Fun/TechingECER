"use client";

import { GOAL_KINDS, OUTCOME_KINDS, TOPIC_KINDS } from "@/lib/domain";
import { Button, Card, Field } from "@/components/ui";

export interface TopicFormValues {
  id?: number;
  title?: string;
  subtitle?: string | null;
  kind?: string;
  school_year?: string | null;
  term?: string | null;
  leader?: string | null;
  team?: string | null;
  background?: string | null;
  theory_basis?: string | null;
  start_on?: string | null;
  end_on?: string | null;
  status?: string;
  /** 按 kind 分组的目标正文，一条一行 */
  goals?: Record<string, string>;
  outcomes?: Record<string, string>;
  modules?: string;
  /** 从资源库某份计划文档导入时，记下出处 */
  doc_resource_id?: number | null;
}

export function TopicForm({
  action,
  initial = {},
  submitLabel = "保存专题",
}: {
  action: (fd: FormData) => void;
  initial?: TopicFormValues;
  submitLabel?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <form action={action} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {initial.doc_resource_id && (
        <input type="hidden" name="doc_resource_id" value={initial.doc_resource_id} />
      )}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="专题名称">
              <input
                name="title"
                required
                defaultValue={initial.title ?? ""}
                className="field"
                placeholder="如：促进学前儿童前阅读核心经验获得的教学实践研究"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="副标题 / 研究方向">
              <input name="subtitle" defaultValue={initial.subtitle ?? ""} className="field" />
            </Field>
          </div>

          <Field label="类型">
            <select name="kind" defaultValue={initial.kind ?? "topic"} className="field">
              {TOPIC_KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="学年">
            <input
              name="school_year"
              defaultValue={initial.school_year ?? `${year}-${year + 1}`}
              className="field"
            />
          </Field>
          <Field label="学期">
            <select name="term" defaultValue={initial.term ?? "上期"} className="field">
              <option value="上期">上期</option>
              <option value="下期">下期</option>
              <option value="全年">全年</option>
            </select>
          </Field>
          <Field label="主持人 / 负责人">
            <input name="leader" defaultValue={initial.leader ?? ""} className="field" />
          </Field>
          <Field label="参与组别">
            <input
              name="team"
              defaultValue={initial.team ?? ""}
              className="field"
              placeholder="语言组全体教师、保教主任"
            />
          </Field>
          {initial.id && (
            <Field label="状态">
              <select name="status" defaultValue={initial.status ?? "active"} className="field">
                <option value="active">进行中</option>
                <option value="done">已结题</option>
                <option value="archived">归档</option>
              </select>
            </Field>
          )}
          <Field label="起始日期">
            <input
              name="start_on"
              type="date"
              defaultValue={initial.start_on ?? ""}
              className="field"
            />
          </Field>
          <Field label="结束日期">
            <input name="end_on" type="date" defaultValue={initial.end_on ?? ""} className="field" />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <Field
          label="教研背景"
          hint="写日常观察到的真问题和它的症结，不要写口号。例：幼儿在科学区只待 3 分钟就离开。"
        >
          <textarea name="background" rows={6} defaultValue={initial.background ?? ""} className="field" />
        </Field>
        <Field label="理论支撑 / 依据文件" hint="如《3—6岁儿童学习与发展指南》、专业书籍某章、政策文件。">
          <textarea
            name="theory_basis"
            rows={3}
            defaultValue={initial.theory_basis ?? ""}
            className="field"
          />
        </Field>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">教研目标</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
          每类目标一条一行。这些目标会出现在每次教研活动页面上，方便回看「这次研讨对准了哪一条」。
        </p>
        <div className="space-y-4">
          {GOAL_KINDS.map((k) => (
            <Field key={k.key} label={k.label} hint={k.hint}>
              <textarea
                name={`goal_${k.key}`}
                rows={3}
                defaultValue={initial.goals?.[k.key] ?? ""}
                className="field"
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">月度主题模块</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
          一条一行，按推进顺序排列——一般一月一个，每个模块下再挂当月的教研活动。
          保存后可在专题页为每个模块补充说明、组织方式和计划月份。
        </p>
        <textarea
          name="modules"
          rows={5}
          defaultValue={initial.modules ?? ""}
          className="field"
          placeholder={"读懂经验——前阅读核心经验的内涵与发展阶段解读\n读好一本书——图画书三种「语言」的深度解析\n问对一个点——围绕核心经验的提问设计与师幼互动\n教得有趣——前阅读活动组织与课例研磨"}
        />
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">预期成果</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
          一条一行。学期末可在专题页逐条勾掉，用来对账。
        </p>
        <div className="space-y-4">
          {OUTCOME_KINDS.map((k) => (
            <Field key={k.key} label={k.label} hint={k.hint}>
              <textarea
                name={`outcome_${k.key}`}
                rows={3}
                defaultValue={initial.outcomes?.[k.key] ?? ""}
                className="field"
              />
            </Field>
          ))}
        </div>
      </Card>

      <Button>{submitLabel}</Button>
    </form>
  );
}
