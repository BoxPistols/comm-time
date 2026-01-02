import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  authenticateRequest,
  handleCors,
  apiResponse,
  apiError,
} from '@/lib/api-auth'

// CORS preflight
export async function OPTIONS() {
  return handleCors()
}

/**
 * PATCH /api/v1/kanban-statuses/reorder
 *
 * ステータスの順序を一括更新
 *
 * Body:
 * - orders: { id: string, sortOrder: number }[]
 */
export async function PATCH(request: NextRequest) {
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

  if (!body.orders || !Array.isArray(body.orders)) {
    return apiError('orders is required and must be an array', 400)
  }

  const orders = body.orders as { id: string; sortOrder: number }[]

  // バリデーション
  for (const order of orders) {
    if (!order.id || typeof order.id !== 'string') {
      return apiError('Each order must have an id string', 400)
    }
    if (typeof order.sortOrder !== 'number') {
      return apiError('Each order must have a sortOrder number', 400)
    }
  }

  // 一括更新
  const updates = orders.map(async (order) => {
    return supabase
      .from('kanban_statuses')
      .update({ sort_order: order.sortOrder })
      .eq('id', order.id)
      .eq('user_id', auth.userId)
  })

  try {
    await Promise.all(updates)
  } catch {
    return apiError('Failed to update order', 500)
  }

  // 更新後のステータスを取得
  const { data, error } = await supabase
    .from('kanban_statuses')
    .select('*')
    .eq('user_id', auth.userId)
    .order('sort_order', { ascending: true })

  if (error) {
    return apiError(error.message, 500)
  }

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

  return apiResponse({ statuses })
}
