-- タグ、優先度、重要度、カンバンステータス機能の追加
-- このSQLをSupabase SQL Editorで実行してください

-- 1. Tags テーブル（タグマスター）
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);

-- Row Level Security (RLS) 有効化
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: Tags（自分のタグのみアクセス可能）
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;

CREATE POLICY "Users can view own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- トリガー設定
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. Todos テーブルに新しいカラムを追加
-- タグID配列（複数タグ対応）
ALTER TABLE todos ADD COLUMN IF NOT EXISTS tag_ids UUID[] DEFAULT '{}';

-- 優先度（high, medium, low, none）
ALTER TABLE todos ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'none'
  CHECK (priority IN ('high', 'medium', 'low', 'none'));

-- 重要度（high, medium, low, none）
ALTER TABLE todos ADD COLUMN IF NOT EXISTS importance TEXT DEFAULT 'none'
  CHECK (importance IN ('high', 'medium', 'low', 'none'));

-- カンバンステータス（backlog, todo, doing, done）
ALTER TABLE todos ADD COLUMN IF NOT EXISTS kanban_status TEXT DEFAULT 'backlog'
  CHECK (kanban_status IN ('backlog', 'todo', 'doing', 'done'));

-- インデックス追加（フィルタリング用）
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_todos_importance ON todos(user_id, importance);
CREATE INDEX IF NOT EXISTS idx_todos_kanban_status ON todos(user_id, kanban_status);
