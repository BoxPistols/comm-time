# Comm Time Private API

このドキュメントでは、Comm TimeアプリケーションのプライベートAPIについて説明します。

## 概要

Comm Time APIを使用すると、外部アプリケーションからTODO、メモ、タグのデータにアクセスできます。

**ベースURL:**
- 開発環境: `http://localhost:5656/api/v1`
- 本番環境: `https://your-domain.com/api/v1`

## 認証

APIへのアクセスには認証が必要です。以下の2つの認証方法をサポートしています：

### 1. Bearer トークン認証（推奨）

Supabaseのアクセストークンを使用します。ログイン後に取得できるJWTトークンをAuthorizationヘッダーに設定します。

```bash
curl -X GET "https://your-domain.com/api/v1/todos" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN"
```

### 2. API Key 認証

外部アプリケーション用の認証方法です。環境変数 `PRIVATE_API_KEY` に設定したキーと、対象ユーザーのIDをヘッダーに設定します。

```bash
curl -X GET "https://your-domain.com/api/v1/todos" \
  -H "X-API-Key: YOUR_PRIVATE_API_KEY" \
  -H "X-User-Id: USER_UUID"
```

**API Keyの生成:**
```bash
openssl rand -hex 32
```

## 共通仕様

### レスポンス形式

すべてのレスポンスはJSON形式で返されます。

**成功時:**
```json
{
  "todos": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**エラー時:**
```json
{
  "error": "Error message"
}
```

### ページネーション

一覧取得APIではページネーションをサポートしています。

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `limit` | number | 50 | 取得件数（1-100） |
| `offset` | number | 0 | スキップする件数 |

### ソート

一覧取得APIではソートをサポートしています。

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `sort` | string | ソート対象のフィールド |
| `order` | string | `asc` または `desc` |

---

## Todos API

### 一覧取得

```
GET /api/v1/todos
```

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `limit` | number | 50 | 取得件数 |
| `offset` | number | 0 | オフセット |
| `sort` | string | `order_index` | `created_at`, `updated_at`, `order_index`, `due_date` |
| `order` | string | `desc` | `asc`, `desc` |
| `is_completed` | string | `all` | `true`, `false`, `all` |
| `kanban_status` | string | `all` | `backlog`, `todo`, `doing`, `done`, `all` |
| `priority` | string | `all` | `high`, `medium`, `low`, `none`, `all` |
| `tag_id` | string | - | タグIDでフィルター |

**レスポンス例:**
```json
{
  "todos": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "text": "タスクの内容",
      "is_completed": false,
      "due_date": "2024-12-28",
      "due_time": "10:00",
      "order_index": 0,
      "tag_ids": ["tag-uuid-1", "tag-uuid-2"],
      "priority": "high",
      "importance": "medium",
      "kanban_status": "doing",
      "created_at": "2024-12-28T00:00:00Z",
      "updated_at": "2024-12-28T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### 個別取得

```
GET /api/v1/todos/:id
```

### 作成

```
POST /api/v1/todos
```

**リクエストボディ:**
```json
{
  "text": "新しいタスク",
  "is_completed": false,
  "due_date": "2024-12-28",
  "due_time": "10:00",
  "tag_ids": ["tag-uuid"],
  "priority": "high",
  "importance": "medium",
  "kanban_status": "todo"
}
```

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `text` | string | ✓ | - | タスクの内容 |
| `is_completed` | boolean | - | false | 完了状態 |
| `due_date` | string | - | null | 期限日（YYYY-MM-DD） |
| `due_time` | string | - | null | 期限時刻（HH:mm） |
| `alarm_point_id` | string | - | null | アラームポイントID |
| `order_index` | number | - | 自動 | 表示順序 |
| `tag_ids` | string[] | - | [] | タグIDの配列 |
| `priority` | string | - | "none" | `high`, `medium`, `low`, `none` |
| `importance` | string | - | "none" | `high`, `medium`, `low`, `none` |
| `kanban_status` | string | - | "backlog" | `backlog`, `todo`, `doing`, `done` |

### 更新

```
PATCH /api/v1/todos/:id
```

**リクエストボディ:**（更新したいフィールドのみ）
```json
{
  "text": "更新されたタスク",
  "is_completed": true
}
```

### 削除

```
DELETE /api/v1/todos/:id
```

---

## Memos API

### 一覧取得

```
GET /api/v1/memos
```

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `limit` | number | 50 | 取得件数 |
| `offset` | number | 0 | オフセット |
| `sort` | string | `updated_at` | `created_at`, `updated_at`, `title` |
| `order` | string | `desc` | `asc`, `desc` |
| `search` | string | - | タイトル・内容で検索 |

**レスポンス例:**
```json
{
  "memos": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "メモのタイトル",
      "content": "# Markdown対応\n\nメモの内容",
      "created_at": "2024-12-28T00:00:00Z",
      "updated_at": "2024-12-28T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### 個別取得

```
GET /api/v1/memos/:id
```

### 作成

```
POST /api/v1/memos
```

**リクエストボディ:**
```json
{
  "title": "新しいメモ",
  "content": "メモの内容"
}
```

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `title` | string | - | "" | メモのタイトル |
| `content` | string | - | "" | メモの内容（Markdown対応） |

### 更新

```
PATCH /api/v1/memos/:id
```

### 削除

```
DELETE /api/v1/memos/:id
```

---

## Tags API

### 一覧取得

```
GET /api/v1/tags
```

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `limit` | number | 50 | 取得件数 |
| `offset` | number | 0 | オフセット |
| `sort` | string | `name` | `created_at`, `updated_at`, `name` |
| `order` | string | `asc` | `asc`, `desc` |

**レスポンス例:**
```json
{
  "tags": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "仕事",
      "color": "bg-blue-500",
      "created_at": "2024-12-28T00:00:00Z",
      "updated_at": "2024-12-28T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### 個別取得

```
GET /api/v1/tags/:id
```

### 作成

```
POST /api/v1/tags
```

**リクエストボディ:**
```json
{
  "name": "新しいタグ",
  "color": "bg-green-500"
}
```

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `name` | string | ✓ | - | タグ名 |
| `color` | string | - | "bg-blue-500" | Tailwind CSSのカラークラス |

**利用可能なカラー:**
- `bg-red-500`, `bg-orange-500`, `bg-yellow-500`
- `bg-green-500`, `bg-blue-500`, `bg-indigo-500`
- `bg-purple-500`, `bg-pink-500`, `bg-gray-500`, `bg-teal-500`

### 更新

```
PATCH /api/v1/tags/:id
```

### 削除

```
DELETE /api/v1/tags/:id
```

> **注意:** タグを削除すると、関連するTODOからそのタグIDが自動的に削除されます。

---

## エラーコード

| コード | 説明 |
|--------|------|
| 400 | Bad Request - リクエストが不正 |
| 401 | Unauthorized - 認証が必要 |
| 404 | Not Found - リソースが見つからない |
| 500 | Internal Server Error - サーバーエラー |
| 503 | Service Unavailable - Supabaseが設定されていない |

---

## 使用例

### JavaScript (fetch)

```javascript
const API_BASE = 'https://your-domain.com/api/v1';
const API_KEY = 'your-private-api-key';
const USER_ID = 'user-uuid';

// TODOを取得
async function getTodos() {
  const response = await fetch(`${API_BASE}/todos`, {
    headers: {
      'X-API-Key': API_KEY,
      'X-User-Id': USER_ID,
    },
  });
  return response.json();
}

// TODOを作成
async function createTodo(text) {
  const response = await fetch(`${API_BASE}/todos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-User-Id': USER_ID,
    },
    body: JSON.stringify({ text }),
  });
  return response.json();
}

