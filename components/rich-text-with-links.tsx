"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { ExternalLink } from "lucide-react";

// キャッシュの最大サイズ（メモリリーク防止）
const MAX_CACHE_SIZE = 200;

// URLメタデータキャッシュ（グローバル、LRU風）
const urlMetadataCache = new Map<string, string>();

// キャッシュに追加（上限を超えたら古いエントリを削除）
function setCache(key: string, value: string) {
  if (urlMetadataCache.size >= MAX_CACHE_SIZE) {
    // Mapの最初のエントリ（最も古い）を削除
    const oldestKey = urlMetadataCache.keys().next().value;
    if (oldestKey) {
      urlMetadataCache.delete(oldestKey);
    }
  }
  urlMetadataCache.set(key, value);
}

// URL検出の正規表現（末尾の句読点を含めないように境界チェック）
const URL_PATTERN = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+?)(?=[.,;:!?)\]]*(?:\s|$))/g;

interface RichLinkProps {
  href: string;
  darkMode?: boolean;
  children?: React.ReactNode; // markdown-memo.tsx用
}

// リッチリンクコンポーネント（export for markdown-memo.tsx）
export function RichLink({ href, darkMode = false, children }: RichLinkProps) {
  const [title, setTitle] = useState<string | null>(null);
  const isMounted = useRef(true);

  // childrenがhrefと同じ場合のみメタデータ取得（自動リンクとみなす）
  const shouldFetchMetadata =
    !children ||
    (typeof children === "string" &&
      (children === href || children === decodeURI(href) || href.endsWith(children)));

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldFetchMetadata || !href) return;

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
          setCache(href, data.title);
        }
      } catch (e) {
        console.error("Failed to fetch metadata", e);
      }
    };

    fetchMetadata();
  }, [href, shouldFetchMetadata]);

  // 表示するテキスト（childrenがあればそれを優先）
  const displayText = children || href;

  // タイトルがない場合はシンプルなリンク表示
  if (!shouldFetchMetadata || !title) {
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
        {typeof displayText === "string" && displayText.length > 50
          ? displayText.slice(0, 50) + "..."
          : displayText}
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
  // URLを検出して分割
  const parts: Array<{ type: "text" | "url"; content: string }> = [];
  let lastIndex = 0;

  // 正規表現を新しく作成（グローバルフラグの状態問題を回避）
  const urlRegex = new RegExp(URL_PATTERN.source, "g");
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // URL前のテキスト
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
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
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  // URLがない場合はそのままテキストを返す
  if (parts.length === 0 || (parts.length === 1 && parts[0].type === "text")) {
    const displayText = maxLength && text.length > maxLength
      ? text.slice(0, maxLength) + "..."
      : text;
    return <span className={className}>{displayText}</span>;
  }

  // maxLengthが指定されている場合、URLを途中で切らないように省略
  let displayParts = parts;
  if (maxLength && text.length > maxLength) {
    let totalLength = 0;
    const truncatedParts: typeof parts = [];

    for (const part of parts) {
      if (totalLength >= maxLength) {
        break;
      }

      if (part.type === "url") {
        // URLは途中で切らない
        if (totalLength + part.content.length > maxLength && totalLength > 0) {
          // URLの開始位置が制限を超える場合、URLの前で切る
          truncatedParts.push({ type: "text", content: "..." });
          break;
        }
        truncatedParts.push(part);
        totalLength += part.content.length;
      } else {
        const remaining = maxLength - totalLength;
        if (part.content.length <= remaining) {
          truncatedParts.push(part);
          totalLength += part.content.length;
        } else {
          truncatedParts.push({
            type: "text",
            content: part.content.slice(0, remaining) + "...",
          });
          break;
        }
      }
    }

    displayParts = truncatedParts;
  }

  return (
    <span className={`${className} whitespace-pre-wrap break-words`}>
      {displayParts.map((part, index) => (
        <Fragment key={`${part.type}-${index}-${part.content.slice(0, 20)}`}>
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
