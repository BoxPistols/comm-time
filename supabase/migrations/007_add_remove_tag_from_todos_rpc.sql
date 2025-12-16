-- タグ削除時にTODOから一括でタグIDを削除するRPC関数
-- N+1問題を回避するため、1回のDB操作で全TODOを更新

CREATE OR REPLACE FUNCTION remove_tag_from_todos(tag_id_to_remove UUID, user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- タグを含むTODOからタグIDを削除
  UPDATE todos
  SET tag_ids = array_remove(tag_ids, tag_id_to_remove),
      updated_at = NOW()
  WHERE user_id = user_id_param
    AND tag_id_to_remove = ANY(tag_ids);

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN affected_rows;
END;
$$;

-- RLSを考慮したセキュリティポリシー
-- この関数はSECURITY DEFINERで実行されるため、
-- 関数内で明示的にuser_idをチェックしている
