"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Edit,
  Eye,
  Trash2,
  Save,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Markdownのチェックボックスパターン: - [ ] または - [x] (*, + も対応)
const CHECKBOX_PATTERN = /^(\s*[-*+]\s*)\[([ xX])\]/;

export interface MemoData {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface MarkdownMemoProps {
  memo: MemoData;
  onUpdate: (id: string, title: string, content: string) => void;
  onDelete: (id: string) => void;
  darkMode: boolean;
  isActive?: boolean; // このメモがアクティブ（表示中）かどうか
  onToggleFullscreen?: () => void; // 親から全画面切り替えをコールバック
  onStartEditing?: () => void; // 親から編集モード開始をコールバック
  isFullscreenMode?: boolean; // 親から制御される全画面状態
  onNavigatePrev?: () => void; // 全画面モードで前のメモへ
  onNavigateNext?: () => void; // 全画面モードで次のメモへ
}

export function MarkdownMemo({
  memo,
  onUpdate,
  onDelete,
  darkMode,
  isActive,
  onToggleFullscreen,
  onStartEditing,
  isFullscreenMode,
  onNavigatePrev,
  onNavigateNext,
}: MarkdownMemoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(memo.title);
  const [content, setContent] = useState(memo.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // 内部の全画面状態（親から制御されない場合に使用）
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef(false);

  // デスクトップ環境判定
  const isDesktop = useCallback(() => {
    return !/mobile|tablet|android|iphone|ipad|ipod/i.test(
      navigator.userAgent.toLowerCase()
    );
  }, []);

  // 全画面状態（親から制御される場合はそちらを優先）
  const isFullscreen =
    isFullscreenMode !== undefined ? isFullscreenMode : internalFullscreen;

  // メモが更新されたら状態を同期（編集中でない場合のみ）
  useEffect(() => {
    // 編集中でない場合のみ、外部からの変更を同期する
    if (!isEditing) {
      setTitle(memo.title);
      setContent(memo.content);
    }
  }, [memo.title, memo.content, isEditing]);

  // IME変換状態の監視
  useEffect(() => {
    const handleCompositionStart = () => {
      isComposingRef.current = true;
    };
    const handleCompositionEnd = () => {
      isComposingRef.current = false;
    };

    document.addEventListener("compositionstart", handleCompositionStart);
    document.addEventListener("compositionend", handleCompositionEnd);

    return () => {
      document.removeEventListener("compositionstart", handleCompositionStart);
      document.removeEventListener("compositionend", handleCompositionEnd);
    };
  }, []);

  // 編集モードに入ったらテキストエリアにフォーカス
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // 自動保存（2秒のデバウンス）
  useEffect(() => {
    if (!isEditing) return;

    // 前回のタイムアウトをクリア
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // 変更があったかチェック
    const hasChanges = title !== memo.title || content !== memo.content;

    if (hasChanges) {
      // 2秒後に自動保存
      autoSaveTimeoutRef.current = setTimeout(() => {
        onUpdate(memo.id, title, content);
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, content, isEditing, memo.id, memo.title, memo.content, onUpdate]);

  const handleSave = useCallback(() => {
    onUpdate(memo.id, title, content);
    setIsEditing(false);
  }, [memo.id, title, content, onUpdate]);

  const handleCancel = useCallback(() => {
    setTitle(memo.title);
    setContent(memo.content);
    setIsEditing(false);
  }, [memo.title, memo.content]);

  const handleDelete = useCallback(() => {
    onDelete(memo.id);
    setShowDeleteConfirm(false);
  }, [memo.id, onDelete]);

  // 全画面モードの切り替え
  const toggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setInternalFullscreen((prev) => !prev);
    }
  }, [onToggleFullscreen]);

  // 編集モード開始
  const startEditing = useCallback(() => {
    if (onStartEditing) {
      onStartEditing();
    }
    setIsEditing(true);
  }, [onStartEditing]);

  // フルスクリーン時に背景スクロールを防止
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isFullscreen]);

