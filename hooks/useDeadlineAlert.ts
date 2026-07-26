"use client";

import { useRef, useEffect } from "react";
import type { TodoItem, AlarmSettings } from "@/types";

type UseDeadlineAlertOptions = {
  todos: TodoItem[];
  currentTime: Date | null;
  deadlineAlertEnabled: boolean;
  deadlineAlertMinutes: number;
  alertedTodoIdsRef: React.MutableRefObject<Set<string>>;
  playAlarm: (settings: AlarmSettings, message?: string) => void;
  meetingAlarmSettings: AlarmSettings;
};

export function useDeadlineAlert({
  todos,
  currentTime,
  deadlineAlertEnabled,
  deadlineAlertMinutes,
  alertedTodoIdsRef,
  playAlarm,
  meetingAlarmSettings,
}: UseDeadlineAlertOptions): void {
  const lastCheckedMinuteRef = useRef<number>(-1);

  useEffect(() => {
    if (!deadlineAlertEnabled || !currentTime) return;

    const currentMinute = currentTime.getMinutes();
    // 分が変わっていなければスキップ
    if (lastCheckedMinuteRef.current === currentMinute) return;
    lastCheckedMinuteRef.current = currentMinute;

    const alertThreshold = deadlineAlertMinutes * 60 * 1000;

    todos.forEach((todo) => {
      if (todo.isCompleted || !todo.dueDate || alertedTodoIdsRef.current.has(todo.id)) {
        return;
      }

      const deadline = new Date(`${todo.dueDate}T${todo.dueTime || "23:59"}`);
      const timeUntilDeadline = deadline.getTime() - currentTime.getTime();

      if (timeUntilDeadline < 0) return;

      if (timeUntilDeadline <= alertThreshold) {
        const minutesLeft = Math.ceil(timeUntilDeadline / (60 * 1000));
        const message = `「${todo.text.slice(0, 20)}${todo.text.length > 20 ? "..." : ""}」の締切まであと${minutesLeft}分です`;
        playAlarm(meetingAlarmSettings, message);
        alertedTodoIdsRef.current.add(todo.id);
      }
    });
  }, [deadlineAlertEnabled, deadlineAlertMinutes, todos, currentTime, playAlarm, meetingAlarmSettings, alertedTodoIdsRef]);
}
