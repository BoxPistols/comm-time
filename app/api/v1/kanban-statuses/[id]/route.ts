import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  authenticateRequest,
  handleCors,
  apiResponse,
  apiError,
} from '@/lib/api-auth'

type RouteContext = {
  params: Promise<{ id: string }>
}

// CORS preflight
export async function OPTIONS() {
  return handleCors()
}

/**
 * GET /api/v1/kanban-statuses/:id
 *
 * 特定のステータスを取得
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { id } = await context.params

  const { data, error } = await supabase
    .from('kanban_statuses')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return apiError('Status not found', 404)
    }
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

  return apiResponse({ status })
}

/**
 * PATCH /api/v1/kanban-statuses/:id
 *
 * ステータスを更新
 *
 * Body (all optional):
 * - name: string
 * - label: string
 * - color: string
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { id } = await context.params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  // 型チェック
  if (('name' in body && typeof body.name !== 'string') || 
      ('label' in body && typeof body.label !== 'string') ||
      ('color' in body && typeof body.color !== 'string')) {
    return apiError('Invalid field type', 400)
  }

  const name = body.name as string | undefined
  const label = body.label as string | undefined
  const color = body.color as string | undefined

  if (!name && !label && !color) {
    return apiError('No valid fields to update', 400)
  }

  const { data, error } = await supabase.rpc('update_kanban_status', {
    p_id: id,
    p_name: name,
    p_label: label,
    p_color: color,
  })

  if (error) {
    // ユニーク制約違反
    if (error.code === '23505') {
      return apiError('A status with this name already exists.', 409)
    }
    // RPC内でraiseされた例外
    if (error.code === 'PGRST' && error.details.includes('Status not found')) {
      return apiError('Status not found', 404)
    }
    return apiError(error.message, 500)
  }

  // rpcの返り値は配列なので、最初の要素を取得
  const statusData = Array.isArray(data) ? data[0] : data;

  if (!statusData) {
    return apiError('Failed to update status', 500)
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

  return apiResponse({ status })
}

/**
 * DELETE /api/v1/kanban-statuses/:id
 *
 * ステータスを削除
 * デフォルトステータスは削除不可
 * 関連するTODOのkanban_statusはデフォルトステータスに変更される
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { id } = await context.params

  const { error } = await supabase.rpc('delete_kanban_status', {
    p_id: id,
  })

  if (error) {
    // RPC内でraiseされた例外
    if (error.code === 'PGRST') {
      if (error.details.includes('Status not found')) {
        return apiError('Status not found', 404)
      }
      if (error.details.includes('Cannot delete the default status')) {
        return apiError('Cannot delete default status', 400)
      }
    }
    return apiError(error.message, 500)
  }

  return apiResponse({ success: true, message: 'Status deleted' })
}
