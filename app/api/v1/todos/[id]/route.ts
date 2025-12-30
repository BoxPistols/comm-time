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

// 許可される値の定義
const VALID_PRIORITIES = ['high', 'medium', 'low', 'none'] as const
const VALID_IMPORTANCES = ['high', 'medium', 'low', 'none'] as const
const VALID_KANBAN_STATUSES = ['backlog', 'todo', 'doing', 'done'] as const

// CORS preflight
export async function OPTIONS() {
  return handleCors()
}

/**
 * GET /api/v1/todos/:id
 *
 * 特定のTODOを取得
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { id } = await context.params

  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return apiError('Todo not found', 404)
    }
    return apiError(error.message, 500)
  }

  return apiResponse({ todo: data })
}

/**
 * PATCH /api/v1/todos/:id
 *
 * TODOを更新
 *
 * Body (all optional):
 * - text: string
 * - is_completed: boolean
 * - due_date: string | null
 * - due_time: string | null
 * - alarm_point_id: string | null
 * - order_index: number
 * - tag_ids: string[]
 * - priority: 'high' | 'medium' | 'low' | 'none'
 * - importance: 'high' | 'medium' | 'low' | 'none'
 * - kanban_status: 'backlog' | 'todo' | 'doing' | 'done'
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
  if ('text' in body && typeof body.text !== 'string') {
    return apiError('text must be a string', 400)
  }

  if ('is_completed' in body && typeof body.is_completed !== 'boolean') {
    return apiError('is_completed must be a boolean', 400)
  }

  if ('due_date' in body && body.due_date !== null && typeof body.due_date !== 'string') {
    return apiError('due_date must be a string or null', 400)
  }

  if ('due_time' in body && body.due_time !== null && typeof body.due_time !== 'string') {
    return apiError('due_time must be a string or null', 400)
  }

  if ('order_index' in body && typeof body.order_index !== 'number') {
    return apiError('order_index must be a number', 400)
  }

  if ('tag_ids' in body && !Array.isArray(body.tag_ids)) {
    return apiError('tag_ids must be an array', 400)
  }

  if ('priority' in body && !VALID_PRIORITIES.includes(body.priority as typeof VALID_PRIORITIES[number])) {
    return apiError(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`, 400)
  }

  if ('importance' in body && !VALID_IMPORTANCES.includes(body.importance as typeof VALID_IMPORTANCES[number])) {
    return apiError(`importance must be one of: ${VALID_IMPORTANCES.join(', ')}`, 400)
  }

  if ('kanban_status' in body && !VALID_KANBAN_STATUSES.includes(body.kanban_status as typeof VALID_KANBAN_STATUSES[number])) {
    return apiError(`kanban_status must be one of: ${VALID_KANBAN_STATUSES.join(', ')}`, 400)
  }

  // 許可されたフィールドのみ抽出
  const allowedFields = [
    'text',
    'is_completed',
    'due_date',
    'due_time',
    'alarm_point_id',
    'order_index',
    'tag_ids',
    'priority',
    'importance',
    'kanban_status',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No valid fields to update', 400)
  }

  // 存在確認と更新を同時に行う
  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.userId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return apiError('Todo not found', 404)
    }
    return apiError(error.message, 500)
  }

  return apiResponse({ todo: data })
}

/**
 * DELETE /api/v1/todos/:id
 *
 * TODOを削除
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { id } = await context.params

  // 存在確認と削除を1つのクエリで実行
  const { error, count } = await supabase
    .from('todos')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) {
    return apiError(error.message, 500)
  }

  if (count === 0) {
    return apiError('Todo not found', 404)
  }

  return apiResponse({ success: true, message: 'Todo deleted' })
}
