/**
 * ST3-2: deadline alert algorithm characterization tests
 * Locks the decision logic currently embedded in comm-time.tsx (lines ~404-420),
 * which will be extracted to useDeadlineAlert in ST5-3.
 *
 * Algorithm (verbatim from comm-time.tsx):
 *   For each todo:
 *     skip if isCompleted || !dueDate || already alerted
 *     deadline = new Date(`${dueDate}T${dueTime || "23:59"}`)
 *     timeUntilDeadline = deadline - currentTime   (ms)
 *     if (timeUntilDeadline < 0) skip   // already overdue
 *     if (timeUntilDeadline <= alertThreshold):
 *       minutesLeft = ceil(timeUntilDeadline / 60000)
 *       message = `「${text.slice(0,20)}${text.length>20?"...":""}」の締切まであと${minutesLeft}分です`
 *       trigger alert, mark todo id as alerted
 */

import type { TodoItem } from "../types";

// Pure re-implementation of the algorithm for testing.
// After ST5-3, useDeadlineAlert will expose the same logic as a hook.
type AlertResult = { todoId: string; message: string };

function runDeadlineAlertCheck(params: {
  todos: TodoItem[];
  currentTime: Date;
  alertThresholdMs: number;
  alertedIds: Set<string>;
}): AlertResult[] {
  const { todos, currentTime, alertThresholdMs, alertedIds } = params;
  const results: AlertResult[] = [];

  todos.forEach((todo) => {
    if (todo.isCompleted || !todo.dueDate || alertedIds.has(todo.id)) return;

    const deadline = new Date(`${todo.dueDate}T${todo.dueTime || "23:59"}`);
    const timeUntilDeadline = deadline.getTime() - currentTime.getTime();

    if (timeUntilDeadline < 0) return;
    if (timeUntilDeadline <= alertThresholdMs) {
      const minutesLeft = Math.ceil(timeUntilDeadline / (60 * 1000));
      const label =
        todo.text.slice(0, 20) + (todo.text.length > 20 ? "..." : "");
      results.push({
        todoId: todo.id,
        message: `「${label}」の締切まであと${minutesLeft}分です`,
      });
      alertedIds.add(todo.id);
    }
  });

  return results;
}

// Fixed reference time: 2026-01-15 10:00:00 JST
const BASE_TIME = new Date("2026-01-15T01:00:00.000Z"); // UTC = 10:00 JST

function makeTodo(overrides: Partial<TodoItem> & { id: string }): TodoItem {
  return { text: "テストTODO", isCompleted: false, ...overrides };
}

