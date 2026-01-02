import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'

// API認証の結果型
export type AuthResult = {
  success: true
  userId: string
  supabase: SupabaseClient  // 認証済みのSupabaseクライアント
} | {
  success: false
  error: string
  status: number
}

// 認証済みSupabaseクライアントを作成
function createAuthenticatedClient(token: string): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

// CORSヘッダー
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-User-Id',
}

// OPTIONS リクエストのレスポンス（CORS preflight）
export function handleCors(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

// APIレスポンスヘルパー
export function apiResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  })
}

// エラーレスポンスヘルパー
export function apiError(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: corsHeaders }
  )
}

/**
 * API認証を行う
 *
 * 認証方法:
 * 1. Bearer トークン (Supabase JWTトークン)
 *    Authorization: Bearer <supabase_access_token>
 *
 * 2. API Key (環境変数で設定したキー + ユーザーID)
 *    X-API-Key: <api_key>
 *    X-User-Id: <user_id>
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  // Supabaseが設定されていない場合
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      status: 503,
    }
  }

  // 1. Bearer トークン認証を試行
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (error || !user) {
        return {
          success: false,
          error: 'Invalid or expired token',
          status: 401,
        }
      }

      // 認証済みのSupabaseクライアントを作成
      const authenticatedSupabase = createAuthenticatedClient(token)

      return {
        success: true,
        userId: user.id,
        supabase: authenticatedSupabase,
      }
    } catch {
      return {
        success: false,
        error: 'Token verification failed',
        status: 401,
      }
    }
  }

  // 2. API Key 認証を試行
  const apiKey = request.headers.get('X-API-Key')
  const userId = request.headers.get('X-User-Id')

  if (apiKey && userId) {
    const validApiKey = process.env.PRIVATE_API_KEY

    if (!validApiKey) {
      return {
        success: false,
        error: 'API Key authentication is not configured. Set PRIVATE_API_KEY in environment variables.',
        status: 503,
      }
    }

    // タイミング攻撃対策: timingSafeEqualは同じ長さのBufferを要求する
    if (apiKey.length !== validApiKey.length) {
      return {
        success: false,
        error: 'Invalid API Key',
        status: 401,
      }
    }

    // 一定時間で比較してタイミング攻撃を防ぐ
    if (!timingSafeEqual(Buffer.from(apiKey), Buffer.from(validApiKey))) {
      return {
        success: false,
        error: 'Invalid API Key',
        status: 401,
      }
    }

    // ユーザーIDの検証（Supabaseでプロフィールが存在するか確認）
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return {
        success: false,
        error: 'User not found',
        status: 404,
      }
    }

    // API Key認証の場合はサービスロールキーまたはデフォルトクライアントを使用
    // 注: RLSをバイパスするにはサービスロールキーが必要
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const authenticatedSupabase = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : supabase

    return {
      success: true,
      userId,
      supabase: authenticatedSupabase,
    }
  }

  // 認証情報がない
  return {
    success: false,
    error: 'Authentication required. Provide either "Authorization: Bearer <token>" or "X-API-Key" with "X-User-Id" headers.',
    status: 401,
  }
}

// ページネーションパラメータの解析
export function parsePagination(request: NextRequest): {
  limit: number
  offset: number
} {
  const url = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50'), 1), 100)
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)
  return { limit, offset }
}

// ソートパラメータの解析
export function parseSort(
  request: NextRequest,
  allowedFields: string[],
  defaultField: string = 'created_at'
): {
  field: string
  order: 'asc' | 'desc'
} {
  const url = new URL(request.url)
  const sortParam = url.searchParams.get('sort') || defaultField
  const orderParam = url.searchParams.get('order') || 'desc'

  const field = allowedFields.includes(sortParam) ? sortParam : defaultField
  const order = orderParam === 'asc' ? 'asc' : 'desc'

  return { field, order }
}
