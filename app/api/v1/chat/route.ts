import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  authenticateRequest,
  handleCors,
  apiResponse,
  apiError,
} from '@/lib/api-auth'
import {
  chatCompletion,
  chatCompletionStream,
  isOpenAIConfigured,
  getDefaultModel,
} from '@/lib/openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// CORS preflight
export async function OPTIONS() {
  return handleCors()
}

// TODOデータの型
interface Todo {
  id: string
  text: string
  is_completed: boolean
  due_date: string | null
  due_time: string | null
  priority: 'high' | 'medium' | 'low' | 'none'
  importance: 'high' | 'medium' | 'low' | 'none'
  kanban_status: 'backlog' | 'todo' | 'doing' | 'done'
  created_at: string
  updated_at: string
}

// メモデータの型
interface Memo {
  id: string
  content: string
  title?: string
  updated_at: string
}

/**
 * 現在の日時情報を取得
 */
function getCurrentTimeContext(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }
  const formatted = now.toLocaleString('ja-JP', options)

  // 残り時間の計算（23:59までの時間）
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)
  const remainingMs = endOfDay.getTime() - now.getTime()
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60))
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

  return `## 現在時刻
${formatted}
今日の残り時間: 約${remainingHours}時間${remainingMinutes}分`
}

// システムプロンプト（時間計画サポート特化）
const SYSTEM_PROMPT = `あなたは時間管理と計画のプロフェッショナルアシスタントです。

## あなたの役割
- ユーザーの現在のタスク（TODO）とメモを把握した上で、時間の割り振りや計画をサポートする
- 「今日何をすべきか」「次の1時間で何に集中すべきか」などの具体的な提案をする
- タスクの見積もり時間や優先順位について壁打ち相手になる
- 集中力の維持やペース配分についてアドバイスする

## 対話スタイル
- 簡潔で実用的なアドバイスを心がける
- 具体的な時間配分（例：「この作業は30分」「休憩5分」）を提案する
- ユーザーの状況を理解した上で、現実的な計画を立てる
- 必要に応じてタスクの分解や優先順位の見直しを提案する

## 時間計画のポイント
- 優先度(priority)と重要度(importance)のバランス
- 期限(due_date)が近いタスクの把握
- カンバンステータス: doing（作業中）のタスクを最優先
- 残り時間と作業量のバランス
- 休憩やバッファ時間の確保

## メモの活用
- メモにはプロジェクトの背景や詳細情報が含まれている場合がある
- タスクとメモを関連づけて、より具体的なアドバイスを行う

## 注意事項
- ユーザーのタスクとメモのデータは会話の文脈として提供されます
- データを正確に把握した上で回答してください
- 無関係な話題でも、時間管理の観点からアドバイスできるか考えてください`

/**
 * ユーザーのTODOデータを取得してフォーマット
 */
async function getUserTodosContext(client: SupabaseClient, userId: string): Promise<string> {
  const { data: todos, error } = await client
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(50)

  if (error || !todos || todos.length === 0) {
    return '## タスク一覧\n現在、未完了のタスクはありません。'
  }

  const priorityLabel: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
    none: '-',
  }

  // ステータス別にグループ化
  const doing = (todos as Todo[]).filter(t => t.kanban_status === 'doing')
  const todo = (todos as Todo[]).filter(t => t.kanban_status === 'todo')
  const backlog = (todos as Todo[]).filter(t => t.kanban_status === 'backlog')

  const formatTodo = (t: Todo) => {
    const parts = [`- ${t.text}`]
    if (t.priority !== 'none') parts.push(`[優先:${priorityLabel[t.priority]}]`)
    if (t.due_date) parts.push(`[期限:${t.due_date}${t.due_time ? ' ' + t.due_time : ''}]`)
    return parts.join(' ')
  }

  const sections: string[] = ['## タスク一覧']

  if (doing.length > 0) {
    sections.push(`\n### 作業中 (${doing.length}件) ← 今取り組んでいるタスク`)
    sections.push(doing.map(formatTodo).join('\n'))
  }

  if (todo.length > 0) {
    sections.push(`\n### 予定 (${todo.length}件)`)
    sections.push(todo.map(formatTodo).join('\n'))
  }

  if (backlog.length > 0) {
    sections.push(`\n### バックログ (${backlog.length}件)`)
    sections.push(backlog.map(formatTodo).join('\n'))
  }

  return sections.join('\n')
}

/**
 * ユーザーのメモデータを取得してフォーマット
 */
async function getUserMemosContext(client: SupabaseClient, userId: string): Promise<string> {
  const { data: memos, error } = await client
    .from('memos')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(5) // 直近5件のメモのみ

  if (error || !memos || memos.length === 0) {
    return ''
  }

  const memoList = (memos as Memo[]).map((memo, i) => {
    const content = memo.content.length > 500
      ? memo.content.substring(0, 500) + '...(省略)'
      : memo.content
    const title = memo.title || `メモ ${i + 1}`
    return `### ${title}\n${content}`
  })

  return `## メモ（直近${memos.length}件）\n\n${memoList.join('\n\n')}`
}

/**
 * POST /api/v1/chat
 *
 * Body:
 * - message: string (required) - ユーザーのメッセージ
 * - history?: Array<{role: 'user' | 'assistant', content: string}> - 会話履歴
 * - stream?: boolean - ストリーミングレスポンスを使用するか (default: false)
 * - model?: string - 使用するモデル (default: 環境変数 or gpt-4o-mini)
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  // OpenAI設定チェック
  if (!isOpenAIConfigured()) {
    return apiError('OpenAI API is not configured. Please set OPENAI_API_KEY.', 503)
  }

  // リクエストボディの解析
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  // バリデーション
  if (!body.message || typeof body.message !== 'string') {
    return apiError('message is required and must be a string', 400)
  }

  const userMessage = body.message as string
  const history = (body.history as Array<{ role: 'user' | 'assistant'; content: string }>) || []
  const useStream = body.stream === true
  const model = (body.model as string) || getDefaultModel()

  // コンテキストを並列で取得（認証済みクライアントを使用）
  const [timeContext, todosContext, memosContext] = await Promise.all([
    getCurrentTimeContext(),
    getUserTodosContext(auth.supabase, auth.userId),
    getUserMemosContext(auth.supabase, auth.userId),
  ])

  // 全コンテキストを結合
  const fullContext = [timeContext, todosContext, memosContext]
    .filter(Boolean)
    .join('\n\n---\n\n')

  // メッセージを構築
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n---\n\n${fullContext}`,
    },
    // 会話履歴
    ...history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    // 新しいメッセージ
    {
      role: 'user',
      content: userMessage,
    },
  ]

  // ストリーミングレスポンス
  if (useStream) {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = chatCompletionStream({
            model,
            messages,
            temperature: 0.7,
            maxTokens: 1500,
          })

          for await (const chunk of generator) {
            const data = JSON.stringify({ content: chunk })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // 通常のレスポンス
  try {
    const result = await chatCompletion({
      model,
      messages,
      temperature: 0.7,
      maxTokens: 1500,
    })

    return apiResponse({
      message: result.content,
      model: result.model,
      usage: result.usage,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Chat completion error:', errorMessage)
    return apiError(`Chat completion failed: ${errorMessage}`, 500)
  }
}

/**
 * GET /api/v1/chat/status
 * OpenAI APIの設定状態を確認
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) {
    return apiError(auth.error, auth.status)
  }

  return apiResponse({
    configured: isOpenAIConfigured(),
    defaultModel: isOpenAIConfigured() ? getDefaultModel() : null,
  })
}
