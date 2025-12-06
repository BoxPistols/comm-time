"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from 'react-dom'
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Edit, Eye, Trash2, Save, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react"

export interface MemoData {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

interface MarkdownMemoProps {
    memo: MemoData
    onUpdate: (id: string, title: string, content: string) => void
    onDelete: (id: string) => void
    darkMode: boolean
    isActive?: boolean // このメモがアクティブ（表示中）かどうか
    onToggleFullscreen?: () => void // 親から全画面切り替えをコールバック
    onStartEditing?: () => void // 親から編集モード開始をコールバック
    isFullscreenMode?: boolean // 親から制御される全画面状態
    onNavigatePrev?: () => void // 全画面モードで前のメモへ
    onNavigateNext?: () => void // 全画面モードで次のメモへ
}

export function MarkdownMemo({
    memo,
    onUpdate,
    onDelete,
    darkMode,
    onToggleFullscreen,
    onStartEditing,
    isFullscreenMode,
    onNavigatePrev,
    onNavigateNext,
}: MarkdownMemoProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [title, setTitle] = useState(memo.title)
    const [content, setContent] = useState(memo.content)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    // 内部の全画面状態（親から制御されない場合に使用）
    const [internalFullscreen, setInternalFullscreen] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isComposingRef = useRef(false)

    // 全画面状態（親から制御される場合はそちらを優先）
    const isFullscreen =
        isFullscreenMode !== undefined ? isFullscreenMode : internalFullscreen

    // メモが更新されたら状態を同期（編集中でない場合のみ）
    useEffect(() => {
        // 編集中でない場合のみ、外部からの変更を同期する
        if (!isEditing) {
            setTitle(memo.title)
            setContent(memo.content)
        }
    }, [memo.title, memo.content, isEditing])

    // IME変換状態の監視
    useEffect(() => {
        const handleCompositionStart = () => {
            isComposingRef.current = true
        }
        const handleCompositionEnd = () => {
            isComposingRef.current = false
        }

        document.addEventListener('compositionstart', handleCompositionStart)
        document.addEventListener('compositionend', handleCompositionEnd)

        return () => {
            document.removeEventListener('compositionstart', handleCompositionStart)
            document.removeEventListener('compositionend', handleCompositionEnd)
        }
    }, [])

    // 編集モードに入ったらテキストエリアにフォーカス
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [isEditing])

    // 自動保存（2秒のデバウンス）
    useEffect(() => {
        if (!isEditing) return

        // 前回のタイムアウトをクリア
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current)
        }

        // 変更があったかチェック
        const hasChanges = title !== memo.title || content !== memo.content

