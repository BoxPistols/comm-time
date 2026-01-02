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
 * PATCH /api/v1/kanban-statuses/reorder
 *
 * ステータスの順序を一括更新
 *
 * Body:
 * - statusIds: string[]
 */
export async function PATCH(request: NextRequest) {
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

  if (!body.statusIds || !Array.isArray(body.statusIds)) {
    return apiError('statusIds is required and must be an array of strings', 400)
  }

  const statusIds = body.statusIds as string[]

  const { error: rpcError } = await supabase.rpc('reorder_kanban_statuses', {
    p_status_ids: statusIds,
  })

  if (rpcError) {
    return apiError(rpcError.message, 500)
  }

  // 更新後のステータスを取得
  const { data, error } = await supabase
    .from('kanban_statuses')
    .select('*')
    .eq('user_id', auth.userId)
    .order('sort_order', { ascending: true })

  if (error) {
    return apiError(error.message, 500)
  }

  const statuses = (data || []).map(status => ({
    id: status.id,
    user_id: status.user_id,
    name: status.name,
    label: status.label,
    color: status.color,
    bgClass: status.bg_class,
    textClass: status.text_class,
    borderClass: status.border_class,
    activeClass: status.active_class,
    sortOrder: status.sort_order,
    isDefault: status.is_default,
    created_at: status.created_at,
    updated_at: status.updated_at,
  }))

  return apiResponse({ statuses })
}
