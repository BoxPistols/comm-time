// カレンダー表示用の日付ユーティリティ（クライアント・サーバー共用、外部依存なし）
import { CALENDAR_TEXT } from "./constants";

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// 週の開始は月曜（docs/CALENDAR_INTEGRATION_PLAN.md 未決事項 #4 の推奨案）
export function startOfWeekMonday(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=日, 1=月, ...
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 24時間表記 HH:MM
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatTimeRange(startIso: string, endIso: string, isAllDay: boolean): string {
  if (isAllDay) {
    return CALENDAR_TEXT.allDayLabel;
  }
  return `${formatTime(startIso)} - ${formatTime(endIso)}`;
}

// 例: 7/10（木）
export function formatDateHeading(date: Date): string {
  const weekday = CALENDAR_TEXT.weekdayLabels[(date.getDay() + 6) % 7];
  return `${date.getMonth() + 1}/${date.getDate()}（${weekday}）`;
}

export function toIso(date: Date): string {
  return date.toISOString();
}
