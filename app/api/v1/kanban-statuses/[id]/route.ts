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
 * - sortOrder: number
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
  if ('name' in body && typeof body.name !== 'string') {
    return apiError('name must be a string', 400)
  }

  if ('label' in body && typeof body.label !== 'string') {
    return apiError('label must be a string', 400)
  }

  if ('color' in body && typeof body.color !== 'string') {
    return apiError('color must be a string', 400)
  }

  if ('sortOrder' in body && typeof body.sortOrder !== 'number') {
    return apiError('sortOrder must be a number', 400)
  }

  // 許可されたフィールドのみ抽出
  const updates: Record<string, unknown> = {}

  if ('name' in body) {
    updates.name = body.name
  }

  if ('label' in body) {
    updates.label = body.label
  }

  if ('color' in body) {
    const colorConfig = getColorConfig(body.color as string)
    updates.color = colorConfig.color
    updates.bg_class = colorConfig.bgClass
    updates.text_class = colorConfig.textClass
    updates.border_class = colorConfig.borderClass
    updates.active_class = colorConfig.activeClass
  }

  if ('sortOrder' in body) {
    updates.sort_order = body.sortOrder
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No valid fields to update', 400)
  }

  const { data, error } = await supabase
    .from('kanban_statuses')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.userId)
    .select()
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

  // まず削除対象のステータスを取得
  const { data: statusToDelete, error: fetchError } = await supabase
    .from('kanban_statuses')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return apiError('Status not found', 404)
    }
    return apiError(fetchError.message, 500)
  }

  // デフォルトステータスは削除不可
  if (statusToDelete.is_default) {
    return apiError('Cannot delete default status', 400)
  }

  // デフォルトステータスを取得
  const { data: defaultStatus } = await supabase
    .from('kanban_statuses')
    .select('name')
    .eq('user_id', auth.userId)
    .eq('is_default', true)
    .single()

  const fallbackStatusName = defaultStatus?.name || 'backlog'

  // 関連するTODOのkanban_statusをデフォルトに変更
  await supabase
    .from('todos')
    .update({ kanban_status: fallbackStatusName })
    .eq('user_id', auth.userId)
    .eq('kanban_status', statusToDelete.name)

  // ステータスを削除
  const { error, count } = await supabase
    .from('kanban_statuses')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) {
    return apiError(error.message, 500)
  }

  if (count === 0) {
    return apiError('Status not found', 404)
  }

  return apiResponse({ success: true, message: 'Status deleted' })
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
