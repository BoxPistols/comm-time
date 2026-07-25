"use client";

import { useState, useMemo } from "react";
import { CALENDAR_TEXT } from "@/lib/constants";
import {
  eventDisplayDate,
  formatMonthHeading,
  getDaysInMonth,
  getFirstDayOfMonth,
  isSameDay,
} from "@/lib/calendar-date";
import { EventCard } from "./event-card";
import type { CalendarEvent } from "@/types/calendar";

type CalendarMonthViewProps = {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
};

export function CalendarMonthView({ events, currentDate, onEventClick }: CalendarMonthViewProps) {
  const [pickedDay, setPickedDay] = useState<Date | null>(null);
  const today = useMemo(() => new Date(), []);

  // 月を移動したら前月の選択は無効にする（別月の日付が選ばれたままだと空の詳細が residual 表示される）
  const selectedDay =
    pickedDay &&
    pickedDay.getMonth() === currentDate.getMonth() &&
    pickedDay.getFullYear() === currentDate.getFullYear()
      ? pickedDay
      : null;

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOffset = (getFirstDayOfMonth(currentDate) + 6) % 7;

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const day = eventDisplayDate(event.startAt, event.isAllDay);
      if (day.getMonth() === currentDate.getMonth() && day.getFullYear() === currentDate.getFullYear()) {
        const key = day.toDateString();
        const list = map.get(key) ?? [];
        list.push(event);
        map.set(key, list);
      }
    }
    return map;
  }, [events, currentDate]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = selectedDay.toDateString();
    return (eventsByDay.get(key) ?? []).sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [selectedDay, eventsByDay]);

  const days = useMemo(() => {
    const result: (Date | null)[] = [];
    for (let i = 0; i < firstDayOffset; i++) {
      result.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      result.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    return result;
  }, [currentDate, daysInMonth, firstDayOffset]);

  const handleDayClick = (day: Date) => {
    if (selectedDay && isSameDay(selectedDay, day)) {
      setPickedDay(null);
    } else {
      setPickedDay(day);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
        {formatMonthHeading(currentDate)}
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-[10px] font-medium text-gray-500 dark:text-gray-400">
        {CALENDAR_TEXT.weekdayLabels.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const isToday = isSameDay(day, today);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => handleDayClick(day)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : isToday
                  ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
              }`}
            >
              <span>{day.getDate()}</span>
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((_, i) => (
                    <span
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? "bg-white" : "bg-indigo-500 dark:bg-indigo-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            {selectedDay.getMonth() + 1}/{selectedDay.getDate()}の予定
          </div>
          {selectedDayEvents.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">予定はありません</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {selectedDayEvents.map((event) => (
                <EventCard
                  key={`${event.calendarId}:${event.eventId}`}
                  event={event}
                  compact
                  onClick={onEventClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedDay && eventsByDay.size === 0 && (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {CALENDAR_TEXT.noEventsMonth}
        </p>
      )}
    </div>
  );
}
