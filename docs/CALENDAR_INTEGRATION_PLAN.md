# Google カレンダー連携 計画書・要件定義・詳細設計

- ステータス: Draft（レビュー待ち）
- 作成日: 2026-07-10
- 対象アプリ: comm-time（https://comm-time.vercel.app/）
- 関連ドキュメント: [API.md](./API.md) / [DATABASE_SYNC_GUIDE.md](./DATABASE_SYNC_GUIDE.md) / [USER_RESEARCH.md](./USER_RESEARCH.md)

---

## 1. 背景と目的（計画書）

### 1.1 課題認識

comm-time はタイマー・TODO・メモ・カンバンなど機能は揃っているが、**「立ち上げる理由」が弱く、起動習慣が定着しない**。ユーザーが毎日必ず見るもの＝「自分の予定（カレンダー）」がアプリの外にあるため、comm-time を開く動機が生まれにくい。

### 1.2 目的

Google カレンダーをアプリ内に統合し、**「予定を確認する場所」= comm-time** にする。これにより:

1. **毎日開く理由を作る** — 今日・今週の予定が最初に目に入るホーム体験
2. **予定と行動をつなぐ** — カレンダーの予定を TODO・ポモドーロ・会議タイマーへワンクリックで接続
3. **予定を「自分の情報」で拡張する** — 各予定にメモ・優先度・タグ・ナレッジを付与（Google 側のデータは汚さず、comm-time 側に保持）
4. **常駐アプリ化** — PWA + 通知 + ミニビューで「開きっぱなしにするツール」へ

### 1.3 成功指標（KPI 案）

| 指標 | 現状 | 目標（リリース3ヶ月後） |
|---|---|---|
| 週あたり起動日数 / アクティブユーザー | 計測なし | 4日以上 |
| カレンダー連携済みユーザー比率 | 0% | アクティブの 50% |
| 予定→TODO 変換の利用 | — | 週1回以上 / 連携ユーザー |
| 予定への注釈（メモ・優先度）付与率 | — | 表示予定の 10% |

### 1.4 フェーズ計画（ロードマップ）

| フェーズ | 内容 | 価値 | 目安 |
|---|---|---|---|
| **Phase 1: 閲覧** | Google OAuth 連携・予定の読み取り表示（今日 / 週 / アジェンダ）| 「開けば予定が見える」| 2〜3週間 |
| **Phase 2: 拡張** | 予定への注釈（メモ・優先度・タグ・ナレッジ）、予定⇄TODO 連携、タイマー連携 | 「comm-time でしかできない体験」| 3〜4週間 |
| **Phase 3: 双方向** | comm-time からの予定作成・編集、TODO の期限をカレンダーに反映 | 「カレンダー操作も comm-time で完結」| 2〜3週間 |
| **Phase 4: 常駐化** | PWA 強化、リマインド通知、コンパクト常駐ビュー、増分同期の自動化 | 「閉じないアプリ」| 2〜3週間 |

> 推奨: Phase 1 を最小スコープ（read-only）で早期リリースし、実際の閲覧習慣が付くかを検証してから Phase 2 以降に投資する。

---

## 2. 要件定義

### 2.1 機能要件

#### FR-1: Google アカウント連携（Phase 1）

- FR-1.1 ユーザーは設定画面から Google アカウントを接続できる（OAuth 2.0 / PKCE）
- FR-1.2 要求スコープは段階的に最小化する
  - Phase 1〜2: `https://www.googleapis.com/auth/calendar.readonly`
  - Phase 3 以降: `https://www.googleapis.com/auth/calendar.events`（書き込みが必要になった時点で再同意）
- FR-1.3 ユーザーはいつでも連携を解除できる（トークン失効 + キャッシュ削除）
- FR-1.4 複数カレンダー（仕事用・個人用など）から表示対象を選択できる

#### FR-2: 予定の表示（Phase 1）

- FR-2.1 「今日」「今週」「アジェンダ（時系列リスト）」の3ビューを提供する
- FR-2.2 各予定は タイトル / 時間帯 / 場所 / 会議 URL（Meet 等）/ 参加者数 / カレンダー色 を表示する
- FR-2.3 会議 URL はワンクリックで開ける
- FR-2.4 終日予定・複数日予定・繰り返し予定を正しく展開表示する
- FR-2.5 オフライン・API 障害時は最終同期時点のキャッシュを表示し、その旨を明示する

