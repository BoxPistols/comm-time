/**
 * OpenAI API クライアント & GPT-4/5互換レイヤ
 *
 * GPT-4系とGPT-5系のパラメータ差分を吸収し、
 * 呼び出し元がモデル差分を意識せずに使えるようにする
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// OpenAIクライアントのシングルトンインスタンス
let openaiClient: OpenAI | null = null;

/**
 * OpenAIクライアントを取得（シングルトン）
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * デフォルトモデルを取得
 */
export function getDefaultModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

// ============================================
// GPT-4/5 互換レイヤ
// ============================================

/**
 * モデルがmax_completion_tokensを必要とするかを判定
 * GPT-5系、GPT-4.1系は max_completion_tokens を使用
 * GPT-4系は max_tokens を使用
 */
export function requiresMaxCompletionTokens(modelId: string): boolean {
  // GPT-5系
  if (modelId.startsWith('gpt-5')) return true;
  // GPT-4.1系
  if (modelId.startsWith('gpt-4.1')) return true;
  // o1系モデル（reasoning models）
  if (modelId.startsWith('o1')) return true;
  // o3系モデル
  if (modelId.startsWith('o3')) return true;

  return false;
}

/**
 * モデルがtemperatureパラメータをサポートしないかを判定
 * o1系、o3系のreasoningモデルのみtemperatureをサポートしない
 * GPT-5系、GPT-4.1系はtemperatureをサポートする
 */
export function doesNotSupportTemperature(modelId: string): boolean {
  // o1系モデル（reasoning models）- temperatureサポートなし
  if (modelId.startsWith('o1')) return true;
  // o3系モデル（reasoning models）- temperatureサポートなし
  if (modelId.startsWith('o3')) return true;
  // GPT-5系、GPT-4.1系はtemperatureをサポート
  return false;
}

/**
 * Chat Completionsリクエストのオプション（アプリ内で統一して使用）
 */
export interface ChatCompletionOptions {
  model?: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Chat Completionsのレスポンス（シンプル化）
 */
export interface ChatCompletionResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string | null;
}

/**
 * Chat Completions APIを呼び出す（互換レイヤ付き）
 *
 * @example
 * const result = await chatCompletion({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   maxTokens: 500,
 * });
 * console.log(result.content);
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const client = getOpenAIClient();
  const model = options.model || getDefaultModel();

  // メッセージの準備（systemPromptがあれば先頭に追加）
  const messages: ChatCompletionMessageParam[] = options.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }, ...options.messages]
    : options.messages;

  // APIリクエストボディの構築（互換レイヤ）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestBody: any = {
    model,
    messages,
  };

  // temperatureの設定（GPT-5系/o1/o3系は非対応）
  if (typeof options.temperature === 'number' && !doesNotSupportTemperature(model)) {
    requestBody.temperature = options.temperature;
  }

  // トークン上限の設定（GPT-4/5互換）
  if (typeof options.maxTokens === 'number') {
    if (requiresMaxCompletionTokens(model)) {
      requestBody.max_completion_tokens = options.maxTokens;
    } else {
      requestBody.max_tokens = options.maxTokens;
    }
  }

  // API呼び出し
  const response = await client.chat.completions.create(requestBody);

  // レスポンスの正規化
  const choice = response.choices[0];
  return {
    content: choice.message.content || '',
    model: response.model,
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
    finishReason: choice.finish_reason,
  };
}

/**
 * ストリーミングChat Completions（SSE対応）
 */
export async function* chatCompletionStream(
  options: ChatCompletionOptions
): AsyncGenerator<string, void, unknown> {
  const client = getOpenAIClient();
  const model = options.model || getDefaultModel();

  const messages: ChatCompletionMessageParam[] = options.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }, ...options.messages]
    : options.messages;

  // ストリーミング用のパラメータを構築
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model,
    messages,
    stream: true as const,
  };

  if (typeof options.temperature === 'number' && !doesNotSupportTemperature(model)) {
    params.temperature = options.temperature;
  }

  if (typeof options.maxTokens === 'number') {
    if (requiresMaxCompletionTokens(model)) {
      params.max_completion_tokens = options.maxTokens;
    } else {
      params.max_tokens = options.maxTokens;
    }
  }

  const stream = await client.chat.completions.create(params);

  // streamはAsyncIterableを返す
  for await (const chunk of stream as unknown as AsyncIterable<{
    choices: Array<{ delta?: { content?: string } }>;
  }>) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

/**
 * JSON出力を期待するChat Completion
 * パース失敗時はフォールバック値を返す
 */
export async function chatCompletionJSON<T>(
  options: ChatCompletionOptions & { fallback: T }
): Promise<T> {
  const result = await chatCompletion(options);

  try {
    // コードブロックを除去してJSONをパース
    let jsonStr = result.content.trim();

    // ```json ... ``` 形式を処理
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    return JSON.parse(jsonStr) as T;
  } catch {
    console.warn('Failed to parse JSON response, using fallback:', result.content);
    return options.fallback;
  }
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * OpenAI APIが設定されているかチェック
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * 利用可能なモデルのリスト（UIで選択用）
 */
export const AVAILABLE_MODELS = [
  // GPT-4系
  { id: 'gpt-4o', name: 'GPT-4o', description: '最新の高性能モデル' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '高速・低コスト' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '大規模コンテキスト対応' },
  // GPT-5系（将来用）
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'GPT-5系の軽量版' },
  { id: 'gpt-5', name: 'GPT-5', description: 'GPT-5標準モデル' },
  // Reasoningモデル
  { id: 'o1-mini', name: 'o1 Mini', description: '推論特化モデル' },
  { id: 'o1', name: 'o1', description: '高度な推論モデル' },
] as const;
