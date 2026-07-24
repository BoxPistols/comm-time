"use client";

import { useState, useCallback } from "react";

type UseTodoEventLinksResult = {
  linking: boolean;
  error: string | null;
  linkTodo: (todoId: string, eventKey: string) => Promise<boolean>;
  unlinkTodo: (todoId: string, eventKey: string) => Promise<boolean>;
};

export function useTodoEventLinks(onChanged?: () => void): UseTodoEventLinksResult {
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkTodo = useCallback(
    async (todoId: string, eventKey: string): Promise<boolean> => {
      setLinking(true);
      setError(null);
      try {
        const res = await fetch("/api/v1/calendar/todo-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ todoId, eventKey }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "リンクの作成に失敗しました");
        }
        onChanged?.();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "リンクの作成に失敗しました");
        return false;
      } finally {
        setLinking(false);
      }
    },
    [onChanged]
  );

  const unlinkTodo = useCallback(
    async (todoId: string, eventKey: string): Promise<boolean> => {
      setLinking(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/v1/calendar/todo-links?todoId=${encodeURIComponent(todoId)}&eventKey=${encodeURIComponent(eventKey)}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "リンクの解除に失敗しました");
        }
        onChanged?.();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "リンクの解除に失敗しました");
        return false;
      } finally {
        setLinking(false);
      }
    },
    [onChanged]
  );

  return { linking, error, linkTodo, unlinkTodo };
}
