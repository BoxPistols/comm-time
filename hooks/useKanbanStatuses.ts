"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
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

// 色からCSSクラスを生成
const getColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string; active: string }> = {
    gray: { bg: 'bg-gray-500', text: 'text-gray-600', border: 'border-gray-300', active: 'bg-gray-500 text-white' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-300', active: 'bg-blue-500 text-white' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-300', active: 'bg-yellow-500 text-black' },
    green: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-300', active: 'bg-green-500 text-white' },
    red: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-300', active: 'bg-red-500 text-white' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-300', active: 'bg-orange-500 text-white' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-300', active: 'bg-purple-500 text-white' },
    pink: { bg: 'bg-pink-500', text: 'text-pink-600', border: 'border-pink-300', active: 'bg-pink-500 text-white' },
    indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', border: 'border-indigo-300', active: 'bg-indigo-500 text-white' },
    teal: { bg: 'bg-teal-500', text: 'text-teal-600', border: 'border-teal-300', active: 'bg-teal-500 text-white' },
  }
  return colorMap[color] || colorMap.gray
}

export function useKanbanStatuses(user: User | null) {
  const [statuses, setStatuses] = useState<KanbanStatusColumn[]>(DEFAULT_KANBAN_COLUMNS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // ステータスリストを取得
  const fetchStatuses = useCallback(async () => {
    // Supabase未設定またはユーザーなしの場合はデフォルト値を使用
    if (!isSupabaseConfigured || !user) {
      setStatuses(DEFAULT_KANBAN_COLUMNS)
      setIsInitialized(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('kanban_statuses')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })

      if (fetchError) {
        // テーブルが存在しない場合はデフォルト値を返す
        if (fetchError.code === '42P01') {
          setStatuses(DEFAULT_KANBAN_COLUMNS)
          setIsInitialized(true)
          return
        }
        throw fetchError
      }

      if (data && data.length > 0) {
        setStatuses(data.map(convertToLocal))
        setIsInitialized(true)
      } else {
        // データがない場合、デフォルトステータスを初期化
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
    if (!isSupabaseConfigured || !user) {
      setStatuses(DEFAULT_KANBAN_COLUMNS)
      setIsInitialized(true)
      return
    }

    try {
      const defaultStatuses = [
        { user_id: user.id, name: 'backlog', label: 'Backlog', color: 'gray', bg_class: 'bg-gray-500', text_class: 'text-gray-600', border_class: 'border-gray-300', active_class: 'bg-gray-500 text-white', sort_order: 0, is_default: true },
        { user_id: user.id, name: 'todo', label: 'Todo', color: 'blue', bg_class: 'bg-blue-500', text_class: 'text-blue-600', border_class: 'border-blue-300', active_class: 'bg-blue-500 text-white', sort_order: 1, is_default: false },
        { user_id: user.id, name: 'doing', label: 'Doing', color: 'yellow', bg_class: 'bg-yellow-500', text_class: 'text-yellow-600', border_class: 'border-yellow-300', active_class: 'bg-yellow-500 text-black', sort_order: 2, is_default: false },
        { user_id: user.id, name: 'done', label: 'Done', color: 'green', bg_class: 'bg-green-500', text_class: 'text-green-600', border_class: 'border-green-300', active_class: 'bg-green-500 text-white', sort_order: 3, is_default: false },
      ]

      const { data, error: insertError } = await supabase
        .from('kanban_statuses')
        .insert(defaultStatuses)
        .select()

      if (insertError) {
        console.warn("Failed to initialize kanban statuses:", insertError)
        setStatuses(DEFAULT_KANBAN_COLUMNS)
      } else if (data && data.length > 0) {
        setStatuses(data.map(convertToLocal))
      } else {
        setStatuses(DEFAULT_KANBAN_COLUMNS)
      }
      setIsInitialized(true)
    } catch (err) {
      console.error("Error initializing kanban statuses:", err)
      setStatuses(DEFAULT_KANBAN_COLUMNS)
      setIsInitialized(true)
    }
  }

  // ステータス追加
  const addStatus = async (name: string, label: string, color: string): Promise<KanbanStatusColumn | null> => {
    if (!isSupabaseConfigured || !user) return null

    try {
      // 現在の最大sort_orderを取得
      const maxSortOrder = Math.max(...statuses.map(s => s.sortOrder), -1)
      const colorClasses = getColorClasses(color)

      const newStatus = {
        user_id: user.id,
        name,
        label,
        color,
        bg_class: colorClasses.bg,
        text_class: colorClasses.text,
        border_class: colorClasses.border,
        active_class: colorClasses.active,
        sort_order: maxSortOrder + 1,
        is_default: false,
      }

      const { data, error: insertError } = await supabase
        .from('kanban_statuses')
        .insert(newStatus)
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          setError('同じ名前のステータスが既に存在します')
        } else {
          setError(insertError.message)
        }
        return null
      }

      if (data) {
        const localStatus = convertToLocal(data)
        setStatuses(prev => [...prev, localStatus])
        return localStatus
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
  const updateStatus = async (id: string, updates: Partial<Pick<KanbanStatusColumn, 'name' | 'label' | 'color'>>) => {
    if (!isSupabaseConfigured || !user) return

    try {
      const dbUpdates: Record<string, unknown> = {}
      if (updates.name) dbUpdates.name = updates.name
      if (updates.label) dbUpdates.label = updates.label
      if (updates.color) {
        dbUpdates.color = updates.color
        const colorClasses = getColorClasses(updates.color)
        dbUpdates.bg_class = colorClasses.bg
        dbUpdates.text_class = colorClasses.text
        dbUpdates.border_class = colorClasses.border
        dbUpdates.active_class = colorClasses.active
      }

      const { data, error: updateError } = await supabase
        .from('kanban_statuses')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        if (updateError.code === '23505') {
          setError('同じ名前のステータスが既に存在します')
        } else {
          setError(updateError.message)
        }
        return
      }

      if (data) {
        setStatuses(prev => prev.map(s => s.id === id ? convertToLocal(data) : s))
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error updating kanban status:", err)
    }
  }

  // ステータス削除
  const deleteStatus = async (id: string) => {
    if (!isSupabaseConfigured || !user) return

    const status = statuses.find(s => s.id === id)
    if (status?.isDefault) {
      setError("デフォルトステータスは削除できません")
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('kanban_statuses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      setStatuses(prev => prev.filter(s => s.id !== id))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error deleting kanban status:", err)
    }
  }

  // ステータス順序更新
  const reorderStatuses = async (newOrder: KanbanStatusColumn[]) => {
    if (!isSupabaseConfigured || !user) return

    const originalStatuses = statuses
    setStatuses(newOrder) // Optimistic update

    try {
      // 各ステータスのsort_orderを更新
      const updates = newOrder.map((status, index) => ({
        id: status.id,
        sort_order: index,
      }))

      // バッチ更新（個別に更新）
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('kanban_statuses')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
          .eq('user_id', user.id)

        if (updateError) {
          throw updateError
        }
      }

      // 更新後のデータで状態を更新
      setStatuses(newOrder.map((s, i) => ({ ...s, sortOrder: i })))
    } catch (err: unknown) {
      setStatuses(originalStatuses) // revert on error
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error reordering kanban statuses:", err)
    }
  }

  // 初回ロード
  useEffect(() => {
    fetchStatuses()
  }, [fetchStatuses])

  // リアルタイム同期（Supabase設定時のみ）
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return

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
