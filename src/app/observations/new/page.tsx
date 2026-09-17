import { all } from "@/lib/db";
import { ObservationForm } from "@/components/observation-form";
import { PageHeader } from "@/components/ui";
import { createObservation } from "../actions";

export const dynamic = "force-dynamic";

export default function NewObservationPage() {
  const children = all<{ id: number; name: string; class_name: string | null }>(
    `SELECT c.id, c.name, cl.name AS class_name
       FROM children c LEFT JOIN classes cl ON cl.id = c.class_id
      ORDER BY cl.name, c.name`,
  );

  return (
    <>
      <PageHeader back={{ href: "/observations", label: "观察记录" }}
        title="新建观察记录"
        description="趁记忆新鲜写下来。客观记录部分只写事实，判断留给「分析解读」。"
      />
      <ObservationForm action={createObservation} childOptions={children} />
    </>
  );
}
