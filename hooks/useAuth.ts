"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChangeは初回実行時に現在のセッションを返すため、
    // これだけで初期状態と変更の両方をハンドルできます
    const { data: authListener } = auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await auth.signOut()
      setUser(null)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signOut,
  }
}
