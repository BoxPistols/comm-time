"use client";

import { CALENDAR_TEXT } from "@/lib/constants";
import { eventDisplayDate, isSameDay } from "@/lib/calendar-date";
import { EventCard } from "./event-card";
import type { CalendarEvent } from "@/types/calendar";

type CalendarDayViewProps = {
  events: CalendarEvent[];
  currentDate?: Date;
  onEventClick: (event: CalendarEvent) => void;
};

// 指定日の予定を時系列で表示（終日予定を先頭に）
export function CalendarDayView({ events, currentDate, onEventClick }: CalendarDayViewProps) {
  const targetDate = currentDate ?? new Date();
  const today = new Date();

  const dayEvents = events
    .filter((e) => {
      const start = eventDisplayDate(e.startAt, e.isAllDay);
      if (e.isAllDay) {
        // Google の終日予定の end は排他的（翌日 00:00）
        const end = eventDisplayDate(e.endAt, true);
        return isSameDay(start, targetDate) || (start <= targetDate && end > targetDate);
      }
      return isSameDay(start, targetDate);
    })
    .sort((a, b) => {
      if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });

  const isToday = isSameDay(targetDate, today);

  if (dayEvents.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {isToday ? CALENDAR_TEXT.noEventsToday : "この日の予定はありません"}
      </p>
    );
  }

  const now = Date.now();

  return (
    <div className="space-y-1.5">
      {dayEvents.map((event) => {
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
