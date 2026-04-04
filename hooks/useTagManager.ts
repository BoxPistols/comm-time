"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { Tag, TodoItem } from "@/types";
import { useSupabaseTags } from "@/hooks/useSupabaseTags";

export type TagManagerState = {
  tags: Tag[];
  tagsMap: Map<string, Tag>;
  localTags: Tag[];
  addTag: (name: string, color: string) => Promise<Tag>;
  updateTag: (id: string, name: string, color: string) => void;
  deleteTag: (id: string) => void;
};

type TagManagerOptions = {
  useDatabase: boolean;
  user: User | null;
  setSharedTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;
};

export function useTagManager(options: TagManagerOptions): TagManagerState {
  const { useDatabase, user, setSharedTodos } = options;
  const supabaseTags = useSupabaseTags(useDatabase ? user : null);

  const [localTags, setLocalTags] = useState<Tag[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tags");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // タグはデータベースモードに応じて切り替え
  const tags = useDatabase && user ? supabaseTags.tags : localTags;

  const tagsMap = useMemo(() => {
    return new Map(tags.map(tag => [tag.id, tag]));
  }, [tags]);

  // localStorage保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("tags", JSON.stringify(localTags));
  }, [localTags]);

  const addTag = useCallback(
    async (name: string, color: string) => {
      if (useDatabase && user) {
        const newTag = await supabaseTags.addTag(name, color);
        return newTag || { id: "", name, color };
      } else {
        const newTag: Tag = {
          id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          color,
        };
        setLocalTags((prev) => [...prev, newTag]);
        return newTag;
      }
    },
    [useDatabase, user, supabaseTags]
  );

  const updateTag = useCallback(
    (id: string, name: string, color: string) => {
      if (useDatabase && user) {
        supabaseTags.updateTag(id, name, color);
      } else {
        setLocalTags((prev) =>
          prev.map((tag) => (tag.id === id ? { ...tag, name, color } : tag))
        );
      }
    },
    [useDatabase, user, supabaseTags]
  );

  const deleteTag = useCallback(
    (id: string) => {
      if (useDatabase && user) {
        supabaseTags.deleteTag(id);
      } else {
        setLocalTags((prev) => prev.filter((tag) => tag.id !== id));
        setSharedTodos((prev) =>
          prev.map((todo) => ({
            ...todo,
            tagIds: todo.tagIds?.filter((tagId) => tagId !== id),
          }))
        );
      }
    },
    [useDatabase, user, supabaseTags, setSharedTodos]
  );

  return { tags, tagsMap, localTags, addTag, updateTag, deleteTag };
}
