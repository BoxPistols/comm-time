import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { BulkTodoDialog } from "@/components/calendar/bulk-todo-dialog";
import { CALENDAR_TEXT } from "@/lib/constants";
import type { CalendarEvent } from "@/types/calendar";

const mockLinkTodo = jest.fn();

jest.mock("@/hooks/useTodoEventLinks", () => ({
  useTodoEventLinks: () => ({
    linkTodo: (...args: unknown[]) => mockLinkTodo(...args),
    error: null,
  }),
}));

function event(eventId: string, summary: string, startAt: string): CalendarEvent {
  return {
    eventKey: eventId,
    eventId,
    calendarId: "cal-1",
    summary,
    startAt,
    endAt: startAt,
    isAllDay: false,
    status: "confirmed",
    linkedTodoIds: [],
  };
}

// 時系列の3件。ダイアログ内では早い順に並ぶ
const EVENTS = [
  event("evt-mon", "月曜の朝会", "2026-07-27T00:00:00.000Z"),
  event("evt-wed", "水曜のレビュー", "2026-07-29T00:00:00.000Z"),
  event("evt-fri", "金曜の締め会", "2026-07-31T00:00:00.000Z"),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockLinkTodo.mockResolvedValue(true);
});

/**
 * addTodo は「先頭に積む」実装なので、呼び出し順が時系列の昇順だと
 * 画面上は降順に並んでしまう。ダイアログ側が逆順で呼ぶことで
 * 積み上げた結果が時系列の昇順になる、という関係を検証する。
 */
it("一括 TODO 化は、積み上げた結果が時系列順になるよう逆順で作成する", async () => {
  const created: string[] = [];
  const onAddTodo = jest.fn(async (text: string) => {
    created.push(text);
    return `todo-${created.length}`;
  });

  const user = userEvent.setup();
  render(
    <BulkTodoDialog
      open
      events={EVENTS}
      periodLabel="今週"
      onAddTodo={onAddTodo}
      onClose={jest.fn()}
      onCompleted={jest.fn()}
    />
  );

  await user.click(screen.getByText("月曜の朝会"));
  await user.click(screen.getByText("水曜のレビュー"));
  await user.click(screen.getByText("金曜の締め会"));

  await user.click(screen.getByRole("button", { name: CALENDAR_TEXT.bulkTodoSubmit }));

  await waitFor(() => expect(onAddTodo).toHaveBeenCalledTimes(3));

  // 作成は遅い予定から。先頭に積まれるので最終的な並びは 月→水→金 になる
  expect(created).toEqual(["金曜の締め会", "水曜のレビュー", "月曜の朝会"]);

  // 先頭挿入を模して積み直すと、時系列の昇順に戻ることを明示する
  const displayed = created.reduce<string[]>((list, text) => [text, ...list], []);
  expect(displayed).toEqual(["月曜の朝会", "水曜のレビュー", "金曜の締め会"]);
});
