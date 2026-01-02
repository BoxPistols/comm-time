"use client";

import React from "react";
import { X, Filter, Tag as TagIcon, Flag, Star, Columns } from "lucide-react";
import {
  type Tag,
  type FilterState,
  type PriorityLevel,
  type ImportanceLevel,
  type KanbanStatus,
  type KanbanStatusColumn,
  PRIORITY_CONFIG,
  IMPORTANCE_CONFIG,
  DEFAULT_KANBAN_COLUMNS,
  TAG_COLORS,
} from "@/types";

interface FilterPanelProps {
  tags: Tag[];
  columns?: KanbanStatusColumn[];
  filterState: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  darkMode: boolean;
  onClose: () => void;
}

export function FilterPanel({
  tags,
  columns = DEFAULT_KANBAN_COLUMNS,
  filterState,
  onFilterChange,
  darkMode,
  onClose,
}: FilterPanelProps) {
  const handleTagToggle = (tagId: string) => {
    const newTags = filterState.tags.includes(tagId)
      ? filterState.tags.filter((id) => id !== tagId)
      : [...filterState.tags, tagId];
    onFilterChange({ ...filterState, tags: newTags });
  };

  const handlePriorityChange = (priority: PriorityLevel | "all") => {
    onFilterChange({ ...filterState, priority });
  };

  const handleImportanceChange = (importance: ImportanceLevel | "all") => {
    onFilterChange({ ...filterState, importance });
  };

  const handleKanbanStatusChange = (kanbanStatus: KanbanStatus | "all") => {
    onFilterChange({ ...filterState, kanbanStatus });
  };

  const clearAllFilters = () => {
    onFilterChange({
      tags: [],
      priority: "all",
      importance: "all",
      kanbanStatus: "all",
    });
  };

  const hasActiveFilters =
    filterState.tags.length > 0 ||
    filterState.priority !== "all" ||
    filterState.importance !== "all" ||
    filterState.kanbanStatus !== "all";

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
          <Filter className="w-4 h-4" />
          フィルター
        </h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              クリア
            </button>
          )}
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
      </div>

      {/* タグフィルター */}
      <div className="mb-4">
        <h4
          className={`text-sm font-medium mb-2 flex items-center gap-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <TagIcon className="w-3 h-3" />
          タグ
        </h4>
        {tags.length === 0 ? (
          <p
            className={`text-xs ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            タグがありません
          </p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${tag.color} ${getTextColorClass(tag.color)} ${
                  filterState.tags.includes(tag.id)
                    ? "ring-2 ring-offset-1 ring-blue-500 scale-105"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 優先度フィルター */}
      <div className="mb-4">
        <h4
          className={`text-sm font-medium mb-2 flex items-center gap-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <Flag className="w-3 h-3" />
          優先度
        </h4>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handlePriorityChange("all")}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
              filterState.priority === "all"
                ? "bg-blue-500 text-white ring-2 ring-offset-1 ring-blue-500"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            -
          </button>
          {(["low", "medium", "high"] as PriorityLevel[]).map(
            (level) => (
              <button
                key={level}
                onClick={() => handlePriorityChange(level)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  filterState.priority === level
                    ? `${PRIORITY_CONFIG[level].activeClass} ring-2 ring-offset-1 ring-blue-500`
                    : `${PRIORITY_CONFIG[level].badgeClass} hover:opacity-80`
                }`}
              >
                {PRIORITY_CONFIG[level].label}
              </button>
            )
          )}
        </div>
      </div>

      {/* 重要度フィルター */}
      <div className="mb-4">
        <h4
          className={`text-sm font-medium mb-2 flex items-center gap-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <Star className="w-3 h-3" />
          重要度
        </h4>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handleImportanceChange("all")}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
              filterState.importance === "all"
                ? "bg-blue-500 text-white ring-2 ring-offset-1 ring-blue-500"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            -
          </button>
          {(["low", "medium", "high"] as ImportanceLevel[]).map(
            (level) => (
              <button
                key={level}
                onClick={() => handleImportanceChange(level)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  filterState.importance === level
                    ? `${IMPORTANCE_CONFIG[level].activeClass} ring-2 ring-offset-1 ring-blue-500`
                    : `${IMPORTANCE_CONFIG[level].badgeClass} hover:opacity-80`
                }`}
              >
                {IMPORTANCE_CONFIG[level].label}
              </button>
            )
          )}
        </div>
      </div>

      {/* カンバンステータスフィルター */}
      <div>
        <h4
          className={`text-sm font-medium mb-2 flex items-center gap-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <Columns className="w-3 h-3" />
          ステータス
        </h4>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handleKanbanStatusChange("all")}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
              filterState.kanbanStatus === "all"
                ? "bg-blue-500 text-white"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            すべて
          </button>
          {columns.map((col) => (
            <button
              key={col.id}
              onClick={() => handleKanbanStatusChange(col.name)}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                filterState.kanbanStatus === col.name
                  ? col.activeClass
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
  );
}