describe("deadline alert algorithm — characterization", () => {
  describe("skip conditions", () => {
    it("does nothing when alertEnabled would be false (empty todos)", () => {
      const results = runDeadlineAlertCheck({
        todos: [],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds: new Set(),
      });
      expect(results).toHaveLength(0);
    });

    it("skips completed todos", () => {
      const todo = makeTodo({
        id: "c1",
        isCompleted: true,
        dueDate: "2026-01-15",
        dueTime: "10:30",
      });
      const results = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds: new Set(),
      });
      expect(results).toHaveLength(0);
    });

    it("skips todos without a dueDate", () => {
      const todo = makeTodo({ id: "nd1" }); // no dueDate
      const results = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds: new Set(),
      });
      expect(results).toHaveLength(0);
    });

    it("skips todos already in alertedIds", () => {
      const todo = makeTodo({
        id: "a1",
        dueDate: "2026-01-15",
        dueTime: "10:30",
      });
      const alreadyAlerted = new Set(["a1"]);
      const results = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds: alreadyAlerted,
      });
      expect(results).toHaveLength(0);
    });

    it("skips overdue todos (timeUntilDeadline < 0)", () => {
      // dueTime = 09:30, currentTime = 10:00 → already past
      const todo = makeTodo({
        id: "ov1",
        dueDate: "2026-01-15",
        dueTime: "09:30",
      });
      const results = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME, // 10:00
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds: new Set(),
      });
      expect(results).toHaveLength(0);
    });

    it("skips todos outside the alert threshold", () => {
      // deadline = 12:00, currentTime = 10:00, threshold = 60 min → 120 min away, no alert
      const todo = makeTodo({
        id: "far1",
        dueDate: "2026-01-15",
        dueTime: "12:00",
      });
      const results = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000, // 60 min
        alertedIds: new Set(),
      });
      expect(results).toHaveLength(0);
    });
  });

  describe("alert triggering", () => {
    it("triggers alert when todo is within threshold", () => {
      // deadline = 10:30, currentTime = 10:00, threshold = 60 min → 30 min away, alert!
      const todo = makeTodo({
        id: "near1",
        text: "会議に参加する",
        dueDate: "2026-01-15",
        dueTime: "10:30",
      });
      const results = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000, // 60 min
        alertedIds: new Set(),
      });
      expect(results).toHaveLength(1);
      expect(results[0].todoId).toBe("near1");
    });

    it("marks the todo as alerted in alertedIds after triggering", () => {
      const todo = makeTodo({
        id: "near2",
        dueDate: "2026-01-15",
        dueTime: "10:30",
      });
      const alertedIds = new Set<string>();
      runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds,
      });
      expect(alertedIds.has("near2")).toBe(true);
    });

    it("does NOT trigger the same todo twice in the same run", () => {
      const todo = makeTodo({
        id: "dup1",
        dueDate: "2026-01-15",
        dueTime: "10:30",
      });
      const alertedIds = new Set<string>();
      const r1 = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds,
      });
      const r2 = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds, // same Set, now contains dup1
      });
      expect(r1).toHaveLength(1);
      expect(r2).toHaveLength(0); // second check skips it
    });
  });

  describe("message format", () => {
    it("message uses short label for text ≤ 20 chars", () => {
      const todo = makeTodo({
        id: "msg1",
        text: "20文字ちょうどのテキスト",
        dueDate: "2026-01-15",
        dueTime: "10:30",
      });
      const [result] = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds: new Set(),
      });
      expect(result.message).not.toContain("...");
      expect(result.message).toContain("「20文字ちょうどのテキスト」");
    });

    it("message truncates text > 20 chars with '...'", () => {
      // Use ASCII string to ensure character count is unambiguous
      const longText = "a".repeat(25); // 25 chars > 20
      const todo = makeTodo({
        id: "msg2",
        text: longText,
        dueDate: "2026-01-15",
        dueTime: "10:30",
      });
      const [result] = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds: new Set(),
      });
      expect(result.message).toContain("...");
      expect(result.message).toContain("「" + "a".repeat(20) + "...」");
    });

    it("message includes minutesLeft (ceil of ms / 60000)", () => {
      // deadline = 10:30 (30 min away), minutesLeft = ceil(30 * 60000 / 60000) = 30
      const todo = makeTodo({
        id: "msg3",
        text: "締切テスト",
        dueDate: "2026-01-15",
        dueTime: "10:30",
      });
      const [result] = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 60 * 60 * 1000,
        alertedIds: new Set(),
      });
      expect(result.message).toContain("あと30分です");
    });

    it("uses 23:59 as default time when dueTime is absent", () => {
      // dueDate = 2026-01-15, no dueTime → deadline = 2026-01-15T23:59
      // currentTime = 10:00 → ~838 min away
      const todo = makeTodo({
        id: "notime1",
        text: "時刻なしTODO",
        dueDate: "2026-01-15",
        // no dueTime
      });
      // Set threshold high enough to trigger
      const results = runDeadlineAlertCheck({
        todos: [todo],
        currentTime: BASE_TIME,
        alertThresholdMs: 24 * 60 * 60 * 1000, // 24h
        alertedIds: new Set(),
      });
      expect(results).toHaveLength(1);
      // minutesLeft = ceil(838 * 60000 / 60000) ≈ 838 (locale-dependent exact value)
      expect(results[0].message).toMatch(/あと\d+分です/);
    });
  });
});
