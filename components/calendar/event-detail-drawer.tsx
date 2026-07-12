"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MapPin, Video, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CALENDAR_TEXT } from "@/lib/constants";
import { formatDateHeading, formatTimeRange } from "@/lib/calendar-date";
import { useEventAnnotations } from "@/hooks/useEventAnnotations";
import type { CalendarEvent, AnnotationScope } from "@/types/calendar";
import type { PriorityLevel, ImportanceLevel } from "@/types";

type EventDetailDrawerProps = {
  event: CalendarEvent | null;
  onClose: () => void;
  onAnnotationChanged: () => void;
};

const LEVEL_OPTIONS: PriorityLevel[] = ["high", "medium", "low", "none"];

// 予定詳細 + 注釈（メモ・優先度・重要度）の編集ダイアログ
export function EventDetailDrawer({ event, onClose, onAnnotationChanged }: EventDetailDrawerProps) {
  const { save, remove, saving, error } = useEventAnnotations(onAnnotationChanged);

  const [memo, setMemo] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("none");
  const [importance, setImportance] = useState<ImportanceLevel>("none");
  const [scope, setScope] = useState<AnnotationScope>("instance");
  const [showPreview, setShowPreview] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // 別の予定を開いたら編集状態を初期化する
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{event.summary || CALENDAR_TEXT.eventDetailTitle}</DialogTitle>
          <DialogDescription>
            {formatDateHeading(new Date(event.startAt))}{" "}
            {formatTimeRange(event.startAt, event.endAt, event.isAllDay)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <div className="prose prose-sm dark:prose-invert max-h-32 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-900/50 p-2 text-sm">
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

            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
