"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from 'react-dom'
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Edit, Eye, Trash2, Save, Maximize2, Minimize2 } from "lucide-react"

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
}

export function MarkdownMemo({
    memo,
    onUpdate,
    onDelete,
    darkMode,
    onToggleFullscreen,
    onStartEditing,
    isFullscreenMode,
}: MarkdownMemoProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [title, setTitle] = useState(memo.title)
    const [content, setContent] = useState(memo.content)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    // 内部の全画面状態（親から制御されない場合に使用）
    const [internalFullscreen, setInternalFullscreen] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)

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

    // 編集モードに入ったらテキストエリアにフォーカス
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [isEditing])

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
        },
        [handleSave]
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
                isFullscreen ? 'h-full' : 'h-full'
            } ${
                darkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
            }`}
        >
            {/* ヘッダー */}
            <div
                className={`flex items-center justify-between p-3 border-b ${
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
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                className={`px-3 py-2 text-xs border-t ${
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
            >
                <div
                    className={`w-[90vw] h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden ${
                        darkMode ? 'bg-gray-900' : 'bg-gray-50'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                >
                    {memoContent}
                </div>
            </div>,
            document.body
        )
    }

    return memoContent
}
