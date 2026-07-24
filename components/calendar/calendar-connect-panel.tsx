"use client";

import { CalendarDays, RefreshCw, Unlink } from "lucide-react";
import { CALENDAR_TEXT } from "@/lib/constants";
import type { CalendarConnection } from "@/types/calendar";

type CalendarConnectPanelProps = {
  isAuthenticated: boolean;
  connection: CalendarConnection | null;
  notConfigured: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectionChange: (calendarIds: string[]) => void;
};

// 連携の開始 / カレンダー選択 / 解除を行う設定パネル
export function CalendarConnectPanel({
  isAuthenticated,
  connection,
  notConfigured,
  error,
  onConnect,
  onDisconnect,
  onSelectionChange,
}: CalendarConnectPanelProps) {
  // 未連携: 連携開始パネル
  if (!connection?.connected) {
    return (
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-6 text-center shadow-md">
        <CalendarDays className="mx-auto mb-3 h-10 w-10 text-indigo-500" />
        <h3 className="mb-2 text-base font-semibold text-gray-800 dark:text-gray-100">
          {CALENDAR_TEXT.connectTitle}
        </h3>
        <p className="mx-auto mb-4 max-w-md text-sm text-gray-600 dark:text-gray-300">
          {CALENDAR_TEXT.connectDescription}
        </p>
        {notConfigured ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {CALENDAR_TEXT.connectNotConfigured}
          </p>
        ) : isAuthenticated ? (
          <button
            type="button"
            onClick={onConnect}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
          >
            {CALENDAR_TEXT.connectButton}
          </button>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {CALENDAR_TEXT.connectRequiresLogin}
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  // 連携済み: カレンダー選択 + 解除
  const toggleCalendar = (id: string) => {
    const next = connection.selectedCalendarIds.includes(id)
      ? connection.selectedCalendarIds.filter((c) => c !== id)
      : [...connection.selectedCalendarIds, id];
    onSelectionChange(next);
  };

  const handleDisconnect = () => {
    if (window.confirm(CALENDAR_TEXT.disconnectConfirm)) {
      onDisconnect();
    }
  };

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-200">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {CALENDAR_TEXT.connectedAs}
          </span>{" "}
          <span className="font-medium">{connection.googleEmail}</span>
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
        >
          <Unlink className="w-3.5 h-3.5" />
          {CALENDAR_TEXT.disconnectButton}
        </button>
      </div>

      {connection.availableCalendars.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
            {CALENDAR_TEXT.calendarSelectLabel}
          </div>
          <div className="flex flex-wrap gap-2">
            {connection.availableCalendars.map((cal) => {
              const selected = connection.selectedCalendarIds.includes(cal.id);
              return (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => toggleCalendar(cal.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {cal.backgroundColor && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: cal.backgroundColor }}
                    />
                  )}
                  {cal.summary}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function SyncStatusBar({
  lastSyncedAt,
  syncing,
  onSyncNow,
}: {
  lastSyncedAt: string | null;
  syncing: boolean;
  onSyncNow: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span>
        {CALENDAR_TEXT.lastSyncedPrefix}{" "}
        {lastSyncedAt
          ? new Date(lastSyncedAt).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : CALENDAR_TEXT.neverSynced}
      </span>
      <button
        type="button"
        onClick={onSyncNow}
        disabled={syncing}
        className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
      >
        <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? CALENDAR_TEXT.syncInProgress : CALENDAR_TEXT.syncButton}
      </button>
    </div>
  );
}
