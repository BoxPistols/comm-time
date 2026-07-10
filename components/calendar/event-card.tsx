"use client";

import { MapPin, Video, StickyNote, Users } from "lucide-react";
import { CALENDAR_TEXT } from "@/lib/constants";
import { formatTimeRange } from "@/lib/calendar-date";
import type { CalendarEvent } from "@/types/calendar";

type EventCardProps = {
  event: CalendarEvent;
  compact?: boolean;
  onClick: (event: CalendarEvent) => void;
};

// 優先度バッジの配色（注釈がある場合のみ表示）
const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

export function EventCard({ event, compact = false, onClick }: EventCardProps) {
  const priority = event.annotation?.priority ?? "none";
  const hasMemo = Boolean(event.annotation?.memo);

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={`w-full text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 shadow-sm hover:shadow-md transition-all ${
        compact ? "px-2 py-1.5" : "px-3 py-2.5"
      } ${event.status === "tentative" ? "opacity-70 border-dashed" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-gray-500 dark:text-gray-400 shrink-0 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          {formatTimeRange(event.startAt, event.endAt, event.isAllDay)}
        </span>
        {priority !== "none" && (
          <span
            className={`shrink-0 rounded px-1 text-[10px] font-semibold ${PRIORITY_BADGE_CLASSES[priority]}`}
          >
            {CALENDAR_TEXT.priorityNames[priority]}
          </span>
        )}
        {hasMemo && <StickyNote className="w-3 h-3 shrink-0 text-amber-500" />}
      </div>
      <div
        className={`font-medium text-gray-800 dark:text-gray-100 truncate ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {event.summary}
      </div>
      {!compact && (event.location || event.hangoutLink || event.attendeesCount) && (
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {event.hangoutLink && (
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <Video className="w-3 h-3" />
              {CALENDAR_TEXT.openMeetingLink}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
          {typeof event.attendeesCount === "number" && event.attendeesCount > 1 && (
            <span className="flex items-center gap-1 shrink-0">
              <Users className="w-3 h-3" />
              {event.attendeesCount}
              {CALENDAR_TEXT.attendeesSuffix}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
