"use client";

import React from "react";
import { Calendar, ChevronDown } from "lucide-react";
import type { TodoItem } from "@/types";
import type { DeadlineStatus } from "@/components/todo-list/TodoListPanel";

interface TodoDeadlinePanelProps {
  todo: TodoItem;
  getDeadlineStatus: (todo: TodoItem) => DeadlineStatus;
  expandedDeadlineTodoId: string | null;
  setExpandedDeadlineTodoId: (id: string | null) => void;
  updateTodoDeadline: (id: string, dueDate: string | undefined, dueTime: string | undefined) => void;
  extendDeadline: (id: string, days: number) => void;
}

export function TodoDeadlinePanel({
  todo,
  getDeadlineStatus,
  expandedDeadlineTodoId,
  setExpandedDeadlineTodoId,
  updateTodoDeadline,
  extendDeadline,
}: TodoDeadlinePanelProps) {
  const status = getDeadlineStatus(todo);
  const isExpanded = expandedDeadlineTodoId === todo.id;

  return (
    <>
      {/* 期限表示 - コンパクト版（クリックで詳細展開） */}
      {status && (() => {
        const statusClasses = status.isOverdue
          ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-medium"
          : status.isSoon
          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 font-medium"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
        const remainingText = status.isOverdue
          ? "期限切れ"
          : status.isSoon
          ? `${status.diffHours}h`
          : `${status.diffDays}d`;
        return (
          <button
            type="button"
            onClick={() => setExpandedDeadlineTodoId(isExpanded ? null : todo.id)}
            className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity ${statusClasses}`}
            title={`${todo.dueDate}${todo.dueTime ? ` ${todo.dueTime}` : ""} - クリックで編集`}
          >
            <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
            <span>{remainingText}</span>
            <ChevronDown
              className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        );
      })()}

      {/* 期限設定フォーム - 折りたたみ式 */}
      {isExpanded && (
        <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg mt-1">
          {/* 日付・時刻入力行 */}
          <div className="flex gap-1 items-center flex-wrap">
            <input
              type="date"
              value={todo.dueDate || ""}
              onChange={(e) =>
                updateTodoDeadline(todo.id, e.target.value || undefined, todo.dueTime)
              }
              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:[color-scheme:dark]"
              placeholder="期限日"
            />
            <input
              type="time"
              value={todo.dueTime || ""}
              onChange={(e) =>
                updateTodoDeadline(todo.id, todo.dueDate, e.target.value || undefined)
              }
              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:[color-scheme:dark]"
              placeholder="時刻"
            />
            {(todo.dueDate || todo.dueTime) && (
              <button
                type="button"
                onClick={() => updateTodoDeadline(todo.id, undefined, undefined)}
                className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded transition-colors"
                title="期限をクリア"
              >
                解除
              </button>
            )}
          </div>
          {/* 延長ボタン行 - 期限が設定されている場合のみ */}
          {todo.dueDate && (
            <div className="flex gap-1 items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                延長:
              </span>
              <button
                type="button"
                onClick={() => extendDeadline(todo.id, 1)}
                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                title="1日延長"
              >
                +1日
              </button>
              <button
                type="button"
                onClick={() => extendDeadline(todo.id, 3)}
                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                title="3日延長"
              >
                +3日
              </button>
              <button
                type="button"
                onClick={() => extendDeadline(todo.id, 7)}
                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                title="1週間延長"
              >
                +7日
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
