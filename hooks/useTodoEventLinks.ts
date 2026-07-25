"use client";

import { useState, useCallback } from "react";
import {
  CalendarApiError,
  createTodoEventLink,
  deleteTodoEventLink,
} from "@/lib/calendar-api";

type UseTodoEventLinksResult = {
  linking: boolean;
  error: string | null;
  linkTodo: (todoId: string, eventKey: string) => Promise<boolean>;
  unlinkTodo: (todoId: string, eventKey: string) => Promise<boolean>;
};

const LINK_FAILED = "リンクの作成に失敗しました";
const UNLINK_FAILED = "リンクの解除に失敗しました";

export function useTodoEventLinks(onChanged?: () => void): UseTodoEventLinksResult {
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkTodo = useCallback(
    async (todoId: string, eventKey: string): Promise<boolean> => {
      setLinking(true);
      setError(null);
      try {
        await createTodoEventLink(todoId, eventKey);
        onChanged?.();
        return true;
      } catch (err) {
        setError(err instanceof CalendarApiError ? err.message : LINK_FAILED);
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
        await deleteTodoEventLink(todoId, eventKey);
        onChanged?.();
        return true;
      } catch (err) {
        setError(err instanceof CalendarApiError ? err.message : UNLINK_FAILED);
        return false;
      } finally {
        setLinking(false);
      }
    },
    [onChanged]
  );

  return { linking, error, linkTodo, unlinkTodo };
}
