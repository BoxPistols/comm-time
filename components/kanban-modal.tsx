"use client";

import React, { useState } from "react";
import { X, Columns, Settings } from "lucide-react";
import { KanbanBoard } from "@/components/kanban-board";
import { KanbanStatusManager } from "@/components/kanban-status-manager";
import type { TodoItem, Tag, KanbanStatus, KanbanStatusColumn } from "@/types";

interface KanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  todos: TodoItem[];
  tags: Tag[];
  kanbanStatuses: KanbanStatusColumn[];
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
  onStatusChange: (todoId: string, kanbanStatus: KanbanStatus) => void;
  onToggleTodo: (id: string) => void;
  onEditTodo: (id: string) => void;
  onAddStatus: (name: string, label: string, color: string) => Promise<KanbanStatusColumn | null>;
  onUpdateStatus: (id: string, updates: Partial<Pick<KanbanStatusColumn, "name" | "label" | "color">>) => Promise<void>;
  onDeleteStatus: (id: string) => Promise<void>;
  onReorderStatuses: (newOrder: KanbanStatusColumn[]) => Promise<void>;
}

export function KanbanModal({
  isOpen,
  onClose,
  darkMode,
  todos,
  tags,
  kanbanStatuses,
  isAuthenticated,
  isSupabaseConfigured,
  onStatusChange,
  onToggleTodo,
  onEditTodo,
  onAddStatus,
  onUpdateStatus,
  onDeleteStatus,
  onReorderStatuses,
}: KanbanModalProps) {
  const [showStatusManager, setShowStatusManager] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* オーバーレイ */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* モーダルコンテンツ */}
        <div
          className={`relative w-[95vw] h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${
            darkMode ? "bg-gray-900" : "bg-white"
          }`}
        >
          {/* ヘッダー */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <h2
              className={`text-xl font-bold flex items-center gap-2 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              <Columns className="w-5 h-5" />
              <span className="hidden sm:inline">カンバンボード</span>
              <span className="sm:hidden">看板</span>
            </h2>
            <div className="flex items-center gap-4">
              {/* ステータス管理ボタン */}
              <button
                onClick={() => setShowStatusManager(true)}
                disabled={!isAuthenticated || !isSupabaseConfigured}
                title={
                  !isAuthenticated || !isSupabaseConfigured
                    ? "ログインするとカスタムステータスを作成できます"
                    : "ステータスを追加・編集・削除できます"
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  !isAuthenticated || !isSupabaseConfigured
                    ? darkMode
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                    : darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                <Settings className="w-4 h-4" />
                ステータス管理
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  darkMode
                    ? "hover:bg-gray-700 text-gray-400"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* カンバンボード */}
          <div className="p-6 h-[calc(90vh-80px)] overflow-auto">
            <KanbanBoard
              todos={todos}
              tags={tags}
              columns={kanbanStatuses}
              darkMode={darkMode}
              onStatusChange={onStatusChange}
              onToggleTodo={onToggleTodo}
              onEditTodo={(id) => {
                onEditTodo(id);
                onClose();
              }}
            />
          </div>
        </div>
      </div>

      {/* ステータス管理モーダル（ログイン時のみ表示） */}
      {showStatusManager && isAuthenticated && isSupabaseConfigured && (
        <KanbanStatusManager
          statuses={kanbanStatuses}
          darkMode={darkMode}
          onClose={() => setShowStatusManager(false)}
          onAddStatus={onAddStatus}
          onUpdateStatus={onUpdateStatus}
          onDeleteStatus={onDeleteStatus}
          onReorderStatuses={onReorderStatuses}
        />
      )}
    </>
  );
}
