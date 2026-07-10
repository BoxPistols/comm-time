/**
 * カレンダー表示用日付ユーティリティのテスト
 * 特に終日予定のタイムゾーン補正（eventDisplayDate）を検証する
 */
import {
  addDays,
  eventDisplayDate,
  isSameDay,
  startOfDay,
  startOfWeekMonday,
} from "@/lib/calendar-date";

describe("eventDisplayDate", () => {
  it("終日予定は UTC の年月日をローカル日付として解釈する", () => {
    // Google の終日予定 2026-07-10 は UTC 0時で保存される
    const d = eventDisplayDate("2026-07-10T00:00:00.000Z", true);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(0);
  });

  it("時間指定予定はそのままローカル時刻で扱う", () => {
    const d = eventDisplayDate("2026-07-10T01:00:00.000Z", false);
    expect(d.getTime()).toBe(new Date("2026-07-10T01:00:00.000Z").getTime());
  });

  it("タイムゾーンに依らず終日予定の日付判定が一致する", () => {
    const allDay = eventDisplayDate("2026-07-10T00:00:00.000Z", true);
    expect(isSameDay(allDay, new Date(2026, 6, 10, 8, 0))).toBe(true);
    expect(isSameDay(allDay, new Date(2026, 6, 11, 8, 0))).toBe(false);
  });
});

describe("startOfWeekMonday", () => {
  it("木曜日から同じ週の月曜日を返す", () => {
    // 2026-07-09 は木曜
    const monday = startOfWeekMonday(new Date(2026, 6, 9));
    expect(monday.getDate()).toBe(6);
    expect(monday.getDay()).toBe(1);
  });

  it("日曜日は前週扱いにならず直前の月曜日を返す", () => {
    // 2026-07-12 は日曜
    const monday = startOfWeekMonday(new Date(2026, 6, 12));
    expect(monday.getDate()).toBe(6);
  });

  it("月曜日はその日自身を返す", () => {
    const monday = startOfWeekMonday(new Date(2026, 6, 6, 15, 30));
    expect(monday.getDate()).toBe(6);
    expect(monday.getHours()).toBe(0);
  });
});

describe("startOfDay / addDays", () => {
  it("startOfDay は時刻を 00:00:00 に丸める", () => {
    const d = startOfDay(new Date(2026, 6, 10, 23, 59, 59));
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(10);
  });

  it("addDays は月をまたいで加算できる", () => {
    const d = addDays(new Date(2026, 6, 31), 1);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(1);
  });
});
