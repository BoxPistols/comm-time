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
 * GET /api/v1/tags/:id
 *
 * 特定のタグを取得
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { id } = await context.params

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return apiError('Tag not found', 404)
    }
    return apiError(error.message, 500)
  }

  return apiResponse({ tag: data })
}

/**
 * PATCH /api/v1/tags/:id
 *
 * タグを更新
 *
 * Body (all optional):
 * - name: string
 * - color: string
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
  const allowedFields = ['name', 'color']
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
    .from('tags')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.userId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return apiError('Tag not found', 404)
    }
    return apiError(error.message, 500)
  }

  return apiResponse({ tag: data })
}

/**
 * DELETE /api/v1/tags/:id
 *
 * タグを削除
 * 関連するTODOからもタグIDを自動的に削除
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  const { id } = await context.params

  // 削除前に存在確認
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (!existing) {
    return apiError('Tag not found', 404)
  }

  // 関連するTODOからタグIDを削除（RPCがあれば使用）
  try {
    await supabase.rpc('remove_tag_from_todos', {
      tag_id_to_remove: id,
      user_id_param: auth.userId,
    })
  } catch {
    // RPCが存在しない場合はスキップ（タグのみ削除）
  }

  // タグを削除
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) {
    return apiError(error.message, 500)
  }

  return apiResponse({ success: true, message: 'Tag deleted' })
}
