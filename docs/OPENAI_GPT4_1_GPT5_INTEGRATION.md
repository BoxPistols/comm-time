# OpenAI GPT-4/5 統合ガイド

このドキュメントでは、本アプリケーションにおけるOpenAI API統合と、GPT-4系/GPT-5系の互換性対応について説明します。

## セットアップ

### 1. 環境変数の設定

`.env.local` に以下を追加:

```bash
# OpenAI API設定
OPENAI_API_KEY=your-openai-api-key

# オプション: デフォルトモデル（省略時: gpt-4o-mini）
OPENAI_MODEL=gpt-4o-mini
```

### 2. 対応モデル

| モデル | パラメータ | 備考 |
|--------|-----------|------|
| gpt-4o | `max_tokens` | 最新の高性能モデル |
| gpt-4o-mini | `max_tokens` | 高速・低コスト |
| gpt-4-turbo | `max_tokens` | 大規模コンテキスト対応 |
| gpt-5-mini | `max_completion_tokens` | GPT-5系の軽量版 |
| gpt-5 | `max_completion_tokens` | GPT-5標準モデル |
| o1 / o1-mini | `max_completion_tokens` | 推論特化モデル |
| o3 | `max_completion_tokens` | 高度な推論モデル |

## アーキテクチャ

### ファイル構成

```
lib/
  openai.ts          # OpenAIクライアント & GPT-4/5互換レイヤ

app/api/v1/
  chat/
    route.ts         # チャットAPIエンドポイント

components/
  ai-chat.tsx        # チャットUIコンポーネント
```

### 互換レイヤの仕組み

`lib/openai.ts` の `requiresMaxCompletionTokens()` 関数でモデルごとに適切なパラメータを選択:

```typescript
// GPT-5系、o1系、o3系は max_completion_tokens を使用
function requiresMaxCompletionTokens(modelId: string): boolean {
  if (modelId.startsWith('gpt-5')) return true;
  if (modelId.startsWith('gpt-4.1')) return true;
  if (modelId.startsWith('o1')) return true;
  if (modelId.startsWith('o3')) return true;
  return false;
}
```

### 使用方法

```typescript
import { chatCompletion, chatCompletionStream } from '@/lib/openai';

// 通常の呼び出し（互換レイヤが自動でパラメータを調整）
const result = await chatCompletion({
  messages: [{ role: 'user', content: 'Hello!' }],
  maxTokens: 500,        // 内部で max_tokens or max_completion_tokens に変換
  temperature: 0.7,
});

console.log(result.content);

// ストリーミング
for await (const chunk of chatCompletionStream({
  messages: [{ role: 'user', content: 'Hello!' }],
  maxTokens: 500,
})) {
  process.stdout.write(chunk);
}
```

## チャット機能

### 機能概要

- タスク一覧の評価・アドバイス
- 優先順位・集中についてのアドバイス
- 取り組んでいる課題の壁打ち

### APIエンドポイント

```
POST /api/v1/chat
Authorization: Bearer <supabase_access_token>

Body:
{
  "message": "今日やるべきタスクを教えて",
  "history": [],          // 会話履歴（オプション）
  "stream": false,        // ストリーミング（オプション）
  "model": "gpt-4o-mini"  // モデル指定（オプション）
}

Response:
{
  "message": "AIからの応答",
  "model": "gpt-4o-mini",
  "usage": {
    "promptTokens": 100,
    "completionTokens": 50,
    "totalTokens": 150
  }
}
```

### 認証

チャット機能はログインユーザーのみ利用可能です。SupabaseのJWTトークンを使用して認証します。

## トラブルシューティング

### エラー: "max_tokens is not supported"

GPT-5系モデルを使用している場合、`max_tokens` ではなく `max_completion_tokens` が必要です。
本実装では互換レイヤが自動で対応しますが、直接APIを呼び出す場合は注意が必要です。

### エラー: "OPENAI_API_KEY is not set"

`.env.local` に `OPENAI_API_KEY` が設定されていることを確認してください。

### エラー: "Not authenticated"

ログインしていない場合、チャット機能は利用できません。

## 今後の拡張

- [ ] 会話履歴のデータベース保存
- [ ] モデル選択UI
- [ ] ストリーミングレスポンスのUI対応
- [ ] タスク分析の自動実行
