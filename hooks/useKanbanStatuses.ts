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
      const { data, error } = await supabase
        .from("kanban_statuses")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })

      if (error) {
        // テーブルが存在しない場合はデフォルト値を使用
        if (error.code === "42P01") {
          console.warn("kanban_statuses table does not exist, using defaults")
          setStatuses(DEFAULT_KANBAN_COLUMNS)
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        setStatuses(data.map(convertToLocal))
        setIsInitialized(true)
      } else {
        // データがない場合はデフォルト値を初期化
        await initializeDefaultStatuses()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error fetching kanban statuses:", err)
      // エラー時はデフォルト値を使用
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
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from("kanban_statuses")
        .insert({
          user_id: user.id,
          name,
          label,
          color,
          bg_class: getColorClasses(color).bgClass,
          text_class: getColorClasses(color).textClass,
          border_class: getColorClasses(color).borderClass,
          active_class: getColorClasses(color).activeClass,
          sort_order: statuses.length,
          is_default: false,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        const newStatus = convertToLocal(data)
        setStatuses(prev => [...prev, newStatus])
        return newStatus
      }
      return null
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error adding kanban status:", err)
      return null
    }
  }

  // ステータス更新
  const updateStatus = async (id: string, updates: Partial<Pick<KanbanStatusColumn, 'name' | 'label' | 'color' | 'sortOrder'>>) => {
    if (!user) return

    try {
      const dbUpdates: Record<string, unknown> = {}

      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.label !== undefined) dbUpdates.label = updates.label
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder

      if (updates.color !== undefined) {
        const colorClasses = getColorClasses(updates.color)
        dbUpdates.color = updates.color
        dbUpdates.bg_class = colorClasses.bgClass
        dbUpdates.text_class = colorClasses.textClass
        dbUpdates.border_class = colorClasses.borderClass
        dbUpdates.active_class = colorClasses.activeClass
      }

      const { data, error } = await supabase
        .from("kanban_statuses")
        .update(dbUpdates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single()

      if (error) throw error

      if (data) {
        const updatedStatus = convertToLocal(data)
        setStatuses(prev => prev.map(s => s.id === id ? updatedStatus : s))
      }
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
    if (!status) return

    if (status.isDefault) {
      setError("デフォルトステータスは削除できません")
      return
    }

    try {
      // 関連するTODOのkanban_statusをデフォルトに変更
      const defaultStatus = statuses.find(s => s.isDefault)
      const fallbackName = defaultStatus?.name || "backlog"

      await supabase
        .from("todos")
        .update({ kanban_status: fallbackName })
        .eq("user_id", user.id)
        .eq("kanban_status", status.name)

      // ステータスを削除
      const { error } = await supabase
        .from("kanban_statuses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)

      if (error) throw error

      setStatuses(prev => prev.filter(s => s.id !== id))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error deleting kanban status:", err)
    }
  }

  // ステータス順序更新
  const reorderStatuses = async (newStatuses: KanbanStatusColumn[]) => {
    if (!user) return

    try {
      const updates = newStatuses.map((status, index) => ({
        id: status.id,
        sortOrder: index,
      }))

      // 一括更新
      await Promise.all(
        updates.map(update =>
          supabase
            .from("kanban_statuses")
            .update({ sort_order: update.sortOrder })
            .eq("id", update.id)
            .eq("user_id", user.id)
        )
      )

      setStatuses(newStatuses.map((s, i) => ({ ...s, sortOrder: i })))
    } catch (err: unknown) {
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
          console.log("Kanban status change received:", payload)

          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new) {
                setStatuses((prev) => [...prev, convertToLocal(payload.new as Record<string, unknown>)])
              }
              break
            case 'UPDATE':
              if (payload.new) {
                setStatuses((prev) =>
                  prev.map((status) =>
                    status.id === payload.new.id ? convertToLocal(payload.new as Record<string, unknown>) : status
                  )
                )
              }
              break
            case 'DELETE':
              if (payload.old) {
                setStatuses((prev) => prev.filter((status) => status.id !== payload.old.id))
              }
              break
            default:
              fetchStatuses()
              break
          }
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

// カラー名からTailwindクラスを生成するヘルパー
function getColorClasses(color: string) {
  const colorConfigs: Record<string, { bgClass: string; textClass: string; borderClass: string; activeClass: string }> = {
    gray: { bgClass: 'bg-gray-500', textClass: 'text-gray-600', borderClass: 'border-gray-300', activeClass: 'bg-gray-500 text-white' },
    blue: { bgClass: 'bg-blue-500', textClass: 'text-blue-600', borderClass: 'border-blue-300', activeClass: 'bg-blue-500 text-white' },
    yellow: { bgClass: 'bg-yellow-500', textClass: 'text-yellow-600', borderClass: 'border-yellow-300', activeClass: 'bg-yellow-500 text-black' },
    green: { bgClass: 'bg-green-500', textClass: 'text-green-600', borderClass: 'border-green-300', activeClass: 'bg-green-500 text-white' },
    red: { bgClass: 'bg-red-500', textClass: 'text-red-600', borderClass: 'border-red-300', activeClass: 'bg-red-500 text-white' },
    orange: { bgClass: 'bg-orange-500', textClass: 'text-orange-600', borderClass: 'border-orange-300', activeClass: 'bg-orange-500 text-white' },
    purple: { bgClass: 'bg-purple-500', textClass: 'text-purple-600', borderClass: 'border-purple-300', activeClass: 'bg-purple-500 text-white' },
    pink: { bgClass: 'bg-pink-500', textClass: 'text-pink-600', borderClass: 'border-pink-300', activeClass: 'bg-pink-500 text-white' },
    indigo: { bgClass: 'bg-indigo-500', textClass: 'text-indigo-600', borderClass: 'border-indigo-300', activeClass: 'bg-indigo-500 text-white' },
    teal: { bgClass: 'bg-teal-500', textClass: 'text-teal-600', borderClass: 'border-teal-300', activeClass: 'bg-teal-500 text-white' },
  }

  return colorConfigs[color] || colorConfigs.gray
}
