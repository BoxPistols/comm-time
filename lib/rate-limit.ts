/**
 * レート制限ユーティリティ
 * サーバーキー利用時のリクエスト制限を管理
 */

// レート制限の設定
export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS: 50,           // 1日あたりの上限回数
  WINDOW_MS: 24 * 60 * 60 * 1000, // 24時間（ミリ秒）
};

// インメモリストア（開発/小規模向け）
// 本番環境ではVercel KVやRedisに置き換え推奨
interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 定期的に期限切れエントリを掃除（5分ごと）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.expiresAt < now) store.delete(key);
    });
  }, 5 * 60 * 1000);
}


/**
 * 次の日本時間0時を取得
 */
function getNextMidnightJST(): Date {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  jst.setHours(24, 0, 0, 0);
  return jst;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  error?: string;
}

/**
 * レート制限をチェック・カウント
 * @param userId - Supabase認証済みユーザーID
 * @param endpoint - エンドポイント名
 */
export function checkRateLimit(userId: string, endpoint: string): RateLimitResult {
  const key = `rate:${userId}:${endpoint}`;
  const now = Date.now();
  const resetTime = getNextMidnightJST();
  const ttlMs = resetTime.getTime() - now;

  const entry = store.get(key);

  // 期限切れまたは未設定
  if (!entry || entry.expiresAt < now) {
    store.set(key, { count: 1, expiresAt: now + ttlMs });
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS - 1,
      resetTime,
    };
  }

  // カウント増加
  entry.count++;

  if (entry.count > RATE_LIMIT_CONFIG.MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      error: `1日のリクエスト上限（${RATE_LIMIT_CONFIG.MAX_REQUESTS}回）に達しました。自分のOpenAI APIキーを設定すると無制限で利用できます。`,
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS - entry.count,
    resetTime,
  };
}

/**
 * レート制限ヘッダーを生成
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.MAX_REQUESTS),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetTime.getTime() / 1000)),
  };
}
