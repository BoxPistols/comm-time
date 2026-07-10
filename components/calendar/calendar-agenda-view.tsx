"use client";

import { useMemo } from "react";
import { CALENDAR_TEXT } from "@/lib/constants";
import { formatDateHeading, isSameDay, startOfDay } from "@/lib/calendar-date";
import { EventCard } from "./event-card";
import type { CalendarEvent } from "@/types/calendar";

type CalendarAgendaViewProps = {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
};

// 日付ごとにグループ化した時系列リスト
export function CalendarAgendaView({ events, onEventClick }: CalendarAgendaViewProps) {
  const groups = useMemo(() => {
    const map = new Map<number, { date: Date; events: CalendarEvent[] }>();
    for (const event of events) {
      const day = startOfDay(new Date(event.startAt));
      const key = day.getTime();
      const group = map.get(key) ?? { date: day, events: [] };
      group.events.push(event);
      map.set(key, group);
    }
    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {CALENDAR_TEXT.noEventsAgenda}
      </p>
    );
  }

  const today = new Date();

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.date.getTime()}>
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            {formatDateHeading(group.date)}
            {isSameDay(group.date, today) && (
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                {CALENDAR_TEXT.todayBadge}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {group.events.map((event) => (
              <EventCard key={`${event.calendarId}:${event.eventId}`} event={event} onClick={onEventClick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
