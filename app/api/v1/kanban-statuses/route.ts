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

  const name = body.name as string
  const label = body.label as string
  const color = (body.color as string) || 'gray'

  if (!name || typeof name !== 'string') {
    return apiError('name is required and must be a string', 400)
  }

  if (!label || typeof label !== 'string') {
    return apiError('label is required and must be a string', 400)
  }

  const { data, error } = await supabase.rpc('create_kanban_status', {
    p_name: name,
    p_label: label,
    p_color: color,
  })

  if (error) {
    // RLSなどSupabase側で発生したエラー
    if (error.code === 'PGRST' && error.details.includes('User ID does not match authenticated user')) {
      return apiError('Unauthorized', 403)
    }
    // ユニーク制約違反
    if (error.code === '23505') {
      return apiError('A status with this name already exists.', 409)
    }
    return apiError(error.message, 500)
  }
  
  // rpcの返り値は配列なので、最初の要素を取得
  const statusData = Array.isArray(data) ? data[0] : data;

  if (!statusData) {
    return apiError('Failed to create status', 500)
  }

  // フロントエンド用の形式に変換
  const status = {
    id: statusData.id,
    user_id: statusData.user_id,
    name: statusData.name,
    label: statusData.label,
    color: statusData.color,
    bgClass: statusData.bg_class,
    textClass: statusData.text_class,
    borderClass: statusData.border_class,
    activeClass: statusData.active_class,
    sortOrder: statusData.sort_order,
    isDefault: statusData.is_default,
    created_at: statusData.created_at,
    updated_at: statusData.updated_at,
  }

  return apiResponse({ status }, 201)
}
