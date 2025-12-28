"use client"

import { useState, useEffect } from "react"
import { supabase, type TodoItem as SupabaseTodoItem } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

// 優先度・重要度・カンバンステータスの型
type PriorityLevel = "high" | "medium" | "low" | "none"
type ImportanceLevel = "high" | "medium" | "low" | "none"
type KanbanStatus = "backlog" | "todo" | "doing" | "done"

// ローカル用のTodo型（既存のcomm-time.tsxと互換性を保つ）
export type LocalTodoItem = {
  id: string
  text: string
  isCompleted: boolean
  dueDate?: string
  dueTime?: string
  alarmPointId?: string
  tagIds?: string[]
  priority?: PriorityLevel
  importance?: ImportanceLevel
  kanbanStatus?: KanbanStatus
}

export function useSupabaseTodos(user: User | null) {
  const [todos, setTodos] = useState<LocalTodoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Supabaseの型からローカル型に変換
  const convertToLocal = (dbTodo: SupabaseTodoItem): LocalTodoItem => ({
    id: dbTodo.id,
    text: dbTodo.text,
    isCompleted: dbTodo.is_completed,
    dueDate: dbTodo.due_date || undefined,
    dueTime: dbTodo.due_time || undefined,
    alarmPointId: dbTodo.alarm_point_id || undefined,
    tagIds: dbTodo.tag_ids || [],
    priority: dbTodo.priority || "none",
    importance: dbTodo.importance || "none",
    kanbanStatus: dbTodo.kanban_status || "backlog",
  })

  // ローカル型からSupabaseの型に変換
  const convertToDb = (localTodo: Partial<LocalTodoItem>) => {
    const dbFields: Record<string, unknown> = {}
    if (localTodo.text !== undefined) dbFields.text = localTodo.text
    if (localTodo.isCompleted !== undefined) dbFields.is_completed = localTodo.isCompleted
    if (localTodo.dueDate !== undefined) dbFields.due_date = localTodo.dueDate
    if (localTodo.dueTime !== undefined) dbFields.due_time = localTodo.dueTime
    if (localTodo.alarmPointId !== undefined) dbFields.alarm_point_id = localTodo.alarmPointId
    if (localTodo.tagIds !== undefined) dbFields.tag_ids = localTodo.tagIds
    if (localTodo.priority !== undefined) dbFields.priority = localTodo.priority
    if (localTodo.importance !== undefined) dbFields.importance = localTodo.importance
    if (localTodo.kanbanStatus !== undefined) dbFields.kanban_status = localTodo.kanbanStatus
    return dbFields
  }

  // TODOリストを取得
  const fetchTodos = async () => {
    if (!user) {
      setTodos([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false })

      if (error) throw error

      setTodos((data || []).map(convertToLocal))
    } catch (err: any) {
      setError(err.message)
      console.error("Error fetching todos:", err)
    } finally {
      setLoading(false)
    }
  }

  // TODO追加
  const addTodo = async (text: string) => {
    if (!user) return

    try {
      // DBから現在のTODO件数を取得（他クライアントからの同時追加にも対応）
      const { count, error: countError } = await supabase
        .from("todos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (countError) throw countError

      const orderIndex = count ?? 0

      const { data, error } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          text,
          is_completed: false,
          order_index: orderIndex,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setTodos(prev => [...prev, convertToLocal(data)])
      }
    } catch (err: any) {
      setError(err.message)
      console.error("Error adding todo:", err)
    }
  }

  // TODO更新
  const updateTodo = async (id: string, updates: Partial<LocalTodoItem>) => {
    if (!user) return

    try {
      const dbUpdates = convertToDb(updates)

      // データベースに反映するフィールドがある場合のみSupabaseを更新
      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from("todos")
          .update(dbUpdates)
          .eq("id", id)
          .eq("user_id", user.id)

        if (error) throw error
      }

      // ローカル状態は常に更新（関数形式で最新の状態を参照）
      setTodos(prev => prev.map((todo) => (todo.id === id ? { ...todo, ...updates } : todo)))
    } catch (err: any) {
      setError(err.message)
      console.error("Error updating todo:", err)
    }
  }

  // TODO削除
  const removeTodo = async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)

      if (error) throw error

      setTodos(prev => prev.filter((todo) => todo.id !== id))
    } catch (err: any) {
      setError(err.message)
      console.error("Error removing todo:", err)
    }
  }

  // TODO完了状態を切り替え
  const toggleTodo = async (id: string) => {
    if (!user) return

    try {
      // DBから最新の状態を取得して、staleな状態を避ける
      const { data: todoToToggle, error: fetchError } = await supabase
        .from("todos")
        .select("is_completed")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (fetchError) throw fetchError
      if (!todoToToggle) return

      await updateTodo(id, { isCompleted: !todoToToggle.is_completed })
    } catch (err: any) {
      setError(err.message)
      console.error("Error toggling todo:", err)
    }
  }

  // TODOの並び順を更新（ドラッグ＆ドロップ用）
  const reorderTodos = async (reorderedTodos: LocalTodoItem[]) => {
    if (!user) return

    try {
      // ローカル状態を即座に更新
      setTodos(reorderedTodos)

      // 各TODOのorder_indexを一括更新
      const updates = reorderedTodos.map((todo, index) => ({
        id: todo.id,
        order_index: index,
      }))

      // 並列でSupabaseを更新
      const updatePromises = updates.map(({ id, order_index }) =>
        supabase
          .from("todos")
          .update({ order_index })
          .eq("id", id)
          .eq("user_id", user.id)
      )

      const results = await Promise.all(updatePromises)

      // エラーチェック
      const errors = results.filter((r) => r.error)
      if (errors.length > 0) {
        console.error("Error reordering todos:", errors)
        // エラー時はリフレッシュして正しい順序を復元
        await fetchTodos()
      }
    } catch (err: any) {
      setError(err.message)
      console.error("Error reordering todos:", err)
      // エラー時はリフレッシュして正しい順序を復元
      await fetchTodos()
    }
  }

  // 初回ロード
  useEffect(() => {
    fetchTodos()
  }, [user])

  // リアルタイム同期（最適化版）
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`todos-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Todo change received:", payload)

          // payloadを使って効率的にローカルstateを更新
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new) {
                setTodos((prev) => [...prev, convertToLocal(payload.new as SupabaseTodoItem)])
              }
              break
            case 'UPDATE':
              if (payload.new) {
                setTodos((prev) =>
                  prev.map((todo) =>
                    todo.id === payload.new.id ? convertToLocal(payload.new as SupabaseTodoItem) : todo
                  )
                )
              }
              break
            case 'DELETE':
              if (payload.old) {
                setTodos((prev) => prev.filter((todo) => todo.id !== payload.old.id))
              }
              break
            default:
              // フォールバック: 全件再取得
              fetchTodos()
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    removeTodo,
    toggleTodo,
    reorderTodos,
    refreshTodos: fetchTodos,
  }
}
