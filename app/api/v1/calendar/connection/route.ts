import { NextRequest } from "next/server";
import { authenticateRequest, handleCors, apiResponse, apiError } from "@/lib/api-auth";
import {
  decryptToken,
  fetchCalendarList,
  getGoogleOAuthConfig,
  revokeToken,
} from "@/lib/google-calendar";
import { getServiceRoleClient, getAccessToken, loadConnection } from "@/lib/calendar-server";
import type { CalendarConnection } from "@/types/calendar";

export async function OPTIONS() {
  return handleCors();
}

const NOT_CONFIGURED_ERROR =
  "Google Calendar integration is not configured on the server.";

/**
 * GET /api/v1/calendar/connection
 *
 * 連携状態と選択可能なカレンダー一覧を返す。
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  const db = getServiceRoleClient();
  if (!db) {
    return apiError(NOT_CONFIGURED_ERROR, 503);
  }

  const connection = await loadConnection(db, auth.userId);
  if (!connection) {
    const empty: CalendarConnection = {
      connected: false,
      selectedCalendarIds: [],
      availableCalendars: [],
    };
    return apiResponse(empty);
  }

  // カレンダー一覧は Google からライブ取得（失敗時は選択済み ID のみ返す）
  const config = getGoogleOAuthConfig();
  let availableCalendars: CalendarConnection["availableCalendars"] = [];
  if (config) {
    try {
      const accessToken = await getAccessToken(config, connection);
      const calendars = await fetchCalendarList(accessToken);
      availableCalendars = calendars.map((c) => ({
        id: c.id,
        summary: c.summary,
        backgroundColor: c.backgroundColor,
        primary: c.primary,
      }));
    } catch {
      availableCalendars = connection.selected_calendar_ids.map((id) => ({
        id,
        summary: id,
      }));
    }
  }

  const result: CalendarConnection = {
    connected: true,
    googleEmail: connection.google_email,
    selectedCalendarIds: connection.selected_calendar_ids,
    availableCalendars,
    lastSyncedAt: connection.last_synced_at ?? undefined,
  };
  return apiResponse(result);
}

/**
 * PATCH /api/v1/calendar/connection
 *
 * Body: { selectedCalendarIds: string[] }
 * 表示対象カレンダーを更新する。次回同期はフル同期からやり直す。
 */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  const db = getServiceRoleClient();
  if (!db) {
    return apiError(NOT_CONFIGURED_ERROR, 503);
  }

  const body: unknown = await request.json().catch(() => null);
  const selectedCalendarIds =
    body && typeof body === "object" && "selectedCalendarIds" in body
      ? (body as { selectedCalendarIds: unknown }).selectedCalendarIds
      : null;
  if (
    !Array.isArray(selectedCalendarIds) ||
    !selectedCalendarIds.every((id): id is string => typeof id === "string")
  ) {
    return apiError("selectedCalendarIds must be an array of strings", 400);
  }

  const { error } = await db
    .from("calendar_connections")
    .update({
      selected_calendar_ids: selectedCalendarIds,
      sync_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.userId);
  if (error) {
    return apiError(error.message, 500);
  }

  return apiResponse({ selectedCalendarIds });
}

/**
 * DELETE /api/v1/calendar/connection
 *
 * 連携解除。Google 側のトークンを失効させ、連携情報とイベントキャッシュを削除する。
 * 注釈（event_annotations）はユーザー資産のため残す。
 */
export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  const db = getServiceRoleClient();
  if (!db) {
    return apiError(NOT_CONFIGURED_ERROR, 503);
  }

  const connection = await loadConnection(db, auth.userId);
  if (connection) {
    const config = getGoogleOAuthConfig();
    if (config) {
      try {
        const refreshToken = decryptToken(connection.refresh_token_encrypted, config.encryptionKey);
        await revokeToken(refreshToken);
      } catch {
        // 復号・失効に失敗してもレコード削除は続行する
      }
    }
    // 削除失敗を握り潰すと、Google 側のトークンは失効済みなのに
    // 暗号化リフレッシュトークンを持つ行が残り、UI は「解除済み」を表示して再試行もできなくなる
    const { error: cacheError } = await db
      .from("calendar_event_cache")
      .delete()
      .eq("user_id", auth.userId);
    if (cacheError) {
      return apiError(cacheError.message, 500);
    }

    const { error: connectionError } = await db
      .from("calendar_connections")
      .delete()
      .eq("user_id", auth.userId);
    if (connectionError) {
      return apiError(connectionError.message, 500);
    }
  }

  return apiResponse({ connected: false });
}