#### FR-3: 予定への注釈（Phase 2）★本アプリの差別化ポイント

- FR-3.1 各予定に **Markdown メモ** を付けられる（既存 `markdown-memo` コンポーネントを再利用）
- FR-3.2 各予定に **優先度**（既存 `PriorityLevel`: high / medium / low / none）と **重要度** を設定できる
- FR-3.3 各予定に既存の **タグ** を付与できる
- FR-3.4 注釈は comm-time の DB にのみ保存し、**Google カレンダー側のデータは変更しない**
- FR-3.5 繰り返し予定は「この回のみ」「シリーズ全体」のどちらに注釈するか選べる
- FR-3.6 注釈付き予定はアイコンで判別でき、注釈を横断検索できる（既存 search-modal に統合）

#### FR-4: TODO・タイマー連携（Phase 2）

- FR-4.1 予定から TODO を生成できる（タイトル・日時・タグを引き継ぐ）
- FR-4.2 予定と TODO は相互リンクされ、双方から参照できる
- FR-4.3 予定から会議タイマーを起動できる（予定の長さ = タイマー時間）
- FR-4.4 予定から「この予定の準備」としてポモドーロタスクを設定できる

#### FR-5: 双方向同期（Phase 3）

- FR-5.1 comm-time から予定を作成・編集・削除できる
- FR-5.2 期限付き TODO を任意でカレンダーに予定として反映できる（明示操作のみ。自動同期はしない）

#### FR-6: 常駐化・通知（Phase 4）

- FR-6.1 予定開始 N 分前に Web Push / アプリ内通知を出せる（ユーザー設定）
- FR-6.2 「次の予定 + 現在のタスク」だけのコンパクトビュー（常駐ウィンドウ / PWA）を提供する
- FR-6.3 バックグラウンドで増分同期し、開いた瞬間に最新の予定が見える

### 2.2 非機能要件

| ID | 要件 |
|---|---|
| NFR-1 | **セキュリティ**: リフレッシュトークンはサーバー側で暗号化保存（AES-256-GCM、鍵は環境変数）。クライアントへは絶対に渡さない。全テーブルに RLS 適用 |
| NFR-2 | **プライバシー**: 予定本文のキャッシュは本人のみ参照可。連携解除時にキャッシュ・トークンを完全削除。Google API Services User Data Policy（Limited Use）準拠 |
| NFR-3 | **性能**: カレンダービュー初期表示 1 秒以内（キャッシュファースト + バックグラウンド再検証） |
| NFR-4 | **API クォータ**: Google Calendar API の呼び出しは syncToken による増分同期を基本とし、ユーザーあたりポーリングは 5 分間隔以下にしない |
| NFR-5 | **可用性**: Google API 障害時もアプリ本体（TODO / タイマー / メモ）は影響を受けない（連携はオプショナル機能として分離） |
| NFR-6 | **i18n**: 表示文字列はすべて定数化（`lib/constants.ts`）。ハードコード禁止（CLAUDE.md 準拠） |
| NFR-7 | **型安全**: `any` 禁止。Google API レスポンスはアプリ内型に変換してから使用 |

### 2.3 スコープ外（明記）

- Google 以外のカレンダー（Outlook / iCal）— 将来検討
- 他ユーザーとの予定共有・空き時間調整
- Google カレンダーの通知設定の変更
- TODO とカレンダーの**自動**双方向同期（衝突解決が複雑になるため、明示操作のみ）

---

## 3. 詳細設計

### 3.1 全体アーキテクチャ

