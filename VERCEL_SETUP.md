# Vercel環境変数の設定方法

## 問題

Vercelにデプロイした際に以下のエラーが発生する場合：

```
POST https://placeholder.supabase.co/auth/v1/token?grant_type=password net::ERR_NAME_NOT_RESOLVED
```

これは、Supabaseの環境変数が設定されていないためです。

## 解決方法

### 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト設定から以下の情報を取得：
   - Project URL（例: `https://xxxxx.supabase.co`）
   - anon/public key

### 2. Vercelに環境変数を設定

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクトを選択
3. **Settings** → **Environment Variables**に移動
4. 以下の環境変数を追加：

#### 必須の環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabaseプロジェクトのurl | 例: `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseのanon key | プロジェクト設定から取得 |

#### オプションの環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NEXT_PUBLIC_ALLOWED_EMAILS` | `email1@example.com,email2@example.com` | ログインを許可するメールアドレス（カンマ区切り） |

### 3. 環境ごとの設定

各環境変数に対して、以下の環境を選択できます：

- **Production**: 本番環境
- **Preview**: プレビュー環境（PRごとのデプロイ）
- **Development**: ローカル開発環境

通常は**すべての環境**にチェックを入れることをお勧めします。

### 4. 再デプロイ

環境変数を設定後、プロジェクトを再デプロイする必要があります：

1. **Deployments**タブに移動
2. 最新のデプロイメントの右側の「...」メニューをクリック
3. **Redeploy**を選択
4. **Redeploy**ボタンをクリック

または、新しいコミットをプッシュすると自動的に再デプロイされます。

## ローカル開発環境での設定

ローカル開発環境では、`.env.local`ファイルを作成します：

```bash
# .env.localファイルを作成
cp .env.local.example .env.local
```

`.env.local`を編集して、実際の値を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_ALLOWED_EMAILS=your-email@example.com
```

## トラブルシューティング

### エラー: "Supabaseが設定されていません"

ログイン時にこのエラーが表示される場合：

1. Vercelの環境変数が正しく設定されているか確認
2. 再デプロイを実行
3. ブラウザのキャッシュをクリア

### 環境変数が反映されない

- Vercelで環境変数を追加/変更した後は、必ず再デプロイが必要です
- `NEXT_PUBLIC_`プレフィックスが付いた変数は、ビルド時にバンドルされます

## 参考リンク

- [Vercel環境変数ドキュメント](https://vercel.com/docs/projects/environment-variables)
- [Supabase JavaScript クライアント](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js 環境変数](https://nextjs.org/docs/basic-features/environment-variables)
