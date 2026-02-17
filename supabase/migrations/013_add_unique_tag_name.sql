-- タグ名のユニーク制約を追加
-- 同一ユーザーが同名のタグを重複作成できないようにする

-- 既存の重複タグを確認・削除（古いものを残し新しいものを削除）
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, LOWER(name) ORDER BY created_at ASC) AS rn
  FROM tags
)
DELETE FROM tags
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ユニーク制約を追加（同一ユーザー内でタグ名は大文字小文字を区別しない）
ALTER TABLE tags
ADD CONSTRAINT unique_user_tag_name UNIQUE (user_id, name);