// TODOを完了にする
async function completeTodo(id) {
  const response = await fetch(`${API_BASE}/todos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-User-Id': USER_ID,
    },
    body: JSON.stringify({ is_completed: true }),
  });
  return response.json();
}
```

### Python (requests)

```python
import requests

API_BASE = 'https://your-domain.com/api/v1'
HEADERS = {
    'X-API-Key': 'your-private-api-key',
    'X-User-Id': 'user-uuid',
    'Content-Type': 'application/json',
}

# TODOを取得
def get_todos():
    response = requests.get(f'{API_BASE}/todos', headers=HEADERS)
    return response.json()

# 未完了のTODOのみ取得
def get_incomplete_todos():
    response = requests.get(
        f'{API_BASE}/todos',
        headers=HEADERS,
        params={'is_completed': 'false'}
    )
    return response.json()

# メモを検索
def search_memos(query):
    response = requests.get(
        f'{API_BASE}/memos',
        headers=HEADERS,
        params={'search': query}
    )
    return response.json()
```

### cURL

```bash
# 全TODOを取得
curl -X GET "https://your-domain.com/api/v1/todos" \
  -H "X-API-Key: YOUR_PRIVATE_API_KEY" \
  -H "X-User-Id: USER_UUID"

# 新しいTODOを作成
curl -X POST "https://your-domain.com/api/v1/todos" \
  -H "X-API-Key: YOUR_PRIVATE_API_KEY" \
  -H "X-User-Id: USER_UUID" \
  -H "Content-Type: application/json" \
  -d '{"text": "新しいタスク", "priority": "high"}'

# TODOを更新
curl -X PATCH "https://your-domain.com/api/v1/todos/TODO_ID" \
  -H "X-API-Key: YOUR_PRIVATE_API_KEY" \
  -H "X-User-Id: USER_UUID" \
  -H "Content-Type: application/json" \
  -d '{"is_completed": true}'

# タグでフィルター
curl -X GET "https://your-domain.com/api/v1/todos?tag_id=TAG_UUID" \
  -H "X-API-Key: YOUR_PRIVATE_API_KEY" \
  -H "X-User-Id: USER_UUID"
```

---

## セキュリティに関する注意

1. **API Keyの管理**: `PRIVATE_API_KEY` は秘密情報です。クライアントサイドのコードに含めないでください。
2. **HTTPS**: 本番環境では必ずHTTPSを使用してください。
3. **Rate Limiting**: 現在はレート制限は実装されていません。必要に応じて追加してください。
4. **ユーザーIDの検証**: API Key認証を使用する場合、指定したUser IDがデータベースに存在することが確認されます。
