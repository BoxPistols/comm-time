"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Edit, Eye, Trash2, Save } from "lucide-react"

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
}

export function MarkdownMemo({ memo, onUpdate, onDelete, darkMode }: MarkdownMemoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(memo.title)
  const [content, setContent] = useState(memo.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // メモが更新されたら状態を同期
  useEffect(() => {
    setTitle(memo.title)
    setContent(memo.content)
  }, [memo.title, memo.content])

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

  // キーボードショートカット
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
  }, [handleCancel, handleSave])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div
      className={`h-full flex flex-col rounded-lg border ${
        darkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }`}
    >
      {/* ヘッダー */}
      <div className={`flex items-center justify-between p-3 border-b ${
        darkMode ? "border-gray-700" : "border-gray-200"
      }`}>
        {isEditing ? (
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトルを入力..."
            className={`flex-1 text-lg font-semibold bg-transparent border-none outline-none ${
              darkMode ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"
            }`}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <h3 className={`text-lg font-semibold truncate flex-1 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
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
                title="保存 (Ctrl+S)"
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
                onClick={() => setIsEditing(true)}
                className={`p-1.5 rounded transition-colors ${
                  darkMode
                    ? "hover:bg-gray-700 text-blue-400"
                    : "hover:bg-gray-100 text-blue-600"
                }`}
                title="編集"
              >
                <Edit size={18} />
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
      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Markdownで記述できます..."
            className={`w-full h-full min-h-[200px] resize-none bg-transparent border-none outline-none font-mono text-sm leading-relaxed ${
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
            onClick={() => setIsEditing(true)}
          >
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p className={`italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                クリックして編集を開始...
              </p>
            )}
          </div>
        )}
      </div>

      {/* フッター（更新日時） */}
      <div className={`px-3 py-2 text-xs border-t ${
        darkMode
          ? "border-gray-700 text-gray-500"
          : "border-gray-200 text-gray-400"
      }`}>
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
          <div className={`p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
            <h4 className={`text-lg font-semibold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              メモを削除しますか？
            </h4>
            <p className={`text-sm mb-4 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}>
              「{title || "無題のメモ"}」を削除します。この操作は取り消せません。
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
  )
}
