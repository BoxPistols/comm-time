import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// 環境変数が正しく設定されているかチェック
const isConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-anon-key'

if (typeof window !== 'undefined' && !isConfigured) {
  console.warn('⚠️ Supabase is not configured. Using LocalStorage mode.')
  console.warn('To enable database features:')
  console.warn('1. Create a Supabase project at https://supabase.com/dashboard')
  console.warn('2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  console.warn('3. Restart the development server')
}

// Supabaseクライアントのシングルトンインスタンス
// 環境変数が設定されていない場合はプレースホルダーで初期化（実際には使用しない）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export { isConfigured as isSupabaseConfigured }

// データベース型定義
export type TodoItem = {
  id: string
  user_id: string
  type: 'meeting' | 'pomodoro'
  text: string
  is_completed: boolean
  due_date?: string
  due_time?: string
  alarm_point_id?: string
  order_index: number
  created_at: string
  updated_at: string
}

export type Memo = {
  id: string
  user_id: string
  type: 'meeting' | 'pomodoro'
  content: string
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  email: string
  created_at: string
  updated_at: string
}

// Supabase認証ヘルパー
export const auth = {
  // メールアドレスでサインアップ
  signUp: async (email: string, password: string) => {
    return await supabase.auth.signUp({ email, password })
  },

  // メールアドレスでサインイン
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  },

  // サインアウト
  signOut: async () => {
    return await supabase.auth.signOut()
  },

  // 現在のユーザーを取得
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // 認証状態の変更を監視
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },
}
