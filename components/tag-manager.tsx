"use client";

import React, { useState } from "react";
import { Plus, X, Edit, Trash2, Save, Tag as TagIcon } from "lucide-react";
import { type Tag, TAG_COLORS } from "@/types";

interface TagManagerProps {
  tags: Tag[];
  onAddTag: (name: string, color: string) => Tag;
  onUpdateTag: (id: string, name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
  darkMode: boolean;
  onClose: () => void;
}

export function TagManager({
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  darkMode,
  onClose,
}: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].value);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");

  const handleAddTag = () => {
    if (newTagName.trim()) {
      onAddTag(newTagName.trim(), newTagColor);
      setNewTagName("");
      setNewTagColor(TAG_COLORS[0].value);
    }
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color);
  };

  const handleSaveEdit = () => {
    if (editingTagId && editingName.trim()) {
      onUpdateTag(editingTagId, editingName.trim(), editingColor);
      setEditingTagId(null);
      setEditingName("");
      setEditingColor("");
    }
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditingName("");
    setEditingColor("");
  };

  const getTextColorClass = (bgColor: string) => {
    const colorConfig = TAG_COLORS.find((c) => c.value === bgColor);
    return colorConfig?.textColor || "text-white";
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        darkMode
          ? "bg-gray-800/95 border-gray-700"
          : "bg-white/95 border-gray-200"
      } shadow-lg`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className={`font-semibold flex items-center gap-2 ${
            darkMode ? "text-white" : "text-gray-800"
          }`}
        >
          <TagIcon className="w-4 h-4" />
          タグ管理
        </h3>
        <button
          onClick={onClose}
          className={`p-1 rounded-full transition-colors ${
            darkMode
              ? "hover:bg-gray-700 text-gray-400"
              : "hover:bg-gray-100 text-gray-600"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 新規タグ追加 */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="新しいタグ名"
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            }`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                handleAddTag();
              }
            }}
          />
          <button
            onClick={handleAddTag}
            disabled={!newTagName.trim()}
            className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1 ${
              newTagName.trim()
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : darkMode
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>

        {/* カラー選択 */}
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setNewTagColor(color.value)}
              className={`w-6 h-6 rounded-full ${color.value} transition-transform ${
                newTagColor === color.value
                  ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                  : "hover:scale-110"
              }`}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* タグ一覧 */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {tags.length === 0 ? (
          <p
            className={`text-sm text-center py-4 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            タグがありません
          </p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                darkMode ? "bg-gray-700/50" : "bg-gray-50"
              }`}
            >
              {editingTagId === tag.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className={`flex-1 px-2 py-1 rounded border text-sm ${
                      darkMode
                        ? "bg-gray-600 border-gray-500 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    {TAG_COLORS.slice(0, 5).map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setEditingColor(color.value)}
                        className={`w-5 h-5 rounded-full ${color.value} ${
                          editingColor === color.value
                            ? "ring-2 ring-blue-500"
                            : ""
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    className="p-1 text-green-500 hover:text-green-600"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 text-gray-500 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${tag.color} ${getTextColorClass(tag.color)}`}
                  >
                    {tag.name}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => handleStartEdit(tag)}
                    className={`p-1 transition-colors ${
                      darkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteTag(tag.id)}
                    className="p-1 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
