import { all } from "@/lib/db";
import { AGE_GROUPS, AGE_GROUP_MAP } from "@/lib/domain";
import { Button, Card, EmptyState, Field, PageHeader, Tag } from "@/components/ui";
import { createChild, createClass, deleteChild, deleteClass } from "./actions";

export const dynamic = "force-dynamic";

interface ClassRow {
  id: number;
  name: string;
  age_group: string;
  head_teacher: string | null;
  school_year: string | null;
  child_count: number;
}

interface ChildRow {
  id: number;
  class_id: number | null;
  name: string;
  gender: string | null;
  birth_date: string | null;
  guardian: string | null;
  obs_count: number;
}

export default function ClassesPage() {
  const classes = all<ClassRow>(
    `SELECT c.*, (SELECT count(*) FROM children ch WHERE ch.class_id = c.id) AS child_count
       FROM classes c ORDER BY c.age_group DESC, c.name`,
  );
  const children = all<ChildRow>(
    `SELECT ch.*, (SELECT count(*) FROM observations o WHERE o.child_id = ch.id) AS obs_count
       FROM children ch ORDER BY ch.name`,
  );

  const byClass = new Map<number | null, ChildRow[]>();
  for (const c of children) {
    const list = byClass.get(c.class_id) ?? [];
    list.push(c);
    byClass.set(c.class_id, list);
  }
  const unassigned = byClass.get(null) ?? [];

  return (
    <>
      <PageHeader
        title="班级与幼儿"
        description="观察记录和家园共育都挂在幼儿名下，先在这里把名单建好。"
      />

      <Card className="no-print mb-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-sm font-semibold">新建班级</h2>
            <form action={createClass} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="班级名称">
                  <input name="name" required className="field" placeholder="大一班" />
                </Field>
                <Field label="年龄段">
                  <select name="age_group" className="field" defaultValue="middle">
                    {AGE_GROUPS.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.label}（{g.ageRange}）
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="班主任">
                  <input name="head_teacher" className="field" />
                </Field>
                <Field label="学年">
                  <input name="school_year" className="field" placeholder="2026-2027" />
                </Field>
              </div>
              <Button>添加班级</Button>
            </form>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold">新增幼儿</h2>
            <form action={createChild} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="姓名">
                  <input name="name" required className="field" />
                </Field>
                <Field label="班级">
                  <select name="class_id" className="field" defaultValue="">
                    <option value="">未分班</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="性别">
                  <select name="gender" className="field" defaultValue="">
                    <option value="">不填</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </Field>
                <Field label="出生日期">
                  <input name="birth_date" type="date" className="field" />
                </Field>
              </div>
              <Field label="监护人及联系方式">
                <input name="guardian" className="field" placeholder="母亲 138****0000" />
              </Field>
              <Button>添加幼儿</Button>
            </form>
          </div>
        </div>
        <p className="hint mt-4">
          幼儿信息属于个人信息，仅保存在本机数据库；data/*.db 已在 .gitignore 中排除，不会被提交到代码仓库。
        </p>
      </Card>

      {classes.length === 0 && children.length === 0 ? (
        <EmptyState title="还没有班级和幼儿" hint="用上面的表单先建一个班级。" />
      ) : (
        <div className="space-y-4">
          {classes.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Tag>{AGE_GROUP_MAP.get(c.age_group as never)?.label ?? c.age_group}</Tag>
                  {c.head_teacher && <Tag>班主任 {c.head_teacher}</Tag>}
                  {c.school_year && <Tag>{c.school_year}</Tag>}
                  <Tag>{c.child_count} 名幼儿</Tag>
                </div>
                <form action={deleteClass} className="no-print">
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs underline" style={{ color: "var(--muted)" }}>
                    删除班级
                  </button>
                </form>
              </div>
              <ChildTable rows={byClass.get(c.id) ?? []} />
            </Card>
          ))}

          {unassigned.length > 0 && (
            <Card>
              <span className="font-medium">未分班</span>
              <ChildTable rows={unassigned} />
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function ChildTable({ rows }: { rows: ChildRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
        本班暂无幼儿
      </p>
    );
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--muted)" }}>
            <th className="py-1.5 text-left text-xs font-normal">姓名</th>
            <th className="py-1.5 text-left text-xs font-normal">性别</th>
            <th className="py-1.5 text-left text-xs font-normal">出生日期</th>
            <th className="py-1.5 text-left text-xs font-normal">监护人</th>
            <th className="py-1.5 text-left text-xs font-normal">观察记录</th>
            <th className="py-1.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((ch) => (
            <tr key={ch.id} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="py-2 font-medium">{ch.name}</td>
              <td className="py-2">{ch.gender ?? "—"}</td>
              <td className="py-2 tabular-nums">{ch.birth_date ?? "—"}</td>
              <td className="py-2">{ch.guardian ?? "—"}</td>
              <td className="py-2 tabular-nums">{ch.obs_count}</td>
              <td className="py-2 text-right">
                <form action={deleteChild} className="no-print">
                  <input type="hidden" name="id" value={ch.id} />
                  <button className="text-xs underline" style={{ color: "var(--muted)" }}>
                    删除
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
