"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, Pagination, Keyboard } from "swiper/modules"
import type { Swiper as SwiperType } from "swiper"
import { Plus, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { MarkdownMemo, type MemoData } from "./markdown-memo"

// Swiper CSS
import "swiper/css"
import "swiper/css/navigation"
import "swiper/css/pagination"

interface MemoSwiperProps {
  memos: MemoData[]
  onCreateMemo: () => void
  onUpdateMemo: (id: string, title: string, content: string) => void
  onDeleteMemo: (id: string) => void
  darkMode: boolean
}

export function MemoSwiper({
  memos,
  onCreateMemo,
  onUpdateMemo,
  onDeleteMemo,
  darkMode,
}: MemoSwiperProps) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isBeginning, setIsBeginning] = useState(true)
  const [isEnd, setIsEnd] = useState(false)
  const prevMemosLengthRef = useRef(memos.length)

  // メモが追加されたら最後のスライドに移動
  useEffect(() => {
    // 新しいメモが追加された場合（配列長が増加した場合）のみ、最後に移動
    if (swiperInstance && memos.length > prevMemosLengthRef.current) {
      swiperInstance.slideTo(memos.length - 1)
    }
    // 現在の長さを保存
    prevMemosLengthRef.current = memos.length
  }, [memos.length, swiperInstance])

  const handleSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.activeIndex)
    setIsBeginning(swiper.isBeginning)
    setIsEnd(swiper.isEnd)
  }, [])

  const handlePrev = useCallback(() => {
    swiperInstance?.slidePrev()
  }, [swiperInstance])

  const handleNext = useCallback(() => {
    swiperInstance?.slideNext()
  }, [swiperInstance])

  return (
    <div className="w-full h-full flex flex-col">
      {/* ヘッダー */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        darkMode ? "border-gray-700" : "border-gray-200"
      }`}>
        <div className="flex items-center gap-2">
          <FileText size={20} className={darkMode ? "text-gray-400" : "text-gray-600"} />
          <span className={`font-medium ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
            メモ ({memos.length})
          </span>
          {memos.length > 0 && (
            <span className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              - {activeIndex + 1} / {memos.length}
            </span>
          )}
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
          <span>新規メモ</span>
        </button>
      </div>

      {/* メモコンテンツ */}
      {memos.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center p-8 ${
          darkMode ? "text-gray-400" : "text-gray-500"
        }`}>
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
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* ナビゲーションボタン（左） */}
          {memos.length > 1 && !isBeginning && (
            <button
              onClick={handlePrev}
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-white hover:bg-gray-100 text-gray-700"
              }`}
              aria-label="前のメモ"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* ナビゲーションボタン（右） */}
          {memos.length > 1 && !isEnd && (
            <button
              onClick={handleNext}
              className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-white hover:bg-gray-100 text-gray-700"
              }`}
              aria-label="次のメモ"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <Swiper
            modules={[Navigation, Pagination, Keyboard]}
            spaceBetween={16}
            slidesPerView={1}
            keyboard={{ enabled: true }}
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            onSwiper={setSwiperInstance}
            onSlideChange={handleSlideChange}
            className="h-full px-4 py-4"
            style={{
              // Pagination bullets styling
              "--swiper-pagination-color": darkMode ? "#3b82f6" : "#2563eb",
              "--swiper-pagination-bullet-inactive-color": darkMode ? "#4b5563" : "#d1d5db",
              "--swiper-pagination-bullet-inactive-opacity": "1",
            } as React.CSSProperties}
          >
            {memos.map((memo) => (
              <SwiperSlide key={memo.id} className="pb-8">
                <div className="h-full">
                  <MarkdownMemo
                    memo={memo}
                    onUpdate={onUpdateMemo}
                    onDelete={onDeleteMemo}
                    darkMode={darkMode}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  )
}
