-- カンバンステータス管理テーブルの追加
-- カスタムステータスを作成・編集・削除できる機能のため

-- 1. kanban_statuses テーブル（ステータスマスター）
CREATE TABLE IF NOT EXISTS kanban_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  bg_class TEXT NOT NULL DEFAULT 'bg-gray-500',
  text_class TEXT NOT NULL DEFAULT 'text-gray-600',
  border_class TEXT NOT NULL DEFAULT 'border-gray-300',
  active_class TEXT NOT NULL DEFAULT 'bg-gray-500 text-white',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_kanban_statuses_user ON kanban_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_statuses_order ON kanban_statuses(user_id, sort_order);

-- ユニーク制約 (user_id と name の組み合わせ)
ALTER TABLE kanban_statuses
ADD CONSTRAINT unique_user_status_name UNIQUE (user_id, name);

-- Row Level Security (RLS) 有効化
ALTER TABLE kanban_statuses ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: kanban_statuses（自分のステータスのみアクセス可能）
DROP POLICY IF EXISTS "Users can view own kanban_statuses" ON kanban_statuses;
DROP POLICY IF EXISTS "Users can insert own kanban_statuses" ON kanban_statuses;
DROP POLICY IF EXISTS "Users can update own kanban_statuses" ON kanban_statuses;
DROP POLICY IF EXISTS "Users can delete own kanban_statuses" ON kanban_statuses;

CREATE POLICY "Users can view own kanban_statuses"
  ON kanban_statuses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kanban_statuses"
  ON kanban_statuses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kanban_statuses"
  ON kanban_statuses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own kanban_statuses"
  ON kanban_statuses FOR DELETE
  USING (auth.uid() = user_id);

-- トリガー設定（既存のトリガーを削除してから作成）
DROP TRIGGER IF EXISTS update_kanban_statuses_updated_at ON kanban_statuses;
CREATE TRIGGER update_kanban_statuses_updated_at
  BEFORE UPDATE ON kanban_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. todosテーブルのkanban_statusカラムの制約を変更
-- 既存のCHECK制約を削除（ダイナミックなステータスに対応するため）
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_kanban_status_check;

-- kanban_statusがnullまたは空の場合のデフォルト値を設定するためのトリガー
CREATE OR REPLACE FUNCTION set_default_kanban_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kanban_status IS NULL OR NEW.kanban_status = '' THEN
    NEW.kanban_status := 'backlog';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_default_kanban_status_trigger ON todos;
CREATE TRIGGER set_default_kanban_status_trigger
  BEFORE INSERT OR UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION set_default_kanban_status();

-- 3. ユーザー初期化用関数（新規ユーザーにデフォルトステータスを作成）
CREATE OR REPLACE FUNCTION create_default_kanban_statuses(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 実行ユーザーが対象ユーザーと一致するか確認
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- 既にステータスが存在する場合はスキップ
  IF EXISTS (SELECT 1 FROM kanban_statuses WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  -- デフォルトステータスを作成
  INSERT INTO kanban_statuses (user_id, name, label, color, bg_class, text_class, border_class, active_class, sort_order, is_default)
  VALUES
    (p_user_id, 'backlog', 'Backlog', 'gray', 'bg-gray-500', 'text-gray-600', 'border-gray-300', 'bg-gray-500 text-white', 0, true),
    (p_user_id, 'todo', 'Todo', 'blue', 'bg-blue-500', 'text-blue-600', 'border-blue-300', 'bg-blue-500 text-white', 1, false),
    (p_user_id, 'doing', 'Doing', 'yellow', 'bg-yellow-500', 'text-yellow-600', 'border-yellow-300', 'bg-yellow-500 text-black', 2, false),
    (p_user_id, 'done', 'Done', 'green', 'bg-green-500', 'text-green-600', 'border-green-300', 'bg-green-500 text-white', 3, false);
END;
$$ LANGUAGE plpgsql;
