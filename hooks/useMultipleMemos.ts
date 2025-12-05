"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { MemoData } from "@/components/markdown-memo"

const LOCAL_STORAGE_KEY = "multipleMemos"

// 新規メモの作成
function createNewMemo(): MemoData {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: "",
    content: "",
    created_at: now,
    updated_at: now,
  }
}

// ローカルストレージからメモを取得
function getLocalMemos(): MemoData[] {
  if (typeof window === "undefined") {
    console.log("[useMultipleMemos] getLocalMemos: window is undefined (SSR)")
    return []
  }
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    const memos = saved ? JSON.parse(saved) : []
    console.log("[useMultipleMemos] getLocalMemos: retrieved", memos.length, "memos")
    return memos
  } catch (error) {
    console.error("[useMultipleMemos] getLocalMemos error:", error)
    return []
  }
}

// ローカルストレージにメモを保存
function saveLocalMemos(memos: MemoData[]) {
  if (typeof window === "undefined") {
    console.log("[useMultipleMemos] saveLocalMemos: window is undefined (SSR)")
    return
  }
  try {
    const data = JSON.stringify(memos)
    localStorage.setItem(LOCAL_STORAGE_KEY, data)
    console.log("[useMultipleMemos] saveLocalMemos: saved", memos.length, "memos, size:", data.length, "bytes")
  } catch (error) {
    console.error("[useMultipleMemos] saveLocalMemos error:", error)
  }
}

