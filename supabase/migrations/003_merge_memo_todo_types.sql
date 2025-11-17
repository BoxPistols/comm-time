-- メモとTODOを共通化（typeカラムを削除）
-- このSQLをSupabase SQL Editorで実行してください

-- ======================================
-- 1. メモの統合
-- ======================================

-- 各ユーザーのmeeting/pomodoroメモを統合
-- 最新のメモ（updated_atが最も新しいもの）を保持
WITH latest_memos AS (
  SELECT DISTINCT ON (user_id)
    id,
    user_id,
    content,
    created_at,
    updated_at
  FROM memos
  ORDER BY user_id, updated_at DESC, created_at DESC
)
DELETE FROM memos
WHERE id NOT IN (SELECT id FROM latest_memos);

-- memosテーブルからtype制約を削除
ALTER TABLE memos DROP CONSTRAINT IF EXISTS memos_type_check;

-- memosテーブルのUNIQUE制約を削除
ALTER TABLE memos DROP CONSTRAINT IF EXISTS unique_user_memo_type;
ALTER TABLE memos DROP CONSTRAINT IF EXISTS memos_user_id_type_key;

-- typeカラムを削除
ALTER TABLE memos DROP COLUMN IF EXISTS type;

-- 新しいUNIQUE制約を追加（user_idのみ）
ALTER TABLE memos ADD CONSTRAINT unique_user_memo UNIQUE (user_id);

-- ======================================
-- 2. TODOの統合
-- ======================================

-- 各ユーザーのmeeting/pomodoroのTODOを統合
-- 重複するtext（内容）のTODOがある場合は、最新のものを保持
WITH ranked_todos AS (
  SELECT
    id,
    user_id,
    text,
    is_completed,
    due_date,
    due_time,
    alarm_point_id,
    order_index,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, text
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM todos
)
DELETE FROM todos
WHERE id IN (
  SELECT id FROM ranked_todos WHERE rn > 1
);

-- todosテーブルからtype制約を削除
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_type_check;

-- typeカラムを削除
ALTER TABLE todos DROP COLUMN IF EXISTS type;

-- ======================================
-- 3. インデックスの再作成
-- ======================================

-- 古いインデックスを削除
DROP INDEX IF EXISTS idx_memos_user_type;
DROP INDEX IF EXISTS idx_todos_user_type;
DROP INDEX IF EXISTS idx_todos_order;

-- 新しいインデックスを作成
CREATE INDEX IF NOT EXISTS idx_memos_user ON memos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_order ON todos(user_id, order_index);

-- ======================================
-- 4. 確認クエリ
-- ======================================

-- メモの確認（各ユーザー1つのみになっているはず）
SELECT
  user_id,
  COUNT(*) as memo_count,
  MAX(updated_at) as latest_update
FROM memos
GROUP BY user_id
ORDER BY memo_count DESC;

-- TODOの確認
SELECT
  user_id,
  COUNT(*) as todo_count,
  COUNT(DISTINCT text) as unique_texts
FROM todos
GROUP BY user_id
ORDER BY todo_count DESC;
