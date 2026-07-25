"use client";

// カレンダータブ全体のオーケストレーション
// ビュー切替（今日/週/月/予定リスト）・連携状態・同期・予定詳細ダイアログを束ねる
import { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ListPlus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { CALENDAR_TEXT } from "@/lib/constants";
import {
  addDays,
  addWeeks,
  addMonths,
  eventDisplayDate,
  startOfDay,
  startOfWeekMonday,
  startOfMonth,
  endOfMonth,
  formatWeekHeading,
  formatMonthHeading,
  toIso,
} from "@/lib/calendar-date";
import { useCalendarConnection } from "@/hooks/useCalendarConnection";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { CalendarConnectPanel, SyncStatusBar } from "./calendar-connect-panel";
import { CalendarDayView } from "./calendar-day-view";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarMonthView } from "./calendar-month-view";
import { CalendarAgendaView } from "./calendar-agenda-view";
import { EventDetailDrawer } from "./event-detail-drawer";
import { BulkTodoDialog } from "./bulk-todo-dialog";
import type { CalendarEvent, CalendarViewType } from "@/types/calendar";
import type { LocalTodoItem } from "@/types";

type CalendarTabProps = {
  user: User | null;
  todos?: LocalTodoItem[];
  onAddTodo?: (text: string, options?: { dueDate?: string; dueTime?: string }) => Promise<string | null>;
};

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: "today", label: CALENDAR_TEXT.viewToday },
  { value: "week", label: CALENDAR_TEXT.viewWeek },
  { value: "month", label: CALENDAR_TEXT.viewMonth },
  { value: "agenda", label: CALENDAR_TEXT.viewAgenda },
];

// 予定リストは今日から14日先まで表示する
const AGENDA_DAYS = 14;
// ビューの最大高さ（スクロール許容）
const VIEW_MAX_HEIGHT = "max-h-[60vh]";