```
┌─ Browser ──────────────────────────────────────────┐
│  CalendarTab (今日/週/アジェンダ)                     │
│  EventDetailDrawer (メモ/優先度/タグ/TODO化)          │
│  hooks: useCalendarEvents / useEventAnnotations     │
└───────────────┬────────────────────────────────────┘
                │ fetch (Supabase セッション JWT)
┌───────────────▼────────────────────────────────────┐
│  Next.js Route Handlers  /api/v1/calendar/*         │
│   - OAuth コールバック / トークン管理（暗号化）        │
│   - Google Calendar API プロキシ + 増分同期           │
└───────┬───────────────────────────┬────────────────┘
        │                           │
┌───────▼─────────┐        ┌────────▼───────────────┐
│ Google Calendar │        │ Supabase (Postgres+RLS) │
│ API v3          │        │  calendar_connections   │
│                 │        │  calendar_event_cache   │
│                 │        │  event_annotations      │
│                 │        │  todo_event_links       │
└─────────────────┘        └────────────────────────┘
```

設計原則:

- **トークンはサーバーだけが触る**。ブラウザは自前 API (`/api/v1/calendar/*`) のみ叩く
- **キャッシュファースト**。表示は常に Supabase のキャッシュから行い、Google API へは同期処理だけがアクセスする
- **注釈はイベント ID をキーに自前 DB に保存**。Google 側データと疎結合（連携解除・再連携しても注釈は復元可能）

### 3.2 認証・トークン設計

推奨方式: **アプリ独自の Google OAuth フロー**（Supabase Auth の Google プロバイダとは分離）

理由（比較検討済み）:

| 方式 | 評価 |
|---|---|
| A. Supabase Auth を Google ログインに変更し provider_token を流用 | ❌ 既存メール認証ユーザーの移行が必要。Supabase はリフレッシュトークンの永続管理を保証しない |
| **B. ログインは現状維持、カレンダー連携だけ独自 OAuth（推奨）** | ✅ 既存認証に影響なし。スコープを最小化でき、連携解除も独立。トークンのライフサイクルを完全に制御できる |

フロー:

1. `GET /api/v1/calendar/auth` — `state`(CSRF) と PKCE を生成し Google 同意画面へリダイレクト（`access_type=offline&prompt=consent` でリフレッシュトークン取得）
2. `GET /api/v1/calendar/callback` — code 交換 → リフレッシュトークンを AES-256-GCM で暗号化し `calendar_connections` に保存 → 設定画面へ戻す
3. アクセストークンはサーバーメモリ/DB に短期保持し、期限切れ時にリフレッシュ
4. 連携解除: `DELETE /api/v1/calendar/connection` — Google の revoke エンドポイント呼び出し + レコードと同期キャッシュを削除

必要な環境変数:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://comm-time.vercel.app/api/v1/calendar/callback
CALENDAR_TOKEN_ENCRYPTION_KEY=  # 32byte base64
```

Google Cloud Console 側の準備:

- プロジェクト作成 → Calendar API 有効化
- OAuth 同意画面（外部 / テストユーザー登録。公開時は `calendar.readonly` が sensitive scope のため検証申請が必要な点に注意）
- 承認済みリダイレクト URI に本番 / プレビュー / ローカル (`http://localhost:5656/...`) を登録

### 3.3 データベース設計（migration 014〜016）

```sql
-- 014_add_calendar_connections.sql
create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_email text not null,
  refresh_token_encrypted text not null,
  scopes text[] not null,
  selected_calendar_ids text[] not null default '{}',
  sync_token text,                -- Google 増分同期用
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)                -- MVP は 1ユーザー1アカウント
);

-- 015_add_calendar_event_cache.sql
create table calendar_event_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null,
  event_id text not null,          -- Google の event.id
  recurring_event_id text,         -- 繰り返しの親 ID
  summary text,
  description text,
  location text,
  hangout_link text,
  start_at timestamptz,
  end_at timestamptz,
  is_all_day boolean not null default false,
  status text not null default 'confirmed',  -- confirmed/tentative/cancelled
  attendees_count int,
  color_id text,
  raw jsonb,                       -- 将来の表示拡張用に原本を保持
  updated_at timestamptz not null default now(),
  unique (user_id, calendar_id, event_id)
);
create index on calendar_event_cache (user_id, start_at);

-- 016_add_event_annotations.sql
create table event_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,         -- 単発: event_id / シリーズ: recurring_event_id
  scope text not null default 'instance',  -- instance | series
  memo text,                       -- Markdown
  priority text default 'none',    -- 既存 PriorityLevel と同一
  importance text default 'none',
  tag_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_key, scope)
);

create table todo_event_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  todo_id uuid not null references todos(id) on delete cascade,
  event_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, todo_id, event_key)
);
```

