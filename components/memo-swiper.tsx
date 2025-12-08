"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Keyboard, Mousewheel } from "swiper/modules";
import "swiper/css/mousewheel";
import type { Swiper as SwiperType } from "swiper";
import {
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  GripVertical,
  Edit,
  Trash2,
  Keyboard as KeyboardIcon,
} from "lucide-react";
import { DragDropContext, Draggable, DropResult } from "react-beautiful-dnd";
import { StrictModeDroppable } from "./strict-mode-droppable";
import { MarkdownMemo, type MemoData } from "./markdown-memo";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ShortcutsModal } from "./ShortcutsModal";
import { ShortcutsDropdown } from "./ShortcutsDropdown";

// Swiper CSS
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface MemoSwiperProps {
  memos: MemoData[];
  onCreateMemo: () => void;
  onUpdateMemo: (id: string, title: string, content: string) => void;
  onDeleteMemo: (id: string) => void;
  onReorderMemos?: (memos: MemoData[]) => void;
  darkMode: boolean;
}

export function MemoSwiper({
  memos,
  onCreateMemo,
  onUpdateMemo,
  onDeleteMemo,
  onReorderMemos,
  darkMode,
}: MemoSwiperProps) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [isShortcutsDropdownOpen, setIsShortcutsDropdownOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const prevMemosLengthRef = useRef(memos.length);
  const { shortcuts, saveShortcuts, resetShortcuts } =
    useKeyboardShortcuts();

  // 表示モード: 'swiper' | 'list'
  const [viewMode, setViewMode] = useState<"swiper" | "list">("swiper");
  // 全画面表示状態（アクティブなメモのみ）
  const [isFullscreen, setIsFullscreen] = useState(false);
  // IME変換中フラグ
  const isComposingRef = useRef(false);
  // コンテナRef
  const containerRef = useRef<HTMLDivElement>(null);

  // メモが追加されたら最後のスライド（右端）に移動
  useEffect(() => {
    if (swiperInstance && memos.length > prevMemosLengthRef.current) {
      setTimeout(() => {
        swiperInstance.slideTo(memos.length - 1, 300);
      }, 100);
    }
    prevMemosLengthRef.current = memos.length;
  }, [memos.length, swiperInstance]);

  // IME変換状態の監視
  useEffect(() => {
    const handleCompositionStart = () => {
      isComposingRef.current = true;
    };
    const handleCompositionEnd = () => {
      isComposingRef.current = false;
    };

    window.addEventListener("compositionstart", handleCompositionStart);
    window.addEventListener("compositionend", handleCompositionEnd);

    return () => {
      window.removeEventListener("compositionstart", handleCompositionStart);
      window.removeEventListener("compositionend", handleCompositionEnd);
    };
  }, []);

  // グローバルキーボードショートカット
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isComposingRef.current || e.isComposing) return;
      if (memos.length === 0) return;

      // テキスト入力要素がフォーカスされている場合は矢印キーを処理しない
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
        return;
      }

      // 矢印キーでメモを移動（全画面モード＆編集中でない場合のみ）
      if (isFullscreen && memos.length > 1 && !isInputFocused) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          swiperInstance?.slideNext();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          swiperInstance?.slidePrev();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [memos.length, isFullscreen, swiperInstance]);

  const handleSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.activeIndex);
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
    if (isFullscreen) {
      setIsFullscreen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 編集モード開始時のコールバック（Swiperの位置を維持するため）
  const handleStartEditing = useCallback(() => {
    // レイアウト変更後に Swiper を更新して位置を維持
    if (swiperInstance) {
      // 現在のスライド位置を保持
      const currentIndex = swiperInstance.activeIndex;

      // レイアウト変更が完了した後に更新
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          swiperInstance.update();
          swiperInstance.updateSize();
          swiperInstance.updateSlides();
          // 位置がずれないように現在のスライドに戻す
          if (swiperInstance.activeIndex !== currentIndex) {
            swiperInstance.slideTo(currentIndex, 0);
          }
        });
      });
    }
  }, [swiperInstance]);

  const handlePrev = useCallback(() => {
    swiperInstance?.slidePrev();
  }, [swiperInstance]);

  const handleNext = useCallback(() => {
    swiperInstance?.slideNext();
  }, [swiperInstance]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // ドラッグ&ドロップの処理
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const items = Array.from(memos);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      if (onReorderMemos) {
        onReorderMemos(items);
      }
    },
    [memos, onReorderMemos]
  );

  // リストビューでメモをクリックしたらスワイパービューに切り替え
  const handleMemoClick = useCallback(
    (index: number) => {
      setViewMode("swiper");
      setTimeout(() => {
        swiperInstance?.slideTo(index, 300);
      }, 100);
    },
    [swiperInstance]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div ref={containerRef} className="flex h-full min-h-0 w-full flex-col">
      {/* ヘッダー */}
      <div
        className={`flex items-center justify-between px-5 py-3.5 border-b ${
          darkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <FileText
            size={20}
            className={darkMode ? "text-gray-400" : "text-gray-600"}
          />
          <span
            className={`font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            メモ ({memos.length})
          </span>
          {viewMode === "swiper" && memos.length > 0 && (
            <span
              className={`text-sm ${
                darkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              - {activeIndex + 1} / {memos.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {memos.length > 0 && (
            <div
              className={`flex rounded-lg overflow-hidden border ${
                darkMode ? "border-gray-600" : "border-gray-300"
              }`}
            >
              <button
                onClick={() => setViewMode("swiper")}
                className={`p-1.5 transition-colors ${
                  viewMode === "swiper"
                    ? darkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-500 text-white"
                    : darkMode
                    ? "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title="スライド表示"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 transition-colors ${
                  viewMode === "list"
                    ? darkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-500 text-white"
                    : darkMode
                    ? "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title="リスト表示（並び替え可能）"
              >
                <List size={16} />
              </button>
            </div>
          )}
          <div className="relative">
            <button
              onClick={() => setIsShortcutsDropdownOpen(!isShortcutsDropdownOpen)}
              className={`p-1.5 rounded-lg transition-colors ${
                darkMode
                  ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
              }`}
              title="キーボードショートカット"
            >
              <KeyboardIcon size={20} />
            </button>
            <ShortcutsDropdown
              isOpen={isShortcutsDropdownOpen}
              onClose={() => setIsShortcutsDropdownOpen(false)}
              onSettingsClick={() => setIsShortcutsModalOpen(true)}
              shortcuts={shortcuts}
              darkMode={darkMode}
            />
          </div>
          <button
            onClick={onCreateMemo}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <Plus size={16} />
            <span>新規</span>
          </button>
        </div>
      </div>

      {/* メモコンテンツ */}
      {memos.length === 0 ? (
        <div
          className={`flex-1 flex flex-col items-center justify-center p-8 ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <FileText size={48} className="mb-4 opacity-50" />
          <p className="text-lg mb-2">メモがありません</p>
          <p className="text-sm mb-4">新しいメモを作成して始めましょう</p>
          <button
            onClick={onCreateMemo}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <Plus size={18} />
            <span>最初のメモを作成</span>
          </button>
        </div>
      ) : viewMode === "list" ? (
        // リストビュー（ドラッグ並び替え可能）
        <div className="flex-1 overflow-auto p-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="memo-list">
              {(provided) => (
                <ul
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {memos.map((memo, index) => (
                    <Draggable
                      key={memo.id}
                      draggableId={memo.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            snapshot.isDragging
                              ? darkMode
                                ? "bg-gray-700 border-blue-500 shadow-lg"
                                : "bg-white border-blue-500 shadow-lg"
                              : darkMode
                              ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                              : "bg-white border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {/* ドラッグハンドル */}
                          <div
                            {...provided.dragHandleProps}
                            className={`cursor-grab active:cursor-grabbing ${
                              darkMode ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            <GripVertical size={20} />
                          </div>

                          {/* メモ情報 */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleMemoClick(index)}
                          >
                            <h4
                              className={`font-medium truncate ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {memo.title || "無題のメモ"}
                            </h4>
                            <p
                              className={`text-sm truncate ${
                                darkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {memo.content || "コンテンツなし"}
                            </p>
                          </div>

                          {/* 更新日時 */}
                          <span
                            className={`text-xs whitespace-nowrap ${
                              darkMode ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            {formatDate(memo.updated_at)}
                          </span>

                          {/* 編集・削除ボタン */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMemoClick(index);
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                darkMode
                                  ? "hover:bg-gray-600 text-blue-400"
                                  : "hover:bg-gray-100 text-blue-600"
                              }`}
                              title="編集"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm(
                                    `「${
                                      memo.title || "無題のメモ"
                                    }」を削除しますか？`
                                  )
                                ) {
                                  onDeleteMemo(memo.id);
                                }
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                darkMode
                                  ? "hover:bg-gray-600 text-red-400"
                                  : "hover:bg-gray-100 text-red-600"
                              }`}
                              title="削除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </StrictModeDroppable>
          </DragDropContext>
        </div>
      ) : (
        // スワイパービュー
        <div className="mt-3 flex-1 min-h-0 flex items-center justify-between gap-1 overflow-hidden">
          {/* 前のメモボタン */}
          {memos.length > 1 && (
            <button
              onClick={handlePrev}
              disabled={isBeginning}
              className={`flex-shrink-0 p-1.5 rounded-full transition-all ${
                isBeginning
                  ? "opacity-30 cursor-not-allowed"
                  : darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
                  : "bg-white hover:bg-gray-100 text-gray-700 shadow-lg"
              }`}
              aria-label="前のメモ"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* メモコンテンツエリア */}
          <div className="flex-1 min-h-0 max-h-full overflow-hidden">
            <Swiper
              modules={[Navigation, Pagination, Keyboard, Mousewheel]}
              spaceBetween={16}
              slidesPerView={1}
              keyboard={{ enabled: true }}
              mousewheel={{
                enabled: !isFullscreen,
                forceToAxis: true,
                sensitivity: 0.5,
                releaseOnEdges: true,
                invert: false,
              }}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              onSwiper={setSwiperInstance}
              onSlideChange={handleSlideChange}
              className="h-full max-h-full px-2"
              style={
                {
                  "--swiper-pagination-color": darkMode ? "#3b82f6" : "#2563eb",
                  "--swiper-pagination-bullet-inactive-color": darkMode
                    ? "#4b5563"
                    : "#d1d5db",
                  "--swiper-pagination-bullet-inactive-opacity": "1",
                } as React.CSSProperties
              }
            >
              {memos.map((memo, index) => (
                <SwiperSlide key={memo.id} className="!h-full">
                  <div className="h-full min-h-0 flex flex-col">
                    <MarkdownMemo
                      memo={memo}
                      onUpdate={onUpdateMemo}
                      onDelete={onDeleteMemo}
                      darkMode={darkMode}
                      isActive={index === activeIndex}
                      isFullscreenMode={
                        index === activeIndex ? isFullscreen : false
                      }
                      onToggleFullscreen={
                        index === activeIndex ? toggleFullscreen : undefined
                      }
                      onStartEditing={
                        index === activeIndex ? handleStartEditing : undefined
                      }
                      onNavigatePrev={handlePrev}
                      onNavigateNext={handleNext}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* 次のメモボタン */}
          {memos.length > 1 && (
            <button
              onClick={handleNext}
              disabled={isEnd}
              className={`flex-shrink-0 p-1.5 rounded-full transition-all ${
                isEnd
                  ? "opacity-30 cursor-not-allowed"
                  : darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
                  : "bg-white hover:bg-gray-100 text-gray-700 shadow-lg"
              }`}
              aria-label="次のメモ"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      )}

      {/* キーボードショートカット設定モーダル */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        shortcuts={shortcuts}
        onSave={saveShortcuts}
        onReset={resetShortcuts}
        darkMode={darkMode}
      />
    </div>
  );
}
