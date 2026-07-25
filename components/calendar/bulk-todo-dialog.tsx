"use client";

import { useState, useMemo, useEffect } from "react";
import { CheckSquare, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CALENDAR_TEXT } from "@/lib/constants";
import { eventDisplayDate, formatDateHeading, formatTimeRange } from "@/lib/calendar-date";
import { useTodoEventLinks } from "@/hooks/useTodoEventLinks";
import type { CalendarEvent } from "@/types/calendar";

type BulkTodoDialogProps = {
  open: boolean;
  events: CalendarEvent[];
  periodLabel: string;
  onAddTodo: (text: string, options?: { dueDate?: string; dueTime?: string }) => Promise<string | null>;
  onClose: () => void;
  onCompleted: () => void;
};

// 表示中の期間の予定を選択してまとめて TODO 化するダイアログ
export function BulkTodoDialog({
  open,
  events,
  periodLabel,
  onAddTodo,
  onClose,
  onCompleted,
}: BulkTodoDialogProps) {
  const { linkTodo } = useTodoEventLinks();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  // まだ TODO が紐付いていない予定のみ対象にする
  const candidates = useMemo(() => {
    return events
      .filter((e) => e.summary && e.linkedTodoIds.length === 0)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events]);

  const linkedCount = useMemo(
    () => events.filter((e) => e.linkedTodoIds.length > 0).length,
    [events]
  );

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setResult(null);
    }
  }, [open]);

  const toggle = (eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const allSelected = candidates.length > 0 && selectedIds.size === candidates.length;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(candidates.map((e) => e.eventId)));
  };

  const handleSubmit = async () => {
    const targets = candidates.filter((e) => selectedIds.has(e.eventId));
    if (targets.length === 0) return;

    setSubmitting(true);
    let created = 0;
    let failed = 0;

    for (const event of targets) {
      const start = eventDisplayDate(event.startAt, event.isAllDay);
      const dueDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      const dueTime = event.isAllDay ? undefined : start.toTimeString().slice(0, 5);
      const todoId = await onAddTodo(event.summary, { dueDate, dueTime });
      if (todoId) {
        await linkTodo(todoId, event.eventId);
        created += 1;
      } else {
        failed += 1;
      }
    }

    setSubmitting(false);
    setResult({ created, failed });
    setSelectedIds(new Set());
    onCompleted();
  };

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="pr-6">{CALENDAR_TEXT.bulkTodoTitle}</DialogTitle>
          <DialogDescription>
            {periodLabel} / {CALENDAR_TEXT.bulkTodoDescription}
          </DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {CALENDAR_TEXT.bulkTodoEmpty}
            {linkedCount > 0 && (
              <span className="mt-1 block text-xs">
                ({linkedCount}件は{CALENDAR_TEXT.bulkTodoAlreadyLinked})
              </span>
            )}
          </p>
        ) : (
          <>
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {allSelected ? CALENDAR_TEXT.bulkTodoDeselectAll : CALENDAR_TEXT.bulkTodoSelectAll}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedIds.size}
                {CALENDAR_TEXT.bulkTodoSelectedCount}
              </span>
            </div>

            <div className="flex-1 min-h-0 space-y-1 overflow-y-auto py-2">
              {candidates.map((event) => {
                const checked = selectedIds.has(event.eventId);
                return (
                  <button
                    key={`${event.calendarId}:${event.eventId}`}
                    type="button"
                    onClick={() => toggle(event.eventId)}
                    disabled={submitting}
                    className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors disabled:opacity-50 ${
                      checked
                        ? "bg-indigo-50 dark:bg-indigo-950/40"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-gray-800 dark:text-gray-100">
                        {event.summary}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {formatDateHeading(eventDisplayDate(event.startAt, event.isAllDay))}{" "}
                        {formatTimeRange(event.startAt, event.endAt, event.isAllDay)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {result && (
          <p className="flex-shrink-0 text-xs text-green-600 dark:text-green-400">
            {result.created}
            {CALENDAR_TEXT.bulkTodoResultSuccess}
            {result.failed > 0 && (
              <span className="ml-1 text-red-600 dark:text-red-400">
                / {result.failed}
                {CALENDAR_TEXT.bulkTodoResultPartial}
              </span>
            )}
          </p>
        )}

        {candidates.length > 0 && (
          <div className="flex flex-shrink-0 justify-end border-t border-gray-200 dark:border-gray-700 pt-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedIds.size === 0}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? CALENDAR_TEXT.bulkTodoSubmitting : CALENDAR_TEXT.bulkTodoSubmit}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
