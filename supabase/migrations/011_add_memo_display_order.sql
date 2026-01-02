-- 011_add_memo_display_order.sql
-- メモの表示順序を保存するためのカラムを追加

-- display_orderカラムを追加（NULLの場合はcreated_atでソート）
ALTER TABLE memos
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- 既存のメモにdisplay_orderを設定（created_atの順序で）
WITH ordered_memos AS (
  SELECT id, user_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM memos
)
UPDATE memos
SET display_order = ordered_memos.rn
FROM ordered_memos
WHERE memos.id = ordered_memos.id;

-- display_orderにNOT NULL制約を追加
ALTER TABLE memos
ALTER COLUMN display_order SET NOT NULL;

-- display_orderにデフォルト値を設定（新規作成時に自動で最大値+1を設定するためのトリガー）
CREATE OR REPLACE FUNCTION set_memo_display_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_order IS NULL THEN
    SELECT COALESCE(MAX(display_order), 0) + 1 INTO NEW.display_order
    FROM memos
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_memo_display_order_trigger ON memos;
CREATE TRIGGER set_memo_display_order_trigger
  BEFORE INSERT ON memos
  FOR EACH ROW
  EXECUTE FUNCTION set_memo_display_order();

-- メモの順序を更新するRPC関数
CREATE OR REPLACE FUNCTION reorder_memos(
  p_user_id UUID,
  p_memo_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i INTEGER;
BEGIN
  -- 各メモのdisplay_orderを更新
  FOR i IN 1..array_length(p_memo_ids, 1) LOOP
    UPDATE memos
    SET display_order = i
    WHERE id = p_memo_ids[i] AND user_id = p_user_id;
  END LOOP;
END;
$$;
