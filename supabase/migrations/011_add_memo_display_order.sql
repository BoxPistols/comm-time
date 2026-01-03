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

-- レースコンディション防止のためユニーク制約を追加
-- DEFERRABLE INITIALLY DEFERREDでトランザクション終了時にチェック（reorder時の中間状態を許可）
ALTER TABLE memos
ADD CONSTRAINT memos_user_id_display_order_key
UNIQUE (user_id, display_order)
DEFERRABLE INITIALLY DEFERRED;

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

-- ソートパフォーマンス向上のためインデックスを追加
CREATE INDEX IF NOT EXISTS idx_memos_user_display_order
ON memos (user_id, display_order);

-- メモの順序を更新するRPC関数（unnestで単一UPDATEに最適化）
CREATE OR REPLACE FUNCTION reorder_memos(
  p_user_id UUID,
  p_memo_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- セキュリティチェック: 呼び出し元のユーザーIDと一致することを確認
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id does not match authenticated user';
  END IF;

  -- unnest + WITH ORDINALITYで効率的に一括更新
  UPDATE memos AS m
  SET display_order = s.new_order
  FROM unnest(p_memo_ids) WITH ORDINALITY AS s(memo_id, new_order)
  WHERE m.id = s.memo_id AND m.user_id = p_user_id;
END;
$$;