export function CalendarTab({ user, todos = [], onAddTodo }: CalendarTabProps) {
  const [view, setView] = useState<CalendarViewType>("today");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()));
  const [bulkTodoOpen, setBulkTodoOpen] = useState(false);

  const connectionState = useCalendarConnection(user);
  const connected = connectionState.connection?.connected ?? false;

  // ナビゲーション: 前/次/今日
  const navigatePrev = useCallback(() => {
    if (view === "week") {
      setCurrentDate((d) => addWeeks(d, -1));
    } else if (view === "month") {
      setCurrentDate((d) => addMonths(d, -1));
    }
  }, [view]);

  const navigateNext = useCallback(() => {
    if (view === "week") {
      setCurrentDate((d) => addWeeks(d, 1));
    } else if (view === "month") {
      setCurrentDate((d) => addMonths(d, 1));
    }
  }, [view]);

  const navigateToday = useCallback(() => {
    setCurrentDate(startOfDay(new Date()));
  }, []);

  // 週/月ビューのみ横スワイプで前後移動できる
  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: navigateNext,
    onSwipeRight: navigatePrev,
    enabled: view === "week" || view === "month",
  });

  // 取得期間: 現在の表示月の前後1ヶ月 + アジェンダ分をカバー
  const range = useMemo(() => {
    const monthStart = startOfMonth(addMonths(currentDate, -1));
    const monthEnd = endOfMonth(addMonths(currentDate, 1));
    const agendaEnd = addDays(startOfDay(new Date()), AGENDA_DAYS);
    const to = monthEnd > agendaEnd ? monthEnd : agendaEnd;
    return { from: toIso(monthStart), to: toIso(to) };
  }, [currentDate]);

  const eventsState = useCalendarEvents({
    enabled: connected,
    from: range.from,
    to: range.to,
  });

  // OAuth コールバックから戻った直後は連携状態を取り直し、URL をクリーンアップする
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("calendar_auth");
    if (result) {
      params.delete("calendar_auth");
      const query = params.toString();
      window.history.replaceState({}, "", query ? `?${query}` : window.location.pathname);
      if (result === "connected") {
        void connectionState.refresh();
      }
    }
    // マウント時のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEventClick = (event: CalendarEvent) => setSelectedEvent(event);

  const agendaEvents = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    return eventsState.events.filter((e) => new Date(e.endAt).getTime() >= todayStart);
  }, [eventsState.events]);

  // 一括 TODO 化の対象は「今表示している週 / 月」の予定に限定する
  const periodBounds = useMemo(() => {
    if (view === "month") {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
    const weekStart = startOfWeekMonday(currentDate);
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { start: weekStart, end: weekEnd };
  }, [view, currentDate]);

  const periodEvents = useMemo(() => {
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    return eventsState.events.filter((e) => {
      const t = eventDisplayDate(e.startAt, e.isAllDay).getTime();
      return t >= startMs && t <= endMs;
    });
  }, [eventsState.events, periodBounds]);

  const periodLabel =
    view === "month" ? formatMonthHeading(currentDate) : formatWeekHeading(startOfWeekMonday(currentDate));

  return (
    <div className="space-y-4">
      <CalendarConnectPanel
        isAuthenticated={Boolean(user)}
        connection={connectionState.connection}
        notConfigured={connectionState.notConfigured}
        error={connectionState.error}
        onConnect={() => void connectionState.connect()}
        onDisconnect={() => void connectionState.disconnect()}
        onSelectionChange={(ids) => void connectionState.setSelectedCalendars(ids)}
      />

      {connected && (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 shadow-md">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setView(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    view === option.value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <SyncStatusBar
              lastSyncedAt={eventsState.lastSyncedAt ?? connectionState.connection?.lastSyncedAt ?? null}
              syncing={eventsState.syncing}
              onSyncNow={() => void eventsState.syncNow()}
            />
          </div>

          {(view === "week" || view === "month") && (
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={navigatePrev}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                aria-label={CALENDAR_TEXT.navPrev}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {view === "week"
                    ? formatWeekHeading(startOfWeekMonday(currentDate))
                    : formatMonthHeading(currentDate)}
                </span>
                <button
                  type="button"
                  onClick={navigateToday}
                  className="rounded-lg px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {CALENDAR_TEXT.navToday}
                </button>
                {onAddTodo && (
                  <button
                    type="button"
                    onClick={() => setBulkTodoOpen(true)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                  >
                    <ListPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{CALENDAR_TEXT.bulkTodoButton}</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={navigateNext}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                aria-label={CALENDAR_TEXT.navNext}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {eventsState.needsReauth && (
            <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2 text-xs text-amber-700 dark:text-amber-300">
              {CALENDAR_TEXT.reauthRequired}
            </div>
          )}
          {eventsState.error && (
            <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 p-2 text-xs text-red-700 dark:text-red-300">
              {eventsState.error}
            </div>
          )}

          <div className={`${VIEW_MAX_HEIGHT} overflow-y-auto`} {...swipeHandlers}>
            {view === "today" && (
              <CalendarDayView events={eventsState.events} onEventClick={handleEventClick} />
            )}
            {view === "week" && (
              <CalendarWeekView
                events={eventsState.events}
                currentDate={currentDate}
                onEventClick={handleEventClick}
              />
            )}
            {view === "month" && (
              <CalendarMonthView
                events={eventsState.events}
                currentDate={currentDate}
                onEventClick={handleEventClick}
              />
            )}
            {view === "agenda" && (
              <CalendarAgendaView events={agendaEvents} onEventClick={handleEventClick} />
            )}
          </div>
        </div>
      )}

      <EventDetailDrawer
        event={selectedEvent}
        todos={todos}
        onAddTodo={onAddTodo}
        onClose={() => setSelectedEvent(null)}
        onAnnotationChanged={() => void eventsState.refresh()}
      />

      {onAddTodo && (
        <BulkTodoDialog
          open={bulkTodoOpen}
          events={periodEvents}
          periodLabel={periodLabel}
          onAddTodo={onAddTodo}
          onClose={() => setBulkTodoOpen(false)}
          onCompleted={() => void eventsState.refresh()}
        />
      )}
    </div>
  );
}
