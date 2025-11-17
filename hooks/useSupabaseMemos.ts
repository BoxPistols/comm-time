"use client"

import { useState, useEffect } from "react"
import { supabase, type Memo } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

export function useSupabaseMemos(user: User | null) {
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
      // ユーザーのメモを取得（1ユーザー1メモ）
      const { data, error } = await supabase
        .from("memos")
        .select("*")
        .eq("user_id", user.id)
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
      // UPSERT: 存在すれば更新、なければ作成
      const { data, error } = await supabase
        .from("memos")
        .upsert(
          {
            user_id: user.id,
            content,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",  // ユニーク制約に基づく（1ユーザー1メモ）
            ignoreDuplicates: false,  // 重複時は更新する
          }
        )
        .select()
        .single()

      if (error) throw error

      if (data) {
        setMemo(data.content)
        setMemoId(data.id)
      }
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
  }, [user])

  // リアルタイム同期（最適化版）
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`memos-${user.id}`)
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
              if (payload.new) {
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
  }, [user, memoId])

  return {
    memo,
    loading,
    error,
    saveMemo,
    deleteMemo,
    refreshMemo: fetchMemo,
  }
}
