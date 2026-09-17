import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import {
  ECERS_SUBSCALES,
  ECERS_SCORE_LABELS,
  qualityLevel,
  subscaleAverage,
  totalAverage,
  type EcersScore,
} from "@/lib/ecers";
import { Button, Card, Field, PageHeader, Tag } from "@/components/ui";
import { deleteAssessment, saveScores } from "../actions";

export const dynamic = "force-dynamic";

interface Assessment {
  id: number;
  class_id: number | null;
  class_name: string | null;
  assessor: string;
  assessed_on: string;
  status: string;
  note: string | null;
}

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aid = Number(id);

  const a = one<Assessment>(
    `SELECT a.*, c.name AS class_name
       FROM ecers_assessments a LEFT JOIN classes c ON c.id = a.class_id
      WHERE a.id = ?`,
    aid,
  );
  if (!a) notFound();

  const rows = all<{ item_no: number; score: number | null; evidence: string | null }>(
    "SELECT item_no, score, evidence FROM ecers_scores WHERE assessment_id = ?",
    aid,
  );
  const scores = new Map<number, EcersScore>(rows.map((r) => [r.item_no, r.score]));
  const evidence = new Map<number, string>(
    rows.filter((r) => r.evidence).map((r) => [r.item_no, r.evidence!]),
  );

  const total = totalAverage(scores);

  return (
    <>
      <PageHeader back={{ href: "/assessments", label: "ECERS 评估" }}
        title={`${a.class_name ?? "未指定班级"} · ECERS-3 评估`}
        description={`${a.assessed_on} · 评估者 ${a.assessor}`}
        action={
          <form action={deleteAssessment} className="no-print">
            <input type="hidden" name="id" value={a.id} />
            <Button variant="ghost">删除评估</Button>
          </form>
        }
      />

      {/* 结果概览：子量表均分 + 总均分 */}
      <Card className="mb-6">
        <div className="mb-5 flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-semibold tabular-nums">
            {total === null ? "—" : total.toFixed(2)}
          </span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            总均分 · {qualityLevel(total)}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            （总均分为所有已评条目的算术平均，NA 条目不计入）
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ECERS_SUBSCALES.map((s) => {
            const avg = subscaleAverage(s, scores);
            const pct = avg === null ? 0 : ((avg - 1) / 6) * 100;
            return (
              <div key={s.key}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-medium">{s.zh}</span>
                  <span className="tabular-nums" style={{ color: "var(--muted)" }}>
                    {avg === null ? "未评" : avg.toFixed(2)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: avg === null ? "transparent" : avg >= 5 ? "#10b981" : avg >= 3 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <form action={saveScores} className="space-y-6">
        <input type="hidden" name="id" value={a.id} />

        {ECERS_SUBSCALES.map((s) => (
          <Card key={s.key}>
            <h2 className="mb-1 text-sm font-semibold">{s.zh}</h2>
            <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
              {s.en} · {s.items.length} 个条目
            </p>
            <div className="space-y-4">
              {s.items.map((item) => (
                <div
                  key={item.no}
                  className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_auto] sm:items-start"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.no}. {item.zh}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {item.en}
                    </p>
                    <input
                      name={`evidence_${item.no}`}
                      defaultValue={evidence.get(item.no) ?? ""}
                      className="field mt-2"
                      placeholder="观察证据（可选）"
                    />
                  </div>
                  <select
                    name={`score_${item.no}`}
                    defaultValue={scores.get(item.no) === null || scores.get(item.no) === undefined ? "" : String(scores.get(item.no))}
                    className="field sm:w-36"
                  >
                    <option value="">NA 不适用</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n}
                        {ECERS_SCORE_LABELS[n] ? ` · ${ECERS_SCORE_LABELS[n]}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>
        ))}

        <Card className="space-y-4">
          <Field label="评估备注">
            <textarea name="note" rows={3} defaultValue={a.note ?? ""} className="field" />
          </Field>
          <Field label="状态">
            <select name="status" defaultValue={a.status} className="field sm:w-48">
              <option value="draft">进行中</option>
              <option value="done">已完成</option>
            </select>
          </Field>
          <div className="flex items-center gap-3">
            <Button>保存评分</Button>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              35 个条目一次性事务写入，不会出现半张表。
            </span>
          </div>
        </Card>
      </form>

      {a.note && (
        <Card className="mt-6">
          <Tag>备注</Tag>
          <p className="mt-2 whitespace-pre-wrap text-sm">{a.note}</p>
        </Card>
      )}
    </>
  );
}
