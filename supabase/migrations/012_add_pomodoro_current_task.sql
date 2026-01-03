-- ポモドーロで集中するタスクを保存するテーブル
-- ユーザーごとに1つだけのタスクを保持

CREATE TABLE IF NOT EXISTS pomodoro_current_task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL DEFAULT '',
  todo_id UUID REFERENCES todos(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLSを有効化
ALTER TABLE pomodoro_current_task ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタスクのみ参照可能
CREATE POLICY "Users can view own pomodoro task"
  ON pomodoro_current_task FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のタスクを作成可能
CREATE POLICY "Users can create own pomodoro task"
  ON pomodoro_current_task FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のタスクを更新可能
CREATE POLICY "Users can update own pomodoro task"
  ON pomodoro_current_task FOR UPDATE
  USING (auth.uid() = user_id);

-- ユーザーは自分のタスクを削除可能
CREATE POLICY "Users can delete own pomodoro task"
  ON pomodoro_current_task FOR DELETE
  USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX IF NOT EXISTS pomodoro_current_task_user_id_idx ON pomodoro_current_task(user_id);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_pomodoro_current_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pomodoro_current_task_timestamp
  BEFORE UPDATE ON pomodoro_current_task
  FOR EACH ROW
  EXECUTE FUNCTION update_pomodoro_current_task_updated_at();
