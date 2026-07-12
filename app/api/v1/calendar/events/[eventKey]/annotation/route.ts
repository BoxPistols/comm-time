import { NextRequest } from "next/server";
import { authenticateRequest, handleCors, apiResponse, apiError } from "@/lib/api-auth";
import type { EventAnnotation } from "@/types/calendar";

export async function OPTIONS() {
  return handleCors();
}

const PRIORITY_VALUES = ["high", "medium", "low", "none"] as const;
const SCOPE_VALUES = ["instance", "series"] as const;

type RouteContext = { params: { eventKey: string } };

function parseLevel(value: unknown): (typeof PRIORITY_VALUES)[number] {
  return PRIORITY_VALUES.includes(value as (typeof PRIORITY_VALUES)[number])
    ? (value as (typeof PRIORITY_VALUES)[number])
    : "none";
}

/**
 * PUT /api/v1/calendar/events/[eventKey]/annotation
 *
 * Body: { scope?: 'instance'|'series', memo?: string, priority?: string, importance?: string, tagIds?: string[] }
 * 注釈を作成または更新する（upsert）。
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  const eventKey = decodeURIComponent(params.eventKey);
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return apiError("Request body must be a JSON object", 400);
  }
  const input = body as {
    scope?: unknown;
    memo?: unknown;
    priority?: unknown;
    importance?: unknown;
    tagIds?: unknown;
  };

  const scope = SCOPE_VALUES.includes(input.scope as (typeof SCOPE_VALUES)[number])
    ? (input.scope as (typeof SCOPE_VALUES)[number])
    : "instance";
  const memo = typeof input.memo === "string" ? input.memo : null;
  // tag_ids カラムは uuid[] のため、不正な値は upsert 前に除外する
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const tagIds = Array.isArray(input.tagIds)
    ? input.tagIds.filter((id): id is string => typeof id === "string" && uuidRegex.test(id))
    : [];

  const { data, error } = await auth.supabase
    .from("event_annotations")
    .upsert(
      {
        user_id: auth.userId,
        event_key: eventKey,
        scope,
        memo,
        priority: parseLevel(input.priority),
        importance: parseLevel(input.importance),
        tag_ids: tagIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,event_key,scope" }
    )
    .select("event_key, scope, memo, priority, importance, tag_ids")
    .single();
  if (error) {
    return apiError(error.message, 500);
  }

  const annotation: EventAnnotation = {
    eventKey: data.event_key,
    scope: data.scope,
    memo: data.memo ?? undefined,
    priority: data.priority,
    importance: data.importance,
    tagIds: data.tag_ids,
  };
  return apiResponse(annotation);
}

/**
 * DELETE /api/v1/calendar/events/[eventKey]/annotation?scope=instance
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  const eventKey = decodeURIComponent(params.eventKey);
  const scopeParam = new URL(request.url).searchParams.get("scope");
  const scope = SCOPE_VALUES.includes(scopeParam as (typeof SCOPE_VALUES)[number])
    ? (scopeParam as (typeof SCOPE_VALUES)[number])
    : "instance";

  const { error } = await auth.supabase
    .from("event_annotations")
    .delete()
    .eq("user_id", auth.userId)
    .eq("event_key", eventKey)
    .eq("scope", scope);
  if (error) {
    return apiError(error.message, 500);
  }

  return apiResponse({ deleted: true });
}
