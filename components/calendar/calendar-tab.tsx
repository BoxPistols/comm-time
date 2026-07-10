"use client";

// カレンダータブ全体のオーケストレーション
// ビュー切替（今日/週/予定リスト）・連携状態・同期・予定詳細ダイアログを束ねる
import { useState, useMemo, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { CALENDAR_TEXT } from "@/lib/constants";
import { addDays, startOfDay, startOfWeekMonday, toIso } from "@/lib/calendar-date";
import { useCalendarConnection } from "@/hooks/useCalendarConnection";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { CalendarConnectPanel, SyncStatusBar } from "./calendar-connect-panel";
import { CalendarDayView } from "./calendar-day-view";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarAgendaView } from "./calendar-agenda-view";
import { EventDetailDrawer } from "./event-detail-drawer";
import type { CalendarEvent, CalendarViewType } from "@/types/calendar";

type CalendarTabProps = {
  user: User | null;
};

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: "today", label: CALENDAR_TEXT.viewToday },
  { value: "week", label: CALENDAR_TEXT.viewWeek },
  { value: "agenda", label: CALENDAR_TEXT.viewAgenda },
];

// 予定リストは今日から14日先まで表示する
const AGENDA_DAYS = 14;

export function CalendarTab({ user }: CalendarTabProps) {
  const [view, setView] = useState<CalendarViewType>("today");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const connectionState = useCalendarConnection(user);
  const connected = connectionState.connection?.connected ?? false;

  // 取得期間はビューに依らず「今週の月曜〜アジェンダ末尾」をまとめて取る（切替時の再取得を防ぐ）
  const range = useMemo(() => {
    const today = startOfDay(new Date());
    const from = startOfWeekMonday(today);
    const to = addDays(today, AGENDA_DAYS);
    return { from: toIso(from), to: toIso(to) };
  }, []);

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

          {view === "today" && (
            <CalendarDayView events={eventsState.events} onEventClick={handleEventClick} />
          )}
          {view === "week" && (
            <CalendarWeekView events={eventsState.events} onEventClick={handleEventClick} />
          )}
          {view === "agenda" && (
            <CalendarAgendaView events={agendaEvents} onEventClick={handleEventClick} />
          )}
        </div>
      )}

      <EventDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onAnnotationChanged={() => void eventsState.refresh()}
      />
    </div>
  );
}
