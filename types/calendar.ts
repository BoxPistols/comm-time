// Google カレンダー連携関連の型定義
// 設計: docs/CALENDAR_INTEGRATION_PLAN.md 3.6 参照
import type { PriorityLevel, ImportanceLevel } from "./index";

// カレンダービューの種類
export type CalendarViewType = "today" | "week" | "month" | "agenda";

// 注釈のスコープ（単発の回のみ / 繰り返しシリーズ全体）
export type AnnotationScope = "instance" | "series";

// 予定への注釈（comm-time 側 DB のみに保存。Google 側は変更しない）
export type EventAnnotation = {
  eventKey: string;
  scope: AnnotationScope;
  memo?: string; // Markdown
  priority: PriorityLevel;
  importance: ImportanceLevel;
  tagIds: string[];
};

// アプリ内で扱うカレンダーイベント（Google API レスポンスから変換済み）
export type CalendarEvent = {
  eventKey: string; // 注釈の紐付けキー（単発: event_id / 繰り返し: recurring_event_id を利用可能）
  eventId: string;
  calendarId: string;
  recurringEventId?: string;
  summary: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  isAllDay: boolean;
  status: "confirmed" | "tentative" | "cancelled";
  attendeesCount?: number;
  colorId?: string;
  annotation?: EventAnnotation;
  linkedTodoIds: string[];
};

// 選択可能なカレンダー
export type CalendarListEntry = {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
};

// 連携状態（GET /api/v1/calendar/connection のレスポンス）
export type CalendarConnection = {
  connected: boolean;
  googleEmail?: string;
  selectedCalendarIds: string[];
  availableCalendars: CalendarListEntry[];
  lastSyncedAt?: string;
};

// 同期 API のレスポンス
export type CalendarSyncResult = {
  synced: boolean;
  eventCount: number;
  fullSync: boolean;
  lastSyncedAt: string;
};
