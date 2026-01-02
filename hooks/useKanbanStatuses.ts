"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { type KanbanStatusColumn, DEFAULT_KANBAN_COLUMNS } from "@/types"

// DBの型からローカル型に変換
const convertToLocal = (dbStatus: Record<string, unknown>): KanbanStatusColumn => ({
  id: dbStatus.id as string,
  user_id: dbStatus.user_id as string,
  name: dbStatus.name as string,
  label: dbStatus.label as string,
  color: dbStatus.color as string,
  bgClass: dbStatus.bg_class as string,
  textClass: dbStatus.text_class as string,
  borderClass: dbStatus.border_class as string,
  activeClass: dbStatus.active_class as string,
  sortOrder: dbStatus.sort_order as number,
  isDefault: dbStatus.is_default as boolean,
  created_at: dbStatus.created_at as string | undefined,
  updated_at: dbStatus.updated_at as string | undefined,
})

export function useKanbanStatuses(user: User | null) {
  const [statuses, setStatuses] = useState<KanbanStatusColumn[]>(DEFAULT_KANBAN_COLUMNS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // ステータスリストを取得
  const fetchStatuses = useCallback(async () => {
    if (!user) {
      setStatuses(DEFAULT_KANBAN_COLUMNS)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/kanban-statuses')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statuses')
      }
      
      if (data.statuses && data.statuses.length > 0) {
        setStatuses(data.statuses)
        setIsInitialized(true)
      } else {
        await initializeDefaultStatuses()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error fetching kanban statuses:", err)
      setStatuses(DEFAULT_KANBAN_COLUMNS)
    } finally {
      setLoading(false)
    }
  }, [user])

  // デフォルトステータスを初期化
  const initializeDefaultStatuses = async () => {
    if (!user) return

    try {
      const response = await fetch("/api/v1/kanban-statuses/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.statuses && data.statuses.length > 0) {
          setStatuses(data.statuses)
          setIsInitialized(true)
        }
      } else {
        console.warn("Failed to initialize kanban statuses, using defaults")
        setStatuses(DEFAULT_KANBAN_COLUMNS)
      }
    } catch (err) {
      console.error("Error initializing kanban statuses:", err)
      setStatuses(DEFAULT_KANBAN_COLUMNS)
    }
  }

  // ステータス追加
  const addStatus = async (name: string, label: string, color: string): Promise<KanbanStatusColumn | null> => {
    if (!user) return null;
    try {
      const response = await fetch('/api/v1/kanban-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, label, color }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add status');
      
      await fetchStatuses() // データを再取得して同期
      return data.status
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error adding kanban status:", err)
      return null
    }
  }

  // ステータス更新
  const updateStatus = async (id: string, updates: Partial<Pick<KanbanStatusColumn, 'name' | 'label' | 'color'>>) => {
    if (!user) return

    try {
      const response = await fetch(`/api/v1/kanban-statuses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update status');

      await fetchStatuses() // データを再取得して同期
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error updating kanban status:", err)
    }
  }

  // ステータス削除
  const deleteStatus = async (id: string) => {
    if (!user) return

    const status = statuses.find(s => s.id === id)
    if (status?.isDefault) {
      setError("デフォルトステータスは削除できません")
      return
    }

    try {
      const response = await fetch(`/api/v1/kanban-statuses/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete status');
      }
      await fetchStatuses() // データを再取得して同期
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error deleting kanban status:", err)
    }
  }

  // ステータス順序更新
  const reorderStatuses = async (newOrder: KanbanStatusColumn[]) => {
    if (!user) return
    const originalStatuses = statuses;
    setStatuses(newOrder); // Optimistic update
    try {
      const statusIds = newOrder.map(s => s.id);
      const response = await fetch('/api/v1/kanban-statuses/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reorder statuses');
      }
      setStatuses(data.statuses) // APIからの確定した順序で更新
    } catch (err: unknown) {
      setStatuses(originalStatuses); // revert on error
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error reordering kanban statuses:", err)
    }
  }

  // 初回ロード
  useEffect(() => {
    fetchStatuses()
  }, [fetchStatuses])

  // リアルタイム同期
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`kanban-statuses-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kanban_statuses",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Kanban status change received, refetching:", payload)
          fetchStatuses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchStatuses])

  return {
    statuses,
    loading,
    error,
    isInitialized,
    addStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    refreshStatuses: fetchStatuses,
  }
}
