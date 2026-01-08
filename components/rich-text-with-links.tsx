"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { ExternalLink } from "lucide-react";

// URLメタデータキャッシュ（グローバル）
const urlMetadataCache = new Map<string, string>();

// URL検出の正規表現
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;

interface RichLinkProps {
  href: string;
  darkMode?: boolean;
}

// リッチリンクコンポーネント
export function RichLink({ href, darkMode = false }: RichLinkProps) {
  const [title, setTitle] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!href) return;

    // キャッシュにあればそれを使う
    if (urlMetadataCache.has(href)) {
      setTitle(urlMetadataCache.get(href)!);
      return;
    }

    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/v1/url-metadata?url=${encodeURIComponent(href)}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        if (isMounted.current && data.title) {
          setTitle(data.title);
          urlMetadataCache.set(href, data.title);
        }
      } catch (e) {
        console.error("Failed to fetch metadata", e);
      }
    };

    fetchMetadata();
  }, [href]);

  // タイトルがない場合はシンプルなリンク表示
  if (!title) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`hover:underline break-all inline-flex items-center gap-0.5 ${
          darkMode ? "text-blue-400" : "text-blue-500"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {href.length > 50 ? href.slice(0, 50) + "..." : href}
        <ExternalLink size={12} className="inline-block opacity-50 flex-shrink-0" />
      </a>
    );
  }

  // リッチ表示（タイトル付き）
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-all no-underline group max-w-full ${
        darkMode
          ? "bg-blue-900/30 text-blue-300 border-blue-800 hover:bg-blue-900/50"
          : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 hover:border-blue-200"
      }`}
      title={href}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="flex-shrink-0 opacity-70 group-hover:opacity-100">
        <ExternalLink size={14} />
      </span>
      <span className="font-medium truncate">{title}</span>
    </a>
  );
}

interface RichTextWithLinksProps {
  text: string;
  darkMode?: boolean;
  className?: string;
  maxLength?: number; // テキスト全体の最大長（省略表示用）
}

// プレーンテキスト内のURLをリッチリンクに変換するコンポーネント
export function RichTextWithLinks({
  text,
  darkMode = false,
  className = "",
  maxLength,
}: RichTextWithLinksProps) {
  // maxLengthが指定されている場合、テキストを省略
  const displayText = maxLength && text.length > maxLength
    ? text.slice(0, maxLength) + "..."
    : text;

  // URLを検出して分割
  const parts: Array<{ type: "text" | "url"; content: string }> = [];
  let lastIndex = 0;
  let match;

  // 正規表現をリセット
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(displayText)) !== null) {
    // URL前のテキスト
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: displayText.slice(lastIndex, match.index),
      });
    }
    // URL
    parts.push({
      type: "url",
      content: match[1],
    });
    lastIndex = match.index + match[0].length;
  }

  // 残りのテキスト
  if (lastIndex < displayText.length) {
    parts.push({
      type: "text",
      content: displayText.slice(lastIndex),
    });
  }

  // URLがない場合はそのままテキストを返す
  if (parts.length === 0 || (parts.length === 1 && parts[0].type === "text")) {
    return <span className={className}>{displayText}</span>;
  }

  return (
    <span className={`${className} whitespace-pre-wrap break-words`}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.type === "url" ? (
            <RichLink href={part.content} darkMode={darkMode} />
          ) : (
            part.content
          )}
        </Fragment>
      ))}
    </span>
  );
}

// キャッシュをクリアするユーティリティ（必要に応じて使用）
export function clearUrlMetadataCache() {
  urlMetadataCache.clear();
}
