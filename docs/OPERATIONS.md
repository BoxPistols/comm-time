# Comm Time 運用ガイド

本番環境、ローカル開発、Google カレンダー連携の設定・運用手順をまとめたドキュメントです。

## 目次

1. [ローカル開発環境](#ローカル開発環境)
2. [本番デプロイ（Vercel）](#本番デプロイvercel)
3. [Google カレンダー連携](#google-カレンダー連携)
4. [Supabase 設定](#supabase-設定)
5. [トラブルシューティング](#トラブルシューティング)

---

## ローカル開発環境

### 前提条件

- Node.js 18+ / pnpm or npm
- Git

### 初回セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/BoxPistols/comm-time.git
cd comm-time

# 依存関係をインストール
npm install

# 環境変数ファイルを作成
cp .env.local.example .env.local
# .env.local を編集して実際の値を設定
```

### 開発サーバー起動

```bash
npm run dev
```

- URL: http://localhost:5656
- ホットリロード有効
- `.env.local` から環境変数を読み込み

### 開発サーバー停止

```bash
# ターミナルで Ctrl+C
# または
pkill -f "next dev"
```

### キャッシュクリア

Next.js のキャッシュが壊れた場合（`Cannot find module` エラーなど）:

```bash
rm -rf .next
npm run dev
```

### ビルド確認

```bash
npm run build
```

---

## 本番デプロイ（Vercel）

### 自動デプロイ

- `main` ブランチにプッシュすると自動でデプロイされる
- PR を作成するとプレビューデプロイが生成される

### 手動デプロイ

```bash
git push origin main
```

### 環境変数（Vercel Dashboard）

Settings → Environment Variables で以下を設定:

| 変数名 | 説明 | 環境 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | All |
| `NEXT_PUBLIC_ALLOWED_EMAILS` | 許可するメールアドレス | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Production |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Production |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Production |
| `GOOGLE_OAUTH_REDIRECT_URI` | OAuth コールバック URL | Production |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | トークン暗号化キー | Production |

**重要**: 環境変数を変更したら Redeploy が必要

### 本番 URL

- https://comm-time.vercel.app

---

## Google カレンダー連携

### 概要

Google Calendar API を使用して予定を読み取り、アプリ内でメモ・優先度を付けて管理する機能。

### 設定手順

#### 1. Google Cloud Console 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. 「API とサービス」→「ライブラリ」→ **Google Calendar API** を有効化
3. 「Google Auth Platform」→「ブランディング」でアプリ情報を設定
4. 「対象」→「+ Add users」でテストユーザーを追加
5. 「データアクセス」→ 以下のスコープを追加:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
6. 「クライアント」→「+ クライアントを作成」:
   - 種類: ウェブアプリケーション
   - 承認済みのリダイレクト URI:
     - `http://localhost:5656/api/v1/calendar/callback` (開発)
     - `https://comm-time.vercel.app/api/v1/calendar/callback` (本番)

#### 2. 環境変数設定

**ローカル (.env.local)**:
```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5656/api/v1/calendar/callback
CALENDAR_TOKEN_ENCRYPTION_KEY=<openssl rand -base64 32 で生成>
SUPABASE_SERVICE_ROLE_KEY=<Supabase Dashboard から取得>
```

**本番 (Vercel)**:
```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_OAUTH_REDIRECT_URI=https://comm-time.vercel.app/api/v1/calendar/callback
CALENDAR_TOKEN_ENCRYPTION_KEY=<同上>
SUPABASE_SERVICE_ROLE_KEY=<同上>
```

#### 3. Supabase マイグレーション

Supabase Dashboard → SQL Editor で以下を実行:

```sql
-- supabase/migrations/014_add_calendar_integration.sql の内容
```

### 動作確認

1. アプリにログイン
2. カレンダータブ →「Google カレンダーを連携する」
3. Google 同意画面で許可
4. 予定が表示されれば成功

---

## Supabase 設定

### Dashboard

- URL: https://supabase.com/dashboard
- プロジェクト: `sjaicdigwxmkjnezldnn`

### API キーの場所

Settings → API:
- **anon key**: クライアント用（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- **service_role key**: サーバー用（`SUPABASE_SERVICE_ROLE_KEY`）

### マイグレーション

`supabase/migrations/` 内の SQL ファイルを SQL Editor で実行:

```
001_create_todos.sql
002_add_tags.sql
...
014_add_calendar_integration.sql
```

### RLS (Row Level Security)

全テーブルで RLS が有効。ユーザーは自分のデータのみアクセス可能。

---

## トラブルシューティング

### ローカル開発

| 症状 | 原因 | 対処 |
|------|------|------|
| `Cannot find module './xxx.js'` | Next.js キャッシュ破損 | `rm -rf .next && npm run dev` |
| `EADDRINUSE: address already in use` | ポート使用中 | `pkill -f "next dev"` |
| 環境変数が読まれない | .env.local がない/空 | ファイルを確認・再作成 |

### 本番デプロイ

| 症状 | 原因 | 対処 |
|------|------|------|
| 環境変数が反映されない | Redeploy していない | Vercel で Redeploy |
| ビルドエラー | 型エラー/lint エラー | `npm run build` でローカル確認 |

### Google カレンダー連携

| 症状 | 原因 | 対処 |
|------|------|------|
| `redirect_uri_mismatch` | リダイレクト URI 不一致 | Google Console と環境変数を確認 |
| `access_denied` | スコープ未設定 | Google Console → データアクセスでスコープ追加 |
| localhost にリダイレクトされる | 本番の REDIRECT_URI が間違っている | Vercel 環境変数を確認 |
| 「Google API の設定がありません」 | 環境変数未設定 | 全環境変数を設定して Redeploy |
| 予定が表示されない | 同期未実行/カレンダー未選択 |「今すぐ同期」を実行、カレンダー選択を確認 |

### よくあるミス

1. **ローカルと本番で REDIRECT_URI が異なる** — 環境ごとに正しい URL を設定
2. **テストユーザー未登録** — Google Console →「対象」で自分のメールを追加
3. **環境変数変更後に Redeploy 忘れ** — Vercel は環境変数変更だけでは反映されない

---

## 関連ドキュメント

- [CALENDAR_SETUP.md](./CALENDAR_SETUP.md) - カレンダー連携の詳細設定
- [CALENDAR_INTEGRATION_PLAN.md](./CALENDAR_INTEGRATION_PLAN.md) - 設計ドキュメント
