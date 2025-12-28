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

  // 削除前に存在確認
  const { data: existing } = await supabase
    .from('todos')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (!existing) {
    return apiError('Todo not found', 404)
  }

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({ success: true, message: 'Todo deleted' })
}
