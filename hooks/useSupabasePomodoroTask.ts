"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

// ポモドーロタスクの型
export type PomodoroTask = {
  taskText: string
  todoId: string | null
}

// Supabaseのデータ型
type SupabasePomodoroTask = {
  id: string
  user_id: string
  task_text: string
  todo_id: string | null
  created_at: string
  updated_at: string
}

export function useSupabasePomodoroTask(user: User | null) {
  const [task, setTask] = useState<PomodoroTask>({ taskText: "", todoId: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Supabaseの型からローカル型に変換
  const convertToLocal = (dbTask: SupabasePomodoroTask): PomodoroTask => ({
    taskText: dbTask.task_text,
    todoId: dbTask.todo_id,
  })

  // タスクを取得
  const fetchTask = useCallback(async () => {
    if (!user) {
      setTask({ taskText: "", todoId: null })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("pomodoro_current_task")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned (not an error for us)
        throw error
      }

      if (data) {
        setTask(convertToLocal(data))
      } else {
        setTask({ taskText: "", todoId: null })
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      console.error("Error fetching pomodoro task:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // タスクを更新（upsert）
  const updateTask = useCallback(async (taskText: string, todoId: string | null = null) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("pomodoro_current_task")
        .upsert({
          user_id: user.id,
          task_text: taskText,
          todo_id: todoId,
        }, { onConflict: "user_id" })

      if (error) throw error

      setTask({ taskText, todoId })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      console.error("Error updating pomodoro task:", err)
    }
  }, [user])

  // タスクをクリア
  const clearTask = useCallback(async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("pomodoro_current_task")
        .delete()
        .eq("user_id", user.id)

      if (error) throw error

      setTask({ taskText: "", todoId: null })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      console.error("Error clearing pomodoro task:", err)
    }
  }, [user])

  // 初回ロード
  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  // リアルタイム同期
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`pomodoro-task-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pomodoro_current_task",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Pomodoro task change received:", payload)

          switch (payload.eventType) {
            case "INSERT":
            case "UPDATE":
              if (payload.new) {
                setTask(convertToLocal(payload.new as SupabasePomodoroTask))
              }
              break
            case "DELETE":
              setTask({ taskText: "", todoId: null })
              break
            default:
              fetchTask()
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchTask])

  return {
    task,
    loading,
    error,
    updateTask,
    clearTask,
    refreshTask: fetchTask,
  }
}
