import { NextRequest } from 'next/server'
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
 * POST /api/v1/kanban-statuses/init
 *
 * ユーザーのデフォルトステータスを初期化
 * 既にステータスが存在する場合は何もしない
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  // 既存のステータスを確認
  const { count } = await auth.supabase
    .from('kanban_statuses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.userId)

  if (count && count > 0) {
    // 既にステータスが存在する場合は既存のものを返す
    const { data: existingStatuses } = await auth.supabase
      .from('kanban_statuses')
      .select('*')
      .eq('user_id', auth.userId)
      .order('sort_order', { ascending: true })

    const statuses = (existingStatuses || []).map(status => ({
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

    return apiResponse({ statuses, initialized: false })
  }

  // デフォルトステータスを作成
  const defaultStatuses = [
    { user_id: auth.userId, name: 'backlog', label: 'Backlog', color: 'gray', bg_class: 'bg-gray-500', text_class: 'text-gray-600', border_class: 'border-gray-300', active_class: 'bg-gray-500 text-white', sort_order: 0, is_default: true },
    { user_id: auth.userId, name: 'todo', label: 'Todo', color: 'blue', bg_class: 'bg-blue-500', text_class: 'text-blue-600', border_class: 'border-blue-300', active_class: 'bg-blue-500 text-white', sort_order: 1, is_default: false },
    { user_id: auth.userId, name: 'doing', label: 'Doing', color: 'yellow', bg_class: 'bg-yellow-500', text_class: 'text-yellow-600', border_class: 'border-yellow-300', active_class: 'bg-yellow-500 text-black', sort_order: 2, is_default: false },
    { user_id: auth.userId, name: 'done', label: 'Done', color: 'green', bg_class: 'bg-green-500', text_class: 'text-green-600', border_class: 'border-green-300', active_class: 'bg-green-500 text-white', sort_order: 3, is_default: false },
  ]

  const { data, error } = await auth.supabase
    .from('kanban_statuses')
    .insert(defaultStatuses)
    .select()

  if (error) {
    // テーブルが存在しない場合
    if (error.code === '42P01') {
      return apiError('Table not found. Please run the migration first.', 500)
    }
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

  return apiResponse({ statuses, initialized: true }, 201)
}