        if (hasChanges) {
            // 2秒後に自動保存
            autoSaveTimeoutRef.current = setTimeout(() => {
                onUpdate(memo.id, title, content)
            }, 2000)
        }

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
            }
        }
    }, [title, content, isEditing, memo.id, memo.title, memo.content, onUpdate])

    const handleSave = useCallback(() => {
        onUpdate(memo.id, title, content)
        setIsEditing(false)
    }, [memo.id, title, content, onUpdate])

    const handleCancel = useCallback(() => {
        setTitle(memo.title)
        setContent(memo.content)
        setIsEditing(false)
    }, [memo.title, memo.content])

    const handleDelete = useCallback(() => {
        onDelete(memo.id)
        setShowDeleteConfirm(false)
    }, [memo.id, onDelete])

    // キーボードショートカット（入力フィールド内でのみ有効）
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            // Cmd+S または Ctrl+S で保存
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
                return
            }
            // Cmd+E または Ctrl+E で編集モード切り替え
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault()
                if (isEditing) {
                    handleSave()
                } else {
                    startEditing()
                }
                return
            }
            // Cmd+F または Ctrl+F で全画面切り替え
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault()
                toggleFullscreen()
                return
            }
        },
        [handleSave, isEditing, startEditing, toggleFullscreen]
    )

    // 全画面モードの切り替え
    const toggleFullscreen = useCallback(() => {
        if (onToggleFullscreen) {
            onToggleFullscreen()
        } else {
            setInternalFullscreen((prev) => !prev)
        }
    }, [onToggleFullscreen])

    // 編集モード開始
    const startEditing = useCallback(() => {
        if (onStartEditing) {
            onStartEditing()
        }
        setIsEditing(true)
    }, [onStartEditing])

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    // 全画面モード用のコンテンツ
    const memoContent = (
        <div
            className={`flex flex-col rounded-lg border ${
                darkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
            }`}
        >
            {/* ヘッダー */}
            <div
                className={`flex-shrink-0 flex items-center justify-between p-3 border-b ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
            >
                {isEditing ? (
                    <input
                        ref={titleInputRef}
                        type='text'
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder='タイトルを入力...'
                        className={`flex-1 text-lg font-semibold bg-transparent border-none outline-none ${
                            darkMode
                                ? 'text-white placeholder-gray-500'
                                : 'text-gray-900 placeholder-gray-400'
                        }`}
                        onKeyDown={handleKeyDown}
                    />
                ) : (
                    <h3
                        className={`text-lg font-semibold truncate flex-1 ${
                            darkMode ? 'text-white' : 'text-gray-900'
                        }`}
                    >
                        {title || '無題のメモ'}
                    </h3>
                )}

                <div className='flex items-center gap-2 ml-2'>
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                className={`p-1.5 rounded transition-colors ${
                                    darkMode
                                        ? 'hover:bg-gray-700 text-green-400'
                                        : 'hover:bg-gray-100 text-green-600'
                                }`}
                                title='保存 (Ctrl+S)'
                            >
                                <Save size={18} />
                            </button>
                            <button
                                onClick={handleCancel}
                                className={`p-1.5 rounded transition-colors text-sm ${
                                    darkMode
                                        ? 'hover:bg-gray-700 text-gray-400'
                                        : 'hover:bg-gray-100 text-gray-500'
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
                                        ? 'hover:bg-gray-700 text-blue-400'
                                        : 'hover:bg-gray-100 text-blue-600'
                                }`}
                                title='編集 (Ctrl+E)'
                            >
                                <Edit size={18} />
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className={`p-1.5 rounded transition-colors ${
                                    darkMode
                                        ? 'hover:bg-gray-700 text-purple-400'
                                        : 'hover:bg-gray-100 text-purple-600'
                                }`}
                                title={
                                    isFullscreen
                                        ? '縮小 (Ctrl+Esc)'
                                        : '全画面表示 (Ctrl+F)'
                                }
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
                                        ? 'hover:bg-gray-700 text-red-400'
                                        : 'hover:bg-gray-100 text-red-600'
                                }`}
                                title='削除'
                            >
                                <Trash2 size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* コンテンツエリア */}
            <div className='flex-1 overflow-auto p-4'>
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder='Markdownで記述できます...'
                        className={`w-full h-full min-h-[200px] resize-none bg-transparent border-none outline-none font-mono text-sm leading-relaxed ${
                            darkMode
                                ? 'text-gray-100 placeholder-gray-500'
                                : 'text-gray-800 placeholder-gray-400'
                        }`}
                        onKeyDown={handleKeyDown}
                    />
                ) : (
                    <div
                        className={`prose prose-sm max-w-none ${
                            darkMode ? 'prose-invert' : ''
                        }`}
                        onClick={startEditing}
                    >
                        {content ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    input: (props) => {
                                        if (props.type === 'checkbox') {
                                            return (
                                                <input
                                                    {...props}
                                                    className={`w-5 h-5 rounded border-2 cursor-pointer mx-1 transition-colors ${
                                                        darkMode
                                                            ? 'border-gray-500 checked:bg-blue-600 checked:border-blue-600 hover:border-gray-400'
                                                            : 'border-gray-300 checked:bg-blue-500 checked:border-blue-500 hover:border-gray-400'
                                                    }`}
                                                />
                                            )
                                        }
                                        return <input {...props} />
                                    }
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        ) : (
                            <p
                                className={`italic ${
                                    darkMode ? 'text-gray-500' : 'text-gray-400'
                                }`}
                            >
                                クリックして編集を開始...
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* フッター（更新日時） */}
            <div
                className={`flex-shrink-0 px-3 py-2 text-xs border-t ${
                    darkMode
                        ? 'border-gray-700 text-gray-500'
                        : 'border-gray-200 text-gray-400'
                }`}
            >
                {isEditing ? (
                    <div className='flex items-center gap-2'>
                        <Eye size={12} />
                        <span>Markdownプレビューは保存後に表示されます</span>
                    </div>
                ) : (
                    <span>更新: {formatDate(memo.updated_at)}</span>
                )}
            </div>

            {/* 削除確認ダイアログ */}
            {showDeleteConfirm && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
                    <div
                        className={`p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 ${
                            darkMode ? 'bg-gray-800' : 'bg-white'
                        }`}
                    >
                        <h4
                            className={`text-lg font-semibold mb-2 ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}
                        >
                            メモを削除しますか？
                        </h4>
                        <p
                            className={`text-sm mb-4 ${
                                darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}
                        >
                            「{title || '無題のメモ'}
                            」を削除します。この操作は取り消せません。
                        </p>
                        <div className='flex justify-end gap-2'>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className={`px-4 py-2 rounded text-sm ${
                                    darkMode
                                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDelete}
                                className='px-4 py-2 rounded text-sm bg-red-600 hover:bg-red-700 text-white'
                            >
                                削除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    // 全画面モードの場合はモーダルオーバーレイとして表示（Portalを使用）
    if (isFullscreen) {
        if (typeof document === 'undefined') return null

        return createPortal(
            <div
                className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm'
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onToggleFullscreen?.()
                    }
                }}
                onKeyDown={(e) => {
                    // テキスト入力要素がフォーカスされている場合は矢印キーを処理しない
                    const activeElement = document.activeElement
                    const isInputFocused = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
                    const isEditing = isInputFocused || isComposingRef.current

                    if (e.key === 'Escape') {
                        e.preventDefault()
                        onToggleFullscreen?.()
                    } else if (!isEditing && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
                        e.preventDefault()
                        // Swiperに右矢印を送る
                        document.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'ArrowRight',
                            bubbles: true
                        }))
                    } else if (!isEditing && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
                        e.preventDefault()
                        document.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'ArrowLeft',
                            bubbles: true
                        }))
                    }
                }}
                tabIndex={0}
            >
                <div
                    className='w-[90vw] h-[90vh] flex items-center justify-center gap-2'
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 左矢印 */}
                    <button
                        onClick={onNavigatePrev}
                        className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                            darkMode
                                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                                : 'hover:bg-gray-200 text-gray-600 hover:text-gray-800'
                        }`}
                        title='前のメモ (←)'
                    >
                        <ChevronLeft size={24} />
                    </button>

                    {/* メモコンテンツ */}
                    <div
                        className={`flex-1 flex flex-col rounded-xl shadow-2xl overflow-hidden h-full ${
                            darkMode ? 'bg-gray-900' : 'bg-gray-50'
                        }`}
                    >
                        {memoContent}
                    </div>

                    {/* 右矢印 */}
                    <button
                        onClick={onNavigateNext}
                        className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                            darkMode
                                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                                : 'hover:bg-gray-200 text-gray-600 hover:text-gray-800'
                        }`}
                        title='次のメモ (→)'
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>,
            document.body
        )
    }

    return memoContent
}
