import { NextRequest } from "next/server";
import { authenticateRequest, handleCors, apiResponse, apiError } from "@/lib/api-auth";
import {
  buildAuthorizationUrl,
  createOAuthState,
  getGoogleOAuthConfig,
} from "@/lib/google-calendar";

export async function OPTIONS() {
  return handleCors();
}

/**
 * GET /api/v1/calendar/auth
 *
 * Google OAuth の認可 URL を返す。
 * リダイレクトはクライアント側で行う（Bearer 認証とリダイレクトを両立させるため）。
 *
 * Response: { url: string }
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return apiError(
      "Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI, and CALENDAR_TOKEN_ENCRYPTION_KEY.",
      503
    );
  }

  const state = createOAuthState(auth.userId, config.encryptionKey);
  return apiResponse({ url: buildAuthorizationUrl(config, state) });
}
