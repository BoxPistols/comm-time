// カレンダー連携のサーバー専用 DB 操作・同期ロジック
// calendar_connections / calendar_event_cache への書き込みは RLS 上サーバーのみ許可のため、
// service role クライアントを使用する。クライアントコードから import しないこと
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  GoogleOAuthConfig,
  GoogleEvent,
  SyncTokenExpiredError,
  decryptToken,
  fetchEventsPage,
  refreshAccessToken,
  toCacheRow,
} from "./google-calendar";

// 同期対象の期間（フル同期時）: 過去60日〜未来365日
const SYNC_PAST_DAYS = 60;
const SYNC_FUTURE_DAYS = 365;

export type CalendarConnectionRow = {
  id: string;
  user_id: string;
  google_email: string;
  refresh_token_encrypted: string;
  scopes: string[];
  selected_calendar_ids: string[];
  sync_token: string | null; // JSON 文字列: { [calendarId]: syncToken }
  last_synced_at: string | null;
};

export function getServiceRoleClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function loadConnection(
  db: SupabaseClient,
  userId: string
): Promise<CalendarConnectionRow | null> {
  const { data, error } = await db
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
  return data as CalendarConnectionRow;
}

// リフレッシュトークンから新しいアクセストークンを取得する
export async function getAccessToken(
  config: GoogleOAuthConfig,
  connection: CalendarConnectionRow
): Promise<string> {
  const refreshToken = decryptToken(connection.refresh_token_encrypted, config.encryptionKey);
  const tokens = await refreshAccessToken(config, refreshToken);
  return tokens.access_token;
}

function parseSyncTokens(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

// 本人が辞退済みの予定は表示対象外（docs/CALENDAR_INTEGRATION_PLAN.md 未決事項 #3 の推奨案）
function isDeclinedBySelf(event: GoogleEvent): boolean {
  return event.attendees?.some((a) => a.self && a.responseStatus === "declined") ?? false;
}

export type SyncSummary = {
  eventCount: number;
  fullSync: boolean;
};

// 選択中の全カレンダーを増分同期する。syncToken 失効時はフル同期にフォールバック
export async function syncCalendars(
  db: SupabaseClient,
  connection: CalendarConnectionRow,
  accessToken: string
): Promise<SyncSummary> {
  const syncTokens = parseSyncTokens(connection.sync_token);
  const now = Date.now();
  const timeMin = new Date(now - SYNC_PAST_DAYS * 86400_000).toISOString();
  const timeMax = new Date(now + SYNC_FUTURE_DAYS * 86400_000).toISOString();

  let totalEvents = 0;
  let didFullSync = false;

  // 選択解除されたカレンダーのキャッシュは削除する
  if (connection.selected_calendar_ids.length > 0) {
    await db
      .from("calendar_event_cache")
      .delete()
      .eq("user_id", connection.user_id)
      .not(
        "calendar_id",
        "in",
        `(${connection.selected_calendar_ids.map((id) => `"${id}"`).join(",")})`
      );
  } else {
    await db.from("calendar_event_cache").delete().eq("user_id", connection.user_id);
  }

  for (const calendarId of connection.selected_calendar_ids) {
    let syncToken: string | undefined = syncTokens[calendarId];
    let isFullSync = !syncToken;

    const runOnePass = async (useSyncToken: string | undefined): Promise<string | undefined> => {
      let pageToken: string | undefined;
      let nextSyncToken: string | undefined;
      do {
        const page = await fetchEventsPage(accessToken, calendarId, {
          syncToken: useSyncToken,
          pageToken,
          timeMin: useSyncToken ? undefined : timeMin,
          timeMax: useSyncToken ? undefined : timeMax,
        });

        const upserts = [];
        const deleteIds: string[] = [];
        for (const event of page.items) {
          if (event.status === "cancelled" || isDeclinedBySelf(event)) {
            deleteIds.push(event.id);
            continue;
          }
          const row = toCacheRow(calendarId, event);
          if (row) {
            upserts.push({ ...row, user_id: connection.user_id, updated_at: new Date().toISOString() });
          }
        }

        if (upserts.length > 0) {
          const { error } = await db
            .from("calendar_event_cache")
            .upsert(upserts, { onConflict: "user_id,calendar_id,event_id" });
          if (error) {
            throw new Error(`Cache upsert failed: ${error.message}`);
          }
          totalEvents += upserts.length;
        }
        if (deleteIds.length > 0) {
          await db
            .from("calendar_event_cache")
            .delete()
            .eq("user_id", connection.user_id)
            .eq("calendar_id", calendarId)
            .in("event_id", deleteIds);
        }

        pageToken = page.nextPageToken;
        nextSyncToken = page.nextSyncToken ?? nextSyncToken;
      } while (pageToken);
      return nextSyncToken;
    };

    try {
      const nextToken = await runOnePass(syncToken);
      if (nextToken) syncTokens[calendarId] = nextToken;
    } catch (e) {
      if (e instanceof SyncTokenExpiredError) {
        // フル同期へフォールバック: 既存キャッシュを消してから取り直す
        isFullSync = true;
        syncToken = undefined;
        await db
          .from("calendar_event_cache")
          .delete()
          .eq("user_id", connection.user_id)
          .eq("calendar_id", calendarId);
        const nextToken = await runOnePass(undefined);
        if (nextToken) syncTokens[calendarId] = nextToken;
      } else {
        throw e;
      }
    }
    didFullSync = didFullSync || isFullSync;
  }

  const lastSyncedAt = new Date().toISOString();
  await db
    .from("calendar_connections")
    .update({
      sync_token: JSON.stringify(syncTokens),
      last_synced_at: lastSyncedAt,
      updated_at: lastSyncedAt,
    })
    .eq("user_id", connection.user_id);

  return { eventCount: totalEvents, fullSync: didFullSync };
}
