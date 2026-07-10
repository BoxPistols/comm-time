/**
 * Google カレンダー連携サーバーユーティリティのテスト
 * - トークン暗号化/復号のラウンドトリップ
 * - OAuth state の署名検証
 * - Google イベント → キャッシュ行変換
 */
import { randomBytes } from "crypto";
import {
  encryptToken,
  decryptToken,
  createOAuthState,
  verifyOAuthState,
  toCacheRow,
  buildAuthorizationUrl,
  type GoogleEvent,
  type GoogleOAuthConfig,
} from "@/lib/google-calendar";

const key = randomBytes(32);

describe("encryptToken / decryptToken", () => {
  it("暗号化したトークンを復号すると元の値に戻る", () => {
    const token = "1//refresh-token-example-0123456789";
    const encrypted = encryptToken(token, key);
    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted, key)).toBe(token);
  });

  it("暗号化のたびに異なる暗号文になる（IV がランダム）", () => {
    const token = "same-token";
    expect(encryptToken(token, key)).not.toBe(encryptToken(token, key));
  });

  it("別の鍵では復号できない", () => {
    const encrypted = encryptToken("secret", key);
    expect(() => decryptToken(encrypted, randomBytes(32))).toThrow();
  });

  it("形式が不正な場合はエラーになる", () => {
    expect(() => decryptToken("broken", key)).toThrow("Invalid encrypted token format");
  });
});

describe("createOAuthState / verifyOAuthState", () => {
  it("正しい state から userId を復元できる", () => {
    const state = createOAuthState("user-123", key);
    expect(verifyOAuthState(state, key)).toBe("user-123");
  });

  it("改ざんされた state は拒否する", () => {
    const state = createOAuthState("user-123", key);
    const tampered = Buffer.from(
      Buffer.from(state, "base64url").toString("utf8").replace("user-123", "attacker"),
      "utf8"
    ).toString("base64url");
    expect(verifyOAuthState(tampered, key)).toBeNull();
  });

  it("別の鍵で署名された state は拒否する", () => {
    const state = createOAuthState("user-123", randomBytes(32));
    expect(verifyOAuthState(state, key)).toBeNull();
  });

  it("不正な文字列は null を返す", () => {
    expect(verifyOAuthState("garbage", key)).toBeNull();
  });
});

describe("toCacheRow", () => {
  const baseEvent: GoogleEvent = {
    id: "evt-1",
    status: "confirmed",
    summary: "定例ミーティング",
    start: { dateTime: "2026-07-10T10:00:00+09:00" },
    end: { dateTime: "2026-07-10T11:00:00+09:00" },
  };

  it("時間指定イベントを変換できる", () => {
    const row = toCacheRow("primary", baseEvent);
    expect(row).not.toBeNull();
    expect(row?.event_id).toBe("evt-1");
    expect(row?.is_all_day).toBe(false);
    expect(row?.start_at).toBe(new Date("2026-07-10T10:00:00+09:00").toISOString());
  });

  it("終日イベントは is_all_day が true になる", () => {
    const row = toCacheRow("primary", {
      ...baseEvent,
      start: { date: "2026-07-10" },
      end: { date: "2026-07-11" },
    });
    expect(row?.is_all_day).toBe(true);
  });

  it("繰り返しの親 ID を保持する", () => {
    const row = toCacheRow("primary", { ...baseEvent, recurringEventId: "series-1" });
    expect(row?.recurring_event_id).toBe("series-1");
  });

  it("時刻情報がない未キャンセルイベントは null を返す", () => {
    expect(toCacheRow("primary", { id: "evt-2", status: "confirmed" })).toBeNull();
  });
});

describe("buildAuthorizationUrl", () => {
  it("offline アクセスと readonly スコープを要求する", () => {
    const config: GoogleOAuthConfig = {
      clientId: "client-id",
      clientSecret: "secret",
      redirectUri: "http://localhost:5656/api/v1/calendar/callback",
      encryptionKey: key,
    };
    const url = new URL(buildAuthorizationUrl(config, "state-value"));
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toContain("calendar.readonly");
    expect(url.searchParams.get("state")).toBe("state-value");
  });
});
