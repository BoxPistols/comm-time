import { NextRequest, NextResponse } from "next/server";

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
  } catch {
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
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // 不正なURL形式のチェック
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
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
        // 一般的なブラウザのUser-Agentを模倣して、ボット対策されているサイトでも取得できるようにする
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch metadata for ${url}: ${response.status}`);
      return NextResponse.json({ title: null, error: "Failed to fetch" }, { status: 200 }); // エラーでも200で返し、nullタイトルを扱う
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      return NextResponse.json({ title: null });
    }

    const html = await response.text();

    // <title>タグの抽出
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : null;

    // HTMLエンティティのデコード
    if (title) {
      title = decodeHtmlEntities(title);
    }

    return NextResponse.json({ title, originalUrl: url });
  } catch (error) {
    // 接続エラーやタイムアウトは正常系として処理（存在しないURL等）
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
