import { NextRequest } from "next/server";
import { authenticateRequest, handleCors, apiResponse, apiError } from "@/lib/api-auth";

export async function OPTIONS() {
  return handleCors();
}

/**
 * POST /api/v1/calendar/todo-links
 * body: { todoId: string, eventKey: string }
 *
 * TODO と カレンダー予定をリンクする
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  let body: { todoId?: string; eventKey?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { todoId, eventKey } = body;
  if (!todoId || !eventKey) {
    return apiError("todoId and eventKey are required", 400);
  }

  const { data, error } = await auth.supabase
    .from("todo_event_links")
    .insert({
      user_id: auth.userId,
      todo_id: todoId,
      event_key: eventKey,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return apiError("Link already exists", 409);
    }
    return apiError(error.message, 500);
  }

  return apiResponse({ link: data }, 201);
}

/**
 * DELETE /api/v1/calendar/todo-links?todoId=xxx&eventKey=yyy
 *
 * TODO と カレンダー予定のリンクを解除する
 */
export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return apiError(auth.error, auth.status);
  }

  const url = new URL(request.url);
  const todoId = url.searchParams.get("todoId");
  const eventKey = url.searchParams.get("eventKey");

  if (!todoId || !eventKey) {
    return apiError("todoId and eventKey are required", 400);
  }

  const { error } = await auth.supabase
    .from("todo_event_links")
    .delete()
    .eq("user_id", auth.userId)
    .eq("todo_id", todoId)
    .eq("event_key", eventKey);

  if (error) {
    return apiError(error.message, 500);
  }

  return apiResponse({ success: true });
}
