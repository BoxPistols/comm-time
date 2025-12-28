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

/**
 * POST /api/v1/todos
 *
 * Body:
 * - text: string (required)
 * - is_completed?: boolean (default: false)
 * - due_date?: string (YYYY-MM-DD)
 * - due_time?: string (HH:mm)
 * - alarm_point_id?: string
 * - order_index?: number
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

  if (!body.text || typeof body.text !== 'string') {
    return apiError('text is required and must be a string', 400)
  }

  // 最大order_indexを取得
  const { data: maxOrderData } = await supabase
    .from('todos')
    .select('order_index')
    .eq('user_id', auth.userId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const nextOrderIndex = (maxOrderData?.order_index ?? -1) + 1

  const newTodo = {
    user_id: auth.userId,
    text: body.text,
    is_completed: body.is_completed ?? false,
    due_date: body.due_date ?? null,
    due_time: body.due_time ?? null,
    alarm_point_id: body.alarm_point_id ?? null,
    order_index: body.order_index ?? nextOrderIndex,
    tag_ids: body.tag_ids ?? [],
    priority: body.priority ?? 'none',
    importance: body.importance ?? 'none',
    kanban_status: body.kanban_status ?? 'backlog',
  }

  const { data, error } = await supabase
    .from('todos')
    .insert(newTodo)
    .select()
    .single()

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({ todo: data }, 201)
}
