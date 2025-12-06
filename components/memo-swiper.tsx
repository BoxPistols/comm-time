"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, Pagination, Keyboard } from "swiper/modules"
import type { Swiper as SwiperType } from "swiper"
import {
    Plus,
    FileText,
    ChevronLeft,
    ChevronRight,
    List,
    Grid,
    GripVertical,
} from 'lucide-react'
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from 'react-beautiful-dnd'
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
    onReorderMemos?: (memos: MemoData[]) => void
    darkMode: boolean
}

export function MemoSwiper({
    memos,
    onCreateMemo,
    onUpdateMemo,
    onDeleteMemo,
    onReorderMemos,
    darkMode,
}: MemoSwiperProps) {
    const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(
        null
    )
    const [activeIndex, setActiveIndex] = useState(0)
    const [isBeginning, setIsBeginning] = useState(true)
    const [isEnd, setIsEnd] = useState(false)
    const prevMemosLengthRef = useRef(memos.length)

    // 表示モード: 'swiper' | 'list'
    const [viewMode, setViewMode] = useState<'swiper' | 'list'>('swiper')
    // 全画面表示状態（アクティブなメモのみ）
    const [isFullscreen, setIsFullscreen] = useState(false)
    // IME変換中フラグ
    const isComposingRef = useRef(false)
    // コンテナRef
    const containerRef = useRef<HTMLDivElement>(null)
    // StrictMode対応
    const [droppableEnabled, setDroppableEnabled] = useState(false)

    // メモが追加されたら最後のスライド（右端）に移動
    useEffect(() => {
        // 新しいメモが追加された場合（配列長が増加した場合）のみ、最後に移動
        if (swiperInstance && memos.length > prevMemosLengthRef.current) {
            // 最後のスライド（右端）に移動
            setTimeout(() => {
                swiperInstance.slideTo(memos.length - 1, 300)
            }, 100)
        }
        // 現在の長さを保存
        prevMemosLengthRef.current = memos.length
    }, [memos.length, swiperInstance])

    // StrictMode対応: Droppableを遅延有効化
    useEffect(() => {
        const animation = requestAnimationFrame(() => setDroppableEnabled(true))
        return () => {
            cancelAnimationFrame(animation)
            setDroppableEnabled(false)
        }
    }, [])

    // IME変換状態の監視
    useEffect(() => {
        const handleCompositionStart = () => {
            isComposingRef.current = true
        }

        const handleCompositionEnd = () => {
            isComposingRef.current = false
        }

        window.addEventListener('compositionstart', handleCompositionStart)
        window.addEventListener('compositionend', handleCompositionEnd)

        return () => {
            window.removeEventListener(
                'compositionstart',
                handleCompositionStart
            )
            window.removeEventListener('compositionend', handleCompositionEnd)
        }
    }, [])

    // グローバルキーボードショートカット
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // IME変換中は無視
            if (isComposingRef.current || e.isComposing) {
                return
            }

            // メモがない場合は無視
            if (memos.length === 0) {
                return
            }

            // Ctrl+Esc または Cmd+Esc で全画面表示を解除
            if (
                (e.ctrlKey || e.metaKey) &&
                e.key === 'Escape' &&
                isFullscreen
            ) {
                e.preventDefault()
                setIsFullscreen(false)
                return
            }

            // Ctrl+F または Cmd+F で全画面表示を切り替え
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault()
                setIsFullscreen((prev) => !prev)
                return
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown)
        }
    }, [memos.length, isFullscreen])

    const handleSlideChange = useCallback((swiper: SwiperType) => {
        setActiveIndex(swiper.activeIndex)
        setIsBeginning(swiper.isBeginning)
        setIsEnd(swiper.isEnd)
        // スライド変更時は全画面表示を解除
        if (isFullscreen) {
            setIsFullscreen(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handlePrev = useCallback(() => {
        swiperInstance?.slidePrev()
    }, [swiperInstance])

    const handleNext = useCallback(() => {
        swiperInstance?.slideNext()
    }, [swiperInstance])

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen((prev) => !prev)
    }, [])

    // ドラッグ&ドロップの処理
    const handleDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return

            const items = Array.from(memos)
            const [reorderedItem] = items.splice(result.source.index, 1)
            items.splice(result.destination.index, 0, reorderedItem)

            if (onReorderMemos) {
                onReorderMemos(items)
            }
        },
        [memos, onReorderMemos]
    )

    // リストビューでメモをクリックしたらスワイパービューに切り替え
    const handleMemoClick = useCallback(
        (index: number) => {
            setViewMode('swiper')
            setTimeout(() => {
                swiperInstance?.slideTo(index, 300)
            }, 100)
        },
        [swiperInstance]
    )

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    return (
        <div ref={containerRef} className='w-full h-full flex flex-col'>
            {/* ヘッダー */}
            <div
                className={`flex items-center justify-between px-4 py-3 border-b ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
            >
                <div className='flex items-center gap-2'>
                    <FileText
                        size={20}
                        className={darkMode ? 'text-gray-400' : 'text-gray-600'}
                    />
                    <span
                        className={`font-medium ${
                            darkMode ? 'text-gray-200' : 'text-gray-700'
                        }`}
                    >
                        メモ ({memos.length})
                    </span>
                    {viewMode === 'swiper' && memos.length > 0 && (
                        <span
                            className={`text-sm ${
                                darkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}
                        >
                            - {activeIndex + 1} / {memos.length}
                        </span>
                    )}
                </div>
                <div className='flex items-center gap-2'>
                    {/* 表示モード切替ボタン */}
                    {memos.length > 0 && (
                        <div
                            className={`flex rounded-lg overflow-hidden border ${
                                darkMode ? 'border-gray-600' : 'border-gray-300'
                            }`}
                        >
                            <button
                                onClick={() => setViewMode('swiper')}
                                className={`p-1.5 transition-colors ${
                                    viewMode === 'swiper'
                                        ? darkMode
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-500 text-white'
                                        : darkMode
                                        ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title='スライド表示'
                            >
                                <Grid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 transition-colors ${
                                    viewMode === 'list'
                                        ? darkMode
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-500 text-white'
                                        : darkMode
                                        ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title='リスト表示（並び替え可能）'
                            >
                                <List size={16} />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={onCreateMemo}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            darkMode
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
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
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                >
                    <FileText size={48} className='mb-4 opacity-50' />
                    <p className='text-lg mb-2'>メモがありません</p>
                    <p className='text-sm mb-4'>
                        新しいメモを作成して始めましょう
                    </p>
                    <button
                        onClick={onCreateMemo}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            darkMode
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                        <Plus size={18} />
                        <span>最初のメモを作成</span>
                    </button>
                </div>
            ) : viewMode === 'list' ? (
                // リストビュー（ドラッグ並び替え可能）
                <div className='flex-1 overflow-auto p-4'>
                    <DragDropContext onDragEnd={handleDragEnd}>
                        {droppableEnabled && (
                            <Droppable droppableId='memo-list'>
                                {(provided) => (
                                    <ul
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className='space-y-2'
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
                                                                    ? 'bg-gray-700 border-blue-500 shadow-lg'
                                                                    : 'bg-white border-blue-500 shadow-lg'
                                                                : darkMode
                                                                ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        {/* ドラッグハンドル */}
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className={`cursor-grab active:cursor-grabbing ${
                                                                darkMode
                                                                    ? 'text-gray-500'
                                                                    : 'text-gray-400'
                                                            }`}
                                                        >
                                                            <GripVertical
                                                                size={20}
                                                            />
                                                        </div>

                                                        {/* メモ情報 */}
                                                        <div
                                                            className='flex-1 min-w-0 cursor-pointer'
                                                            onClick={() =>
                                                                handleMemoClick(
                                                                    index
                                                                )
                                                            }
                                                        >
                                                            <h4
                                                                className={`font-medium truncate ${
                                                                    darkMode
                                                                        ? 'text-white'
                                                                        : 'text-gray-900'
                                                                }`}
                                                            >
                                                                {memo.title ||
                                                                    '無題のメモ'}
                                                            </h4>
                                                            <p
                                                                className={`text-sm truncate ${
                                                                    darkMode
                                                                        ? 'text-gray-400'
                                                                        : 'text-gray-500'
                                                                }`}
                                                            >
                                                                {memo.content ||
                                                                    'コンテンツなし'}
                                                            </p>
                                                        </div>

                                                        {/* 更新日時 */}
                                                        <span
                                                            className={`text-xs whitespace-nowrap ${
                                                                darkMode
                                                                    ? 'text-gray-500'
                                                                    : 'text-gray-400'
                                                            }`}
                                                        >
                                                            {formatDate(
                                                                memo.updated_at
                                                            )}
                                                        </span>
                                                    </li>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </ul>
                                )}
                            </Droppable>
                        )}
                    </DragDropContext>
                </div>
            ) : (
                // スワイパービュー
                <div className='flex-1 relative overflow-hidden'>
                    {/* ナビゲーションボタン（左） */}
                    {memos.length > 1 && !isBeginning && (
                        <button
                            onClick={handlePrev}
                            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all ${
                                darkMode
                                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                    : 'bg-white hover:bg-gray-100 text-gray-700'
                            }`}
                            aria-label='前のメモ'
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
                                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                    : 'bg-white hover:bg-gray-100 text-gray-700'
                            }`}
                            aria-label='次のメモ'
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
                        className='h-full px-4 py-4'
                        style={
                            {
                                '--swiper-pagination-color': darkMode
                                    ? '#3b82f6'
                                    : '#2563eb',
                                '--swiper-pagination-bullet-inactive-color':
                                    darkMode ? '#4b5563' : '#d1d5db',
                                '--swiper-pagination-bullet-inactive-opacity':
                                    '1',
                            } as React.CSSProperties
                        }
                    >
                        {memos.map((memo, index) => (
                            <SwiperSlide key={memo.id} className='pb-8'>
                                <div className='h-full'>
                                    <MarkdownMemo
                                        memo={memo}
                                        onUpdate={onUpdateMemo}
                                        onDelete={onDeleteMemo}
                                        darkMode={darkMode}
                                        isFullscreenMode={
                                            index === activeIndex
                                                ? isFullscreen
                                                : false
                                        }
                                        onToggleFullscreen={
                                            index === activeIndex
                                                ? toggleFullscreen
                                                : undefined
                                        }
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
