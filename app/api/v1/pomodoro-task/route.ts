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
 * GET /api/v1/pomodoro-task
 *
 * 現在のポモドーロタスクを取得
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { data, error } = await supabase
    .from('pomodoro_current_task')
    .select('*')
    .eq('user_id', auth.userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (not an error for us)
    return apiError(error.message, 500)
  }

  return apiResponse({
    task: data || { task_text: '', todo_id: null },
  })
}

/**
 * PUT /api/v1/pomodoro-task
 *
 * ポモドーロタスクを更新（upsert）
 *
 * Body:
 * - task_text: string
 * - todo_id?: string | null
 */
export async function PUT(request: NextRequest) {
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

  // バリデーション
  if ('task_text' in body && typeof body.task_text !== 'string') {
    return apiError('task_text must be a string', 400)
  }

  if ('todo_id' in body && body.todo_id !== null && typeof body.todo_id !== 'string') {
    return apiError('todo_id must be a string or null', 400)
  }

  const taskData = {
    user_id: auth.userId,
    task_text: typeof body.task_text === 'string' ? body.task_text : '',
    todo_id: body.todo_id || null,
  }

  const { data, error } = await supabase
    .from('pomodoro_current_task')
    .upsert(taskData, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({ task: data })
}

/**
 * DELETE /api/v1/pomodoro-task
 *
 * ポモドーロタスクをクリア
 */
export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { error } = await supabase
    .from('pomodoro_current_task')
    .delete()
    .eq('user_id', auth.userId)

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({ success: true })
}
