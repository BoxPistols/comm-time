import { NextRequest, NextResponse } from "next/server";

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

    // 一般的なHTMLエンティティのデコード
    if (title) {
      title = title
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, " ");
        
      // YouTubeなどの場合、" - YouTube" などの接尾辞がついていることが多いので、必要なら加工するが、
      // ユーザーは「取得したURLのmeta情報からtitle文字列を取得」と言っているのでそのままにする。
    }

    return NextResponse.json({ title, originalUrl: url });
  } catch (error) {
    console.error("Metadata fetch error:", error);
    return NextResponse.json({ title: null, error: "Internal Server Error" }, { status: 500 });
  }
}
