"use client";

import { useMemo } from "react";
import { CALENDAR_TEXT } from "@/lib/constants";
import { isSameDay } from "@/lib/calendar-date";
import { EventCard } from "./event-card";
import type { CalendarEvent } from "@/types/calendar";

type CalendarDayViewProps = {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
};

// 今日の予定を時系列で表示（終日予定を先頭に）
export function CalendarDayView({ events, onEventClick }: CalendarDayViewProps) {
  const today = new Date();
  const todayEvents = useMemo(
    () =>
      events
        .filter((e) => isSameDay(new Date(e.startAt), today) || (e.isAllDay && new Date(e.startAt) <= today && new Date(e.endAt) > today))
        .sort((a, b) => {
          if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
          return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
        }),
    // today は描画ごとに生成されるため依存に含めない（日付単位の比較のみに使用）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events]
  );

  if (todayEvents.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {CALENDAR_TEXT.noEventsToday}
      </p>
    );
  }

  const now = Date.now();

  return (
    <div className="space-y-1.5">
      {todayEvents.map((event) => {
        const isPast = new Date(event.endAt).getTime() < now && !event.isAllDay;
        const isOngoing =
          !event.isAllDay &&
          new Date(event.startAt).getTime() <= now &&
          now < new Date(event.endAt).getTime();
        return (
          <div
            key={`${event.calendarId}:${event.eventId}`}
            className={`${isPast ? "opacity-50" : ""} ${
              isOngoing ? "ring-2 ring-indigo-400 rounded-xl" : ""
            }`}
          >
            <EventCard event={event} onClick={onEventClick} />
          </div>
        );
      })}
    </div>
  );
}