- 全テーブルに既存パターンどおりの RLS（`user_id = auth.uid()`）を適用
- **注釈は `event_key` で疎結合**にし、キャッシュを削除しても注釈は残す（再同期で再び紐づく）

### 3.4 API 設計（既存 `/api/v1` 規約に準拠、`lib/api-auth.ts` の認証を再利用）

| Method | Path | 説明 | Phase |
|---|---|---|---|
| GET | `/api/v1/calendar/auth` | OAuth 開始（リダイレクト） | 1 |
| GET | `/api/v1/calendar/callback` | OAuth コールバック | 1 |
| GET | `/api/v1/calendar/connection` | 連携状態・カレンダー一覧取得 | 1 |
| PATCH | `/api/v1/calendar/connection` | 表示カレンダー選択の更新 | 1 |
| DELETE | `/api/v1/calendar/connection` | 連携解除（revoke + 削除） | 1 |
| POST | `/api/v1/calendar/sync` | 増分同期の実行（syncToken 利用、410 時はフル同期にフォールバック） | 1 |
| GET | `/api/v1/calendar/events?from&to` | キャッシュから期間指定でイベント取得（注釈・TODO リンクを JOIN して返す） | 1 |
| PUT | `/api/v1/calendar/events/[eventKey]/annotation` | 注釈の作成・更新 | 2 |
| DELETE | `/api/v1/calendar/events/[eventKey]/annotation` | 注釈の削除 | 2 |
| POST | `/api/v1/calendar/events/[eventKey]/todo` | 予定から TODO 生成 + リンク作成 | 2 |
| POST | `/api/v1/calendar/events` | 予定作成（Google へ書き込み） | 3 |
| PATCH/DELETE | `/api/v1/calendar/events/[eventKey]` | 予定編集・削除 | 3 |

同期戦略:

1. **手動 + 表示時同期（Phase 1)**: カレンダータブを開いた時に前回同期から 5 分以上経過していれば `POST /sync`
2. **増分同期**: `events.list` の `syncToken` を保存し差分のみ取得。`410 Gone` ならフル同期しなおす
3. **自動化（Phase 4)**: Vercel Cron（既存 keep-alive ワークフローと同様の枠組み）で定期同期、将来的に Google push notifications（webhook channel）を検討

### 3.5 フロントエンド設計

新規ファイル構成（1コンポーネント1責務、副作用は hooks に分離 — CLAUDE.md 準拠）:

```
components/calendar/
  calendar-tab.tsx            # タブ全体のレイアウト（今日/週/アジェンダ切替）
  calendar-day-view.tsx       # 今日ビュー（タイムライン）
  calendar-week-view.tsx      # 週ビュー
  calendar-agenda-view.tsx    # 時系列リスト
  event-card.tsx              # 予定1件の表示（注釈バッジ・会議リンク付き）
  event-detail-drawer.tsx     # 予定詳細 + 注釈編集（markdown-memo 再利用）
  calendar-connect-panel.tsx  # 設定画面: 連携・カレンダー選択・解除
  next-event-widget.tsx       # ヘッダー常駐「次の予定」ミニ表示 (Phase 4)

hooks/
  useCalendarConnection.ts    # 連携状態の取得・解除
  useCalendarEvents.ts        # 期間指定取得 + 同期トリガー + キャッシュ
  useEventAnnotations.ts      # 注釈 CRUD
  useEventTodoLink.ts         # 予定→TODO 変換

types/calendar.ts             # CalendarEvent / EventAnnotation / CalendarConnection
lib/google-calendar.ts        # サーバー専用: Google API クライアント・トークン暗号化
lib/constants.ts              # カレンダー関連の表示文字列を追加（i18n 定数化）
```

UI 統合ポイント:

