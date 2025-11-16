# Supabase セットアップガイド

このガイドでは、Comm Timeアプリで Supabase を使ってTODO/メモをクラウドで管理する方法を説明します。

## 前提条件

- Supabaseアカウント（無料）: https://supabase.com/

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. 「New Project」ボタンをクリック
3. 以下の情報を入力：
   - **Project Name**: `comm-time` (任意の名前でOK)
   - **Database Password**: 強力なパスワードを設定（後で使用しません）
   - **Region**: `Northeast Asia (Tokyo)` を推奨
4. 「Create new project」をクリック
5. プロジェクトの作成を待つ（1-2分）

### 2. データベーススキーマの作成

1. 左サイドバーの「SQL Editor」をクリック
2. 「New Query」をクリック
3. `supabase/migrations/001_init_schema.sql` ファイルの内容をコピー&ペースト
4. 「Run」ボタンをクリックしてSQLを実行
5. 成功メッセージが表示されることを確認

### 3. 環境変数の設定

1. Supabase Dashboardの「Settings」→「API」に移動
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co` の形式
   - **anon public key**: `eyJ...` で始まる長い文字列

3. プロジェクトルートの `.env.local` ファイルを編集：

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**実際の値に置き換えてください！**

例：
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. メール認証の設定（推奨）

1. Supabase Dashboardの「Authentication」→「Providers」に移動
2. 「Email」が有効になっていることを確認
3. 「Settings」→「Auth」→「Email Templates」で、確認メールのテンプレートをカスタマイズ可能

### 5. アプリの再起動

```bash
npm run dev
```

開発サーバーを再起動して、環境変数を読み込みます。

## 使い方

### 新規ユーザー登録

1. アプリのヘッダーにある「ログイン」ボタンをクリック
2. 「アカウントをお持ちでない方はこちら」をクリック
3. メールアドレスとパスワード（6文字以上）を入力
4. 「新規登録」をクリック
5. 確認メールが送信されます
6. メール内のリンクをクリックしてアカウントを有効化

### ログイン

1. 「ログイン」ボタンをクリック
2. メールアドレスとパスワードを入力
3. 「ログイン」をクリック

### データベース連携の有効化

1. ログイン後、ヘッダーに「データベース」アイコンが表示されます
2. このアイコンをクリックして緑色に変わると、データベース連携が有効化されます
3. TODO/メモがSupabaseに保存されるようになります

### データの同期

- **データベース連携ON**: TODO/メモはSupabaseに保存され、他のデバイスと同期されます
- **データベース連携OFF**: TODO/メモはローカルストレージに保存されます（従来通り）

### ログアウト

ヘッダーの「ログアウト」ボタンをクリックします。

## データ構造

### Profiles テーブル
ユーザープロフィール情報を管理

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | ユーザーID |
| email | TEXT | メールアドレス |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

### Memos テーブル
メモデータを管理

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | メモID |
| user_id | UUID | ユーザーID |
| type | TEXT | 'meeting' または 'pomodoro' |
| content | TEXT | メモ内容 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

### Todos テーブル
TODOリストを管理

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | TODO ID |
| user_id | UUID | ユーザーID |
| type | TEXT | 'meeting' または 'pomodoro' |
| text | TEXT | TODO内容 |
| is_completed | BOOLEAN | 完了状態 |
| due_date | DATE | 期限日 |
| due_time | TIME | 期限時刻 |
| alarm_point_id | TEXT | アラームポイントID |
| order_index | INTEGER | 表示順序 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

## Row Level Security (RLS)

Supabaseでは、Row Level Securityが有効になっており、各ユーザーは自分のデータのみアクセスできます。

- ユーザーは自分のプロフィール、メモ、TODOのみ閲覧・編集可能
- 他のユーザーのデータは完全に分離されています

## API アクセス

### REST API

Supabaseは自動的にREST APIを生成します。

**エンドポイント**: `https://your-project-url.supabase.co/rest/v1/`

**認証**: `apikey: YOUR_ANON_KEY` と `Authorization: Bearer YOUR_USER_TOKEN` ヘッダーが必要

#### TODO取得の例

```bash
curl -X GET 'https://your-project-url.supabase.co/rest/v1/todos?user_id=eq.your-user-id&type=eq.meeting' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

#### メモ作成の例

```bash
curl -X POST 'https://your-project-url.supabase.co/rest/v1/memos' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "your-user-id",
    "type": "meeting",
    "content": "ミーティングのメモ"
  }'
```

### JavaScript SDKでのアクセス

```javascript
import { supabase } from './lib/supabase'

// TODO取得
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('type', 'meeting')

// TODO作成
const { data, error } = await supabase
  .from('todos')
  .insert({
    type: 'meeting',
    text: '新しいTODO',
    is_completed: false
  })
```

## トラブルシューティング

### 「Network error」が表示される

1. `.env.local` の設定を確認
2. Supabaseプロジェクトが正常に起動しているか確認
3. 開発サーバーを再起動

### メール確認が届かない

1. スパムフォルダを確認
2. Supabase Dashboard → Authentication → Settings で、メール送信が有効か確認
3. 無料プランでは1時間に4通までの制限があります

### データが同期されない

1. 「データベース連携」アイコンが緑色（ON）になっているか確認
2. ブラウザのコンソールでエラーがないか確認
3. Supabase Dashboard → Table Editor でデータを直接確認

### RLS（Row Level Security）エラー

SQL実行時にRLSポリシーが正しく設定されていることを確認してください。`001_init_schema.sql` を再度実行してみてください。

## セキュリティ

- パスワードは最低6文字以上を推奨
- anon keyは公開しても安全ですが、サービスキーは絶対に公開しないでください
- Row Level Securityにより、各ユーザーは自分のデータのみアクセス可能です

## サポート

問題が発生した場合：

1. [Supabase公式ドキュメント](https://supabase.com/docs)
2. [GitHubリポジトリのIssues](https://github.com/your-repo/comm-time/issues)
3. [Supabaseコミュニティ](https://github.com/supabase/supabase/discussions)

---

以上でセットアップは完了です！クラウド同期を活用して、快適なタイマー管理をお楽しみください！
