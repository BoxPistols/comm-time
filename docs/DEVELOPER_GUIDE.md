# Comm Time - 開発者向けガイド

Comm Timeアプリケーションの開発者向けドキュメントです。セットアップから実装の詳細、デプロイまでを網羅しています。

## 目次

- [技術スタック](#技術スタック)
- [プロジェクト構造](#プロジェクト構造)
- [環境構築](#環境構築)
- [Supabaseセットアップ](#supabaseセットアップ)
- [実装の詳細](#実装の詳細)
- [開発ガイド](#開発ガイド)
- [テスト](#テスト)
- [デプロイ](#デプロイ)
- [トラブルシューティング](#トラブルシューティング)

---

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14.2.16 (App Router)
- **言語**: TypeScript 5
- **UIライブラリ**:
  - React 18
  - Radix UI (Dialog)
  - Lucide React (Icons)
- **スタイリング**: Tailwind CSS 3.4.1
- **DnD**: react-beautiful-dnd 13.1.1

### バックエンド/データベース
- **BaaS**: Supabase
- **データベース**: PostgreSQL (Supabase)
- **認証**: Supabase Auth
- **ストレージ**: LocalStorage + Supabase

### 開発ツール
- **パッケージマネージャー**: npm
- **リンター**: ESLint
- **テスト**: Jest + React Testing Library

---

## プロジェクト構造

```
comm-time/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # ルートレイアウト
│   ├── page.tsx                 # トップページ
│   └── globals.css              # グローバルスタイル
│
├── components/                   # Reactコンポーネント
│   ├── comm-time.tsx            # メインコンポーネント (2,700+ 行)
│   ├── auth-dialog.tsx          # 認証ダイアログ
│   └── ui/
│       └── dialog.tsx           # ダイアログコンポーネント
│
├── hooks/                        # カスタムフック
│   ├── useAuth.ts               # 認証状態管理
│   ├── useSupabaseTodos.ts      # TODO CRUD操作
│   └── useSupabaseMemos.ts      # メモCRUD操作
│
├── lib/                          # ライブラリ・ユーティリティ
│   ├── supabase.ts              # Supabaseクライアント
│   └── utils.ts                 # ヘルパー関数
│
├── supabase/                     # Supabaseマイグレーション
│   └── migrations/
│       └── 001_init_schema.sql  # 初期スキーマ
│
├── __tests__/                    # テストファイル
│   ├── default-values.test.ts
│   ├── alarm-multiple.test.tsx
│   └── dark-mode.test.tsx
│
├── docs/                         # ドキュメント
│   ├── DEVELOPER_GUIDE.md       # このファイル
│   ├── USER_GUIDE.md            # ユーザー向けガイド
│   └── SUPABASE_SETUP.md        # Supabaseセットアップ
│
├── .env.local.example           # 環境変数サンプル
├── .env.local                   # 環境変数（Git管理外）
├── next.config.mjs              # Next.js設定
├── tailwind.config.ts           # Tailwind設定
└── tsconfig.json                # TypeScript設定
```

---

## 環境構築

### 1. 必要なソフトウェア

- **Node.js**: v18.x 以上
- **npm**: v8.x 以上
- **Git**: v2.x 以上

### 2. リポジトリのクローン

```bash
git clone https://github.com/BoxPistols/comm-time.git
cd comm-time
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成：

```bash
cp .env.local.example .env.local
```

`.env.local` を編集（詳細は次のセクション）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

---

## Supabaseセットアップ

詳細は [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) を参照してください。

### クイックスタート

#### 1. Supabaseプロジェクト作成

1. https://supabase.com でアカウント作成
2. 新規プロジェクト作成
   - **Name**: comm-time
   - **Database Password**: 強力なパスワード
   - **Region**: Northeast Asia (Tokyo)

#### 2. データベーススキーマ実行

1. Supabase Dashboard → **SQL Editor**
2. `supabase/migrations/001_init_schema.sql` の内容をコピー&ペースト
3. **Run** をクリック

#### 3. 環境変数取得

1. Supabase Dashboard → **Settings** → **API**
2. 以下をコピー：
   - **Project URL**
   - **anon public key**

#### 4. `.env.local` に設定

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 5. 開発サーバー再起動

```bash
npm run dev
```

### データベーススキーマ

#### テーブル構成

**profiles** - ユーザープロフィール
```sql
id          UUID PRIMARY KEY (auth.usersと連携)
email       TEXT UNIQUE NOT NULL
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

**memos** - メモデータ
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES profiles(id)
type        TEXT ('meeting' | 'pomodoro')
content     TEXT
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

**todos** - TODOリスト
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES profiles(id)
type            TEXT ('meeting' | 'pomodoro')
text            TEXT NOT NULL
is_completed    BOOLEAN DEFAULT FALSE
due_date        DATE
due_time        TIME
alarm_point_id  TEXT
order_index     INTEGER
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### Row Level Security (RLS)

すべてのテーブルでRLSが有効化されており、各ユーザーは自分のデータのみアクセス可能：

```sql
-- 例: todos テーブルのポリシー
CREATE POLICY "Users can view own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 実装の詳細

### アーキテクチャ

```
┌─────────────────────────────────────────────┐
│           Comm Time アプリ                   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐         ┌──────────────┐  │
│  │   ログイン   │────────▶│  Supabase    │  │
│  │   なし      │         │   Auth       │  │
│  └─────────────┘         └──────────────┘  │
│        │                         │          │
│        ▼                         ▼          │
│  ┌─────────────┐         ┌──────────────┐  │
│  │ LocalStorage│         │  PostgreSQL  │  │
│  │  (従来方式) │         │  (Supabase)  │  │
│  └─────────────┘         └──────────────┘  │
│                                   │         │
│                                   ▼         │
│                          ┌──────────────┐  │
│                          │  REST API    │  │
│                          │ (自動生成)    │  │
│                          └──────────────┘  │
└─────────────────────────────────────────────┘
```

### 主要コンポーネント

#### 1. **CommTimeComponent** (`components/comm-time.tsx`)

メインコンポーネント。すべてのタイマー機能とUIを管理。

**主要機能**:
- ミーティングタイマー
- ポモドーロタイマー
- カウントダウンモード
- TODO管理
- メモ管理
- アラーム機能
- ダークモード

**状態管理**:
- React Hooks (useState, useEffect)
- LocalStorageへの自動保存
- Supabase連携準備済み

#### 2. **AuthDialog** (`components/auth-dialog.tsx`)

認証ダイアログコンポーネント。

**機能**:
- ログイン
- サインアップ
- エラーハンドリング
- 成功時のコールバック

**使用例**:
```tsx
<AuthDialog
  open={authDialogOpen}
  onOpenChange={setAuthDialogOpen}
  onSuccess={() => setUseDatabase(true)}
/>
```

### カスタムフック

#### 1. **useAuth** (`hooks/useAuth.ts`)

認証状態を管理するフック。

```typescript
const { user, loading, isAuthenticated, signOut } = useAuth()

// user: 現在のユーザー情報 (User | null)
// loading: 認証状態のロード中フラグ
// isAuthenticated: 認証済みかどうか
// signOut: ログアウト関数
```

**実装**:
- 初回ロード時にユーザー情報取得
- `onAuthStateChange` でリアルタイム監視
- セッション管理

#### 2. **useSupabaseTodos** (`hooks/useSupabaseTodos.ts`)

TODOのCRUD操作を行うフック。

```typescript
const {
  todos,
  loading,
  error,
  addTodo,
  updateTodo,
  removeTodo,
  toggleTodo,
  refreshTodos
} = useSupabaseTodos('meeting', user)
```

**機能**:
- TODOの取得（自動ソート）
- TODOの追加
- TODOの更新
- TODOの削除
- 完了状態の切り替え
- リアルタイム同期

**型変換**:
- Supabase型 ↔ ローカル型の自動変換
- 既存のcomm-time.tsxとの互換性維持

#### 3. **useSupabaseMemos** (`hooks/useSupabaseMemos.ts`)

メモのCRUD操作を行うフック。

```typescript
const {
  memo,
  loading,
  error,
  saveMemo,
  deleteMemo,
  refreshMemo
} = useSupabaseMemos('pomodoro', user)
```

**機能**:
- メモの取得
- メモの保存（作成/更新を自動判定）
- メモの削除
- リアルタイム同期

### Supabaseクライアント

#### **lib/supabase.ts**

Supabaseクライアントと認証ヘルパーを提供。

```typescript
import { supabase, auth } from '@/lib/supabase'

// データベース操作
const { data, error } = await supabase
  .from('todos')
  .select('*')

// 認証操作
await auth.signUp(email, password)
await auth.signIn(email, password)
await auth.signOut()
const user = await auth.getCurrentUser()
```

**提供する機能**:
- Supabaseクライアントのシングルトン
- 認証ヘルパー関数
- 型定義

---

## 開発ガイド

### 新機能の追加

#### TODO機能の拡張例

1. **型定義を更新** (`lib/supabase.ts`)

```typescript
export type TodoItem = {
  // ... 既存のフィールド
  priority?: 'low' | 'medium' | 'high'  // 追加
}
```

2. **マイグレーションを作成**

```sql
-- supabase/migrations/002_add_priority.sql
ALTER TABLE todos ADD COLUMN priority TEXT;
```

3. **フックを更新** (`hooks/useSupabaseTodos.ts`)

```typescript
const convertToDb = (localTodo: Partial<LocalTodoItem>) => ({
  // ... 既存のフィールド
  priority: localTodo.priority,
})
```

4. **UIを更新** (`components/comm-time.tsx`)

```tsx
// priority選択UIを追加
```

### コーディング規約

#### TypeScript
- strict モード有効
- 明示的な型定義を推奨
- `any` の使用を避ける

#### React
- 関数コンポーネント使用
- Hooks を活用
- propsは型定義必須

#### ファイル命名
- コンポーネント: `PascalCase.tsx`
- フック: `useHookName.ts`
- ユーティリティ: `camelCase.ts`

#### コミットメッセージ
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
refactor: リファクタリング
test: テスト追加
chore: ビルド・設定変更
```

---

## テスト

### テストの実行

```bash
# すべてのテスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage
```

### テストファイル構成

```
__tests__/
├── default-values.test.ts      # デフォルト値のテスト
├── alarm-multiple.test.tsx     # 複数アラームのテスト
└── dark-mode.test.tsx          # ダークモードのテスト
```

### 新しいテストの追加

```typescript
import { render, screen } from '@testing-library/react'
import { CommTimeComponent } from '@/components/comm-time'

describe('CommTimeComponent', () => {
  it('should render login button', () => {
    render(<CommTimeComponent />)
    expect(screen.getByText('ログイン')).toBeInTheDocument()
  })
})
```

---

## デプロイ

### Vercelへのデプロイ

#### 1. Vercelアカウント作成

https://vercel.com でアカウント作成

#### 2. プロジェクトをインポート

```bash
# Vercel CLIインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel
```

#### 3. 環境変数を設定

Vercel Dashboard → Settings → Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 4. 本番デプロイ

```bash
vercel --prod
```

### その他のプラットフォーム

#### Netlify
```bash
npm run build
# outディレクトリをデプロイ
```

#### 自前サーバー
```bash
npm run build
npm start
```

---

## トラブルシューティング

### よくある問題

#### 1. ビルドエラー: "Invalid supabaseUrl"

**原因**: `.env.local` が設定されていない

**解決方法**:
```bash
cp .env.local.example .env.local
# .env.local を編集して正しい値を設定
```

#### 2. 認証エラー: "Invalid login credentials"

**原因**: メール確認が完了していない

**解決方法**:
1. メールボックスを確認
2. 確認リンクをクリック
3. 再度ログイン

#### 3. データが同期されない

**原因**: データベース連携がOFFになっている

**解決方法**:
1. ログイン
2. ヘッダーの「データベース」アイコンをクリック
3. 緑色（ON）になっていることを確認

#### 4. RLSエラー: "new row violates row-level security policy"

**原因**: RLSポリシーが正しく設定されていない

**解決方法**:
```sql
-- Supabase SQL Editorで再実行
-- supabase/migrations/001_init_schema.sql の内容
```

#### 5. リアルタイム同期が動作しない

**原因**: Supabaseのリアルタイム機能が有効化されていない

**解決方法**:
1. Supabase Dashboard → Database → Replication
2. `todos` と `memos` テーブルのReplicationを有効化

### デバッグ方法

#### ブラウザコンソール

```javascript
// LocalStorageの確認
console.log(localStorage.getItem('meetingTodos'))

// Supabase接続確認
import { supabase } from '@/lib/supabase'
const { data } = await supabase.from('todos').select('count')
console.log(data)
```

#### Supabase Dashboard

1. **Table Editor**: データを直接確認・編集
2. **SQL Editor**: クエリを直接実行
3. **Auth**: ユーザー一覧を確認
4. **Logs**: エラーログを確認

---

## パフォーマンス最適化

### 推奨事項

1. **データベースインデックス**
   - `(user_id, type)` の複合インデックス（実装済み）
   - `order_index` のインデックス（実装済み）

2. **キャッシング**
   - LocalStorageでのオフラインキャッシュ
   - Reactのメモ化（useMemo, useCallback）

3. **バンドルサイズ削減**
   - 動的インポート
   - Tree Shaking

---

## セキュリティ

### 実装済みのセキュリティ対策

1. **Row Level Security (RLS)**
   - ユーザーごとのデータ分離
   - SQLインジェクション対策

2. **認証**
   - Supabase Authによる安全な認証
   - パスワードハッシュ化

3. **環境変数**
   - `.env.local` はGit管理外
   - `anon key` のみをクライアント公開

### 注意事項

- `service_role` キーは絶対に公開しない
- CORS設定を適切に管理
- XSS対策（Reactが自動処理）

---

## サポート

### 公式リソース

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Supabase ドキュメント](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### コミュニティ

- GitHub Issues: https://github.com/BoxPistols/comm-time/issues
- Discussions: https://github.com/BoxPistols/comm-time/discussions

---

**Happy Coding! 🚀**
