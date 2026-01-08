import { NextRequest, NextResponse } from "next/server";

// プライベートIPアドレスかどうかを判定
function isPrivateIP(hostname: string): boolean {
  // ループバックアドレス
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }

  // IPv4プライベートレンジとリンクローカル
  const ipv4Patterns = [
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,           // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
    /^192\.168\.\d{1,3}\.\d{1,3}$/,              // 192.168.0.0/16
    /^169\.254\.\d{1,3}\.\d{1,3}$/,              // 169.254.0.0/16 (リンクローカル/メタデータサービス)
    /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,            // 0.0.0.0/8
  ];

  for (const pattern of ipv4Patterns) {
    if (pattern.test(hostname)) {
      return true;
    }
  }

  return false;
}

// URLが安全かどうかを検証（SSRF対策）
function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);

    // HTTPまたはHTTPSのみ許可
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    // プライベートIPアドレスをブロック
    if (isPrivateIP(parsed.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// YouTube URLかどうかを判定
function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url);
}

// YouTube oEmbed APIからタイトルを取得
async function getYouTubeTitle(url: string): Promise<string | null> {
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(oEmbedUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.title || null;
  } catch (error) {
    console.warn(`Failed to get YouTube title for ${url}:`, error);
    return null;
  }
}

// 一般的なHTMLエンティティをデコード
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// ストリームから先頭部分のみを読み込み（DoS対策）
async function readPartialResponse(response: Response, maxBytes: number = 100 * 1024): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const decoder = new TextDecoder();
  let html = "";
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.length;
      html += decoder.decode(value, { stream: true });

      // </title>が見つかったら、または最大バイト数を超えたらループを抜ける
      if (html.includes("</title>") || bytesRead > maxBytes) {
        break;
      }
    }
  } finally {
    reader.cancel().catch(() => {}); // ストリームの残りをキャンセル
  }

  return html;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // URL形式の検証
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // SSRF対策: プライベートIPアドレスをブロック
  if (!isUrlSafe(url)) {
    return NextResponse.json({ title: null, error: "URL not allowed" }, { status: 200 });
  }

  try {
    // YouTube URLの場合はoEmbed APIを優先使用
    if (isYouTubeUrl(url)) {
      const youtubeTitle = await getYouTubeTitle(url);
      if (youtubeTitle) {
        return NextResponse.json({ title: youtubeTitle, originalUrl: url });
      }
      // oEmbedが失敗した場合は通常のフェッチにフォールバック
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch metadata for ${url}: ${response.status}`);
      return NextResponse.json({ title: null, error: "Failed to fetch" }, { status: 200 });
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      return NextResponse.json({ title: null });
    }

    // ストリームで先頭部分のみ読み込み（DoS対策）
    const html = await readPartialResponse(response);

    // <title>タグの抽出
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : null;

    // HTMLエンティティのデコード
    if (title) {
      title = decodeHtmlEntities(title);
    }

    return NextResponse.json({ title, originalUrl: url });
  } catch (error) {
    // 接続エラーやタイムアウトは正常系として処理
    const isConnectionError = error instanceof TypeError &&
      (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED"));

    if (isConnectionError) {
      console.warn(`Connection failed for ${url}`);
      return NextResponse.json({ title: null, originalUrl: url });
    }

    console.error("Metadata fetch error:", error);
    return NextResponse.json({ title: null, error: "Internal Server Error" }, { status: 500 });
  }
}
