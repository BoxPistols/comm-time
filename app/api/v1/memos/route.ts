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
 * GET /api/v1/memos
 *
 * Query Parameters:
 * - limit: number (1-100, default: 50)
 * - offset: number (default: 0)
 * - sort: string (created_at, updated_at, title)
 * - order: 'asc' | 'desc' (default: 'desc')
 * - search: string (search in title and content)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { limit, offset } = parsePagination(request)
  const { field, order } = parseSort(
    request,
    ['created_at', 'updated_at', 'title'],
    'updated_at'
  )

  const url = new URL(request.url)
  const search = url.searchParams.get('search')

  let query = supabase
    .from('memos')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.userId)
    .order(field, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  // 検索フィルター
  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({
    memos: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
}

/**
 * POST /api/v1/memos
 *
 * Body:
 * - title?: string (default: '')
 * - content?: string (default: '')
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

  // 型チェック
  if ('title' in body && typeof body.title !== 'string') {
    return apiError('title must be a string', 400)
  }

  if ('content' in body && typeof body.content !== 'string') {
    return apiError('content must be a string', 400)
  }

  const newMemo = {
    user_id: auth.userId,
    title: body.title ?? '',
    content: body.content ?? '',
  }

  const { data, error } = await supabase
    .from('memos')
    .insert(newMemo)
    .select()
    .single()

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({ memo: data }, 201)
}
