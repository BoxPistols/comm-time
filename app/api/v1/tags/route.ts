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
 * GET /api/v1/tags
 *
 * Query Parameters:
 * - limit: number (1-100, default: 50)
 * - offset: number (default: 0)
 * - sort: string (created_at, updated_at, name)
 * - order: 'asc' | 'desc' (default: 'asc' for name, 'desc' for dates)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { limit, offset } = parsePagination(request)
  const { field, order } = parseSort(
    request,
    ['created_at', 'updated_at', 'name'],
    'name'
  )

  // nameの場合はデフォルトで昇順
  const defaultOrder = field === 'name' ? 'asc' : 'desc'
  const url = new URL(request.url)
  const orderParam = url.searchParams.get('order')
  const finalOrder = orderParam ? order : defaultOrder

  const { data, error, count } = await supabase
    .from('tags')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.userId)
    .order(field, { ascending: finalOrder === 'asc' })
    .range(offset, offset + limit - 1)

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({
    tags: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
}

/**
 * POST /api/v1/tags
 *
 * Body:
 * - name: string (required)
 * - color?: string (default: 'bg-blue-500')
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

  if (!body.name || typeof body.name !== 'string') {
    return apiError('name is required and must be a string', 400)
  }

  // 型チェック
  if ('color' in body && typeof body.color !== 'string') {
    return apiError('color must be a string', 400)
  }

  const newTag = {
    user_id: auth.userId,
    name: body.name,
    color: body.color ?? 'bg-blue-500',
  }

  const { data, error } = await supabase
    .from('tags')
    .insert(newTag)
    .select()
    .single()

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({ tag: data }, 201)
}
