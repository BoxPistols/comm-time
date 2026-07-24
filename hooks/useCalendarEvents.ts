"use client";

// カレンダーイベントの取得と同期トリガーを担う hook
// キャッシュファースト: まずキャッシュから表示し、同期完了後に再取得する
import { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarApiError,
  fetchCalendarEvents,
  syncCalendar,
} from "@/lib/calendar-api";
import { CALENDAR_TEXT } from "@/lib/constants";
import type { CalendarEvent } from "@/types/calendar";

type UseCalendarEventsOptions = {
  enabled: boolean; // 連携済みかどうか
  from: string; // ISO
  to: string; // ISO
};

export function useCalendarEvents({ enabled, from, to }: UseCalendarEventsOptions) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const initialSyncDone = useRef(false);

  const loadFromCache = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await fetchCalendarEvents(from, to);
      setEvents(result);
      setError(null);
    } catch {
      setError(CALENDAR_TEXT.errorLoadFailed);
    }
  }, [enabled, from, to]);

  const sync = useCallback(
    async (force: boolean) => {
      if (!enabled) return;
      setSyncing(true);
      try {
        const result = await syncCalendar(force);
        setLastSyncedAt(result.lastSyncedAt);
        setNeedsReauth(false);
        if (result.synced) {
          await loadFromCache();
        }
      } catch (e) {
        if (e instanceof CalendarApiError && e.status === 401) {
          setNeedsReauth(true);
        } else {
          setError(CALENDAR_TEXT.errorSyncFailed);
        }
      } finally {
        setSyncing(false);
      }
    },
    [enabled, loadFromCache]
  );

  // 初回: キャッシュ表示 → バックグラウンドで同期
  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await loadFromCache();
      if (cancelled) return;
      setLoading(false);
      if (!initialSyncDone.current) {
        initialSyncDone.current = true;
        await sync(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, loadFromCache, sync]);

  return {
    events,
    loading,
    syncing,
    error,
    needsReauth,
    lastSyncedAt,
    refresh: loadFromCache,
    syncNow: () => sync(true),
  };
}
