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
 * GET /api/v1/memos/:id
 *
 * 特定のメモを取得
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { id } = await context.params

  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return apiError('Memo not found', 404)
    }
    return apiError(error.message, 500)
  }

  return apiResponse({ memo: data })
}

/**
 * PATCH /api/v1/memos/:id
 *
 * メモを更新
 *
 * Body (all optional):
 * - title: string
 * - content: string
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
  const allowedFields = ['title', 'content']
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No valid fields to update', 400)
  }

  const { data, error } = await supabase
    .from('memos')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.userId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return apiError('Memo not found', 404)
    }
    return apiError(error.message, 500)
  }

  return apiResponse({ memo: data })
}

/**
 * DELETE /api/v1/memos/:id
 *
 * メモを削除
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { id } = await context.params

  // 削除前に存在確認
  const { data: existing } = await supabase
    .from('memos')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (!existing) {
    return apiError('Memo not found', 404)
  }

  const { error } = await supabase
    .from('memos')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({ success: true, message: 'Memo deleted' })
}
