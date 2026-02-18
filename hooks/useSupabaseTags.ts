"use client"

import { useState, useEffect } from "react"
import { supabase, type Tag as SupabaseTag } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

// ローカル用のTag型（comm-time.tsxと互換性を保つ）
export type LocalTag = {
  id: string
  name: string
  color: string
}

export function useSupabaseTags(user: User | null) {
  const [tags, setTags] = useState<LocalTag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Supabaseの型からローカル型に変換
  const convertToLocal = (dbTag: SupabaseTag): LocalTag => ({
    id: dbTag.id,
    name: dbTag.name,
    color: dbTag.color,
  })

  // タグリストを取得
  const fetchTags = async () => {
    if (!user) {
      setTags([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      if (error) throw error

      setTags((data || []).map(convertToLocal))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error fetching tags:", err)
    } finally {
      setLoading(false)
    }
  }

  // タグ追加
  const addTag = async (name: string, color: string): Promise<LocalTag | null> => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          user_id: user.id,
          name,
          color,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        const newTag = convertToLocal(data)
        setTags(prev => [...prev, newTag])
        return newTag
      }
      return null
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error adding tag:", err)
      return null
    }
  }

  // タグ更新
  const updateTag = async (id: string, name: string, color: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("tags")
        .update({ name, color })
        .eq("id", id)
        .eq("user_id", user.id)

      if (error) throw error

      // 関数形式で最新の状態を参照
      setTags(prev => prev.map((tag) => (tag.id === id ? { ...tag, name, color } : tag)))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error updating tag:", err)
      throw err
    }
  }

  // タグ削除（RPCでTODOからのタグ参照も一括削除）
  const deleteTag = async (id: string) => {
    if (!user) return

    try {
      // 1. RPCでTODOからタグ参照を一括削除（N+1問題を回避）
      const { error: rpcError } = await supabase
        .rpc("remove_tag_from_todos", {
          tag_id_to_remove: id,
          user_id_param: user.id,
        })

      if (rpcError) {
        console.warn("RPC not available, tag references in todos may remain:", rpcError)
        // RPCが利用できない場合は続行（タグ自体は削除される）
      }

      // 2. タグを削除
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)

      if (error) throw error

      // 関数形式で最新の状態を参照
      setTags(prev => prev.filter((tag) => tag.id !== id))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("Error deleting tag:", err)
    }
  }

  // 初回ロード
  useEffect(() => {
    fetchTags()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // リアルタイム同期
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`tags-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tags",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Tag change received:", payload)

          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new) {
                // 楽観的更新で既に追加済みの場合は重複追加を防ぐ
                setTags((prev) => {
                  if (prev.some((t) => t.id === payload.new.id)) return prev
                  return [...prev, convertToLocal(payload.new as SupabaseTag)]
                })
              }
              break
            case 'UPDATE':
              if (payload.new) {
                setTags((prev) =>
                  prev.map((tag) =>
                    tag.id === payload.new.id ? convertToLocal(payload.new as SupabaseTag) : tag
                  )
                )
              }
              break
            case 'DELETE':
              if (payload.old) {
                setTags((prev) => prev.filter((tag) => tag.id !== payload.old.id))
              }
              break
            default:
              fetchTags()
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return {
    tags,
    loading,
    error,
    addTag,
    updateTag,
    deleteTag,
    refreshTags: fetchTags,
  }
}
