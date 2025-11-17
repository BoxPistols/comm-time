"use client"

import { useState, useEffect } from "react"
import { supabase, type Memo } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

export function useSupabaseMemos(type: "meeting" | "pomodoro", user: User | null) {
  const [memo, setMemo] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memoId, setMemoId] = useState<string | null>(null)

  // メモを取得
  const fetchMemo = async () => {
    if (!user) {
      setMemo("")
      setMemoId(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("memos")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", type)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setMemo(data.content)
        setMemoId(data.id)
      } else {
        setMemo("")
        setMemoId(null)
      }
    } catch (err: any) {
      setError(err.message)
      console.error("Error fetching memo:", err)
    } finally {
      setLoading(false)
    }
  }

  // メモを保存（作成または更新）
  const saveMemo = async (content: string) => {
    if (!user) return

    try {
      if (memoId) {
        // 更新
        const { error } = await supabase
          .from("memos")
          .update({ content })
          .eq("id", memoId)
          .eq("user_id", user.id)

        if (error) throw error
      } else {
        // 新規作成
        const { data, error } = await supabase
          .from("memos")
          .insert({
            user_id: user.id,
            type,
            content,
          })
          .select()
          .single()

        if (error) throw error

        if (data) {
          setMemoId(data.id)
        }
      }

      setMemo(content)
    } catch (err: any) {
      setError(err.message)
      console.error("Error saving memo:", err)
    }
  }

  // メモを削除
  const deleteMemo = async () => {
    if (!user || !memoId) return

    try {
      const { error } = await supabase
        .from("memos")
        .delete()
        .eq("id", memoId)
        .eq("user_id", user.id)

      if (error) throw error

      setMemo("")
      setMemoId(null)
    } catch (err: any) {
      setError(err.message)
      console.error("Error deleting memo:", err)
    }
  }

  // 初回ロード
  useEffect(() => {
    fetchMemo()
  }, [user, type])

  // リアルタイム同期（最適化版）
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`memos-${type}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memos",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Memo change received:", payload)

          // payloadを使って効率的にローカルstateを更新
          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
              if (payload.new && payload.new.type === type) {
                setMemo(payload.new.content || "")
                setMemoId(payload.new.id)
              }
              break
            case 'DELETE':
              if (payload.old && payload.old.id === memoId) {
                setMemo("")
                setMemoId(null)
              }
              break
            default:
              // フォールバック: 再取得
              fetchMemo()
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, type, memoId])

  return {
    memo,
    loading,
    error,
    saveMemo,
    deleteMemo,
    refreshMemo: fetchMemo,
  }
}
