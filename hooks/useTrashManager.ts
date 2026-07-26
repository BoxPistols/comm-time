"use client";

import { useState, useCallback } from "react";
import type { TrashedTodoItem, TrashedMemoItem, TodoVersion } from "@/types";

export function useTrashManager() {
  const [trashedTodos, setTrashedTodos] = useState<TrashedTodoItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trashedTodos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return parsed.filter(
            (item: TrashedTodoItem) => new Date(item.deletedAt) > thirtyDaysAgo
          );
        } catch { return []; }
      }
    }
    return [];
  });

  const [trashedMemos, setTrashedMemos] = useState<TrashedMemoItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trashedMemos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return parsed.filter(
            (item: TrashedMemoItem) => new Date(item.deletedAt) > thirtyDaysAgo
          );
        } catch { return []; }
      }
    }
    return [];
  });

  const [todoVersions, setTodoVersions] = useState<TodoVersion[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("todoVersions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return parsed.filter(
            (item: TodoVersion) => new Date(item.timestamp) > thirtyDaysAgo
          );
        } catch { return []; }
      }
    }
    return [];
  });

  const addTodoVersion = useCallback(
    (todoId: string, text: string, changeType: "create" | "update" | "delete") => {
      const newVersion: TodoVersion = {
        id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        todoId, text,
        timestamp: new Date().toISOString(),
        changeType,
      };
      setTodoVersions((prev) => [...prev, newVersion]);
    }, []
  );

  const permanentlyDeleteTodo = useCallback((id: string) => {
    setTrashedTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const emptyTrash = useCallback(() => setTrashedTodos([]), []);

  return {
    trashedTodos, setTrashedTodos,
    trashedMemos, setTrashedMemos,
    todoVersions,
    addTodoVersion,
    permanentlyDeleteTodo,
    emptyTrash,
  };
}
