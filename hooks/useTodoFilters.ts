"use client";

import { useState, useMemo } from "react";
import type { TodoItem, FilterState } from "@/types";
import { initialFilterState } from "@/types";

type TodoFiltersOptions = {
  sharedTodos: TodoItem[];
};

export function useTodoFilters({ sharedTodos }: TodoFiltersOptions) {
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);

  const hasActiveFilters = useMemo(() => {
    return filterState.tags.length > 0 ||
      filterState.priority !== "all" ||
      filterState.importance !== "all" ||
      filterState.kanbanStatus !== "all";
  }, [filterState]);

  const [viewMode] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("todoViewMode");
      if (saved === "kanban" || saved === "list") return saved;
    }
    return "list";
  });

  const filteredTodos = useMemo(() => {
    return sharedTodos.filter((todo) => {
      if (filterState.tags.length > 0) {
        const todoTags = todo.tagIds || [];
        if (!filterState.tags.some((tagId) => todoTags.includes(tagId))) return false;
      }
      if (filterState.priority !== "all" && (todo.priority || "none") !== filterState.priority) return false;
      if (filterState.importance !== "all" && (todo.importance || "none") !== filterState.importance) return false;
      if (filterState.kanbanStatus !== "all" && (todo.kanbanStatus || "backlog") !== filterState.kanbanStatus) return false;
      return true;
    });
  }, [sharedTodos, filterState]);

  return { filterState, setFilterState, hasActiveFilters, filteredTodos, viewMode };
}