  // キーボードショートカット（入力フィールド内でのみ有効）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd+S または Ctrl+S: 保存のみ
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isEditing) {
          handleSave();
        }
        return;
      }
      // Cmd+E または Ctrl+E で編集モード切り替え
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        if (isEditing) {
          handleSave();
        } else {
          startEditing();
        }
        return;
      }
      // Cmd+F または Ctrl+F で全画面切り替え
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      // Ctrl+Esc で編集キャンセル
      if (e.ctrlKey && e.key === "Escape") {
        e.preventDefault();
        handleCancel();
        return;
      }
    },
    [handleSave, handleCancel, isEditing, startEditing, toggleFullscreen]
  );

  // グローバルキーボードショートカット（Cmd+S で保存、Cmd+E で編集切り替え - アクティブなメモのみ）
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // IME変換中は無視
      if (isComposingRef.current || e.isComposing) return;

      // PC環境のみで動作
      if (!isDesktop()) return;

      // テキスト入力要素がフォーカスされている場合は無視（input/textareaの onKeyDown で処理される）
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;

      // Cmd+S または Ctrl+S: 保存（編集中のみ）
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isEditing) {
          handleSave();
        }
        return;
      }

      // Cmd+E または Ctrl+E で編集開始（編集中は input/textarea の onKeyDown で処理）
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        // 入力フィールドがフォーカスされている場合はスキップ（そこの onKeyDown で処理）
        if (isInputFocused) return;

        e.preventDefault();
        if (isEditing) {
          handleSave();
        } else {
          startEditing();
        }
        return;
      }
    };

    // memo-swiper.tsx から isActive が渡されない場合は、全てのメモのハンドラーを登録
    // isActive が true のみ登録して、他のメモのハンドラーを削除する
    if (!isActive) return;

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isEditing, startEditing, handleSave, isDesktop, isActive]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // チェックボックスをトグルする関数（インデックスベース）
  const toggleCheckbox = useCallback(
    (checkboxIndex: number) => {
      const lines = content.split("\n");

      let currentIndex = 0;
      let targetLineIndex = -1;

      // 指定されたインデックスのチェックボックスを見つける
      for (let i = 0; i < lines.length; i++) {
        if (CHECKBOX_PATTERN.test(lines[i])) {
          if (currentIndex === checkboxIndex) {
            targetLineIndex = i;
            break;
          }
          currentIndex++;
        }
      }

      if (targetLineIndex === -1) {
        return;
      }

      const line = lines[targetLineIndex];
      const newLine = line.replace(
        CHECKBOX_PATTERN,
        (match: string, prefix: string, checked: string) => {
          // トグル: 空白なら x に、x/X なら空白に
          const newChecked = checked === " " ? "x" : " ";
          return `${prefix}[${newChecked}]`;
        }
      );

      if (line !== newLine) {
        lines[targetLineIndex] = newLine;
        const newContent = lines.join("\n");

        // コンテンツを更新して保存
        setContent(newContent);
        onUpdate(memo.id, title, newContent);
      }
    },
    [content, memo.id, title, onUpdate]
  );

  // 全画面モード用のコンテンツ
  const memoContent = (
    <div
      className={`flex flex-col h-full min-h-0 rounded-lg border ${
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      {/* ヘッダー */}
      <div
        className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b ${
          darkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        {isEditing ? (
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトルを入力..."
            className={`flex-1 text-lg font-semibold bg-transparent border-none outline-none ${
              darkMode
                ? "text-white placeholder-gray-500"
                : "text-gray-900 placeholder-gray-400"
            }`}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <h3
            className={`text-lg font-semibold truncate flex-1 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {title || "無題のメモ"}
          </h3>
        )}

        <div className="flex items-center gap-2 ml-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className={`p-1.5 rounded transition-colors ${
                  darkMode
                    ? "hover:bg-gray-700 text-green-400"
                    : "hover:bg-gray-100 text-green-600"
                }`}
                title="保存 (Cmd+S)"
              >
                <Save size={18} />
              </button>
              <button
                onClick={handleCancel}
                className={`p-1.5 rounded transition-colors text-sm ${
                  darkMode
                    ? "hover:bg-gray-700 text-gray-400"
                    : "hover:bg-gray-100 text-gray-500"
                }`}
              >
                キャンセル
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEditing}
                className={`p-1.5 rounded transition-colors ${
                  darkMode
                    ? "hover:bg-gray-700 text-blue-400"
                    : "hover:bg-gray-100 text-blue-600"
                }`}
                title="編集 (Cmd+S)"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={toggleFullscreen}
                className={`p-1.5 rounded transition-colors ${
                  darkMode
                    ? "hover:bg-gray-700 text-purple-400"
                    : "hover:bg-gray-100 text-purple-600"
                }`}
                title={isFullscreen ? "縮小 (Ctrl+Esc)" : "全画面表示 (Ctrl+F)"}
              >
                {isFullscreen ? (
                  <Minimize2 size={18} />
                ) : (
                  <Maximize2 size={18} />
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`p-1.5 rounded transition-colors ${
                  darkMode
                    ? "hover:bg-gray-700 text-red-400"
                    : "hover:bg-gray-100 text-red-600"
                }`}
                title="削除"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 min-h-0 overflow-auto px-3 py-3">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Markdownで記述できます..."
            className={`w-full h-full min-h-[300px] resize-none bg-transparent border-none outline-none font-mono text-sm leading-relaxed ${
              darkMode
                ? "text-gray-100 placeholder-gray-500"
                : "text-gray-800 placeholder-gray-400"
            }`}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div
            className={`prose prose-sm max-w-none ${
              darkMode ? "prose-invert" : ""
            }`}
            onClick={(e) => {
              // チェックボックスがクリックされた場合のみイベント処理
              if ((e.target as HTMLElement).tagName === "INPUT") {
                return;
              }
              // 編集モードへの自動切り替えは行わない
            }}
          >
            {content ? (
              (() => {
                // チェックボックスのインデックスを追跡するためのカウンター
                let checkboxCounter = 0;
                return (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      input: (props) => {
                        if (props.type === "checkbox") {
                          // 現在のチェックボックスのインデックスを取得して、カウンターをインクリメント
                          const currentIndex = checkboxCounter++;

                          return (
                            <input
                              type="checkbox"
                              checked={props.checked || false}
                              className={`w-5 h-5 rounded border-2 cursor-pointer mx-1 transition-colors ${
                                darkMode
                                  ? "border-gray-500 checked:bg-blue-600 checked:border-blue-600 hover:border-gray-400"
                                  : "border-gray-300 checked:bg-blue-500 checked:border-blue-500 hover:border-gray-400"
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleCheckbox(currentIndex);
                              }}
                              onChange={() => {}} // コントロールドコンポーネント
                              disabled={false}
                            />
                          );
                        }
                        return <input {...props} />;
                      },
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                );
              })()
            ) : (
              <p
                className={`italic ${
                  darkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                クリックして編集を開始...
              </p>
            )}
          </div>
        )}
      </div>

      {/* フッター（更新日時） - 常に最下部に配置 */}
      <div
        className={`flex-shrink-0 px-4 py-2.5 text-xs border-t ${
          darkMode
            ? "border-gray-700 text-gray-500"
            : "border-gray-200 text-gray-400"
        }`}
      >
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Eye size={12} />
            <span>Markdownプレビューは保存後に表示されます</span>
          </div>
        ) : (
          <span>更新: {formatDate(memo.updated_at)}</span>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className={`p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <h4
              className={`text-lg font-semibold mb-2 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              メモを削除しますか？
            </h4>
            <p
              className={`text-sm mb-4 ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              「{title || "無題のメモ"}
              」を削除します。この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 rounded text-sm ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded text-sm bg-red-600 hover:bg-red-700 text-white"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 全画面モードの場合はモーダルオーバーレイとして表示（Portalを使用）
  if (isFullscreen) {
    if (typeof document === "undefined") return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex flex-col overflow-y-auto bg-black/70 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onToggleFullscreen?.();
          }
        }}
        onKeyDown={(e) => {
          // IME変換中は無視
          if (isComposingRef.current) return;

          // PC環境のみで動作
          if (!isDesktop()) return;

          // テキスト入力要素がフォーカスされている場合は処理しない
          const activeElement = document.activeElement;
          const isInputFocused =
            activeElement instanceof HTMLInputElement ||
            activeElement instanceof HTMLTextAreaElement;

          // Cmd+S または Ctrl+S: 保存のみ（PC環境のみ）
          if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            // 入力フィールドがフォーカスされている場合はスキップ（そこの onKeyDown で処理）
            if (isInputFocused) return;

            e.preventDefault();
            if (isEditing) {
              handleSave();
            }
            return;
          }

          // Cmd+E または Ctrl+E で編集モード切り替え
          if ((e.ctrlKey || e.metaKey) && e.key === "e") {
            // 入力フィールドがフォーカスされている場合はスキップ
            if (isInputFocused) return;

            e.preventDefault();
            if (isEditing) {
              handleSave();
            } else {
              startEditing();
            }
            return;
          }

          // Ctrl+Esc で編集キャンセル（Escapeチェックより先に処理する必要あり）
          // ただしinputやtextarea内のときは handleKeyDown に任せる
          if (e.ctrlKey && e.key === "Escape" && !isInputFocused) {
            e.preventDefault();
            handleCancel();
            return;
          }

          // Escape で全画面を閉じる（inputやtextarea内のときは何もしない）
          if (e.key === "Escape" && !isInputFocused) {
            e.preventDefault();
            onToggleFullscreen?.();
            return;
          }

          // 矢印キーはグローバルハンドラー（memo-swiper.tsx）で処理するためスキップ
          // ここで処理するとダブル処理になってメモをスキップしてしまう
        }}
        tabIndex={0}
      >
        <div
          className="w-[98vw] sm:w-[95vw] md:w-[90vw] m-auto flex flex-col md:flex-row items-center gap-2 py-4 pb-safe"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 左矢印（デスクトップのみ表示） */}
          <button
            onClick={onNavigatePrev}
            className={`hidden md:flex flex-shrink-0 p-2 rounded-full transition-colors ${
              darkMode
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800"
            }`}
            title="前のメモ (←)"
          >
            <ChevronLeft size={24} />
          </button>

          {/* メモコンテンツ */}
          <div
            className={`flex-1 w-full md:w-auto flex flex-col rounded-xl shadow-2xl overflow-hidden min-h-0 max-h-[80vh] max-h-[80dvh] ${
              darkMode ? "bg-gray-900" : "bg-gray-50"
            }`}
          >
            {memoContent}
          </div>

          {/* ナビゲーションボタン（モバイルは下部に横並び、デスクトップは右矢印のみ） */}
          <div className="flex _md:hidden items-center justify-center gap-4 py-2 flex-shrink-0">
            <button
              onClick={onNavigatePrev}
              className={`p-3 rounded-full transition-colors ${
                darkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  : "bg-white hover:bg-gray-100 text-gray-600"
              }`}
              title="前のメモ"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              onClick={onNavigateNext}
              className={`p-3 rounded-full transition-colors ${
                darkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  : "bg-white hover:bg-gray-100 text-gray-600"
              }`}
              title="次のメモ"
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* 右矢印（デスクトップのみ表示） */}
          <button
            onClick={onNavigateNext}
            className={`hidden md:flex flex-shrink-0 p-2 rounded-full transition-colors ${
              darkMode
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800"
            }`}
            title="次のメモ (→)"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return memoContent;
}
