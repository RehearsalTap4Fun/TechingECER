import { LessonForm } from "@/components/lesson-form";
import { PageHeader } from "@/components/ui";
import { createLesson } from "../actions";

export default function NewLessonPage() {
  return (
    <>
      <PageHeader title="新建教案" description="填完「活动过程」就能用；反思可以等实施后再补。" />
      <LessonForm action={createLesson} />
    </>
  );
}
