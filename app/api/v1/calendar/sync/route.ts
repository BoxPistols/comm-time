import { NextRequest } from "next/server";
import { authenticateRequest, handleCors, apiResponse, apiError } from "@/lib/api-auth";
import { getGoogleOAuthConfig } from "@/lib/google-calendar";
import {
  getServiceRoleClient,
  getAccessToken,
  loadConnection,
  syncCalendars,
} from "@/lib/calendar-server";
import type { CalendarSyncResult } from "@/types/calendar";

// 初回フルシンク（425日分）は 10 秒では終わらないため延長
export const maxDuration = 60;

export async function OPTIONS() {
  return handleCors();
}

// 同期の最短間隔（API クォータ対策。force 指定時のみ無視）
const MIN_SYNC_INTERVAL_MS = 60 * 1000;

/**
 * POST /api/v1/calendar/sync
 *
 * 選択中カレンダーの増分同期を実行する。
 * Query: force=true で最短間隔チェックをスキップ（手動更新ボタン用）
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  const db = getServiceRoleClient();
  const config = getGoogleOAuthConfig();
  if (!db || !config) {
    return apiError("Google Calendar integration is not configured on the server.", 503);
  }

  const connection = await loadConnection(db, auth.userId);
  if (!connection) {
    return apiError("Google Calendar is not connected.", 404);
  }

  const force = new URL(request.url).searchParams.get("force") === "true";
  if (!force && connection.last_synced_at) {
    const elapsed = Date.now() - new Date(connection.last_synced_at).getTime();
    if (elapsed < MIN_SYNC_INTERVAL_MS) {
      const skipped: CalendarSyncResult = {
        synced: false,
        eventCount: 0,
        fullSync: false,
        lastSyncedAt: connection.last_synced_at,
      };
      return apiResponse(skipped);
    }
  }

  try {
    const accessToken = await getAccessToken(config, connection);
    const summary = await syncCalendars(db, connection, accessToken);
    const result: CalendarSyncResult = {
      synced: true,
      eventCount: summary.eventCount,
      fullSync: summary.fullSync,
      lastSyncedAt: new Date().toISOString(),
    };
    return apiResponse(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    // リフレッシュトークン失効は再連携が必要なため 401 で区別する
    const status = message.includes("Token refresh failed") ? 401 : 502;
    return apiError(message, status);
  }
}
