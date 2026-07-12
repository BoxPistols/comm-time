"use client";

// 予定への注釈（メモ・優先度・タグ）の保存・削除を担う hook
import { useState, useCallback } from "react";
import {
  AnnotationInput,
  deleteEventAnnotation,
  saveEventAnnotation,
} from "@/lib/calendar-api";
import type { EventAnnotation, AnnotationScope } from "@/types/calendar";

export function useEventAnnotations(onChanged?: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (eventKey: string, input: AnnotationInput): Promise<EventAnnotation | null> => {
      setSaving(true);
      setError(null);
      try {
        const result = await saveEventAnnotation(eventKey, input);
        onChanged?.();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save annotation");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [onChanged]
  );

  const remove = useCallback(
    async (eventKey: string, scope: AnnotationScope): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        await deleteEventAnnotation(eventKey, scope);
        onChanged?.();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete annotation");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [onChanged]
  );

  return { save, remove, saving, error };
}
