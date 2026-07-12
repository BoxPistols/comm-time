# Google カレンダー連携 セットアップガイド

コードは実装済みです。以下のアカウント側の設定を行うと連携機能が有効になります（未設定の間、カレンダータブには設定を促すメッセージが表示され、他の機能には影響しません）。

設計の詳細は [CALENDAR_INTEGRATION_PLAN.md](./CALENDAR_INTEGRATION_PLAN.md) を参照してください。

## 1. Supabase マイグレーションの適用

Supabase Dashboard の SQL Editor で以下を実行します:

- `supabase/migrations/014_add_calendar_integration.sql`

## 2. Google Cloud プロジェクトの設定

1. [Google Cloud Console](https://console.cloud.google.com/) で新規プロジェクトを作成（例: `comm-time`）
2. 「APIとサービス」→「ライブラリ」で **Google Calendar API** を有効化
3. 「APIとサービス」→「OAuth 同意画面」を設定
   - User Type: **外部**
   - テストユーザーに自分の Gmail アドレスを追加（個人利用の間は審査申請は不要）
   - スコープに `.../auth/calendar.readonly` と `.../auth/userinfo.email` を追加
4. 「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
   - アプリケーションの種類: **ウェブアプリケーション**
   - 承認済みのリダイレクト URI に以下を追加:
     - `http://localhost:5656/api/v1/calendar/callback`（開発）
     - `https://comm-time.vercel.app/api/v1/calendar/callback`（本番）

## 3. 環境変数の設定

`.env.local`（開発）と Vercel の環境変数（本番）に以下を追加します:

```bash
# Google OAuth（手順2で発行した値）
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5656/api/v1/calendar/callback

# リフレッシュトークンの暗号化鍵（32バイトの base64。下記コマンドで生成）
CALENDAR_TOKEN_ENCRYPTION_KEY=

# サーバー側 DB 書き込み用（Supabase Dashboard → Settings → API → service_role key）
SUPABASE_SERVICE_ROLE_KEY=
```

暗号化鍵の生成:

```bash
openssl rand -base64 32
```

> **注意**: `GOOGLE_OAUTH_REDIRECT_URI` は環境ごとに変えてください（本番は `https://comm-time.vercel.app/...`）。
> `SUPABASE_SERVICE_ROLE_KEY` と `GOOGLE_CLIENT_SECRET` はサーバー専用の秘密情報です。`NEXT_PUBLIC_` プレフィックスを付けないでください。

## 4. 動作確認

1. `npm run dev` でアプリを起動し、ログインする
2. カレンダータブ（デフォルトタブ）の「Google カレンダーを連携する」をクリック
3. Google の同意画面で許可すると、アプリに戻って予定が表示される
4. 予定をクリックするとメモ・優先度・重要度を記録できる

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| 「サーバーに Google API の設定がありません」 | 手順3の環境変数が未設定。設定後に再起動 / 再デプロイ |
| 同意画面で `redirect_uri_mismatch` | Google Cloud Console のリダイレクト URI と `GOOGLE_OAUTH_REDIRECT_URI` が不一致 |
| 「Google との接続が切れています」 | リフレッシュトークンが失効。連携を解除して再連携する |
| 連携後に予定が出ない | 「今すぐ同期」を実行。表示対象カレンダーが選択されているかを確認 |
