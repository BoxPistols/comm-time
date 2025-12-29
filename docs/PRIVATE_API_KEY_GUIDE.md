# PRIVATE_API_KEY 設定ガイド

このガイドでは、Comm Time の Private API を利用するために必要な **API キー** について、初めての方にもわかりやすく説明します。

---

## 目次

1. [API キーとは何か](#1-api-キーとは何か)
2. [なぜ API キーが必要なのか](#2-なぜ-api-キーが必要なのか)
3. [API キーの生成方法](#3-api-キーの生成方法)
4. [API キーの設定方法](#4-api-キーの設定方法)
5. [API キーの使い方](#5-api-キーの使い方)
6. [セキュリティの注意点](#6-セキュリティの注意点)
7. [トラブルシューティング](#7-トラブルシューティング)

---

## 1. API キーとは何か

### 簡単に言うと

API キーは「**パスワード**」のようなものです。

普段、Web サービスにログインするときはメールアドレスとパスワードを使いますよね。
API キーは、**プログラムやツールがサービスにアクセスするときに使うパスワード**です。

### 例え話

```
【人間がログインする場合】
あなた → メール + パスワード → Comm Time

【プログラムがアクセスする場合】
プログラム → API キー → Comm Time API
```

### PRIVATE_API_KEY の正体

- 64文字のランダムな英数字の文字列
- 自分で生成する（サービスから発行されるものではない）
- 知っている人だけが API を使える「合言葉」

---

## 2. なぜ API キーが必要なのか

### 2つの認証方法

Comm Time の API には、2つのアクセス方法があります。

| 方法 | 用途 | 認証方法 |
|------|------|---------|
| ブラウザから | 普段の利用 | Supabase ログイン（メール/パスワード） |
| 外部アプリから | プログラム連携 | API キー |

### 外部アプリとは？

「外部アプリ」とは、ブラウザ以外から API にアクセスするものです。

**具体例：**
- コマンドラインからのスクリプト
- 自動化ツール（Zapier、n8n など）
- 自作のプログラム（Python、JavaScript など）
- 他のサービスとの連携

### なぜブラウザ認証ではダメなのか

プログラムは「ログイン画面でメールアドレスとパスワードを入力する」ことができません。
そのため、**事前に設定した文字列（API キー）で本人確認**を行います。

---

## 3. API キーの生成方法

### 方法 1: openssl コマンド（推奨）

ターミナルを開いて、以下のコマンドを実行します。

```bash
openssl rand -hex 32
```

**実行結果の例：**
```
7a3b9c2d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
```

この64文字の文字列があなたの API キーです。

### 方法 2: オンラインジェネレーター

信頼できるパスワード生成サイトで64文字の英数字を生成することもできます。
ただし、セキュリティ上は `openssl` コマンドの方が安全です。

### 方法 3: 自分で考える（非推奨）

自分で文字列を考えることもできますが、推測されやすいため避けてください。

**ダメな例：**
```
mypassword123
commtime-api-key
abc123def456
```

**良い例：**
```
7a3b9c2d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
```

---

## 4. API キーの設定方法

### 手順

#### Step 1: API キーを生成

```bash
openssl rand -hex 32
```

出力された文字列をコピーしてください。

#### Step 2: .env.local ファイルに追記

プロジェクトのルートディレクトリにある `.env.local` ファイルを編集します。

**コマンドで追記する場合：**
```bash
echo "PRIVATE_API_KEY=ここに生成した文字列を貼り付け" >> .env.local
```

**手動で編集する場合：**
```bash
# エディタで開く
code .env.local
# または
vim .env.local
```

以下の行を追加：
```
PRIVATE_API_KEY=7a3b9c2d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
```

#### Step 3: 設定を確認

```bash
grep PRIVATE_API_KEY .env.local
```

正しく設定されていれば、以下のように表示されます：
```
PRIVATE_API_KEY=7a3b9c2d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
```

#### Step 4: 開発サーバーを再起動

設定を反映するために、開発サーバーを再起動します。

```bash
# 実行中のサーバーを停止（Ctrl + C）
# 再起動
pnpm run dev
```

---

## 5. API キーの使い方

### 基本的な使い方

API キーは HTTP リクエストの**ヘッダー**に含めて送信します。

```
X-API-Key: あなたのAPIキー
X-User-Id: あなたのユーザーID
```

### curl での例

```bash
curl -X GET "http://localhost:5656/api/v1/todos" \
  -H "X-API-Key: 7a3b9c2d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b" \
  -H "X-User-Id: あなたのユーザーUUID"
```

### JavaScript での例

```javascript
const response = await fetch('http://localhost:5656/api/v1/todos', {
  headers: {
    'X-API-Key': '7a3b9c2d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    'X-User-Id': 'あなたのユーザーUUID',
  },
});
const data = await response.json();
```

### Python での例

```python
import requests

headers = {
    'X-API-Key': '7a3b9c2d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    'X-User-Id': 'あなたのユーザーUUID',
}
response = requests.get('http://localhost:5656/api/v1/todos', headers=headers)
data = response.json()
```

### Swagger UI での例

1. `/api-docs` にアクセス
2. 「Authorize」ボタンをクリック
3. `apiKeyAuth` に API キーを入力
4. `userIdHeader` にユーザー ID を入力
5. API をテスト

詳細は [Swagger UI 利用ガイド](./SWAGGER_UI_GUIDE.md) を参照してください。

---

## 6. セキュリティの注意点

### 絶対にやってはいけないこと

#### ❌ GitHub に公開しない

`.env.local` は `.gitignore` に含まれているため、通常は Git にコミットされません。
しかし、以下のような場合は注意が必要です。

```bash
# これは絶対にダメ！
git add .env.local
git commit -m "Add env file"
```

#### ❌ クライアントサイドのコードに含めない

```javascript
// これは絶対にダメ！（ブラウザで見える）
const API_KEY = '7a3b9c2d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b';
```

#### ❌ 他人に教えない

API キーを知っている人は、あなたのアカウントでデータを操作できます。

### やるべきこと

#### ✅ 定期的に変更する

セキュリティ強化のため、定期的に新しい API キーを生成して置き換えましょう。

#### ✅ 漏洩したら即座に変更

もし API キーが漏洩した可能性がある場合は、すぐに新しいキーを生成して `.env.local` を更新してください。

#### ✅ 本番環境では環境変数で管理

本番環境（Vercel など）では、ダッシュボードの環境変数設定で `PRIVATE_API_KEY` を設定します。

---

## 7. トラブルシューティング

### Q: API キーを設定したのに 401 エラーが出る

**考えられる原因：**

1. **キーが間違っている**
   ```bash
   # 設定値を確認
   grep PRIVATE_API_KEY .env.local
   ```

2. **サーバーを再起動していない**
   ```bash
   # サーバーを再起動
   pnpm run dev
   ```

3. **ヘッダー名が間違っている**
   - 正しい: `X-API-Key`
   - 間違い: `API-Key`, `ApiKey`, `x-api-key`（小文字）

### Q: 503 エラーが出る

**原因：** `PRIVATE_API_KEY` が設定されていない

```bash
# 設定されているか確認
grep PRIVATE_API_KEY .env.local

# なければ追加
echo "PRIVATE_API_KEY=$(openssl rand -hex 32)" >> .env.local
```

### Q: User ID はどこで確認できる？

**方法 1: Supabase ダッシュボード**
1. [Supabase](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. Authentication → Users
4. 対象ユーザーの UUID をコピー

**方法 2: ブラウザの Console**
1. Comm Time にログインした状態で
2. DevTools を開く（F12 または Cmd + Option + I）
3. Console タブで以下を実行：
```javascript
const { data } = await supabase.auth.getSession()
console.log(data.session.user.id)
```

### Q: API キーを変更したい

```bash
# 1. 新しいキーを生成
NEW_KEY=$(openssl rand -hex 32)
echo "新しいキー: $NEW_KEY"

# 2. .env.local を編集して PRIVATE_API_KEY の値を置き換え
code .env.local

# 3. サーバーを再起動
pnpm run dev
```

---

## まとめ

| 項目 | 内容 |
|------|------|
| **何か** | 外部アプリが API にアクセスするためのパスワード |
| **生成方法** | `openssl rand -hex 32` |
| **設定場所** | `.env.local` ファイル |
| **使い方** | `X-API-Key` ヘッダーに設定 |
| **注意点** | 公開しない、漏洩したら即変更 |

---

## 関連ドキュメント

- [API 仕様書](./API.md) - 詳細な API リファレンス
- [Swagger UI 利用ガイド](./SWAGGER_UI_GUIDE.md) - ブラウザでの API テスト方法
- [開発者ガイド](./DEVELOPER_GUIDE.md) - 開発環境のセットアップ
