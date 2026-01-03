"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, X, Minimize2, ChevronDown, Settings2, ArrowUpRight, ArrowDownLeft, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  darkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
}

// サイズプリセット
type ChatSize = "small" | "medium" | "large";

const SIZE_CONFIG: Record<ChatSize, { width: number; height: number }> = {
  small: { width: 360, height: 450 },
  medium: { width: 450, height: 550 },
  large: { width: 600, height: 700 },
};

// ドラッグリサイズの制限
const MIN_WIDTH = 300;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 350;
const MAX_HEIGHT = 900;

// モデルプリセット
type ModelOption = {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
};

const MODEL_OPTIONS: ModelOption[] = [
  { id: "gpt-4.1-nano", name: "gpt-4.1-nano", description: "高速・軽量" },
  { id: "gpt-4o-mini", name: "gpt-4o-mini", description: "推奨・高速" },
  { id: "gpt-5-nano", name: "gpt-5-nano", description: "次世代・軽量" },
  { id: "gpt-5-mini", name: "gpt-5-mini", description: "次世代・高性能" },
  { id: "custom", name: "カスタム...", description: "Local LLM等", isCustom: true },
];

// 認証ヘッダーを取得
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export function AIChat({ darkMode, isOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSize, setChatSize] = useState<ChatSize>("medium");
  const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // IME変換中フラグ
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState("http://localhost:1234/v1");
  const [customModelName, setCustomModelName] = useState("");
  const [showCustomSettings, setShowCustomSettings] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // 自動スクロール
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // オープン時にフォーカス
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // モデルメニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    if (showModelMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModelMenu]);

  // メッセージ送信
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    // ユーザーメッセージを追加
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // カスタムモデル（Local LLM）の場合
      if (selectedModel === "custom") {
        const response = await fetch(`${customEndpoint}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: customModelName || "local-model",
            messages: [
              { role: "system", content: "あなたはタスク管理のアシスタントです。" },
              ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
              { role: "user", content: userMessage },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          throw new Error(`Local LLM error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "応答がありませんでした";

        setMessages([
          ...newMessages,
          { role: "assistant", content },
        ]);
      } else {
        // OpenAI APIを使用
        const headers = await getAuthHeaders();

        const response = await fetch("/api/v1/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: userMessage,
            history: messages.slice(-10),
            model: selectedModel,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }

        const data = await response.json();

        setMessages([
          ...newMessages,
          { role: "assistant", content: data.message },
        ]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "エラーが発生しました";
      setError(errorMessage);
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // キー入力ハンドラ（IME対応）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // IME変換中はEnterを無視
    if (isComposing) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // IME変換開始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // IME変換終了
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // チャットクリア
  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // サイズ切り替え
  const cycleSize = () => {
    const sizes: ChatSize[] = ["small", "medium", "large"];
    const currentIndex = sizes.indexOf(chatSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setChatSize(sizes[nextIndex]);
    setCustomSize(null); // プリセットに戻す
  };

  // ドラッグリサイズ
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const currentWidth = customSize?.width || SIZE_CONFIG[chatSize].width;
    const currentHeight = customSize?.height || SIZE_CONFIG[chatSize].height;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX; // 左上からリサイズ
      const deltaY = startY - e.clientY;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, currentWidth + deltaX));
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, currentHeight + deltaY));
      setCustomSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [chatSize, customSize]);

  // コピー機能
  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  if (!isOpen) return null;

  // 最小化状態
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-colors ${
            darkMode
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "bg-indigo-500 hover:bg-indigo-600 text-white"
          }`}
        >
          <Bot size={20} />
          <span className="font-medium">AIアシスタント</span>
          {messages.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
              {messages.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  const currentWidth = customSize?.width || SIZE_CONFIG[chatSize].width;
  const currentHeight = customSize?.height || SIZE_CONFIG[chatSize].height;

  return (
    <div
      ref={chatRef}
      className="fixed bottom-4 right-4 z-[9999]"
      style={{
        width: `${currentWidth}px`,
        maxWidth: "calc(100vw - 2rem)"
      }}
    >
      {/* リサイズハンドル（左上） */}
      <div
        onMouseDown={handleResizeStart}
        className={`absolute -top-2 -left-2 w-6 h-6 cursor-nw-resize z-10 flex items-center justify-center ${
          isResizing ? "opacity-100" : "opacity-50 hover:opacity-100"
        } transition-opacity`}
        title="ドラッグでリサイズ"
      >
        <div className={`w-3 h-3 border-l-2 border-t-2 rounded-tl ${
          darkMode ? "border-gray-400" : "border-gray-500"
        }`} />
      </div>
      <div
        className={`rounded-lg shadow-2xl flex flex-col overflow-hidden ${
          darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
        } ${isResizing ? "select-none" : ""}`}
        style={{
          height: `${currentHeight}px`,
          maxHeight: "calc(100vh - 6rem)"
        }}
      >
        {/* ヘッダー */}
        <div
          className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b ${
            darkMode
              ? "bg-gray-900 border-gray-700"
              : "bg-indigo-500 border-indigo-600"
          }`}
        >
          <div className="flex items-center gap-2 text-white">
            <Bot size={20} />
            <span className="font-medium">AIアシスタント</span>
          </div>
          <div className="flex items-center gap-1">
            {/* サイズ切り替えボタン */}
            <button
              onClick={cycleSize}
              className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
              aria-label={`サイズ: ${chatSize}`}
              title={`クリックで${chatSize === "small" ? "中" : chatSize === "medium" ? "大" : "小"}に切り替え`}
            >
              {chatSize === "large" ? (
                <ArrowDownLeft size={16} />
              ) : (
                <ArrowUpRight size={16} />
              )}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
              aria-label="最小化"
            >
              <Minimize2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
              aria-label="閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* メッセージエリア */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-4 ${
            darkMode ? "bg-gray-800" : "bg-gray-50"
          }`}
        >
          {messages.length === 0 ? (
            <div
              className={`text-center py-8 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              <Bot size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">時間計画アシスタント</p>
              <p className="text-sm">
                タスクとメモを把握した上で
                <br />
                時間配分や計画をサポートします
              </p>
              <p className={`text-xs mt-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                例: 「今日の計画を立てて」「次の1時間で何をすべき？」
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } group`}
              >
                {msg.role === "assistant" && (
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      darkMode ? "bg-indigo-600" : "bg-indigo-500"
                    }`}
                  >
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div className="flex flex-col max-w-[80%]">
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      msg.role === "user"
                        ? darkMode
                          ? "bg-indigo-600 text-white"
                          : "bg-indigo-500 text-white"
                        : darkMode
                        ? "bg-gray-700 text-gray-100"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                  {/* コピーボタン（アシスタントメッセージのみ） */}
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyToClipboard(msg.content, index)}
                      className={`self-start mt-1 p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${
                        copiedIndex === index
                          ? "text-green-500"
                          : darkMode
                          ? "text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      }`}
                      title={copiedIndex === index ? "コピーしました" : "クリップボードにコピー"}
                    >
                      {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
                {msg.role === "user" && (
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      darkMode ? "bg-gray-600" : "bg-gray-300"
                    }`}
                  >
                    <User size={16} className={darkMode ? "text-gray-200" : "text-gray-600"} />
                  </div>
                )}
              </div>
            ))
          )}

          {/* ローディング表示 */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  darkMode ? "bg-indigo-600" : "bg-indigo-500"
                }`}
              >
                <Bot size={16} className="text-white" />
              </div>
              <div
                className={`rounded-lg px-4 py-2 ${
                  darkMode
                    ? "bg-gray-700 text-gray-100"
                    : "bg-white text-gray-800 border border-gray-200"
                }`}
              >
                <Loader2 size={16} className="animate-spin" />
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div
              className={`rounded-lg px-4 py-2 text-sm ${
                darkMode
                  ? "bg-red-900/50 text-red-200 border border-red-800"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}
            >
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div
          className={`flex-shrink-0 p-3 border-t ${
            darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          {/* モデル選択 & クリアボタン */}
          <div className="flex items-center justify-between mb-2">
            {/* モデル選択ドロップダウン */}
            <div className="relative" ref={modelMenuRef}>
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                  darkMode
                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Settings2 size={12} />
                <span>{selectedModel === "custom" ? (customModelName || "カスタム") : selectedModel}</span>
                <ChevronDown size={12} />
              </button>

              {/* ドロップダウンメニュー */}
              {showModelMenu && (
                <div
                  className={`absolute bottom-full left-0 mb-1 w-56 rounded-lg shadow-lg border overflow-hidden ${
                    darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  }`}
                >
                  {MODEL_OPTIONS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        if (model.isCustom) {
                          setSelectedModel("custom");
                          setShowCustomSettings(true);
                        } else {
                          setSelectedModel(model.id);
                          setShowCustomSettings(false);
                        }
                        setShowModelMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                        selectedModel === model.id
                          ? darkMode
                            ? "bg-indigo-600 text-white"
                            : "bg-indigo-500 text-white"
                          : darkMode
                          ? "text-gray-300 hover:bg-gray-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span>{model.name}</span>
                      <span className={`text-xs ${
                        selectedModel === model.id
                          ? "text-white/70"
                          : darkMode ? "text-gray-500" : "text-gray-400"
                      }`}>
                        {model.description}
                      </span>
                    </button>
                  ))}

                  {/* カスタム設定 */}
                  {showCustomSettings && (
                    <div className={`p-3 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                      <div className="space-y-2">
                        <div>
                          <label className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            エンドポイント
                          </label>
                          <input
                            type="text"
                            value={customEndpoint}
                            onChange={(e) => setCustomEndpoint(e.target.value)}
                            placeholder="http://localhost:1234/v1"
                            className={`w-full mt-1 px-2 py-1 text-xs rounded border ${
                              darkMode
                                ? "bg-gray-700 border-gray-600 text-white"
                                : "bg-gray-50 border-gray-300 text-gray-900"
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            モデル名（任意）
                          </label>
                          <input
                            type="text"
                            value={customModelName}
                            onChange={(e) => setCustomModelName(e.target.value)}
                            placeholder="local-model"
                            className={`w-full mt-1 px-2 py-1 text-xs rounded border ${
                              darkMode
                                ? "bg-gray-700 border-gray-600 text-white"
                                : "bg-gray-50 border-gray-300 text-gray-900"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* クリアボタン */}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  darkMode
                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                会話をクリア
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder="メッセージを入力..."
              rows={1}
              className={`flex-1 resize-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                darkMode
                  ? "bg-gray-800 text-white placeholder-gray-500 focus:ring-indigo-500 border border-gray-700"
                  : "bg-gray-100 text-gray-900 placeholder-gray-500 focus:ring-indigo-400 border border-gray-200"
              }`}
              style={{ minHeight: "40px", maxHeight: "120px" }}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                input.trim() && !isLoading
                  ? darkMode
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                  : darkMode
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              aria-label="送信"
            >
              <Send size={18} />
            </button>
          </div>
          <p
            className={`text-xs mt-2 ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Enter で送信 / Shift+Enter で改行
          </p>
        </div>
      </div>
    </div>
  );
}
