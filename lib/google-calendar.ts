// Google カレンダー連携のサーバー専用ユーティリティ
// - リフレッシュトークンの AES-256-GCM 暗号化 / 復号
// - OAuth 2.0 フロー（認可 URL・トークン交換・リフレッシュ・失効）
// - Calendar API v3 呼び出し（カレンダー一覧・イベント増分同期）
// クライアントコードから import しないこと（トークンと秘密鍵を扱うため）
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export const CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const USERINFO_EMAIL_SCOPE = "https://www.googleapis.com/auth/userinfo.email";

// state トークンの有効期限（OAuth リダイレクト往復の想定時間）
const STATE_TTL_MS = 10 * 60 * 1000;

// =============================
// 環境変数
// =============================

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionKey: Buffer;
};

// 必須環境変数が揃っている場合のみ設定を返す（未設定なら null → API は 503 を返す）
export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const keyBase64 = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !redirectUri || !keyBase64) {
    return null;
  }
  const encryptionKey = Buffer.from(keyBase64, "base64");
  if (encryptionKey.length !== 32) {
    return null;
  }
  return { clientId, clientSecret, redirectUri, encryptionKey };
}

// =============================
// トークン暗号化（AES-256-GCM）
// =============================

// 保存形式: base64(iv):base64(authTag):base64(ciphertext)
export function encryptToken(plainText: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(stored: string, key: Buffer): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted token format");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// =============================
// OAuth state（HMAC 署名付き・ステートレス CSRF 対策）
// =============================

// 形式: base64url(userId|expiresAt|nonce|hmac)
export function createOAuthState(userId: string, key: Buffer): string {
  const expiresAt = Date.now() + STATE_TTL_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${userId}|${expiresAt}|${nonce}`;
  const signature = createHmac("sha256", key).update(payload).digest("hex");
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

// 検証成功時は userId を返す。失敗・期限切れは null
export function verifyOAuthState(state: string, key: Buffer): string | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 4) return null;
    const [userId, expiresAtStr, nonce, signature] = parts;
    const payload = `${userId}|${expiresAtStr}|${nonce}`;
    const expected = createHmac("sha256", key).update(payload).digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    if (Date.now() > Number(expiresAtStr)) return null;
    return userId;
  } catch {
    return null;
  }
}

// =============================
// OAuth フロー
// =============================

export function buildAuthorizationUrl(config: GoogleOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: `${CALENDAR_READONLY_SCOPE} ${USERINFO_EMAIL_SCOPE}`,
    access_type: "offline",
    prompt: "consent", // リフレッシュトークンを確実に取得する
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
};

export async function exchangeCodeForTokens(
  config: GoogleOAuthConfig,
  code: string
): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(
  config: GoogleOAuthConfig,
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function revokeToken(refreshToken: string): Promise<void> {
  // 失効失敗は握りつぶす（連携レコード削除自体は続行するため）
  await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(refreshToken)}`, {
    method: "POST",
  }).catch(() => undefined);
}

export async function fetchUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Userinfo fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { email?: string };
  return data.email ?? "";
}

// =============================
// Calendar API v3
// =============================

export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
};

export async function fetchCalendarList(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const res = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList?maxResults=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`CalendarList fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { items?: GoogleCalendarListEntry[] };
  return data.items ?? [];
}

export type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  colorId?: string;
  recurringEventId?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: { email?: string; self?: boolean; responseStatus?: string }[];
};

export type EventsPage = {
  items: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export class SyncTokenExpiredError extends Error {}

// events.list の1ページ取得。syncToken 失効（410）は専用エラーで通知しフル同期へフォールバックさせる
export async function fetchEventsPage(
  accessToken: string,
  calendarId: string,
  options: {
    syncToken?: string;
    pageToken?: string;
    timeMin?: string;
    timeMax?: string;
  }
): Promise<EventsPage> {
  const params = new URLSearchParams({
    maxResults: "250",
    singleEvents: "true", // 繰り返し予定を各回に展開して取得する
  });
  if (options.syncToken) {
    params.set("syncToken", options.syncToken);
  } else {
    if (options.timeMin) params.set("timeMin", options.timeMin);
    if (options.timeMax) params.set("timeMax", options.timeMax);
  }
  if (options.pageToken) params.set("pageToken", options.pageToken);

  const res = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 410) {
    throw new SyncTokenExpiredError("Sync token expired");
  }
  if (!res.ok) {
    throw new Error(`Events fetch failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as EventsPage;
}

// =============================
// イベント変換
// =============================

export type CachedEventRow = {
  calendar_id: string;
  event_id: string;
  recurring_event_id: string | null;
  summary: string | null;
  description: string | null;
  location: string | null;
  hangout_link: string | null;
  start_at: string | null;
  end_at: string | null;
  is_all_day: boolean;
  status: string;
  attendees_count: number | null;
  color_id: string | null;
  raw: GoogleEvent;
};

// Google API のイベントをキャッシュ行へ変換。時刻情報がない場合は null を返す（キャンセル通知等）
export function toCacheRow(calendarId: string, event: GoogleEvent): CachedEventRow | null {
  const startRaw = event.start?.dateTime ?? event.start?.date;
  const endRaw = event.end?.dateTime ?? event.end?.date;
  if (event.status !== "cancelled" && (!startRaw || !endRaw)) {
    return null;
  }
  const isAllDay = Boolean(event.start?.date);
  return {
    calendar_id: calendarId,
    event_id: event.id,
    recurring_event_id: event.recurringEventId ?? null,
    summary: event.summary ?? null,
    description: event.description ?? null,
    location: event.location ?? null,
    hangout_link: event.hangoutLink ?? null,
    // 終日予定の date (YYYY-MM-DD) は UTC 0時として保存し、表示側で eventDisplayDate により補正する
    start_at: startRaw ? new Date(startRaw).toISOString() : null,
    end_at: endRaw ? new Date(endRaw).toISOString() : null,
    is_all_day: isAllDay,
    status: event.status ?? "confirmed",
    attendees_count: event.attendees?.length ?? null,
    color_id: event.colorId ?? null,
    raw: event,
  };
}
