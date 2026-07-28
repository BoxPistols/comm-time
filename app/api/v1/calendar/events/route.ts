import { NextRequest } from "next/server";
import { authenticateRequest, handleCors, apiResponse, apiError } from "@/lib/api-auth";
import type { CalendarEvent, EventAnnotation } from "@/types/calendar";
import type { PriorityLevel, ImportanceLevel } from "@/types";

export async function OPTIONS() {
  return handleCors();
}

type CacheRow = {
  calendar_id: string;
  event_id: string;
  recurring_event_id: string | null;
  summary: string | null;
  description: string | null;
  location: string | null;
  hangout_link: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  status: string;
  attendees_count: number | null;
  color_id: string | null;
};

type AnnotationRow = {
  event_key: string;
  scope: "instance" | "series";
  memo: string | null;
  priority: PriorityLevel;
  importance: ImportanceLevel;
  tag_ids: string[];
};

type TodoLinkRow = {
  todo_id: string;
  event_key: string;
};

/**
 * GET /api/v1/calendar/events?from=ISO&to=ISO
 *
 * キャッシュから期間指定でイベントを取得し、注釈・TODO リンクをマージして返す。
 * Google API へはアクセスしない（同期は /sync が担当）。
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return apiError("Query parameters 'from' and 'to' must be valid ISO datetimes", 400);
  }

  // 認証済みクライアント（RLS 適用）でキャッシュを取得。期間に重なるイベントを対象とする
  const { data: rows, error } = await auth.supabase
    .from("calendar_event_cache")
    .select(
      "calendar_id, event_id, recurring_event_id, summary, description, location, hangout_link, start_at, end_at, is_all_day, status, attendees_count, color_id"
    )
    .eq("user_id", auth.userId)
    .lt("start_at", to)
    .gt("end_at", from)
    .order("start_at", { ascending: true });
  if (error) {
    return apiError(error.message, 500);
  }

  const events = (rows ?? []) as CacheRow[];
  const instanceKeys = events.map((e) => e.event_id);
  const seriesKeys = events
    .map((e) => e.recurring_event_id)
    .filter((id): id is string => id !== null);
  const allKeys = Array.from(new Set([...instanceKeys, ...seriesKeys]));

  const annotations: AnnotationRow[] = [];
  const todoLinks: TodoLinkRow[] = [];
  if (allKeys.length > 0) {
    // PostgREST の URL 長制限を回避するため、バッチ処理
    const BATCH_SIZE = 100;
    const batches: string[][] = [];
    for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
      batches.push(allKeys.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const [annotationResult, linkResult] = await Promise.all([
        auth.supabase
          .from("event_annotations")
          .select("event_key, scope, memo, priority, importance, tag_ids")
          .eq("user_id", auth.userId)
          .in("event_key", batch),
        auth.supabase
          .from("todo_event_links")
          .select("todo_id, event_key")
          .eq("user_id", auth.userId)
          .in("event_key", batch),
      ]);
      // data だけ見て error を捨てると、取得失敗と「注釈もリンクも無い」が区別できず、
      // 予定のメモ・優先度・タグが 200 のまま黙って消える
      if (annotationResult.error) {
        return apiError(annotationResult.error.message, 500);
      }
      if (linkResult.error) {
        return apiError(linkResult.error.message, 500);
      }
      annotations.push(...((annotationResult.data ?? []) as AnnotationRow[]));
      todoLinks.push(...((linkResult.data ?? []) as TodoLinkRow[]));
    }
  }

  const annotationByKey = new Map(annotations.map((a) => [`${a.event_key}:${a.scope}`, a]));
  const todoIdsByKey = new Map<string, string[]>();
  for (const link of todoLinks) {
    const existing = todoIdsByKey.get(link.event_key) ?? [];
    todoIdsByKey.set(link.event_key, [...existing, link.todo_id]);
  }

  const result: CalendarEvent[] = events.map((row) => {
    // 注釈は instance 優先、なければ series を適用する
    const instanceAnnotation = annotationByKey.get(`${row.event_id}:instance`);
    const seriesAnnotation = row.recurring_event_id
      ? annotationByKey.get(`${row.recurring_event_id}:series`)
      : undefined;
    const annotationRow = instanceAnnotation ?? seriesAnnotation;
    const annotation: EventAnnotation | undefined = annotationRow
      ? {
          eventKey: annotationRow.event_key,
          scope: annotationRow.scope,
          memo: annotationRow.memo ?? undefined,
          priority: annotationRow.priority,
          importance: annotationRow.importance,
          tagIds: annotationRow.tag_ids,
        }
      : undefined;

    return {
      eventKey: row.event_id,
      eventId: row.event_id,
      calendarId: row.calendar_id,
      recurringEventId: row.recurring_event_id ?? undefined,
      summary: row.summary ?? "",
      description: row.description ?? undefined,
      location: row.location ?? undefined,
      hangoutLink: row.hangout_link ?? undefined,
      startAt: row.start_at,
      endAt: row.end_at,
      isAllDay: row.is_all_day,
      status: row.status === "tentative" ? "tentative" : "confirmed",
      attendeesCount: row.attendees_count ?? undefined,
      colorId: row.color_id ?? undefined,
      annotation,
      linkedTodoIds: [
        ...(todoIdsByKey.get(row.event_id) ?? []),
        ...(row.recurring_event_id ? todoIdsByKey.get(row.recurring_event_id) ?? [] : []),
      ],
    };
  });

  return apiResponse({ events: result, count: result.length });
}
