"use client";

import React from "react";
import { Flag, Star } from "lucide-react";
import type { TodoItem, Tag, KanbanStatusColumn } from "@/types";
import { PRIORITY_CONFIG, IMPORTANCE_CONFIG, TAG_COLORS } from "@/lib/constants";

interface TodoMetaBadgesProps {
  todo: TodoItem;
  tagsMap: Map<string, Tag>;
  kanbanStatuses: KanbanStatusColumn[];
}

export function TodoMetaBadges({ todo, tagsMap, kanbanStatuses }: TodoMetaBadgesProps) {
  const hasContent =
    (todo.tagIds && todo.tagIds.length > 0) ||
    (todo.priority && todo.priority !== "none") ||
    (todo.importance && todo.importance !== "none") ||
    (todo.kanbanStatus && todo.kanbanStatus !== "backlog");

  if (!hasContent) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {/* タグ表示 - コンパクト */}
      {todo.tagIds && todo.tagIds.length > 0 && (
        <>
          {todo.tagIds.slice(0, 2).map((tagId) => {
            const tag = tagsMap.get(tagId);
            if (!tag) return null;
            const textColor =
              TAG_COLORS.find((c) => c.value === tag.color)?.textColor ||
              "text-white";
            return (
              <span
                key={tagId}
                className={`text-[10px] px-1 py-0.5 rounded ${tag.color} ${textColor}`}
              >
                {tag.name}
              </span>
            );
          })}
          {todo.tagIds.length > 2 && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              +{todo.tagIds.length - 2}
            </span>
          )}
        </>
      )}
      {/* 優先度バッジ - コンパクト */}
      {todo.priority && todo.priority !== "none" && (
        <span
          className={`text-[10px] px-1 py-0.5 rounded flex items-center ${PRIORITY_CONFIG[todo.priority].badgeClass}`}
          title={`優先度: ${PRIORITY_CONFIG[todo.priority].label}`}
        >
          <Flag className="w-2.5 h-2.5" />
        </span>
      )}
      {/* 重要度バッジ - コンパクト */}
      {todo.importance && todo.importance !== "none" && (
        <span
          className={`text-[10px] px-1 py-0.5 rounded flex items-center ${IMPORTANCE_CONFIG[todo.importance].badgeClass}`}
          title={`重要度: ${IMPORTANCE_CONFIG[todo.importance].label}`}
        >
          <Star className="w-2.5 h-2.5" />
        </span>
      )}
      {/* カンバンステータスバッジ - コンパクト */}
      {todo.kanbanStatus && todo.kanbanStatus !== "backlog" && (
        <span
          className={`text-[10px] px-1 py-0.5 rounded ${
            todo.kanbanStatus === "done"
              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
              : todo.kanbanStatus === "doing"
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
              : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
          }`}
        >
          {kanbanStatuses.find((c) => c.name === todo.kanbanStatus)?.label}
        </span>
      )}
    </div>
  );
}
