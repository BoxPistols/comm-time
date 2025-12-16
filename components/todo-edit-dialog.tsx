"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Tag as TagIcon, Flag, Star, Columns } from "lucide-react";
import {
  type Tag,
  type PriorityLevel,
  type ImportanceLevel,
  type KanbanStatus,
  PRIORITY_CONFIG,
  IMPORTANCE_CONFIG,
  KANBAN_COLUMNS,
  TAG_COLORS,
} from "@/types";

interface TodoItem {
  id: string;
  text: string;
  isCompleted: boolean;
  dueDate?: string;
  dueTime?: string;
  tagIds?: string[];
  priority?: PriorityLevel;
  importance?: ImportanceLevel;
  kanbanStatus?: KanbanStatus;
}

interface TodoEditDialogProps {
  todo: TodoItem | null;
  tags: Tag[];
  darkMode: boolean;
  onSave: (
    todoId: string,
    updates: {
      tagIds?: string[];
      priority?: PriorityLevel;
      importance?: ImportanceLevel;
      kanbanStatus?: KanbanStatus;
    }
  ) => void;
  onClose: () => void;
}

export function TodoEditDialog({
  todo,
  tags,
  darkMode,
  onSave,
  onClose,
}: TodoEditDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priority, setPriority] = useState<PriorityLevel>("none");
  const [importance, setImportance] = useState<ImportanceLevel>("none");
  const [kanbanStatus, setKanbanStatus] = useState<KanbanStatus>("backlog");

  useEffect(() => {
    if (todo) {
      setSelectedTags(todo.tagIds || []);
      setPriority(todo.priority || "none");
      setImportance(todo.importance || "none");
      setKanbanStatus(todo.kanbanStatus || "backlog");
    }
  }, [todo]);

  if (!todo) return null;

  const handleSave = () => {
    onSave(todo.id, {
      tagIds: selectedTags,
      priority,
      importance,
      kanbanStatus,
    });
    onClose();
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const getTextColorClass = (bgColor: string) => {
    const colorConfig = TAG_COLORS.find((c) => c.value === bgColor);
    return colorConfig?.textColor || "text-white";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border ${
          darkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        {/* ヘッダー */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h3
            className={`font-semibold ${
              darkMode ? "text-white" : "text-gray-800"
            }`}
          >
            TODO詳細設定
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition-colors ${
              darkMode
                ? "hover:bg-gray-700 text-gray-400"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* TODO内容表示 */}
          <div
            className={`p-3 rounded-lg ${
              darkMode ? "bg-gray-700/50" : "bg-gray-50"
            }`}
          >
            <p
              className={`text-sm ${
                darkMode ? "text-gray-200" : "text-gray-800"
              }`}
            >
              {todo.text}
            </p>
          </div>

          {/* タグ選択 */}
          <div>
            <h4
              className={`text-sm font-medium mb-2 flex items-center gap-1 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <TagIcon className="w-4 h-4" />
              タグ
            </h4>
            {tags.length === 0 ? (
              <p
                className={`text-xs ${
                  darkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                タグがありません（タグ管理から追加してください）
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-2 py-1 rounded-full text-sm font-medium transition-all ${
                      selectedTags.includes(tag.id)
                        ? `${tag.color} ${getTextColorClass(tag.color)} ring-2 ring-blue-500`
                        : darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 優先度選択 */}
          <div>
            <h4
              className={`text-sm font-medium mb-2 flex items-center gap-1 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <Flag className="w-4 h-4" />
              優先度
            </h4>
            <div className="flex flex-wrap gap-2">
              {(["none", "low", "medium", "high"] as PriorityLevel[]).map(
                (level) => (
                  <button
                    key={level}
                    onClick={() => setPriority(level)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      priority === level
                        ? level === "none"
                          ? "bg-gray-500 text-white"
                          : level === "high"
                          ? "bg-red-500 text-white"
                          : level === "medium"
                          ? "bg-yellow-500 text-black"
                          : "bg-blue-500 text-white"
                        : darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {PRIORITY_CONFIG[level].icon} {PRIORITY_CONFIG[level].label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 重要度選択 */}
          <div>
            <h4
              className={`text-sm font-medium mb-2 flex items-center gap-1 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <Star className="w-4 h-4" />
              重要度
            </h4>
            <div className="flex flex-wrap gap-2">
              {(["none", "low", "medium", "high"] as ImportanceLevel[]).map(
                (level) => (
                  <button
                    key={level}
                    onClick={() => setImportance(level)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      importance === level
                        ? level === "none"
                          ? "bg-gray-500 text-white"
                          : level === "high"
                          ? "bg-red-500 text-white"
                          : level === "medium"
                          ? "bg-yellow-500 text-black"
                          : "bg-blue-500 text-white"
                        : darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {IMPORTANCE_CONFIG[level].icon}{" "}
                    {IMPORTANCE_CONFIG[level].label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* カンバンステータス選択 */}
          <div>
            <h4
              className={`text-sm font-medium mb-2 flex items-center gap-1 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <Columns className="w-4 h-4" />
              ステータス
            </h4>
            <div className="flex flex-wrap gap-2">
              {KANBAN_COLUMNS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setKanbanStatus(col.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    kanbanStatus === col.id
                      ? col.id === "backlog"
                        ? "bg-gray-500 text-white"
                        : col.id === "todo"
                        ? "bg-blue-500 text-white"
                        : col.id === "doing"
                        ? "bg-yellow-500 text-black"
                        : "bg-green-500 text-white"
                      : darkMode
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div
          className={`flex justify-end gap-2 p-4 border-t ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
