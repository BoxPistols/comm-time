import { NextRequest, NextResponse } from "next/server";
import {
  encryptToken,
  exchangeCodeForTokens,
  fetchCalendarList,
  fetchUserEmail,
  getGoogleOAuthConfig,
  verifyOAuthState,
} from "@/lib/google-calendar";
import { getServiceRoleClient } from "@/lib/calendar-server";

// アプリトップへ結果を伝えるクエリパラメータ
const RESULT_PARAM = "calendar_auth";

function redirectToApp(request: NextRequest, result: "connected" | "error"): NextResponse {
  const url = new URL("/", request.url);
  url.searchParams.set(RESULT_PARAM, result);
  return NextResponse.redirect(url);
}

/**
 * GET /api/v1/calendar/callback
 *
 * Google OAuth のコールバック。state（HMAC 署名付き）でユーザーを特定し、
 * リフレッシュトークンを暗号化して calendar_connections に保存する。
 */
export async function GET(request: NextRequest) {
  const config = getGoogleOAuthConfig();
  const db = getServiceRoleClient();
  if (!config || !db) {
    return redirectToApp(request, "error");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return redirectToApp(request, "error");
  }

  const userId = verifyOAuthState(state, config.encryptionKey);
  if (!userId) {
    return redirectToApp(request, "error");
  }

  try {
    const tokens = await exchangeCodeForTokens(config, code);
    if (!tokens.refresh_token) {
      // prompt=consent を指定しているため通常発生しないが、念のためエラー扱い
      return redirectToApp(request, "error");
    }

    const [email, calendars] = await Promise.all([
      fetchUserEmail(tokens.access_token),
      fetchCalendarList(tokens.access_token),
    ]);

    // 初期表示はプライマリカレンダーのみ（docs/CALENDAR_INTEGRATION_PLAN.md 未決事項 #2 の推奨案）
    const primaryIds = calendars.filter((c) => c.primary).map((c) => c.id);

    const now = new Date().toISOString();
    const { error } = await db.from("calendar_connections").upsert(
      {
        user_id: userId,
        google_email: email,
        refresh_token_encrypted: encryptToken(tokens.refresh_token, config.encryptionKey),
        scopes: tokens.scope.split(" "),
        selected_calendar_ids: primaryIds,
        sync_token: null, // 再連携時はフル同期からやり直す
        updated_at: now,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      return redirectToApp(request, "error");
    }

    return redirectToApp(request, "connected");
  } catch {
    return redirectToApp(request, "error");
  }
}
