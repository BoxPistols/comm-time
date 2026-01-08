"use client";

import React from "react";
import {
  DragDropContext,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";
import { StrictModeDroppable } from "@/components/strict-mode-droppable";
import {
  Check,
  Flag,
  Star,
  Clock,
} from "lucide-react";
import { RichTextWithLinks } from "@/components/rich-text-with-links";
import {
  type Tag,
  type KanbanStatus,
  type KanbanStatusColumn,
  type PriorityLevel,
  type ImportanceLevel,
  DEFAULT_KANBAN_COLUMNS,
  PRIORITY_CONFIG,
  IMPORTANCE_CONFIG,
  TAG_COLORS,
} from "@/types";

// TODO型の最小定義（comm-time.tsxから渡される）
interface TodoItem {
  id: string;
  text: string;
  isCompleted: boolean;
  dueDate?: string;
  dueTime?: string;
  tagIds?: string[];
  priority?: PriorityLevel;
  importance?: ImportanceLevel;
  kanbanStatus?: KanbanStatus;
}

interface KanbanBoardProps {
  todos: TodoItem[];
  tags: Tag[];
  columns?: KanbanStatusColumn[];
  darkMode: boolean;
  onStatusChange: (todoId: string, newStatus: KanbanStatus) => void;
  onToggleTodo: (id: string) => void;
  onEditTodo?: (id: string) => void;
}

export function KanbanBoard({
  todos,
  tags,
  columns = DEFAULT_KANBAN_COLUMNS,
  darkMode,
  onStatusChange,
  onToggleTodo,
  onEditTodo,
}: KanbanBoardProps) {
  // カラムごとにTODOをグループ化
  const getColumnTodos = (columnId: KanbanStatus) => {
    return todos.filter((todo) => (todo.kanbanStatus || "backlog") === columnId);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // ドロップ先がない場合は何もしない
    if (!destination) return;

    // 同じ位置にドロップした場合は何もしない
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // ステータスを更新
    const newStatus = destination.droppableId as KanbanStatus;
    onStatusChange(draggableId, newStatus);
  };

  // tagsをMapに変換してO(1)検索を実現
  const tagsMap = React.useMemo(() => {
    return new Map(tags.map(tag => [tag.id, tag]));
  }, [tags]);

  const getTextColorClass = (bgColor: string) => {
    const colorConfig = TAG_COLORS.find((c) => c.value === bgColor);
    return colorConfig?.textColor || "text-white";
  };

  const getDeadlineStatus = (dueDate?: string, dueTime?: string) => {
    if (!dueDate) return null;
    const now = new Date();
    const deadline = new Date(`${dueDate}T${dueTime || "23:59"}`);
    const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return "overdue";
    if (diffHours <= 24) return "soon";
    return "future";
  };

  const formatDeadline = (dueDate?: string, dueTime?: string) => {
    if (!dueDate) return null;
    const date = new Date(`${dueDate}T${dueTime || "00:00"}`);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const time = dueTime ? ` ${dueTime}` : "";
    return `${month}/${day}${time}`;
  };

  // 動的なカラム色を生成
  const getColumnColors = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; header: string; bgLight: string; borderLight: string; headerLight: string }> = {
      gray: { bg: "bg-gray-800/50", border: "border-gray-700", header: "bg-gray-700", bgLight: "bg-gray-50", borderLight: "border-gray-200", headerLight: "bg-gray-200" },
      blue: { bg: "bg-blue-900/20", border: "border-blue-800", header: "bg-blue-800", bgLight: "bg-blue-50", borderLight: "border-blue-200", headerLight: "bg-blue-200" },
      yellow: { bg: "bg-yellow-900/20", border: "border-yellow-800", header: "bg-yellow-800", bgLight: "bg-yellow-50", borderLight: "border-yellow-200", headerLight: "bg-yellow-200" },
      green: { bg: "bg-green-900/20", border: "border-green-800", header: "bg-green-800", bgLight: "bg-green-50", borderLight: "border-green-200", headerLight: "bg-green-200" },
      red: { bg: "bg-red-900/20", border: "border-red-800", header: "bg-red-800", bgLight: "bg-red-50", borderLight: "border-red-200", headerLight: "bg-red-200" },
      orange: { bg: "bg-orange-900/20", border: "border-orange-800", header: "bg-orange-800", bgLight: "bg-orange-50", borderLight: "border-orange-200", headerLight: "bg-orange-200" },
      purple: { bg: "bg-purple-900/20", border: "border-purple-800", header: "bg-purple-800", bgLight: "bg-purple-50", borderLight: "border-purple-200", headerLight: "bg-purple-200" },
      pink: { bg: "bg-pink-900/20", border: "border-pink-800", header: "bg-pink-800", bgLight: "bg-pink-50", borderLight: "border-pink-200", headerLight: "bg-pink-200" },
      indigo: { bg: "bg-indigo-900/20", border: "border-indigo-800", header: "bg-indigo-800", bgLight: "bg-indigo-50", borderLight: "border-indigo-200", headerLight: "bg-indigo-200" },
      teal: { bg: "bg-teal-900/20", border: "border-teal-800", header: "bg-teal-800", bgLight: "bg-teal-50", borderLight: "border-teal-200", headerLight: "bg-teal-200" },
    };
    const config = colorMap[color] || colorMap.gray;
    return {
      bg: darkMode ? config.bg : config.bgLight,
      border: darkMode ? config.border : config.borderLight,
      header: darkMode ? config.header : config.headerLight,
    };
  };

  // ソート順でカラムを並べ替え
  const sortedColumns = React.useMemo(() => {
    return [...columns].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [columns]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sortedColumns.map((column) => {
          const columnTodos = getColumnTodos(column.name);
          const colors = getColumnColors(column.color);

          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-52 sm:w-64 rounded-xl border ${colors.border} ${colors.bg}`}
            >
              {/* カラムヘッダー */}
              <div
                className={`px-3 py-2 rounded-t-xl ${colors.header} flex items-center justify-between`}
              >
                <span
                  className={`font-medium text-sm ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {column.label}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    darkMode ? "bg-gray-600 text-gray-300" : "bg-white/50 text-gray-600"
                  }`}
                >
                  {columnTodos.length}
                </span>
              </div>

              {/* ドロップ可能エリア */}
              <StrictModeDroppable droppableId={column.name}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] max-h-[400px] overflow-y-auto p-2 space-y-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? darkMode
                          ? "bg-gray-700/50"
                          : "bg-gray-100"
                        : ""
                    }`}
                  >
                    {columnTodos.map((todo, index) => {
                      const deadlineStatus = getDeadlineStatus(
                        todo.dueDate,
                        todo.dueTime
                      );

                      return (
                        <Draggable
                          key={todo.id}
                          draggableId={todo.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onEditTodo?.(todo.id)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all overflow-hidden ${
                                snapshot.isDragging
                                  ? "shadow-lg scale-105"
                                  : "hover:shadow-md"
                              } ${
                                darkMode
                                  ? "bg-gray-800 border-gray-700"
                                  : "bg-white border-gray-200"
                              } ${
                                todo.isCompleted ? "opacity-60" : ""
                              }`}
                            >
                              {/* タスク内容 */}
                              <div className="flex items-start gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleTodo(todo.id);
                                  }}
                                  className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    todo.isCompleted
                                      ? "bg-green-500 border-green-500 text-white"
                                      : darkMode
                                      ? "border-gray-600 hover:border-gray-500"
                                      : "border-gray-300 hover:border-gray-400"
                                  }`}
                                >
                                  {todo.isCompleted && (
                                    <Check className="w-3 h-3" />
                                  )}
                                </button>
                                <div
                                  className={`flex-1 text-sm leading-tight break-words ${
                                    todo.isCompleted
                                      ? "line-through"
                                      : ""
                                  } ${
                                    darkMode ? "text-gray-200" : "text-gray-800"
                                  }`}
                                >
                                  <RichTextWithLinks
                                    text={todo.text}
                                    darkMode={darkMode}
                                    maxLength={40}
                                  />
                                </div>
                              </div>

                              {/* メタ情報 */}
                              <div className="mt-2 flex flex-wrap items-center gap-1">
                                {/* 期限 */}
                                {todo.dueDate && (
                                  <span
                                    className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                                      deadlineStatus === "overdue"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : deadlineStatus === "soon"
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {formatDeadline(todo.dueDate, todo.dueTime)}
                                  </span>
                                )}

                                {/* 優先度 */}
                                {todo.priority && todo.priority !== "none" && (
                                  <span
                                    className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
                                      todo.priority === "high"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : todo.priority === "medium"
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    }`}
                                  >
                                    <Flag className="w-3 h-3" />
                                    {PRIORITY_CONFIG[todo.priority].label}
                                  </span>
                                )}

                                {/* 重要度 */}
                                {todo.importance &&
                                  todo.importance !== "none" && (
                                    <span
                                      className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
                                        todo.importance === "high"
                                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                          : todo.importance === "medium"
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                      }`}
                                    >
                                      <Star className="w-3 h-3" />
                                      {IMPORTANCE_CONFIG[todo.importance].label}
                                    </span>
                                  )}
                              </div>

                              {/* タグ */}
                              {todo.tagIds && todo.tagIds.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {todo.tagIds.slice(0, 3).map((tagId) => {
                                    const tag = tagsMap.get(tagId);
                                    if (!tag) return null;
                                    return (
                                      <span
                                        key={tagId}
                                        className={`text-xs px-1.5 py-0.5 rounded-full ${tag.color} ${getTextColorClass(tag.color)}`}
                                      >
                                        {tag.name}
                                      </span>
                                    );
                                  })}
                                  {todo.tagIds.length > 3 && (
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        darkMode
                                          ? "bg-gray-700 text-gray-400"
                                          : "bg-gray-200 text-gray-600"
                                      }`}
                                    >
                                      +{todo.tagIds.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}

                    {/* 空の場合のプレースホルダー */}
                    {columnTodos.length === 0 && (
                      <div
                        className={`text-center py-8 text-sm ${
                          darkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        タスクをドロップ
                      </div>
                    )}
                  </div>
                )}
              </StrictModeDroppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
