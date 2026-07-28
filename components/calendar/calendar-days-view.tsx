"use client";

import { CALENDAR_TEXT } from "@/lib/constants";
import {
  addDays,
  eventDisplayDate,
  formatDateHeading,
  isSameDay,
} from "@/lib/calendar-date";
import { EventCard } from "./event-card";
import type { CalendarEvent } from "@/types/calendar";

type CalendarDaysViewProps = {
  events: CalendarEvent[];
  currentDate?: Date;
  daysCount?: number;
  onEventClick: (event: CalendarEvent) => void;
};

export function CalendarDaysView({
  events,
  currentDate,
  daysCount = 4,
  onEventClick,
}: CalendarDaysViewProps) {
  const today = new Date();
  const startDate = currentDate ?? today;

  const days = Array.from({ length: daysCount }, (_, i) => {
    const date = addDays(startDate, i);
    const dayEvents = events
      .filter((e) => isSameDay(eventDisplayDate(e.startAt, e.isAllDay), date))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    return { date, events: dayEvents };
  });

  const isEmpty = days.every((d) => d.events.length === 0);
  if (isEmpty) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {CALENDAR_TEXT.noEventsWeek}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-2 lg:items-start">
      {days.map((day) => {
        const isToday = isSameDay(day.date, today);
        return (
          <div
            key={day.date.getTime()}
            className={`rounded-lg p-2 ${
              isToday
                ? "bg-indigo-50/80 dark:bg-indigo-950/40 ring-1 ring-indigo-300 dark:ring-indigo-700"
                : "bg-gray-50/60 dark:bg-gray-900/40"
            }`}
          >
            <div
              className={`mb-1.5 text-xs font-semibold ${
                isToday
                  ? "text-indigo-700 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {formatDateHeading(day.date)}
            </div>
            <div className="space-y-1">
              {day.events.map((event) => (
                <EventCard
                  key={`${event.calendarId}:${event.eventId}`}
                  event={event}
                  compact
                  onClick={onEventClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
