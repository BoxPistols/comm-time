-- メモの重複を防ぐためのユニーク制約を追加
-- このSQLをSupabase SQL Editorで実行してください

-- まず、既存の重複メモを削除（最新のもの以外）
WITH duplicates AS (
  SELECT
    id,
    user_id,
    type,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM memos
)
DELETE FROM memos
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- user_id と type の組み合わせに対してユニーク制約を追加
ALTER TABLE memos
ADD CONSTRAINT unique_user_memo_type UNIQUE (user_id, type);

-- 確認用クエリ（実行すると各ユーザー・タイプごとのメモ数が表示されます）
SELECT user_id, type, COUNT(*) as count
FROM memos
GROUP BY user_id, type
ORDER BY count DESC;
