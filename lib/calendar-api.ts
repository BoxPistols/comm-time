// カレンダー連携 API のクライアントラッパー
// Supabase セッションの JWT を Bearer トークンとして /api/v1/calendar/* を呼び出す
import { supabase } from "./supabase";
import type {
  CalendarConnection,
  CalendarEvent,
  CalendarSyncResult,
  EventAnnotation,
  AnnotationScope,
} from "@/types/calendar";
import type { PriorityLevel, ImportanceLevel } from "@/types";

class CalendarApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export { CalendarApiError };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new CalendarApiError("Not authenticated", 401);
  }
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed: ${res.status}`;
    throw new CalendarApiError(message, res.status);
  }
  return body as T;
}

export async function fetchCalendarConnection(): Promise<CalendarConnection> {
  return request<CalendarConnection>("/api/v1/calendar/connection");
}

export async function startCalendarAuth(): Promise<string> {
  const { url } = await request<{ url: string }>("/api/v1/calendar/auth");
  return url;
}

export async function updateSelectedCalendars(selectedCalendarIds: string[]): Promise<void> {
  await request("/api/v1/calendar/connection", {
    method: "PATCH",
    body: JSON.stringify({ selectedCalendarIds }),
  });
}

export async function disconnectCalendar(): Promise<void> {
  await request("/api/v1/calendar/connection", { method: "DELETE" });
}

export async function syncCalendar(force: boolean): Promise<CalendarSyncResult> {
  return request<CalendarSyncResult>(`/api/v1/calendar/sync${force ? "?force=true" : ""}`, {
    method: "POST",
  });
}

export async function fetchCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({ from, to });
  const { events } = await request<{ events: CalendarEvent[] }>(
    `/api/v1/calendar/events?${params.toString()}`
  );
  return events;
}

// EventAnnotation から eventKey を除いたもの（送信ペイロード）
export type AnnotationInput = Omit<EventAnnotation, "eventKey">;

export async function saveEventAnnotation(
  eventKey: string,
  input: AnnotationInput
): Promise<EventAnnotation> {
  return request<EventAnnotation>(
    `/api/v1/calendar/events/${encodeURIComponent(eventKey)}/annotation`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    }
  );
}

export async function deleteEventAnnotation(
  eventKey: string,
  scope: AnnotationScope
): Promise<void> {
  await request(
    `/api/v1/calendar/events/${encodeURIComponent(eventKey)}/annotation?scope=${scope}`,
    { method: "DELETE" }
  );
}

export async function createTodoEventLink(todoId: string, eventKey: string): Promise<void> {
  await request("/api/v1/calendar/todo-links", {
    method: "POST",
    body: JSON.stringify({ todoId, eventKey }),
  });
}

export async function deleteTodoEventLink(todoId: string, eventKey: string): Promise<void> {
  const params = new URLSearchParams({ todoId, eventKey });
  await request(`/api/v1/calendar/todo-links?${params.toString()}`, { method: "DELETE" });
}
