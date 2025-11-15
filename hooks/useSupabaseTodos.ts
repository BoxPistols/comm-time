"use client"

import { useState, useEffect } from "react"
import { supabase, type TodoItem as SupabaseTodoItem } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

// ローカル用のTodo型（既存のcomm-time.tsxと互換性を保つ）
export type LocalTodoItem = {
  id: string
  text: string
  isCompleted: boolean
  dueDate?: string
  dueTime?: string
  alarmPointId?: string
}

export function useSupabaseTodos(type: "meeting" | "pomodoro", user: User | null) {
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
  })

  // ローカル型からSupabaseの型に変換
  const convertToDb = (localTodo: Partial<LocalTodoItem>) => ({
    text: localTodo.text,
    is_completed: localTodo.isCompleted,
    due_date: localTodo.dueDate,
    due_time: localTodo.dueTime,
    alarm_point_id: localTodo.alarmPointId,
  })

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
        .eq("type", type)
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
      const orderIndex = todos.length

      const { data, error } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          type,
          text,
          is_completed: false,
          order_index: orderIndex,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setTodos([...todos, convertToLocal(data)])
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
      const { error } = await supabase
        .from("todos")
        .update(convertToDb(updates))
        .eq("id", id)
        .eq("user_id", user.id)

      if (error) throw error

      setTodos(todos.map((todo) => (todo.id === id ? { ...todo, ...updates } : todo)))
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

      setTodos(todos.filter((todo) => todo.id !== id))
    } catch (err: any) {
      setError(err.message)
      console.error("Error removing todo:", err)
    }
  }

  // TODO完了状態を切り替え
  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id)
    if (!todo) return

    await updateTodo(id, { isCompleted: !todo.isCompleted })
  }

  // 初回ロード
  useEffect(() => {
    fetchTodos()
  }, [user, type])

  // リアルタイム同期
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`todos-${type}`)
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
          fetchTodos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, type])

  return {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    removeTodo,
    toggleTodo,
    refreshTodos: fetchTodos,
  }
}
