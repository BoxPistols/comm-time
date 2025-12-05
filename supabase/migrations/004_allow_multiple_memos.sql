-- memosテーブルのuser_idに対するユニーク制約を削除して、
-- 1ユーザーが複数のメモを持てるようにする
ALTER TABLE memos DROP CONSTRAINT IF EXISTS unique_user_memo;
