"use client";

// Google カレンダー連携状態の取得・接続・解除を担う hook
import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import {
  CalendarApiError,
  disconnectCalendar,
  fetchCalendarConnection,
  startCalendarAuth,
  updateSelectedCalendars,
} from "@/lib/calendar-api";
import { CALENDAR_TEXT } from "@/lib/constants";
import type { CalendarConnection } from "@/types/calendar";

export function useCalendarConnection(user: User | null) {
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setConnection(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCalendarConnection();
      setConnection(result);
      setNotConfigured(false);
    } catch (e) {
      if (e instanceof CalendarApiError && e.status === 503) {
        setNotConfigured(true);
      } else {
        setError(CALENDAR_TEXT.errorLoadFailed);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // OAuth 同意画面へ遷移する（コールバック後にアプリへ戻る）
  const connect = useCallback(async () => {
    setError(null);
    try {
      const url = await startCalendarAuth();
      window.location.href = url;
    } catch (e) {
      if (e instanceof CalendarApiError && e.status === 503) {
        setNotConfigured(true);
      } else {
        setError(CALENDAR_TEXT.errorConnectFailed);
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    await disconnectCalendar();
    await refresh();
  }, [refresh]);

  const setSelectedCalendars = useCallback(
    async (selectedCalendarIds: string[]) => {
      await updateSelectedCalendars(selectedCalendarIds);
      await refresh();
    },
    [refresh]
  );

  return {
    connection,
    loading,
    error,
    notConfigured,
    connect,
    disconnect,
    setSelectedCalendars,
    refresh,
  };
}
