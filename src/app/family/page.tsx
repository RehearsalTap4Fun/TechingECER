import { all } from "@/lib/db";
import { FAMILY_NOTE_KINDS } from "@/lib/domain";
import { Button, Card, EmptyState, Field, PageHeader, Tag } from "@/components/ui";
import { createFamilyNote, deleteFamilyNote } from "./actions";

export const dynamic = "force-dynamic";

const KIND_LABEL = new Map(FAMILY_NOTE_KINDS.map((k) => [k.key, k.label]));

interface Row {
  id: number;
  child_name: string | null;
  class_name: string | null;
  kind_key: string;
  noted_on: string;
  title: string;
  content: string | null;
  author: string | null;
}

export default function FamilyPage() {
  const rows = all<Row>(
    `SELECT f.*, c.name AS child_name, cl.name AS class_name
       FROM family_notes f
       LEFT JOIN children c ON c.id = f.child_id
       LEFT JOIN classes cl ON cl.id = c.class_id
      ORDER BY f.noted_on DESC, f.id DESC`,
  );
  const children = all<{ id: number; name: string; class_name: string | null }>(
    `SELECT c.id, c.name, cl.name AS class_name
       FROM children c LEFT JOIN classes cl ON cl.id = c.class_id ORDER BY cl.name, c.name`,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="家园共育"
        description="家访、家长面谈、日常沟通与成长反馈的统一台账，避免口头沟通事后无据可查。"
      />

      <Card className="no-print mb-6">
        <h2 className="mb-4 text-sm font-semibold">新增一条沟通记录</h2>
        <form action={createFamilyNote} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="幼儿">
              <select name="child_id" className="field" defaultValue="">
                <option value="">未指定</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.class_name ? `（${c.class_name}）` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="类型">
              <select name="kind_key" className="field" defaultValue="daily">
                {FAMILY_NOTE_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="日期">
              <input name="noted_on" type="date" required defaultValue={today} className="field" />
            </Field>
            <Field label="记录人">
              <input name="author" className="field" />
            </Field>
          </div>
          <Field label="标题">
            <input name="title" required className="field" placeholder="如：入园适应情况沟通" />
          </Field>
          <Field label="沟通内容" hint="家长反映了什么、教师的回应、双方约定的做法。">
            <textarea name="content" rows={4} className="field" />
          </Field>
          <Button>保存记录</Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="还没有家园共育记录" hint="上面的表单填一条试试。" />
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <Card key={n.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  {n.child_name && <Tag>{n.child_name}</Tag>}
                  {n.class_name && <Tag>{n.class_name}</Tag>}
                  <Tag>{KIND_LABEL.get(n.kind_key as never) ?? n.kind_key}</Tag>
                  <Tag>{n.noted_on}</Tag>
                </div>
                <form action={deleteFamilyNote} className="no-print">
                  <input type="hidden" name="id" value={n.id} />
                  <button className="text-xs underline" style={{ color: "var(--muted)" }}>
                    删除
                  </button>
                </form>
              </div>
              {n.content && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{n.content}</p>}
              {n.author && (
                <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                  记录人：{n.author}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
