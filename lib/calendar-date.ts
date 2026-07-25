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

export function startOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function formatMonthHeading(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function formatWeekHeading(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = weekStart.getMonth() + 1;
  const endMonth = weekEnd.getMonth() + 1;
  if (startMonth === endMonth) {
    return `${weekStart.getFullYear()}年${startMonth}月 ${weekStart.getDate()}日〜${weekEnd.getDate()}日`;
  }
  return `${startMonth}/${weekStart.getDate()}〜${endMonth}/${weekEnd.getDate()}`;
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

// 終日予定の date-only 値（UTC 0時で保存）はタイムゾーンでずれるため、
// UTC の年月日をそのままローカル日付として解釈する
export function eventDisplayDate(iso: string, isAllDay: boolean): Date {
  const d = new Date(iso);
  if (isAllDay) {
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  return d;
}
