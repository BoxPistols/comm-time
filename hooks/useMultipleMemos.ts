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
        setLoading(true)
        setError(null)

        try {
            if (useDatabase && user) {
                // Supabaseから取得（display_orderの昇順で取得）
                const { data, error: fetchError } = await supabase
                    .from('memos')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('display_order', { ascending: true })

                if (fetchError) throw fetchError

                const formattedMemos: MemoData[] = (data || []).map((item) => ({
                    id: item.id,
                    title: item.title || '',
                    content: item.content || '',
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                }))

                setMemos(formattedMemos)
            } else {
                // ローカルストレージから取得
                const localMemos = getLocalMemos()
                setMemos(localMemos)
            }
        } catch (err: any) {
            setError(err.message)
            console.error('Error fetching memos:', err)
            // フォールバック: ローカルストレージ
            const localMemos = getLocalMemos()
            setMemos(localMemos)
        } finally {
            setLoading(false)
        }
    }, [user, useDatabase])

    // メモを作成
    const createMemo = useCallback(async (): Promise<MemoData | null> => {
        const newMemo = createNewMemo()

        try {
            if (useDatabase && user) {
                // Supabaseに保存
                const { data, error: insertError } = await supabase
                    .from('memos')
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

                if (insertError) throw insertError

                const createdMemo: MemoData = {
                    id: data.id,
                    title: data.title || '',
                    content: data.content || '',
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                }

                setMemos((prev) => [...prev, createdMemo])
                return createdMemo
            } else {
                // ローカルストレージに保存
                // setMemosの関数形式を使用して、常に最新の状態を参照する
                setMemos((prev) => {
                    const updatedMemos = [...prev, newMemo]
                    saveLocalMemos(updatedMemos)
                    return updatedMemos
                })
                return newMemo
            }
        } catch (err: any) {
            setError(err.message)
            console.error('Error creating memo:', err)
            return null
        }
    }, [user, useDatabase])

    // メモを更新
    const updateMemo = useCallback(
        async (id: string, title: string, content: string) => {
            const now = new Date().toISOString()

            try {
                if (useDatabase && user) {
                    // Supabaseを更新
                    const { error: updateError } = await supabase
                        .from('memos')
                        .update({
                            title,
                            content,
                            updated_at: now,
                        })
                        .eq('id', id)
                        .eq('user_id', user.id)

                    if (updateError) throw updateError
                }

                // ローカル状態を更新（ローカルストレージも同時に更新）
                setMemos((prev) => {
                    const updatedMemos = prev.map((memo) =>
                        memo.id === id
                            ? { ...memo, title, content, updated_at: now }
                            : memo
                    )

                    // ローカルストレージも更新（最新のstateを使用）
                    if (!useDatabase || !user) {
                        saveLocalMemos(updatedMemos)
                    }

                    return updatedMemos
                })
            } catch (err: any) {
                setError(err.message)
                console.error('Error updating memo:', err)
            }
        },
        [user, useDatabase]
    )

    // メモを削除（ゴミ箱に移動）
    const deleteMemo = useCallback(
        async (id: string, moveToTrash: (memo: MemoData) => void) => {
            try {
                // 削除前にメモを取得してゴミ箱に移動
                const memoToDelete = memos.find((memo) => memo.id === id)
                if (memoToDelete) {
                    moveToTrash(memoToDelete)
                }

                if (useDatabase && user) {
                    // Supabaseから削除
                    const { error: deleteError } = await supabase
                        .from('memos')
                        .delete()
                        .eq('id', id)
                        .eq('user_id', user.id)

                    if (deleteError) throw deleteError
                }

                // ローカル状態を更新（ローカルストレージも同時に更新）
                setMemos((prev) => {
                    const updatedMemos = prev.filter((memo) => memo.id !== id)

                    // ローカルストレージも更新（最新のstateを使用）
                    if (!useDatabase || !user) {
                        saveLocalMemos(updatedMemos)
                    }

                    return updatedMemos
                })
            } catch (err: any) {
                setError(err.message)
                console.error('Error deleting memo:', err)
            }
        },
        [user, useDatabase, memos]
    )

    // メモを復元（ゴミ箱から）
    const restoreMemo = useCallback(
        async (memo: MemoData) => {
            try {
                if (useDatabase && user) {
                    // Supabaseに復元
                    const { error: insertError } = await supabase
                        .from('memos')
                        .insert({
                            id: memo.id,
                            user_id: user.id,
                            title: memo.title,
                            content: memo.content,
                            created_at: memo.created_at,
                            updated_at: memo.updated_at,
                        })

                    if (insertError) throw insertError
                }

                // ローカル状態を更新
                setMemos((prev) => {
                    const updatedMemos = [...prev, memo]

                    // ローカルストレージも更新
                    if (!useDatabase || !user) {
                        saveLocalMemos(updatedMemos)
                    }

                    return updatedMemos
                })
            } catch (err: any) {
                setError(err.message)
                console.error('Error restoring memo:', err)
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
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'memos',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Memo change received:', payload)

                    switch (payload.eventType) {
                        case 'INSERT':
                            if (payload.new) {
                                const newMemo: MemoData = {
                                    id: payload.new.id,
                                    title: payload.new.title || '',
                                    content: payload.new.content || '',
                                    created_at: payload.new.created_at,
                                    updated_at: payload.new.updated_at,
                                }
                                setMemos((prev) => {
                                    // 既に存在しない場合のみ追加
                                    if (
                                        !prev.some((m) => m.id === newMemo.id)
                                    ) {
                                        return [...prev, newMemo]
                                    }
                                    return prev
                                })
                            }
                            break
                        case 'UPDATE':
                            if (payload.new) {
                                setMemos((prev) =>
                                    prev.map((memo) =>
                                        memo.id === payload.new.id
                                            ? {
                                                  ...memo,
                                                  title:
                                                      payload.new.title || '',
                                                  content:
                                                      payload.new.content || '',
                                                  updated_at:
                                                      payload.new.updated_at,
                                              }
                                            : memo
                                    )
                                )
                            }
                            break
                        case 'DELETE':
                            if (payload.old) {
                                setMemos((prev) =>
                                    prev.filter(
                                        (memo) => memo.id !== payload.old.id
                                    )
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

    // メモの並び替え
    const reorderMemos = useCallback(
        async (reorderedMemos: MemoData[]) => {
            const originalMemos = memos
            setMemos(reorderedMemos)

            if (useDatabase && user) {
                // Supabaseに順序を保存
                try {
                    const memoIds = reorderedMemos.map((memo) => memo.id)
                    const { error: reorderError } = await supabase.rpc(
                        'reorder_memos',
                        {
                            p_user_id: user.id,
                            p_memo_ids: memoIds,
                        }
                    )
                    if (reorderError) {
                        throw reorderError
                    }
                } catch (err: any) {
                    console.error('Error reordering memos:', err)
                    setError('メモの順序の保存に失敗しました。')
                    setMemos(originalMemos)
                }
            } else {
                // ローカルストレージに保存
                saveLocalMemos(reorderedMemos)
            }
        },
        [memos, useDatabase, user]
    )

    return {
        memos,
        loading,
        error,
        createMemo,
        updateMemo,
        deleteMemo,
        restoreMemo,
        reorderMemos,
        refreshMemos: fetchMemos,
    }
}
