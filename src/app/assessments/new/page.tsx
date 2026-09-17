import { all } from "@/lib/db";
import { Button, Card, Field, PageHeader } from "@/components/ui";
import { createAssessment } from "../actions";

export const dynamic = "force-dynamic";

export default function NewAssessmentPage() {
  const classes = all<{ id: number; name: string }>("SELECT id, name FROM classes ORDER BY name");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="新建 ECERS 评估" description="建立后进入评分表，逐条录入分数和观察证据。" />
      <form action={createAssessment}>
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="班级">
              <select name="class_id" className="field" defaultValue="">
                <option value="">未指定</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="评估者">
              <input name="assessor" required className="field" />
            </Field>
            <Field label="评估日期">
              <input name="assessed_on" type="date" required defaultValue={today} className="field" />
            </Field>
          </div>
          <Field label="备注" hint="如观察时段、在园幼儿数、天气等会影响评分的背景信息。">
            <textarea name="note" rows={3} className="field" />
          </Field>
          <Button>创建并开始评分</Button>
        </Card>
      </form>
    </>
  );
}
