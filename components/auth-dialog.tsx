"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { auth } from "@/lib/supabase"

type AuthMode = "signin" | "signup"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // メモリリーク防止のためのタイマー参照
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      // アンマウント時にタイマーをクリア
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // 既存のタイマーをクリア
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }

    // メールアドレス制限チェック
    const allowedEmailsStr = process.env.NEXT_PUBLIC_ALLOWED_EMAILS || ""
    if (allowedEmailsStr) {
      const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase())
      const userEmail = email.trim().toLowerCase()

      if (!allowedEmails.includes(userEmail)) {
        setError("このメールアドレスでのログインは許可されていません。")
        setLoading(false)
        return
      }
    }

    try {
      if (mode === "signup") {
        const { error } = await auth.signUp(email, password)
        if (error) throw error

        setMessage("確認メールを送信しました。メールを確認してアカウントを有効化してください。")
        setEmail("")
        setPassword("")

        // 数秒後にダイアログを閉じる（メモリリーク対策済み）
        closeTimerRef.current = setTimeout(() => {
          onOpenChange(false)
          setMessage(null)
          closeTimerRef.current = null
        }, 3000)
      } else {
        const { error } = await auth.signIn(email, password)
        if (error) throw error

        setMessage("ログインに成功しました！")
        setEmail("")
        setPassword("")

        // 成功時のコールバックを呼ぶ
        if (onSuccess) onSuccess()

        // ダイアログを閉じる（メモリリーク対策済み）
        closeTimerRef.current = setTimeout(() => {
          onOpenChange(false)
          setMessage(null)
          closeTimerRef.current = null
        }, 1000)
      }
    } catch (err) {
      const error = err as Error
      setError(error.message || "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin")
    setError(null)
    setMessage(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "signin" ? "ログイン" : "新規登録"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signin"
              ? "メールアドレスとパスワードでログインしてください"
              : "メールアドレスとパスワードで新規アカウントを作成"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              placeholder="example@email.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              placeholder="6文字以上"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              {error}
            </div>
          )}

          {message && (
            <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "処理中..." : mode === "signin" ? "ログイン" : "新規登録"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            disabled={loading}
          >
            {mode === "signin"
              ? "アカウントをお持ちでない方はこちら"
              : "既にアカウントをお持ちの方はこちら"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
