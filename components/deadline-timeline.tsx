"use client";

import React, { useMemo } from "react";
import { Play, Clock, ArrowRight, Target } from "lucide-react";
import type { LocalTodoItem } from "@/hooks/useSupabaseTodos";

type DeadlineTimelineProps = {
  todos: LocalTodoItem[];
  currentPomodoroTaskId: string | null;
  onStartPomodoro: (todo: LocalTodoItem) => void;
};

export function DeadlineTimeline({
  todos,
  currentPomodoroTaskId,
  onStartPomodoro,
}: DeadlineTimelineProps) {
  const { todayTasks, todayNoTimeTasks, overdueTasks, upcomingTasks, now, currentTaskIndex } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();

    const todayTasks = todos
      .filter((t) => !t.isCompleted && t.dueDate === todayStr && t.dueTime)
      .sort((a, b) => {
        const timeA = a.dueTime || "23:59";
        const timeB = b.dueTime || "23:59";
        return timeA.localeCompare(timeB);
      });

    const todayNoTimeTasks = todos
      .filter((t) => !t.isCompleted && t.dueDate === todayStr && !t.dueTime);

    const overdueTasks = todos
      .filter((t) => {
        if (t.isCompleted || !t.dueDate) return false;
        const deadline = new Date(`${t.dueDate}T${t.dueTime || "23:59"}`);
        return deadline.getTime() < Date.now() && t.dueDate <= todayStr;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.dueDate}T${a.dueTime || "23:59"}`);
        const dateB = new Date(`${b.dueDate}T${b.dueTime || "23:59"}`);
        return dateA.getTime() - dateB.getTime();
      });

    const upcomingTasks = todos
      .filter((t) => {
        if (t.isCompleted || !t.dueDate) return false;
        if (t.dueDate === todayStr) return false;
        return t.dueDate > todayStr;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.dueDate}T${a.dueTime || "23:59"}`);
        const dateB = new Date(`${b.dueDate}T${b.dueTime || "23:59"}`);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);

    const currentTaskIndex = todayTasks.findIndex((t) => {
      const deadline = new Date(`${t.dueDate}T${t.dueTime}`);
      return deadline.getTime() > now.getTime();
    });

    return { todayTasks, todayNoTimeTasks, overdueTasks, upcomingTasks, now, currentTaskIndex, todayStr };
  }, [todos]);

  const hasAnyTasks = todayTasks.length > 0 || todayNoTimeTasks.length > 0 || overdueTasks.length > 0 || upcomingTasks.length > 0;

  if (!hasAnyTasks) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-xl p-4 sm:p-6 mt-4 border border-emerald-100 dark:border-emerald-900">
      <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
        <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        デッドラインタイムライン
      </h3>

      {/* 期限切れタスク */}
      {overdueTasks.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wider">
            期限切れ
          </div>
          <div className="space-y-2">
            {overdueTasks.map((todo) => {
              const deadline = new Date(`${todo.dueDate}T${todo.dueTime || "23:59"}`);
              const diffMs = now.getTime() - deadline.getTime();
              const diffMin = Math.floor(diffMs / 60000);
              const diffHr = Math.floor(diffMin / 60);
              const overLabel = diffHr > 0 ? `${diffHr}h${diffMin % 60}m超過` : `${diffMin}m超過`;

              return (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-red-100/80 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
                >
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">
                      {todo.dueTime || "終日"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 truncate">
                      {todo.text}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {overLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartPomodoro(todo)}
                    className="flex-shrink-0 p-1.5 text-red-600 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg transition-colors"
                    title="このタスクでポモドーロ開始"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 今日のタイムライン（時間付き） */}
      {todayTasks.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wider">
            今日のスケジュール
          </div>
          <div className="relative">
            <div className="absolute left-[1.75rem] top-0 bottom-0 w-0.5 bg-emerald-200 dark:bg-emerald-800" />
            <div className="space-y-1">
              {todayTasks.map((todo, index) => {
                const deadline = new Date(`${todo.dueDate}T${todo.dueTime}`);
                const isCurrent = index === currentTaskIndex;
                const isPast = deadline.getTime() <= now.getTime();
                const diffMs = deadline.getTime() - now.getTime();
                const diffMin = Math.floor(diffMs / 60000);
                const diffHr = Math.floor(diffMin / 60);
                const remainLabel = diffHr > 0 ? `あと${diffHr}h${diffMin % 60}m` : diffMin > 0 ? `あと${diffMin}m` : "";
                const isActivePomodoro = currentPomodoroTaskId === todo.id;
                const nextTodo = index < todayTasks.length - 1 ? todayTasks[index + 1] : null;

                return (
                  <div key={todo.id}>
                    <div
                      className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                        isActivePomodoro
                          ? "bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-300 dark:border-indigo-700 shadow-sm"
                          : isCurrent
                          ? "bg-emerald-100/80 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                          : isPast
                          ? "opacity-50"
                          : "hover:bg-white/50 dark:hover:bg-gray-800/30"
                      }`}
                    >
                      <div className="flex-shrink-0 w-14 flex items-center justify-center relative z-10">
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          isActivePomodoro
                            ? "bg-indigo-500 border-indigo-300 shadow-lg shadow-indigo-500/50"
                            : isCurrent
                            ? "bg-emerald-500 border-emerald-300 shadow-lg shadow-emerald-500/50"
                            : isPast
                            ? "bg-gray-300 dark:bg-gray-600 border-gray-400"
                            : "bg-white dark:bg-gray-700 border-emerald-400"
                        }`} />
                      </div>
                      <div className="flex-shrink-0 w-12 text-center">
                        <div className={`text-sm font-bold tabular-nums ${
                          isCurrent ? "text-emerald-700 dark:text-emerald-300" : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {todo.dueTime}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isActivePomodoro
                            ? "text-indigo-800 dark:text-indigo-200"
                            : isCurrent
                            ? "text-emerald-800 dark:text-emerald-200"
                            : "text-gray-700 dark:text-gray-300"
                        }`}>
                          {isActivePomodoro && <span className="text-xs mr-1">🎯</span>}
                          {todo.text}
                        </p>
                        {remainLabel && !isPast && (
                          <p className={`text-xs ${
                            isCurrent ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-500"
                          }`}>
                            {remainLabel}
                            {nextTodo && (
                              <span className="ml-2 text-gray-400 dark:text-gray-600">
                                <ArrowRight className="w-3 h-3 inline" /> {nextTodo.dueTime} {nextTodo.text.slice(0, 15)}{nextTodo.text.length > 15 ? "..." : ""}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onStartPomodoro(todo)}
                        className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                          isActivePomodoro
                            ? "text-indigo-600 bg-indigo-200 dark:bg-indigo-800"
                            : "text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                        }`}
                        title="このタスクでポモドーロ開始"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 今日の時間未指定タスク */}
      {todayNoTimeTasks.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wider">
            今日中
          </div>
          <div className="space-y-1">
            {todayNoTimeTasks.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  currentPomodoroTaskId === todo.id
                    ? "bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-300 dark:border-indigo-700"
                    : "hover:bg-white/50 dark:hover:bg-gray-800/30"
                }`}
              >
                <div className="flex-shrink-0 w-14 text-center">
                  <Clock className="w-4 h-4 text-amber-500 mx-auto" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {todo.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onStartPomodoro(todo)}
                  className="flex-shrink-0 p-1.5 text-amber-600 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
                  title="このタスクでポモドーロ開始"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 今後の予定 */}
      {upcomingTasks.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-500 mb-2 uppercase tracking-wider">
            今後の予定
          </div>
          <div className="space-y-1">
            {upcomingTasks.map((todo) => {
              const todayStr = new Date().toISOString().split("T")[0];
              const dueDate = new Date(todo.dueDate!);
              const daysDiff = Math.ceil((dueDate.getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
              const dayLabel = daysDiff === 1 ? "明日" : daysDiff <= 7 ? `${daysDiff}日後` : todo.dueDate!;

              return (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
                >
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-500">
                      {dayLabel}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {todo.text}
                    </p>
                    {todo.dueTime && (
                      <p className="text-xs text-gray-400 dark:text-gray-600">
                        {todo.dueTime}まで
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
