import { all } from "@/lib/db";
import type { TopicOption } from "@/components/research-form";

/**
 * 教研活动表单里的专题/模块下拉数据。
 * 新建和编辑两个页面都要用，抽出来避免两处 SQL 走样。
 */
export function loadTopicOptions(): TopicOption[] {
  const topics = all<{ id: number; title: string }>(
    "SELECT id, title FROM research_topics WHERE status != 'archived' ORDER BY school_year DESC, id DESC",
  );
  if (topics.length === 0) return [];

  const modules = all<{ id: number; topic_id: number; seq: number; title: string }>(
    "SELECT id, topic_id, seq, title FROM research_modules ORDER BY topic_id, seq",
  );
  const goals = all<{ topic_id: number; content: string }>(
    "SELECT topic_id, content FROM research_goals ORDER BY topic_id, kind, seq",
  );

  return topics.map((t) => ({
    id: t.id,
    title: t.title,
    modules: modules
      .filter((m) => m.topic_id === t.id)
      .map((m) => ({ id: m.id, seq: m.seq, title: m.title })),
    goals: goals.filter((g) => g.topic_id === t.id).map((g) => g.content),
  }));
}