- 既存 `tab-switcher.tsx`（meeting / pomodoro）に **calendar タブを追加**し、`TabType` を拡張
- ヘッダー（`app-header.tsx`）に「次の予定」ウィジェットを常設 → どのタブにいても予定が視界に入る（習慣化の核）
- 予定詳細から「TODO にする」→ 既存 `useSupabaseTodos` の作成フローに接続
- 予定詳細から「会議タイマー開始」→ `useMeetingTimer` に予定の長さを渡す
- 検索モーダルに注釈メモを検索対象として追加

### 3.6 型定義（抜粋）

```ts
// types/calendar.ts
export type CalendarEvent = {
  eventKey: string;            // 注釈の紐付けキー
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  startAt: string;             // ISO
  endAt: string;               // ISO
  isAllDay: boolean;
  status: "confirmed" | "tentative" | "cancelled";
  attendeesCount?: number;
  colorId?: string;
  annotation?: EventAnnotation;
  linkedTodoIds: string[];
};

export type EventAnnotation = {
  eventKey: string;
  scope: "instance" | "series";
  memo?: string;               // Markdown
  priority: PriorityLevel;     // 既存型を再利用
  importance: ImportanceLevel;
  tagIds: string[];
};

export type CalendarConnection = {
  googleEmail: string;
  selectedCalendarIds: string[];
  availableCalendars: { id: string; summary: string; color: string }[];
  lastSyncedAt?: string;
};
```

### 3.7 テスト計画

- **単体（Jest)**: トークン暗号化/復号、syncToken フォールバック、繰り返し予定の展開ロジック、event_key 解決（instance/series）
- **API**: 各 route handler の認証・バリデーション（既存 API テストの流儀に合わせる）
- **E2E（Playwright)**: Google API をモックし、連携→表示→注釈→TODO 化の一連フロー。OAuth 本体はモック境界の外とする
- **ビジュアル回帰**: 既存 `visual-regression.spec.ts` にカレンダービューを追加

### 3.8 リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| Google OAuth 検証（sensitive scope 審査）に時間がかかる | 公開が遅れる | 開発中はテストユーザー枠（100人）で運用。readonly スコープに限定して審査負荷を下げる。審査は Phase 1 開発と並行して申請 |
| リフレッシュトークン失効（半年未使用・パスワード変更等） | 予定が更新されない | 401 検知で「再連携が必要」バナーを表示。キャッシュは残すため閲覧は継続可能 |
| API クォータ超過 | 同期停止 | 増分同期 + 同期間隔の下限 + exponential backoff |
| 繰り返し予定の注釈仕様が複雑化 | 工数増 | Phase 2 初期は「この回のみ (instance)」だけ実装し、series は後続で追加 |
| トークン漏洩 | 重大 | サーバー限定・暗号化保存・スコープ最小化・連携解除で即 revoke |

### 3.9 マイルストーンとタスク分解（Phase 1 詳細）

1. Google Cloud プロジェクト・OAuth 同意画面のセットアップ（0.5d）
2. migration 014/015 + RLS（0.5d)
3. `lib/google-calendar.ts`（トークン暗号化・API クライアント）（1d）
4. OAuth 開始/コールバック/連携解除 API（1.5d）
5. 同期 API（syncToken 増分 + フルフォールバック）（1.5d）
6. `useCalendarEvents` + カレンダータブ（今日/アジェンダ）（2d）
7. 週ビュー + 連携設定パネル（1.5d）
8. テスト・ドキュメント（`docs/CALENDAR_SETUP.md`）（1d）

→ Phase 1 実働 約 9〜10 人日。完了条件: 「Google 連携したユーザーが、今日と今週の予定を comm-time 内で 1 秒以内に閲覧できる」

---

## 4. 未決事項（レビューで決めたいこと）

1. **ホームでの位置づけ**: カレンダーを独立タブにするか、起動時のデフォルトタブにするか（推奨: Phase 1 は独立タブ、Phase 4 でデフォルト化を検証）
2. **Supabase Auth への Google ログイン追加**: 連携とは別件だが、ログイン自体を Google にすると導線が滑らかになる。要検討
3. **TODO→カレンダー反映（FR-5.2）の優先度**: ユーザー価値検証後に判断
4. **通知チャネル**: Web Push（要 service worker 拡張）か、アプリ内通知のみで足りるか
