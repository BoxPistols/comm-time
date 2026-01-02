"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  X,
  Check,
  Settings,
} from "lucide-react";
import {
  DragDropContext,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";
import { StrictModeDroppable } from "@/components/strict-mode-droppable";
import {
  type KanbanStatusColumn,
  KANBAN_STATUS_COLORS,
} from "@/types";

interface KanbanStatusManagerProps {
  statuses: KanbanStatusColumn[];
  darkMode: boolean;
  onClose: () => void;
  // Hook functions
  onAddStatus: (name: string, label: string, color: string) => Promise<KanbanStatusColumn | null>;
  onUpdateStatus: (id: string, updates: Partial<Pick<KanbanStatusColumn, 'name' | 'label' | 'color'>>) => Promise<void>;
  onDeleteStatus: (id: string) => Promise<void>;
  onReorderStatuses: (newOrder: KanbanStatusColumn[]) => Promise<void>;
}

export function KanbanStatusManager({
  statuses,
  darkMode,
  onClose,
  onAddStatus,
  onUpdateStatus,
  onDeleteStatus,
  onReorderStatuses,
}: KanbanStatusManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("gray");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(statuses);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // ソート順を更新
    const updatedItems = items.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    try {
      setError(null);
      await onReorderStatuses(updatedItems);
    } catch {
      setError("順序の更新に失敗しました");
    }
  };

  const handleAddStatus = async () => {
    if (!newLabel.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const name = newLabel.toLowerCase().replace(/\s+/g, "_");
      const result = await onAddStatus(name, newLabel.trim(), newColor);

      if (result) {
        setNewLabel("");
        setNewColor("gray");
        setIsAddingNew(false);
      } else {
        setError("ステータスの作成に失敗しました");
      }
    } catch {
      setError("ステータスの作成に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStart = (status: KanbanStatusColumn) => {
    setEditingId(status.id);
    setEditingLabel(status.label);
    setEditingColor(status.color);
  };

  const handleEditSave = async () => {
    if (!editingId || !editingLabel.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      await onUpdateStatus(editingId, {
        label: editingLabel.trim(),
        color: editingColor,
      });
      setEditingId(null);
    } catch {
      setError("ステータスの更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const status = statuses.find((s) => s.id === id);
    if (!status) return;

    if (status.isDefault) {
      setError("デフォルトステータスは削除できません");
      return;
    }

    if (!confirm(`「${status.label}」を削除しますか？\n関連するタスクはデフォルトステータスに移動します。`)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onDeleteStatus(id);
    } catch {
      setError("ステータスの削除に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`w-full max-w-md mx-4 rounded-xl shadow-2xl ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="font-semibold">ステータス管理</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="status-list">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {statuses.map((status, index) => (
                    <Draggable
                      key={status.id}
                      draggableId={status.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                            snapshot.isDragging
                              ? "shadow-lg scale-[1.02]"
                              : ""
                          } ${
                            darkMode
                              ? "bg-gray-700/50 border-gray-600"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className={`cursor-grab ${
                              darkMode ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Color Badge */}
                          <div
                            className={`w-4 h-4 rounded-full flex-shrink-0 ${status.bgClass}`}
                          />

                          {editingId === status.id ? (
                            // Edit Mode
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingLabel}
                                onChange={(e) =>
                                  setEditingLabel(e.target.value)
                                }
                                className={`flex-1 px-2 py-1 text-sm rounded border ${
                                  darkMode
                                    ? "bg-gray-800 border-gray-600"
                                    : "bg-white border-gray-300"
                                }`}
                                autoFocus
                              />
                              <select
                                value={editingColor}
                                onChange={(e) =>
                                  setEditingColor(e.target.value)
                                }
                                className={`px-2 py-1 text-sm rounded border ${
                                  darkMode
                                    ? "bg-gray-800 border-gray-600"
                                    : "bg-white border-gray-300"
                                }`}
                              >
                                {KANBAN_STATUS_COLORS.map((c) => (
                                  <option key={c.color} value={c.color}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={handleEditSave}
                                disabled={isSaving}
                                className="p-1 text-green-500 hover:text-green-600"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-gray-500 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            // Display Mode
                            <>
                              <span className="flex-1 text-sm">
                                {status.label}
                                {status.isDefault && (
                                  <span
                                    className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                      darkMode
                                        ? "bg-gray-600 text-gray-300"
                                        : "bg-gray-200 text-gray-600"
                                    }`}
                                  >
                                    デフォルト
                                  </span>
                                )}
                              </span>
                              <button
                                onClick={() => handleEditStart(status)}
                                className={`p-1 rounded transition-colors ${
                                  darkMode
                                    ? "hover:bg-gray-600"
                                    : "hover:bg-gray-200"
                                }`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {!status.isDefault && (
                                <button
                                  onClick={() => handleDelete(status.id)}
                                  className="p-1 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </StrictModeDroppable>
          </DragDropContext>

          {/* Add New Status */}
          {isAddingNew ? (
            <div
              className={`mt-4 p-3 rounded-lg border ${
                darkMode
                  ? "bg-gray-700/50 border-gray-600"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="space-y-3">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="ステータス名"
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    darkMode
                      ? "bg-gray-800 border-gray-600"
                      : "bg-white border-gray-300"
                  }`}
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  {KANBAN_STATUS_COLORS.map((c) => (
                    <button
                      key={c.color}
                      onClick={() => setNewColor(c.color)}
                      className={`w-8 h-8 rounded-full ${c.bgClass} ${
                        newColor === c.color
                          ? "ring-2 ring-offset-2 ring-blue-500"
                          : ""
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddStatus}
                    disabled={isSaving || !newLabel.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    追加
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewLabel("");
                      setNewColor("gray");
                    }}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      darkMode
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingNew(true)}
              className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-colors ${
                darkMode
                  ? "border-gray-600 hover:border-gray-500 text-gray-400"
                  : "border-gray-300 hover:border-gray-400 text-gray-500"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">新しいステータスを追加</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-3 border-t ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <p
            className={`text-xs ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            ドラッグ&ドロップでステータスの順序を変更できます
          </p>
        </div>
      </div>
    </div>
  );
}
