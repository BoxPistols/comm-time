# Swagger UI 利用ガイド

このガイドでは、Comm Time の API をブラウザからテストできる **Swagger UI** の使い方を説明します。

## 目次

1. [Swagger UI とは](#swagger-ui-とは)
2. [アクセス方法](#アクセス方法)
3. [認証の設定](#認証の設定)
4. [API のテスト方法](#api-のテスト方法)
5. [よくある質問](#よくある質問)

---

## Swagger UI とは

Swagger UI は、API をブラウザ上で確認・テストできるツールです。

**できること:**
- API エンドポイントの一覧確認
- リクエスト/レスポンスの仕様確認
- 実際に API を実行してテスト
- コードを書かずに動作確認

---

## アクセス方法

### 1. 開発サーバーを起動

```bash
pnpm run dev
```

### 2. ブラウザでアクセス

```
http://localhost:5656/api-docs
```

以下のような画面が表示されます：

```
┌─────────────────────────────────────────────┐
│  Comm Time Private API                      │
│  外部アプリからTODO、メモ、タグの...        │
│                                             │
│  [Authorize] ← 認証設定ボタン               │
│                                             │
│  ▼ Todos                                    │
│    GET  /api/v1/todos      TODO一覧取得     │
│    POST /api/v1/todos      TODO作成         │
│    ...                                      │
│                                             │
│  ▼ Memos                                    │
│  ▼ Tags                                     │
└─────────────────────────────────────────────┘
```

---

## 認証の設定

API を使用するには認証が必要です。

### 手順

#### Step 1: 認証情報を準備

以下の 2 つの値が必要です：

| 項目 | 説明 | 確認方法 |
|------|------|---------|
| **API Key** | プライベート API キー | `.env.local` の `PRIVATE_API_KEY` |
| **User ID** | Supabase のユーザー UUID | 下記参照 |

**API Key の確認:**
```bash
# .env.local ファイルを確認
cat .env.local | grep PRIVATE_API_KEY

# 例: PRIVATE_API_KEY=abc123def456...
```

**User ID の確認方法:**

1. Supabase ダッシュボードにログイン
2. Authentication → Users を開く
3. 対象ユーザーの UUID をコピー

または、ブラウザの開発者ツールで確認：
1. Comm Time にログイン
2. DevTools を開く（F12）
3. Console で以下を実行：
   ```javascript
   // Supabaseセッションからユーザー情報を取得
   const { data } = await supabase.auth.getSession()
   console.log(data.session.user.id)
   ```

#### Step 2: Swagger UI で認証設定

1. 画面右上の **「Authorize」** ボタンをクリック

2. 認証ダイアログが表示されます：

   ```
   ┌─────────────────────────────────────────┐
   │  Available authorizations           ✕  │
   │                                         │
   │  apiKeyAuth (apiKey)                    │
   │  プライベートAPIキー                    │
   │  Name: X-API-Key                        │
   │  In: header                             │
   │                                         │
   │  Value: [____________________]          │
   │                                         │
   │         [Authorize]  [Close]            │
   │─────────────────────────────────────────│
   │  userIdHeader (apiKey)                  │
   │  ユーザーID (API Key認証時に必要)       │
   │  Name: X-User-Id                        │
   │  In: header                             │
   │                                         │
   │  Value: [____________________]          │
   │                                         │
   │         [Authorize]  [Close]            │
   └─────────────────────────────────────────┘
   ```

3. **apiKeyAuth** の Value に API Key を入力 → 「Authorize」クリック

4. **userIdHeader** の Value に User ID を入力 → 「Authorize」クリック

5. 両方に鍵マークが付いたら「Close」で閉じる

---

## API のテスト方法

### 基本的な流れ

#### 1. エンドポイントを選択

例: 「GET /api/v1/todos」をクリックして展開

```
┌─────────────────────────────────────────────┐
│  GET /api/v1/todos         TODO一覧取得     │
│─────────────────────────────────────────────│
│  Parameters                                 │
│                                             │
│  limit    [50    ] 取得件数                 │
│  offset   [0     ] オフセット               │
│  sort     [order_index ▼] ソート項目        │
│  ...                                        │
│                                             │
│  [Try it out]                               │
└─────────────────────────────────────────────┘
```

#### 2. 「Try it out」をクリック

パラメータが編集可能になります。

#### 3. パラメータを設定（任意）

例：
- `limit`: 10（10件だけ取得）
- `is_completed`: false（未完了のみ）

#### 4. 「Execute」をクリック

API が実行され、結果が表示されます：

```
┌─────────────────────────────────────────────┐
│  Responses                                  │
│                                             │
│  Code: 200                                  │
│                                             │
│  Response body:                             │
│  {                                          │
│    "todos": [                               │
│      {                                      │
│        "id": "abc-123",                     │
│        "text": "買い物に行く",              │
│        "is_completed": false,               │
│        ...                                  │
│      }                                      │
│    ],                                       │
│    "pagination": {                          │
│      "total": 42,                           │
│      "limit": 10,                           │
│      "offset": 0,                           │
│      "hasMore": true                        │
│    }                                        │
│  }                                          │
└─────────────────────────────────────────────┘
```

---

### 各 API の使用例

#### TODO を作成する

1. 「POST /api/v1/todos」を展開
2. 「Try it out」をクリック
3. Request body に以下を入力：

```json
{
  "text": "Swagger UIからのテストタスク",
  "priority": "high",
  "kanban_status": "todo"
}
```

4. 「Execute」をクリック
5. Response で新しい TODO の情報が返ってきたら成功

#### TODO を更新する

1. 「PATCH /api/v1/todos/{id}」を展開
2. 「Try it out」をクリック
3. `id` パラメータに TODO の UUID を入力
4. Request body に更新内容を入力：

```json
{
  "is_completed": true
}
```

5. 「Execute」をクリック

#### TODO を削除する

1. 「DELETE /api/v1/todos/{id}」を展開
2. 「Try it out」をクリック
3. `id` パラメータに削除する TODO の UUID を入力
4. 「Execute」をクリック

---

## よくある質問

### Q: 401 Unauthorized エラーが出る

**原因:** 認証情報が設定されていない、または間違っている

**対処法:**
1. 右上の「Authorize」ボタンを再度クリック
2. API Key と User ID が正しく入力されているか確認
3. `.env.local` の `PRIVATE_API_KEY` と一致しているか確認

### Q: 404 Not Found エラーが出る

**原因:** 指定した ID のリソースが存在しない

**対処法:**
1. まず GET で一覧を取得して、存在する ID を確認
2. 正しい UUID を使用しているか確認

### Q: 503 Service Unavailable エラーが出る

**原因:** Supabase が設定されていない

**対処法:**
1. `.env.local` に以下が設定されているか確認：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `PRIVATE_API_KEY`

### Q: CORS エラーが出る

**原因:** ブラウザからの直接アクセス時に発生することがある

**対処法:**
- Swagger UI を使用している場合は問題ないはず
- 外部アプリから使用する場合は、サーバーサイドからアクセスする

### Q: User ID はどこで確認できる？

**3つの方法:**

1. **Supabase ダッシュボード**
   - Authentication → Users で確認

2. **ブラウザ Console**
   ```javascript
   const { data } = await supabase.auth.getSession()
   console.log(data.session.user.id)
   ```

3. **ローカルストレージ**
   - DevTools → Application → Local Storage
   - `sb-*-auth-token` キーの中の `user.id`

---

## 関連ドキュメント

- [API 仕様書](./API.md) - 詳細な API リファレンス
- [開発者ガイド](./DEVELOPER_GUIDE.md) - 開発環境のセットアップ
