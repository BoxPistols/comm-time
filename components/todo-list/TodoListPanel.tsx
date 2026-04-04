"use client";

import React from "react";
import {
  Plus,
  Check,
  X,
  Edit,
  Save,
  Timer,
  Calendar,
  ChevronDown,
  Trash2,
  RotateCcw,
  Tag as TagIcon,
  Filter,
  Columns,
  Flag,
  Star,
} from "lucide-react";
import {
  DragDropContext,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";
import { StrictModeDroppable } from "@/components/strict-mode-droppable";
import { TagManager } from "@/components/tag-manager";
import { FilterPanel } from "@/components/filter-panel";
import { RichTextWithLinks } from "@/components/rich-text-with-links";
import type {
  TodoItem,
  TrashedTodoItem,
  FilterState,
  Tag,
  TabType,
  KanbanStatus,
  PriorityLevel,
  ImportanceLevel,
  KanbanStatusColumn,
} from "@/types";
import { PRIORITY_CONFIG, IMPORTANCE_CONFIG, TAG_COLORS } from "@/types";

type DeadlineStatus = {
  isOverdue: boolean;
  isSoon: boolean;
  diffDays: number;
  diffHours: number;
  diffMs: number;
} | null;

export interface TodoListPanelProps {
  // Data
  sharedTodos: TodoItem[];
  filteredTodos: TodoItem[];
  trashedTodos: TrashedTodoItem[];
  tags: Tag[];
  tagsMap: Map<string, Tag>;
  kanbanStatuses: KanbanStatusColumn[];

  // Editing state
  editingTodoId: string | null;
  startEditingTodo: (id: string) => void;
  cancelEditingTodo: () => void;

  // Expanded states
  expandedDeadlineTodoId: string | null;
  setExpandedDeadlineTodoId: (id: string | null) => void;
  expandedTodoContentId: string | null;
  setExpandedTodoContentId: (id: string | null) => void;

  // Highlighted
  highlightedTodoId: string | null;

  // Sort
  sortByDeadline: boolean;
  setSortByDeadline: (v: boolean) => void;
  sortTodosByDeadline: (todos: TodoItem[]) => TodoItem[];

  // Tags
  addTag: (name: string, color: string) => Promise<Tag>;
  updateTag: (id: string, name: string, color: string) => void;
  deleteTag: (id: string) => void;
  showTagManager: boolean;
  setShowTagManager: (v: boolean) => void;

  // Filter
  filterState: FilterState;
  setFilterState: (v: FilterState) => void;
  hasActiveFilters: boolean;
  showFilterPanel: boolean;
  setShowFilterPanel: (v: boolean) => void;

  // Trash
  showTrash: boolean;
  setShowTrash: (v: boolean) => void;
  restoreTodo: (trashedTodo: TrashedTodoItem) => void;
  permanentlyDeleteTodo: (id: string) => void;
  emptyTrash: () => void;

  // CRUD
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  updateTodo: (id: string, newText: string) => void;
  clearAllTodos: () => Promise<void>;
  clearCompletedTodos: () => Promise<void>;

  // Deadline
  updateTodoDeadline: (id: string, dueDate: string | undefined, dueTime: string | undefined) => void;
  extendDeadline: (id: string, days: number) => void;
  getDeadlineStatus: (todo: TodoItem) => DeadlineStatus;

  // Kanban & details
  updateTodoKanbanStatus: (todoId: string, kanbanStatus: KanbanStatus) => void;
  handleSaveTodoDetails: (todoId: string, updates: {
    tagIds?: string[];
    priority?: PriorityLevel;
    importance?: ImportanceLevel;
    kanbanStatus?: KanbanStatus;
  }) => void;
  setEditDialogTodoId: (id: string | null) => void;

  // Drag & drop
  onDragEnd: (result: DropResult) => void;

  // UI
  darkMode: boolean;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Auth
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;

  // Kanban modal
  showKanbanModal: boolean;
  setShowKanbanModal: (v: boolean) => void;

  // Pomodoro start from TODO
  startWithTodo: (text: string, todoId: string) => void;

  // Refs
  editingInputRef: React.RefObject<HTMLInputElement>;
  todoInputRef: React.RefObject<HTMLInputElement>;
  isComposingRef: React.MutableRefObject<boolean>;
}

export function TodoListPanel({
  filteredTodos,
  trashedTodos,
  tags,
  tagsMap,
  kanbanStatuses,
  editingTodoId,
  startEditingTodo,
  cancelEditingTodo,
  expandedDeadlineTodoId,
  setExpandedDeadlineTodoId,
  expandedTodoContentId,
  setExpandedTodoContentId,
  highlightedTodoId,
  sortByDeadline,
  setSortByDeadline,
  sortTodosByDeadline,
  addTag,
  updateTag,
  deleteTag,
  showTagManager,
  setShowTagManager,
  filterState,
  setFilterState,
  hasActiveFilters,
  showFilterPanel,
  setShowFilterPanel,
  showTrash,
  setShowTrash,
  restoreTodo,
  permanentlyDeleteTodo,
  emptyTrash,
  addTodo,
  toggleTodo,
  removeTodo,
  updateTodo,
  clearAllTodos,
  clearCompletedTodos,
  updateTodoDeadline,
  extendDeadline,
  getDeadlineStatus,
  setEditDialogTodoId,
  onDragEnd,
  darkMode,
  activeTab,
  setActiveTab,
  setShowKanbanModal,
  startWithTodo,
  editingInputRef,
  todoInputRef,
  isComposingRef,
}: TodoListPanelProps) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/20">
      <div className="flex flex-col gap-2 mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          TODOリスト
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSortByDeadline(!sortByDeadline)}
            className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${
              sortByDeadline
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title="期限順にソート"
          >
            <Calendar className="w-3 h-3" />
            期限順
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("完了したTODOを削除しますか？")) {
                clearCompletedTodos();
              }
            }}
            className="text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
            title="完了済みを削除"
          >
            完了削除
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "すべてのTODOを削除しますか？この操作は取り消せません。"
                )
              ) {
                clearAllTodos();
              }
            }}
            className="text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
            title="すべて削除"
          >
            全削除
          </button>
          <button
            type="button"
            onClick={() => setShowTrash(!showTrash)}
            className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${
              showTrash
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title={`ゴミ箱 (${trashedTodos.length}件)`}
          >
            <Trash2 className="w-3 h-3" />
            {trashedTodos.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {trashedTodos.length}
              </span>
            )}
          </button>
          <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            onClick={() => setShowTagManager(!showTagManager)}
            className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${
              showTagManager
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title="タグ管理"
          >
            <TagIcon className="w-3 h-3" />
            タグ
          </button>
          <button
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${
              showFilterPanel || hasActiveFilters
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title="フィルター"
          >
            <Filter className="w-3 h-3" />
            絞込
          </button>
          <button
            type="button"
            onClick={() => setShowKanbanModal(true)}
            className="text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            title="カンバン表示"
          >
            <Columns className="w-3 h-3" />
            看板
          </button>
        </div>
      </div>

      {/* タグ管理パネル */}
      {showTagManager && (
        <div className="mb-4">
          <TagManager
            tags={tags}
            onAddTag={addTag}
            onUpdateTag={updateTag}
            onDeleteTag={deleteTag}
            darkMode={darkMode}
            onClose={() => setShowTagManager(false)}
          />
        </div>
      )}

      {/* フィルターパネル */}
      {showFilterPanel && (
        <div className="mb-4">
          <FilterPanel
            tags={tags}
            columns={kanbanStatuses}
            filterState={filterState}
            onFilterChange={setFilterState}
            darkMode={darkMode}
            onClose={() => setShowFilterPanel(false)}
          />
        </div>
      )}

      {/* ゴミ箱UI */}
      {showTrash && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1">
              <Trash2 className="w-4 h-4" />
              ゴミ箱 ({trashedTodos.length}件)
            </h4>
            {trashedTodos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "ゴミ箱を空にしますか？この操作は取り消せません。"
                    )
                  ) {
                    emptyTrash();
                  }
                }}
                className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded transition-colors"
              >
                ゴミ箱を空にする
              </button>
            )}
          </div>
          {trashedTodos.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ゴミ箱は空です
            </p>
          ) : (
            <ul className="space-y-2 max-h-[200px] overflow-y-auto">
              {trashedTodos.map((todo) => {
                const deletedDate = new Date(todo.deletedAt);
                const daysAgo = Math.floor(
                  (Date.now() - deletedDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                const expiresIn = 30 - daysAgo;
                return (
                  <li
                    key={todo.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs text-gray-700 dark:text-gray-300 truncate"
                        title={todo.text}
                      >
                        <RichTextWithLinks
                          text={todo.text}
                          darkMode={darkMode}
                          maxLength={80}
                        />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        削除: {deletedDate.toLocaleDateString("ja-JP")}{" "}
                        (残り{expiresIn}
                        日で完全削除)
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => restoreTodo(todo)}
                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                        title="復元"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "このTODOを完全に削除しますか？"
                            )
                          ) {
                            permanentlyDeleteTodo(todo.id);
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                        title="完全に削除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            ※ 削除から30日経過したアイテムは自動的に完全削除されます
          </p>
        </div>
      )}

      {/* TODOリスト */}
      <DragDropContext onDragEnd={onDragEnd}>
        <StrictModeDroppable
          droppableId={
            activeTab === "meeting" ? "meetingTodos" : "pomodoroTodos"
          }
        >
          {(provided) => (
            <ul
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2 mb-3 sm:mb-4 max-h-[400px] overflow-y-auto"
            >
              {(sortByDeadline
                ? sortTodosByDeadline(filteredTodos)
                : filteredTodos
              ).map((todo, index) => (
                <Draggable
                  key={todo.id}
                  draggableId={todo.id}
                  index={index}
                  isDragDisabled={sortByDeadline}
                >
                  {(provided, snapshot) => (
                    <li
                      id={`todo-${todo.id}`}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`grid grid-cols-[1fr_auto] gap-1 p-2 sm:p-3 rounded-xl transition-all duration-200 ${
                        todo.isCompleted
                          ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800"
                          : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                      } ${
                        snapshot.isDragging
                          ? "shadow-2xl scale-105"
                          : "shadow-sm hover:shadow-md"
                      } ${
                        highlightedTodoId === todo.id
                          ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800 bg-indigo-50 dark:bg-indigo-900/30 transition-all duration-500"
                          : ""
                      }`}
                    >
                      {editingTodoId === todo.id ? (
                        <>
                          <input
                            type="text"
                            defaultValue={todo.text}
                            ref={editingInputRef}
                            onCompositionStart={() => {
                              isComposingRef.current = true;
                            }}
                            onCompositionEnd={() => {
                              // IME変換確定後のEnterキーによる誤送信を防ぐため、遅延してフラグをリセット
                              setTimeout(() => {
                                isComposingRef.current = false;
                              }, 50);
                            }}
                            onKeyDown={(e) => {
                              if (
                                isComposingRef.current ||
                                e.nativeEvent.isComposing ||
                                e.key === "Process" ||
                                (e as React.KeyboardEvent & { keyCode?: number }).keyCode === 229
                              )
                                return;
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const value =
                                  editingInputRef.current?.value.trim() ||
                                  "";
                                if (value) {
                                  updateTodo(todo.id, value);
                                }
                              } else if (e.key === "Escape") {
                                cancelEditingTodo();
                              }
                            }}
                            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const value =
                                  editingInputRef.current?.value.trim() ||
                                  "";
                                if (value) {
                                  updateTodo(todo.id, value);
                                }
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                            >
                              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingTodo}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                            >
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 space-y-1">
                            {/* TODO内容 - 3行省略+クリック展開 */}
                            <div
                              className={`text-xs sm:text-sm ${
                                todo.isCompleted
                                  ? "line-through text-gray-500 dark:text-gray-400"
                                  : "text-gray-800 dark:text-gray-200"
                              }`}
                            >
                              {expandedTodoContentId === todo.id ? (
                                // 展開表示
                                <div>
                                  <RichTextWithLinks
                                    text={todo.text}
                                    darkMode={darkMode}
                                    className="whitespace-pre-wrap break-words"
                                  />
                                  {todo.text.length > 100 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedTodoContentId(null)
                                      }
                                      className="ml-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs"
                                    >
                                      [閉じる]
                                    </button>
                                  )}
                                </div>
                              ) : (
                                // 省略表示（3行まで）
                                <div
                                  className="cursor-pointer"
                                  onClick={() => {
                                    if (todo.text.length > 100) {
                                      setExpandedTodoContentId(todo.id);
                                    }
                                  }}
                                  title={todo.text}
                                >
                                  <span className="line-clamp-3 whitespace-pre-wrap break-words">
                                    <RichTextWithLinks
                                      text={todo.text}
                                      darkMode={darkMode}
                                    />
                                  </span>
                                  {todo.text.length > 100 && (
                                    <span className="text-indigo-500 dark:text-indigo-400 text-xs ml-1">
                                      [続きを見る]
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 期限表示 - コンパクト版（クリックで詳細展開） */}
                            {(() => {
                              const status = getDeadlineStatus(todo);
                              if (!status) return null;

                              // ステータスに応じたスタイルクラス
                              const statusClasses = status.isOverdue
                                ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-medium"
                                : status.isSoon
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 font-medium"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";

                              // 残り時間テキスト（短縮版）
                              const remainingText = status.isOverdue
                                ? "期限切れ"
                                : status.isSoon
                                ? `${status.diffHours}h`
                                : `${status.diffDays}d`;

                              const isExpanded =
                                expandedDeadlineTodoId === todo.id;

                              return (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedDeadlineTodoId(
                                      isExpanded ? null : todo.id
                                    )
                                  }
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
                            {expandedDeadlineTodoId === todo.id && (
                              <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg mt-1">
                                {/* 日付・時刻入力行 */}
                                <div className="flex gap-1 items-center flex-wrap">
                                  <input
                                    type="date"
                                    value={todo.dueDate || ""}
                                    onChange={(e) =>
                                      updateTodoDeadline(
                                        todo.id,
                                        e.target.value || undefined,
                                        todo.dueTime,
                                      )
                                    }
                                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:[color-scheme:dark]"
                                    placeholder="期限日"
                                  />
                                  <input
                                    type="time"
                                    value={todo.dueTime || ""}
                                    onChange={(e) =>
                                      updateTodoDeadline(
                                        todo.id,
                                        todo.dueDate,
                                        e.target.value || undefined,
                                      )
                                    }
                                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:[color-scheme:dark]"
                                    placeholder="時刻"
                                  />
                                  {(todo.dueDate || todo.dueTime) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateTodoDeadline(
                                          todo.id,
                                          undefined,
                                          undefined
                                        )
                                      }
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
                                      onClick={() =>
                                        extendDeadline(todo.id, 1)
                                      }
                                      className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                                      title="1日延長"
                                    >
                                      +1日
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        extendDeadline(todo.id, 3)
                                      }
                                      className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                                      title="3日延長"
                                    >
                                      +3日
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        extendDeadline(todo.id, 7)
                                      }
                                      className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                                      title="1週間延長"
                                    >
                                      +7日
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* タグ・優先度・重要度表示 - コンパクト */}
                            <div className="flex flex-wrap items-center gap-0.5">
                              {/* タグ表示 - コンパクト */}
                              {todo.tagIds && todo.tagIds.length > 0 && (
                                <>
                                  {todo.tagIds.slice(0, 2).map((tagId) => {
                                    const tag = tagsMap.get(tagId);
                                    if (!tag) return null;
                                    const textColor = TAG_COLORS.find((c) => c.value === tag.color)?.textColor || "text-white";
                                    return (
                                      <span
                                        key={tagId}
                                        className={`text-[10px] px-1 py-0.5 rounded ${tag.color} ${textColor}`}
                                      >
                                        {tag.name}
                                      </span>
                                    );
                                  })}
                                  {todo.tagIds.length > 2 && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                      +{todo.tagIds.length - 2}
                                    </span>
                                  )}
                                </>
                              )}
                              {/* 優先度バッジ - コンパクト */}
                              {todo.priority && todo.priority !== "none" && (
                                <span
                                  className={`text-[10px] px-1 py-0.5 rounded flex items-center ${PRIORITY_CONFIG[todo.priority].badgeClass}`}
                                  title={`優先度: ${PRIORITY_CONFIG[todo.priority].label}`}
                                >
                                  <Flag className="w-2.5 h-2.5" />
                                </span>
                              )}
                              {/* 重要度バッジ - コンパクト */}
                              {todo.importance && todo.importance !== "none" && (
                                <span
                                  className={`text-[10px] px-1 py-0.5 rounded flex items-center ${IMPORTANCE_CONFIG[todo.importance].badgeClass}`}
                                  title={`重要度: ${IMPORTANCE_CONFIG[todo.importance].label}`}
                                >
                                  <Star className="w-2.5 h-2.5" />
                                </span>
                              )}
                              {/* カンバンステータスバッジ - コンパクト */}
                              {todo.kanbanStatus && todo.kanbanStatus !== "backlog" && (
                                <span
                                  className={`text-[10px] px-1 py-0.5 rounded ${
                                    todo.kanbanStatus === "done"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                      : todo.kanbanStatus === "doing"
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                  }`}
                                >
                                  {kanbanStatuses.find((c) => c.name === todo.kanbanStatus)?.label}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* アクションボタン - コンパクト配置 */}
                          <div className="flex gap-0.5 items-center self-start">
                            <button
                              type="button"
                              onClick={() =>
                                toggleTodo(todo.id)
                              }
                              className={`p-1 rounded transition-colors ${
                                todo.isCompleted
                                  ? "text-green-600 bg-green-100 dark:bg-green-900/50"
                                  : "text-gray-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                              }`}
                              title="完了/未完了"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDeadlineTodoId(
                                  expandedDeadlineTodoId === todo.id
                                    ? null
                                    : todo.id
                                )
                              }
                              className={`p-1 rounded transition-colors ${
                                expandedDeadlineTodoId === todo.id ||
                                todo.dueDate
                                  ? "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50"
                                  : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                              }`}
                              title="期限を設定"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditDialogTodoId(todo.id)}
                              className={`p-1 rounded transition-colors ${
                                (todo.tagIds && todo.tagIds.length > 0) ||
                                (todo.priority && todo.priority !== "none") ||
                                (todo.importance && todo.importance !== "none")
                                  ? "text-purple-600 bg-purple-100 dark:bg-purple-900/50"
                                  : "text-gray-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                              }`}
                              title="タグ・優先度・重要度"
                            >
                              <TagIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditingTodo(todo.id)}
                              className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
                              title="編集"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                startWithTodo(todo.text, todo.id);
                                setActiveTab("pomodoro");
                                // スムーズスクロールでタイマー表示位置へ
                                const timerElement = document.getElementById('pomodoro-timer-section');
                                if (timerElement) {
                                  timerElement.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded transition-colors"
                              title="このタスクでポモドーロを開始"
                            >
                              <Timer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                removeTodo(todo.id)
                              }
                              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                              title="削除"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </StrictModeDroppable>
      </DragDropContext>

      {/* TODO追加フォーム */}
      <div className="flex gap-2">
        <input
          type="text"
          defaultValue=""
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            // IME変換確定後のEnterキーによる誤送信を防ぐため、遅延してフラグをリセット
            setTimeout(() => {
              isComposingRef.current = false;
            }, 50);
          }}
          onKeyDown={(e) => {
            // 日本語入力（IME）の変換中はスキップ
            if (
              isComposingRef.current ||
              e.nativeEvent.isComposing ||
              e.key === "Process" ||
              (e as React.KeyboardEvent & { keyCode?: number }).keyCode === 229
            )
              return;
            if (e.key === "Enter") {
              e.preventDefault();
              const value = todoInputRef.current?.value.trim() || "";
              if (value) {
                addTodo(value);
                if (todoInputRef.current) {
                  todoInputRef.current.value = "";
                  todoInputRef.current.focus();
                }
              }
            }
          }}
          className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="新しいTODOを入力..."
          ref={todoInputRef}
        />
        <button
          type="button"
          onClick={() => {
            const value = todoInputRef.current?.value.trim() || "";
            if (value) {
              addTodo(value);
              if (todoInputRef.current) {
                todoInputRef.current.value = "";
                todoInputRef.current.focus();
              }
            }
          }}
          className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base whitespace-nowrap flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">追加</span>
        </button>
      </div>
    </div>
  );
}