export function useMultipleMemos(user: User | null, useDatabase: boolean) {
  const [memos, setMemos] = useState<MemoData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // メモを取得
  const fetchMemos = useCallback(async () => {
    console.log("[useMultipleMemos] fetchMemos called:", { useDatabase, hasUser: !!user })
    setLoading(true)
    setError(null)

    try {
      if (useDatabase && user) {
        // Supabaseから取得
        console.log("[useMultipleMemos] Fetching from Supabase...")
        const { data, error: fetchError } = await supabase
          .from("memos")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })

        if (fetchError) {
          console.error("[useMultipleMemos] Supabase fetch error:", fetchError)
          throw fetchError
        }

        const formattedMemos: MemoData[] = (data || []).map((item) => ({
          id: item.id,
          title: item.title || "",
          content: item.content || "",
          created_at: item.created_at,
          updated_at: item.updated_at,
        }))

        console.log("[useMultipleMemos] Fetched from Supabase, memos count:", formattedMemos.length)
        setMemos(formattedMemos)
        // バックアップとしてローカルストレージにも保存
        saveLocalMemos(formattedMemos)
      } else {
        // ローカルストレージから取得
        const localMemos = getLocalMemos()
        console.log("[useMultipleMemos] Fetched from localStorage, memos count:", localMemos.length)
        setMemos(localMemos)
      }
    } catch (err: any) {
      setError(err.message)
      console.error("[useMultipleMemos] Error fetching memos:", err)
      // フォールバック: ローカルストレージ
      const localMemos = getLocalMemos()
      console.log("[useMultipleMemos] Fallback: using localStorage, memos count:", localMemos.length)
      setMemos(localMemos)
    } finally {
      setLoading(false)
    }
  }, [user, useDatabase])

  // メモを作成
  const createMemo = useCallback(async (): Promise<MemoData | null> => {
    const newMemo = createNewMemo()
    console.log("[useMultipleMemos] createMemo called:", { useDatabase, hasUser: !!user, memoId: newMemo.id })

    try {
      if (useDatabase && user) {
        // Supabaseに保存
        console.log("[useMultipleMemos] Creating in Supabase...")
        const { data, error: insertError } = await supabase
          .from("memos")
          .insert({
            id: newMemo.id,
            user_id: user.id,
            title: newMemo.title,
            content: newMemo.content,
            created_at: newMemo.created_at,
            updated_at: newMemo.updated_at,
          })
          .select()
          .single()

        if (insertError) {
          console.error("[useMultipleMemos] Supabase insert error:", insertError)
          throw insertError
        }

        const createdMemo: MemoData = {
          id: data.id,
          title: data.title || "",
          content: data.content || "",
          created_at: data.created_at,
          updated_at: data.updated_at,
        }

        setMemos((prev) => {
          const updatedMemos = [...prev, createdMemo]
          // バックアップとしてローカルストレージにも保存
          saveLocalMemos(updatedMemos)
          console.log("[useMultipleMemos] Created in Supabase and saved to localStorage, memos count:", updatedMemos.length)
          return updatedMemos
        })
        return createdMemo
      } else {
        // ローカルストレージに保存
        console.log("[useMultipleMemos] Creating in localStorage...")
        setMemos((prev) => {
          const updatedMemos = [...prev, newMemo]
          saveLocalMemos(updatedMemos)
          console.log("[useMultipleMemos] Saved to localStorage, memos count:", updatedMemos.length)
          return updatedMemos
        })
        return newMemo
      }
    } catch (err: any) {
      setError(err.message)
      console.error("[useMultipleMemos] Error creating memo:", err)
      // エラー時でもローカルストレージには保存する（フォールバック）
      setMemos((prev) => {
        const updatedMemos = [...prev, newMemo]
        saveLocalMemos(updatedMemos)
        console.log("[useMultipleMemos] Fallback: saved to localStorage after error")
        return updatedMemos
      })
      return newMemo
    }
  }, [user, useDatabase])

  // メモを更新
  const updateMemo = useCallback(
    async (id: string, title: string, content: string) => {
      const now = new Date().toISOString()
      console.log("[useMultipleMemos] updateMemo called:", { id, title, content: content.substring(0, 50), useDatabase, hasUser: !!user })

      try {
        if (useDatabase && user) {
          // Supabaseを更新
          console.log("[useMultipleMemos] Updating in Supabase...")
          const { error: updateError } = await supabase
            .from("memos")
            .update({
              title,
              content,
              updated_at: now,
            })
            .eq("id", id)
            .eq("user_id", user.id)

          if (updateError) {
            console.error("[useMultipleMemos] Supabase update error:", updateError)
            throw updateError
          }
          console.log("[useMultipleMemos] Supabase update successful")
        }

        // ローカル状態を更新（ローカルストレージも同時に更新）
        setMemos((prev) => {
          const updatedMemos = prev.map((memo) =>
            memo.id === id
              ? { ...memo, title, content, updated_at: now }
              : memo
          )

          // ローカルストレージも更新
          // データベースモードでない場合、または常にバックアップとして保存
          saveLocalMemos(updatedMemos)
          console.log("[useMultipleMemos] Saved to localStorage, memos count:", updatedMemos.length)

          return updatedMemos
        })
      } catch (err: any) {
        setError(err.message)
        console.error("[useMultipleMemos] Error updating memo:", err)
        // エラー時でもローカル状態とストレージは更新する（フォールバック）
        setMemos((prev) => {
          const updatedMemos = prev.map((memo) =>
            memo.id === id
              ? { ...memo, title, content, updated_at: now }
              : memo
          )
          saveLocalMemos(updatedMemos)
          console.log("[useMultipleMemos] Fallback: saved to localStorage after error")
          return updatedMemos
        })
      }
    },
    [user, useDatabase]
  )

  // メモを削除
  const deleteMemo = useCallback(
    async (id: string) => {
      console.log("[useMultipleMemos] deleteMemo called:", { id, useDatabase, hasUser: !!user })

      try {
        if (useDatabase && user) {
          // Supabaseから削除
          console.log("[useMultipleMemos] Deleting from Supabase...")
          const { error: deleteError } = await supabase
            .from("memos")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id)

          if (deleteError) {
            console.error("[useMultipleMemos] Supabase delete error:", deleteError)
            throw deleteError
          }
          console.log("[useMultipleMemos] Supabase delete successful")
        }

        // ローカル状態を更新（ローカルストレージも同時に更新）
        setMemos((prev) => {
          const updatedMemos = prev.filter((memo) => memo.id !== id)
          // 常にローカルストレージも更新
          saveLocalMemos(updatedMemos)
          console.log("[useMultipleMemos] Deleted and saved to localStorage, memos count:", updatedMemos.length)
          return updatedMemos
        })
      } catch (err: any) {
        setError(err.message)
        console.error("[useMultipleMemos] Error deleting memo:", err)
        // エラー時でもローカル状態とストレージは更新する（フォールバック）
        setMemos((prev) => {
          const updatedMemos = prev.filter((memo) => memo.id !== id)
          saveLocalMemos(updatedMemos)
          console.log("[useMultipleMemos] Fallback: deleted from localStorage after error")
          return updatedMemos
        })
      }
    },
    [user, useDatabase]
  )

  // 初回ロード
  useEffect(() => {
    fetchMemos()
  }, [fetchMemos])

  // リアルタイム同期（Supabase使用時）
  useEffect(() => {
    if (!useDatabase || !user) return

    const channel = supabase
      .channel(`memos-multi-${user.id}`)
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

          switch (payload.eventType) {
            case "INSERT":
              if (payload.new) {
                const newMemo: MemoData = {
                  id: payload.new.id,
                  title: payload.new.title || "",
                  content: payload.new.content || "",
                  created_at: payload.new.created_at,
                  updated_at: payload.new.updated_at,
                }
                setMemos((prev) => {
                  // 既に存在しない場合のみ追加
                  if (!prev.some((m) => m.id === newMemo.id)) {
                    return [...prev, newMemo]
                  }
                  return prev
                })
              }
              break
            case "UPDATE":
              if (payload.new) {
                setMemos((prev) =>
                  prev.map((memo) =>
                    memo.id === payload.new.id
                      ? {
                          ...memo,
                          title: payload.new.title || "",
                          content: payload.new.content || "",
                          updated_at: payload.new.updated_at,
                        }
                      : memo
                  )
                )
              }
              break
            case "DELETE":
              if (payload.old) {
                setMemos((prev) =>
                  prev.filter((memo) => memo.id !== payload.old.id)
                )
              }
              break
            default:
              // フォールバック: 再取得
              fetchMemos()
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, useDatabase, fetchMemos])

  return {
    memos,
    loading,
    error,
    createMemo,
    updateMemo,
    deleteMemo,
    refreshMemos: fetchMemos,
  }
}
