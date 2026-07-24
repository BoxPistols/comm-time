-- タグ名のユニーク制約を追加
-- 同一ユーザーが同名のタグを重複作成できないようにする

-- 既存の重複タグを削除し、todos.tag_ids のオーファン参照も同時にクリーンアップ
-- （古いものを残し新しいものを削除）
WITH duplicates AS (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, LOWER(name) ORDER BY created_at ASC) AS rn
    FROM tags
  ) sub
  WHERE rn > 1
),
cleanup_todos AS (
  UPDATE todos
  SET tag_ids = ARRAY(
    SELECT unnest(tag_ids)
    EXCEPT
    SELECT id FROM duplicates
  )
  WHERE tag_ids IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM unnest(tag_ids) AS tid
      WHERE tid IN (SELECT id FROM duplicates)
    )
  RETURNING id
)
DELETE FROM tags
WHERE id IN (SELECT id FROM duplicates);

-- ユニークインデックスを追加（同一ユーザー内でタグ名は大文字小文字を区別しない）
CREATE UNIQUE INDEX unique_user_tag_name ON tags (user_id, LOWER(name));
