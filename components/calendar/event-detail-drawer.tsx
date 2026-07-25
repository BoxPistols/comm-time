"use client";

import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MapPin, Video, Trash2, Link2, Unlink, CheckSquare, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CALENDAR_TEXT } from "@/lib/constants";
import { eventDisplayDate, formatDateHeading, formatTimeRange } from "@/lib/calendar-date";
import { useEventAnnotations } from "@/hooks/useEventAnnotations";
import { useTodoEventLinks } from "@/hooks/useTodoEventLinks";
import type { CalendarEvent, AnnotationScope } from "@/types/calendar";
import type { PriorityLevel, ImportanceLevel } from "@/types";
import type { LocalTodoItem } from "@/types";

type EventDetailDrawerProps = {
  event: CalendarEvent | null;
  todos: LocalTodoItem[];
  onAddTodo?: (text: string, options?: { dueDate?: string; dueTime?: string }) => Promise<string | null>;
  onClose: () => void;
  onAnnotationChanged: () => void;
};

const LEVEL_OPTIONS: PriorityLevel[] = ["high", "medium", "low", "none"];

// 予定詳細 + 注釈（メモ・優先度・重要度）の編集ダイアログ
export function EventDetailDrawer({ event, todos, onAddTodo, onClose, onAnnotationChanged }: EventDetailDrawerProps) {
  const { save, remove, saving, error } = useEventAnnotations(onAnnotationChanged);
  const { linkTodo, unlinkTodo, linking, error: linkError } = useTodoEventLinks(onAnnotationChanged);

  const [memo, setMemo] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("none");
  const [importance, setImportance] = useState<ImportanceLevel>("none");
  const [scope, setScope] = useState<AnnotationScope>("instance");
  const [showPreview, setShowPreview] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [showTodoSelector, setShowTodoSelector] = useState(false);

  // 別の予定を開いたら編集状態を初期化する
  const linkedTodoIds = event?.linkedTodoIds ?? [];

  const linkedTodos = useMemo(() => {
    if (!linkedTodoIds.length) return [];
    return todos.filter((t) => linkedTodoIds.includes(t.id));
  }, [todos, linkedTodoIds]);

  const availableTodos = useMemo(() => {
    if (!linkedTodoIds.length) return todos.filter((t) => !t.isCompleted);
    return todos.filter((t) => !t.isCompleted && !linkedTodoIds.includes(t.id));
  }, [todos, linkedTodoIds]);

  useEffect(() => {
    if (event) {
      setMemo(event.annotation?.memo ?? "");
      setPriority(event.annotation?.priority ?? "none");
      setImportance(event.annotation?.importance ?? "none");
      setScope(event.annotation?.scope ?? "instance");
      setShowPreview(false);
      setSavedMessage(false);
    }
  }, [event]);

  if (!event) {
    return null;
  }

  const hasAnnotation = Boolean(event.annotation);
  const isRecurring = Boolean(event.recurringEventId);

  const handleLinkTodo = async (todoId: string) => {
    await linkTodo(todoId, event.eventId);
    setShowTodoSelector(false);
  };

  const handleUnlinkTodo = async (todoId: string) => {
    await unlinkTodo(todoId, event.eventId);
  };

  const handleCreateTodoFromEvent = async () => {
    if (!onAddTodo || !event.summary) return;
    // 終日予定は UTC 保存のためローカル日付として解釈し直す（toISOString だと前日にずれる）
    const startDate = eventDisplayDate(event.startAt, event.isAllDay);
    const dueDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
    const dueTime = event.isAllDay ? undefined : startDate.toTimeString().slice(0, 5);
    const todoId = await onAddTodo(event.summary, { dueDate, dueTime });
    if (todoId) {
      await linkTodo(todoId, event.eventId);
    }
  };

  // series スコープは繰り返しの親 ID に紐付ける
  const annotationKey =
    scope === "series" && event.recurringEventId ? event.recurringEventId : event.eventId;

  const handleSave = async () => {
    const result = await save(annotationKey, {
      scope,
      memo: memo || undefined,
      priority,
      importance,
      tagIds: event.annotation?.tagIds ?? [],
    });
    if (result) {
      setSavedMessage(true);
    }
  };

  const handleDelete = async () => {
    const targetKey = event.annotation?.eventKey ?? annotationKey;
    const targetScope = event.annotation?.scope ?? scope;
    if (await remove(targetKey, targetScope)) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="pr-6">{event.summary || CALENDAR_TEXT.eventDetailTitle}</DialogTitle>
          <DialogDescription>
            {formatDateHeading(new Date(event.startAt))}{" "}
            {formatTimeRange(event.startAt, event.endAt, event.isAllDay)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          {(event.location || event.hangoutLink) && (
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              {event.hangoutLink && (
                <a
                  href={event.hangoutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Video className="w-4 h-4" />
                  {CALENDAR_TEXT.openMeetingLink}
                </a>
              )}
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          )}

          {event.description && (
            <div className="prose prose-sm dark:prose-invert max-h-48 overflow-y-auto overflow-x-hidden rounded-lg bg-gray-50 dark:bg-gray-900/50 p-2 text-sm break-words [&_*]:break-words [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-0 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-0 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:mt-0 [&_h3]:mb-1 [&_p]:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.description}</ReactMarkdown>
            </div>
          )}

          {/* 注釈エリア */}
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="event-memo"
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {CALENDAR_TEXT.memoLabel}
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {showPreview ? "編集" : "プレビュー"}
              </button>
            </div>
            {showPreview ? (
              <div className="prose prose-sm dark:prose-invert min-h-[6rem] rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{memo}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                id="event-memo"
                value={memo}
                onChange={(e) => {
                  setMemo(e.target.value);
                  setSavedMessage(false);
                }}
                placeholder={CALENDAR_TEXT.memoPlaceholder}
                rows={5}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="event-priority"
                  className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300"
                >
                  {CALENDAR_TEXT.priorityLabel}
                </label>
                <select
                  id="event-priority"
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as PriorityLevel);
                    setSavedMessage(false);
                  }}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1.5 text-sm text-gray-800 dark:text-gray-100"
                >
                  {LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {CALENDAR_TEXT.priorityNames[level]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="event-importance"
                  className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300"
                >
                  {CALENDAR_TEXT.importanceLabel}
                </label>
                <select
                  id="event-importance"
                  value={importance}
                  onChange={(e) => {
                    setImportance(e.target.value as ImportanceLevel);
                    setSavedMessage(false);
                  }}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1.5 text-sm text-gray-800 dark:text-gray-100"
                >
                  {LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {CALENDAR_TEXT.priorityNames[level]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isRecurring && (
              <div>
                <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  {CALENDAR_TEXT.scopeLabel}
                </span>
                <div className="flex gap-2">
                  {(["instance", "series"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setScope(s);
                        setSavedMessage(false);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        scope === s
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {s === "instance" ? CALENDAR_TEXT.scopeInstance : CALENDAR_TEXT.scopeSeries}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(error || linkError) && (
              <p className="text-xs text-red-600 dark:text-red-400">{error || linkError}</p>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? CALENDAR_TEXT.savingAnnotation : CALENDAR_TEXT.saveAnnotation}
                </button>
                {savedMessage && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {CALENDAR_TEXT.annotationSaved}
                  </span>
                )}
              </div>
              {hasAnnotation && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {CALENDAR_TEXT.deleteAnnotation}
                </button>
              )}
            </div>
          </div>

          {/* TODOリンクセクション */}
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                <Link2 className="w-4 h-4" />
                リンク済みTODO
              </span>
              <div className="flex items-center gap-2">
                {onAddTodo && (
                  <button
                    type="button"
                    onClick={handleCreateTodoFromEvent}
                    disabled={linking || !event.summary}
                    className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    TODOに追加
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowTodoSelector(!showTodoSelector)}
                  disabled={linking || availableTodos.length === 0}
                  className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  既存をリンク
                </button>
              </div>
            </div>

            {linkedTodos.length > 0 ? (
              <div className="space-y-1.5">
                {linkedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5"
                  >
                    <span className={`text-sm truncate ${todo.isCompleted ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-200"}`}>
                      <CheckSquare className="w-3.5 h-3.5 inline mr-1.5 text-indigo-500" />
                      {todo.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnlinkTodo(todo.id)}
                      disabled={linking}
                      className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                      title="リンク解除"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                リンクされたTODOはありません
              </p>
            )}

            {showTodoSelector && availableTodos.length > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 max-h-32 overflow-y-auto">
                {availableTodos.map((todo) => (
                  <button
                    key={todo.id}
                    type="button"
                    onClick={() => handleLinkTodo(todo.id)}
                    disabled={linking}
                    className="w-full text-left px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 truncate"
                  >
                    {todo.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
