import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  authenticateRequest,
  handleCors,
  apiResponse,
  apiError,
  parsePagination,
  parseSort,
} from '@/lib/api-auth'

// CORS preflight
export async function OPTIONS() {
  return handleCors()
}

/**
 * GET /api/v1/kanban-statuses
 *
 * Query Parameters:
 * - limit: number (1-100, default: 50)
 * - offset: number (default: 0)
 * - sort: string (created_at, updated_at, name, sort_order)
 * - order: 'asc' | 'desc' (default: 'asc' for sort_order)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { limit, offset } = parsePagination(request)
  const { field, order } = parseSort(
    request,
    ['created_at', 'updated_at', 'name', 'sort_order'],
    'sort_order'
  )

  // sort_orderの場合はデフォルトで昇順
  const defaultOrder = field === 'sort_order' || field === 'name' ? 'asc' : 'desc'
  const url = new URL(request.url)
  const orderParam = url.searchParams.get('order')
  const finalOrder = orderParam ? order : defaultOrder

  const { data, error, count } = await supabase
    .from('kanban_statuses')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.userId)
    .order(field, { ascending: finalOrder === 'asc' })
    .range(offset, offset + limit - 1)

  if (error) {
    // テーブルが存在しない場合はデフォルト値を返す
    if (error.code === '42P01') {
      return apiResponse({
        statuses: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      })
    }
    return apiError(error.message, 500)
  }

  // DB結果をフロントエンド用の形式に変換
  const statuses = (data || []).map(status => ({
    id: status.id,
    user_id: status.user_id,
    name: status.name,
    label: status.label,
    color: status.color,
    bgClass: status.bg_class,
    textClass: status.text_class,
    borderClass: status.border_class,
    activeClass: status.active_class,
    sortOrder: status.sort_order,
    isDefault: status.is_default,
    created_at: status.created_at,
    updated_at: status.updated_at,
  }))

  return apiResponse({
    statuses,
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
}

/**
 * POST /api/v1/kanban-statuses
 *
 * Body:
 * - name: string (required) - 内部識別子
 * - label: string (required) - 表示名
 * - color?: string (default: 'gray')
 * - sortOrder?: number (default: 0)
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!body.name || typeof body.name !== 'string') {
    return apiError('name is required and must be a string', 400)
  }

  if (!body.label || typeof body.label !== 'string') {
    return apiError('label is required and must be a string', 400)
  }

  // 型チェック
  if ('color' in body && typeof body.color !== 'string') {
    return apiError('color must be a string', 400)
  }

  if ('sortOrder' in body && typeof body.sortOrder !== 'number') {
    return apiError('sortOrder must be a number', 400)
  }

  // カラー設定を取得
  const colorConfig = getColorConfig(body.color as string || 'gray')

  // 既存のステータス数を取得してsort_orderを設定
  let sortOrder = body.sortOrder as number | undefined
  if (sortOrder === undefined) {
    const { count } = await supabase
      .from('kanban_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
    sortOrder = count || 0
  }

  const newStatus = {
    user_id: auth.userId,
    name: body.name,
    label: body.label,
    color: colorConfig.color,
    bg_class: colorConfig.bgClass,
    text_class: colorConfig.textClass,
    border_class: colorConfig.borderClass,
    active_class: colorConfig.activeClass,
    sort_order: sortOrder,
    is_default: false,
  }

  const { data, error } = await supabase
    .from('kanban_statuses')
    .insert(newStatus)
    .select()
    .single()

  if (error) {
    return apiError(error.message, 500)
  }

  // フロントエンド用の形式に変換
  const status = {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    label: data.label,
    color: data.color,
    bgClass: data.bg_class,
    textClass: data.text_class,
    borderClass: data.border_class,
    activeClass: data.active_class,
    sortOrder: data.sort_order,
    isDefault: data.is_default,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }

  return apiResponse({ status }, 201)
}

// カラー設定を取得するヘルパー関数
function getColorConfig(color: string) {
  const colorConfigs: Record<string, { color: string; bgClass: string; textClass: string; borderClass: string; activeClass: string }> = {
    gray: { color: 'gray', bgClass: 'bg-gray-500', textClass: 'text-gray-600', borderClass: 'border-gray-300', activeClass: 'bg-gray-500 text-white' },
    blue: { color: 'blue', bgClass: 'bg-blue-500', textClass: 'text-blue-600', borderClass: 'border-blue-300', activeClass: 'bg-blue-500 text-white' },
    yellow: { color: 'yellow', bgClass: 'bg-yellow-500', textClass: 'text-yellow-600', borderClass: 'border-yellow-300', activeClass: 'bg-yellow-500 text-black' },
    green: { color: 'green', bgClass: 'bg-green-500', textClass: 'text-green-600', borderClass: 'border-green-300', activeClass: 'bg-green-500 text-white' },
    red: { color: 'red', bgClass: 'bg-red-500', textClass: 'text-red-600', borderClass: 'border-red-300', activeClass: 'bg-red-500 text-white' },
    orange: { color: 'orange', bgClass: 'bg-orange-500', textClass: 'text-orange-600', borderClass: 'border-orange-300', activeClass: 'bg-orange-500 text-white' },
    purple: { color: 'purple', bgClass: 'bg-purple-500', textClass: 'text-purple-600', borderClass: 'border-purple-300', activeClass: 'bg-purple-500 text-white' },
    pink: { color: 'pink', bgClass: 'bg-pink-500', textClass: 'text-pink-600', borderClass: 'border-pink-300', activeClass: 'bg-pink-500 text-white' },
    indigo: { color: 'indigo', bgClass: 'bg-indigo-500', textClass: 'text-indigo-600', borderClass: 'border-indigo-300', activeClass: 'bg-indigo-500 text-white' },
    teal: { color: 'teal', bgClass: 'bg-teal-500', textClass: 'text-teal-600', borderClass: 'border-teal-300', activeClass: 'bg-teal-500 text-white' },
  }

  return colorConfigs[color] || colorConfigs.gray
}
