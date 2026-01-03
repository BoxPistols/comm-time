"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, CheckSquare, X, ArrowRight } from "lucide-react";

// 検索結果の型
export type SearchResult = {
  id: string;
  type: "todo" | "memo";
  title: string;
  content: string;
  matchedText: string;
  memoIndex?: number; // メモの場合のインデックス
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  todos: Array<{
    id: string;
    text: string;
    isCompleted: boolean;
    dueDate?: string;
    dueTime?: string;
  }>;
  memos: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  onSelectResult: (result: SearchResult) => void;
}

export function SearchModal({
  isOpen,
  onClose,
  darkMode,
  todos,
  memos,
  onSelectResult,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // モーダルが開いたらフォーカス
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // 検索実行
  const performSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      const q = searchQuery.toLowerCase();
      const searchResults: SearchResult[] = [];

      // TODOを検索
      todos.forEach((todo) => {
        if (todo.text.toLowerCase().includes(q)) {
          const matchStart = todo.text.toLowerCase().indexOf(q);
          const matchEnd = matchStart + q.length;
          const start = Math.max(0, matchStart - 20);
          const end = Math.min(todo.text.length, matchEnd + 20);
          let matchedText = todo.text.slice(start, end);
          if (start > 0) matchedText = "..." + matchedText;
          if (end < todo.text.length) matchedText = matchedText + "...";

          searchResults.push({
            id: todo.id,
            type: "todo",
            title: todo.text.length > 50 ? todo.text.slice(0, 50) + "..." : todo.text,
            content: todo.isCompleted ? "完了" : "未完了",
            matchedText,
          });
        }
      });

      // メモを検索
      memos.forEach((memo, index) => {
        const titleMatch = memo.title.toLowerCase().includes(q);
        const contentMatch = memo.content.toLowerCase().includes(q);

        if (titleMatch || contentMatch) {
          let matchedText = "";
          if (contentMatch) {
            const matchStart = memo.content.toLowerCase().indexOf(q);
            const matchEnd = matchStart + q.length;
            const start = Math.max(0, matchStart - 30);
            const end = Math.min(memo.content.length, matchEnd + 30);
            matchedText = memo.content.slice(start, end);
            if (start > 0) matchedText = "..." + matchedText;
            if (end < memo.content.length) matchedText = matchedText + "...";
          } else {
            matchedText = memo.content.slice(0, 60) + (memo.content.length > 60 ? "..." : "");
          }

          searchResults.push({
            id: memo.id,
            type: "memo",
            title: memo.title || "無題のメモ",
            content: `メモ ${index + 1}`,
            matchedText,
            memoIndex: index,
          });
        }
      });

      setResults(searchResults);
      setSelectedIndex(0);
    },
    [todos, memos]
  );

  // 入力変更時に検索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // キーボードナビゲーション
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      onSelectResult(results[selectedIndex]);
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // 選択されたアイテムをスクロール
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, results.length]);

  // マッチしたテキストをハイライト
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 text-inherit rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル */}
      <div
        className={`relative w-full max-w-xl mx-4 rounded-xl shadow-2xl overflow-hidden ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* 検索入力 */}
        <div
          className={`flex items-center gap-3 px-4 py-3 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <Search className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="TODO・メモを検索..."
            className={`flex-1 bg-transparent outline-none text-base ${
              darkMode ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"
            }`}
          />
          <kbd
            className={`hidden sm:inline-flex items-center px-2 py-0.5 text-xs rounded ${
              darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
            }`}
          >
            ESC
          </kbd>
          <button
            onClick={onClose}
            className={`sm:hidden p-1 rounded-full transition-colors ${
              darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 検索結果 */}
        <div
          ref={resultsRef}
          className="max-h-[50vh] overflow-y-auto"
        >
          {query && results.length === 0 ? (
            <div className={`px-4 py-8 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              「{query}」に一致する結果がありません
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    onSelectResult(result);
                    onClose();
                  }}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                    index === selectedIndex
                      ? darkMode
                        ? "bg-indigo-600/30"
                        : "bg-indigo-50"
                      : darkMode
                      ? "hover:bg-gray-700/50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {/* アイコン */}
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg ${
                      result.type === "todo"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-blue-500/20 text-blue-500"
                    }`}
                  >
                    {result.type === "todo" ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>

                  {/* コンテンツ */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium truncate ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {highlightMatch(result.title, query)}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          result.type === "todo"
                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                            : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {result.type === "todo" ? "TODO" : "メモ"}
                      </span>
                    </div>
                    <p
                      className={`text-sm mt-1 truncate ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {highlightMatch(result.matchedText, query)}
                    </p>
                  </div>

                  {/* 矢印 */}
                  {index === selectedIndex && (
                    <ArrowRight className={`w-4 h-4 mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
                  )}
                </button>
              ))}
            </div>
          ) : !query ? (
            <div className={`px-4 py-6 text-center ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              <p className="text-sm">キーワードを入力して検索</p>
              <p className="text-xs mt-2">
                <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>↑</kbd>
                <kbd className={`px-1.5 py-0.5 rounded ml-1 ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>↓</kbd>
                <span className="mx-2">で移動</span>
                <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>Enter</kbd>
                <span className="ml-2">で選択</span>
              </p>
            </div>
          ) : null}
        </div>

        {/* フッター */}
        {results.length > 0 && (
          <div
            className={`px-4 py-2 text-xs border-t flex items-center justify-between ${
              darkMode ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"
            }`}
          >
            <span>{results.length}件の結果</span>
            <span className="hidden sm:inline">
              <kbd className={`px-1 py-0.5 rounded ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>Enter</kbd>
              <span className="ml-1">で移動</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
