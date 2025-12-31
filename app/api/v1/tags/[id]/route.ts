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

  // 型チェック
  if ('name' in body && typeof body.name !== 'string') {
    return apiError('name must be a string', 400)
  }

  if ('color' in body && typeof body.color !== 'string') {
    return apiError('color must be a string', 400)
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

  // 関連するTODOからタグIDを削除（タグが存在しなくてもエラーにならない）
  const { error: rpcError } = await supabase.rpc('remove_tag_from_todos', {
    tag_id_to_remove: id,
    user_id_param: auth.userId,
  })

  // RPCが存在しない場合のエラー(42883: function does not exist, 42P01: relation does not exist)は無視
  // それ以外のエラーはデータ不整合を防ぐために処理を中断
  if (rpcError && rpcError.code !== '42883' && rpcError.code !== '42P01') {
    console.error('RPC call to remove_tag_from_todos failed:', rpcError)
    return apiError('Failed to update related todos', 500)
  }

  // 存在確認と削除を1つのクエリで実行
  const { error, count } = await supabase
    .from('tags')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) {
    return apiError(error.message, 500)
  }

  if (count === 0) {
    return apiError('Tag not found', 404)
  }

  return apiResponse({ success: true, message: 'Tag deleted' })
}
