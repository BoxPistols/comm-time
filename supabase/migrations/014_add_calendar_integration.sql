-- Google カレンダー連携用テーブル
-- 設計: docs/CALENDAR_INTEGRATION_PLAN.md 3.3 参照
-- トークンはサーバー側で AES-256-GCM 暗号化して保存する（クライアントには渡さない）

-- =============================
-- 1. calendar_connections: Google アカウント連携（1ユーザー1アカウント）
-- =============================
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  selected_calendar_ids TEXT[] NOT NULL DEFAULT '{}',
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- =============================
-- 2. calendar_event_cache: Google イベントのローカルキャッシュ
-- =============================
CREATE TABLE IF NOT EXISTS calendar_event_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  recurring_event_id TEXT,
  summary TEXT,
  description TEXT,
  location TEXT,
  hangout_link TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  attendees_count INT,
  color_id TEXT,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, calendar_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_cache_user_start
  ON calendar_event_cache (user_id, start_at);

-- =============================
-- 3. event_annotations: 予定への注釈（メモ・優先度・タグ）
--    event_key で疎結合（キャッシュ削除後も注釈は残す）
-- =============================
CREATE TABLE IF NOT EXISTS event_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'instance' CHECK (scope IN ('instance', 'series')),
  memo TEXT,
  priority TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('high', 'medium', 'low', 'none')),
  importance TEXT NOT NULL DEFAULT 'none' CHECK (importance IN ('high', 'medium', 'low', 'none')),
  tag_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_key, scope)
);

-- =============================
-- 4. todo_event_links: 予定と TODO の相互リンク
-- =============================
CREATE TABLE IF NOT EXISTS todo_event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, todo_id, event_key)
);

-- =============================
-- RLS（既存テーブルと同一パターン）
-- =============================
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_event_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own calendar connection" ON calendar_connections;
DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_event_cache;
DROP POLICY IF EXISTS "Users can view own event annotations" ON event_annotations;
DROP POLICY IF EXISTS "Users can insert own event annotations" ON event_annotations;
DROP POLICY IF EXISTS "Users can update own event annotations" ON event_annotations;
DROP POLICY IF EXISTS "Users can delete own event annotations" ON event_annotations;
DROP POLICY IF EXISTS "Users can view own todo event links" ON todo_event_links;
DROP POLICY IF EXISTS "Users can insert own todo event links" ON todo_event_links;
DROP POLICY IF EXISTS "Users can delete own todo event links" ON todo_event_links;

-- connections / cache への書き込みはサーバー（service role）のみ。クライアントは参照のみ
CREATE POLICY "Users can view own calendar connection" ON calendar_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own calendar events" ON calendar_event_cache
  FOR SELECT USING (auth.uid() = user_id);

-- 注釈・リンクはクライアントからも CRUD 可能
CREATE POLICY "Users can view own event annotations" ON event_annotations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own event annotations" ON event_annotations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own event annotations" ON event_annotations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own event annotations" ON event_annotations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own todo event links" ON todo_event_links
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own todo event links" ON todo_event_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own todo event links" ON todo_event_links
  FOR DELETE USING (auth.uid() = user_id);
