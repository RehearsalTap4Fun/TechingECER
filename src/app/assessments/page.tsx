import Link from "next/link";
import { all } from "@/lib/db";
import { Card, EmptyState, LinkButton, PageHeader, Tag } from "@/components/ui";
import { qualityLevel } from "@/lib/ecers";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  class_name: string | null;
  assessor: string;
  assessed_on: string;
  status: string;
  scored: number;
  avg: number | null;
}

export default function AssessmentsPage() {
  const rows = all<Row>(
    `SELECT a.id, c.name AS class_name, a.assessor, a.assessed_on, a.status,
            (SELECT count(*) FROM ecers_scores s WHERE s.assessment_id=a.id AND s.score IS NOT NULL) AS scored,
            (SELECT avg(s.score) FROM ecers_scores s WHERE s.assessment_id=a.id AND s.score IS NOT NULL) AS avg
       FROM ecers_assessments a LEFT JOIN classes c ON c.id = a.class_id
      ORDER BY a.assessed_on DESC, a.id DESC`,
  );

  return (
    <>
      <PageHeader
        title="ECERS-3 环境评估"
        description="6 个子量表 35 个条目，1~7 分制。不适用的条目留空即可，按规则不计入均分。"
        action={<LinkButton href="/assessments/new">＋ 新建评估</LinkButton>}
      />

      <Card className="mb-6" >
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          ⚠️ 本系统只提供 ECERS-3 的<strong>条目框架</strong>用于组织评分与生成报告。
          各条目 1/3/5/7 分下的具体评分指标受版权保护，未收录在本项目中——
          实际打分请对照正式出版的《幼儿学习环境评量表（第三版）》手册，由受过训练的评估者观察后评定。
        </p>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="还没有评估记录"
          hint="选一个班级建立评估，然后逐条录入观察到的分数与证据。"
          action={<LinkButton href="/assessments/new" variant="ghost">＋ 新建评估</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Link key={a.id} href={`/assessments/${a.id}`}>
              <Card className="transition hover:border-brand-400">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.class_name ?? "未指定班级"}</span>
                    <Tag>{a.assessed_on}</Tag>
                    <Tag>{a.status === "done" ? "已完成" : "进行中"}</Tag>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span style={{ color: "var(--muted)" }}>已评 {a.scored}/35</span>
                    {a.avg !== null && (
                      <span className="font-semibold tabular-nums">
                        {a.avg.toFixed(2)} 分 · {qualityLevel(a.avg)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                  评估者：{a.assessor}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
