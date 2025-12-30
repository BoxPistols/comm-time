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
 * GET /api/v1/todos
 *
 * Query Parameters:
 * - limit: number (1-100, default: 50)
 * - offset: number (default: 0)
 * - sort: string (created_at, updated_at, order_index, due_date)
 * - order: 'asc' | 'desc' (default: 'desc')
 * - is_completed: 'true' | 'false' | 'all' (default: 'all')
 * - kanban_status: 'backlog' | 'todo' | 'doing' | 'done' | 'all' (default: 'all')
 * - priority: 'high' | 'medium' | 'low' | 'none' | 'all' (default: 'all')
 * - tag_id: string (filter by tag ID)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { limit, offset } = parsePagination(request)
  const { field, order } = parseSort(
    request,
    ['created_at', 'updated_at', 'order_index', 'due_date'],
    'order_index'
  )

  const url = new URL(request.url)
  const isCompleted = url.searchParams.get('is_completed')
  const kanbanStatus = url.searchParams.get('kanban_status')
  const priority = url.searchParams.get('priority')
  const tagId = url.searchParams.get('tag_id')

  let query = supabase
    .from('todos')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.userId)
    .order(field, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  // フィルター適用
  if (isCompleted === 'true') {
    query = query.eq('is_completed', true)
  } else if (isCompleted === 'false') {
    query = query.eq('is_completed', false)
  }

  if (kanbanStatus && kanbanStatus !== 'all') {
    query = query.eq('kanban_status', kanbanStatus)
  }

  if (priority && priority !== 'all') {
    query = query.eq('priority', priority)
  }

  if (tagId) {
    query = query.contains('tag_ids', [tagId])
  }

  const { data, error, count } = await query

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({
    todos: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
}

// 許可される値の定義
const VALID_PRIORITIES = ['high', 'medium', 'low', 'none'] as const
const VALID_IMPORTANCES = ['high', 'medium', 'low', 'none'] as const
const VALID_KANBAN_STATUSES = ['backlog', 'todo', 'doing', 'done'] as const

/**
 * POST /api/v1/todos
 *
 * Body:
 * - text: string (required)
 * - is_completed?: boolean (default: false)
 * - due_date?: string (YYYY-MM-DD)
 * - due_time?: string (HH:mm)
 * - alarm_point_id?: string
 * - tag_ids?: string[]
 * - priority?: 'high' | 'medium' | 'low' | 'none'
 * - importance?: 'high' | 'medium' | 'low' | 'none'
 * - kanban_status?: 'backlog' | 'todo' | 'doing' | 'done'
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

  // 必須フィールドのバリデーション
  if (!body.text || typeof body.text !== 'string') {
    return apiError('text is required and must be a string', 400)
  }

  // 型チェック
  if ('is_completed' in body && typeof body.is_completed !== 'boolean') {
    return apiError('is_completed must be a boolean', 400)
  }

  if ('due_date' in body && body.due_date !== null && typeof body.due_date !== 'string') {
    return apiError('due_date must be a string (YYYY-MM-DD) or null', 400)
  }

  if ('due_time' in body && body.due_time !== null && typeof body.due_time !== 'string') {
    return apiError('due_time must be a string (HH:mm) or null', 400)
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

  // RPC関数を使用してアトミックにTODOを作成（レースコンディション対策）
  const { data, error } = await supabase.rpc('create_todo_with_order', {
    p_user_id: auth.userId,
    p_text: body.text,
    p_is_completed: body.is_completed ?? false,
    p_due_date: body.due_date ?? null,
    p_due_time: body.due_time ?? null,
    p_alarm_point_id: body.alarm_point_id ?? null,
    p_tag_ids: body.tag_ids ?? [],
    p_priority: body.priority ?? 'none',
    p_importance: body.importance ?? 'none',
    p_kanban_status: body.kanban_status ?? 'backlog',
  })

  // RPCが存在しない場合は従来の方法にフォールバック
  if (error && (error.code === '42883' || error.code === '42P01')) {
    // フォールバック: 従来のINSERT（レースコンディションの可能性あり）
    const { data: maxOrderData } = await supabase
      .from('todos')
      .select('order_index')
      .eq('user_id', auth.userId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const nextOrderIndex = (maxOrderData?.order_index ?? -1) + 1

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('todos')
      .insert({
        user_id: auth.userId,
        text: body.text,
        is_completed: body.is_completed ?? false,
        due_date: body.due_date ?? null,
        due_time: body.due_time ?? null,
        alarm_point_id: body.alarm_point_id ?? null,
        order_index: nextOrderIndex,
        tag_ids: body.tag_ids ?? [],
        priority: body.priority ?? 'none',
        importance: body.importance ?? 'none',
        kanban_status: body.kanban_status ?? 'backlog',
      })
      .select()
      .single()

    if (fallbackError) {
      return apiError(fallbackError.message, 500)
    }

    return apiResponse({ todo: fallbackData }, 201)
  }

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({ todo: data }, 201)
}
