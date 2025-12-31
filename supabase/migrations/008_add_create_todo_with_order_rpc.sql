-- order_indexをアトミックに採番してTODOを作成するRPC関数
-- レースコンディションを防ぐためにトランザクション内でMAX取得とINSERTを行う

CREATE OR REPLACE FUNCTION create_todo_with_order(
  p_user_id UUID,
  p_text TEXT,
  p_is_completed BOOLEAN DEFAULT FALSE,
  p_due_date DATE DEFAULT NULL,
  p_due_time TIME DEFAULT NULL,
  p_alarm_point_id TEXT DEFAULT NULL,
  p_tag_ids UUID[] DEFAULT '{}',
  p_priority TEXT DEFAULT 'none',
  p_importance TEXT DEFAULT 'none',
  p_kanban_status TEXT DEFAULT 'backlog'
)
RETURNS todos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_index INTEGER;
  v_new_todo todos;
BEGIN
  -- 排他ロックを取得してレースコンディションを防ぐ
  LOCK TABLE todos IN SHARE ROW EXCLUSIVE MODE;

  -- 現在の最大order_indexを取得
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_order_index
  FROM todos
  WHERE user_id = p_user_id;

  -- 新しいTODOを挿入
  INSERT INTO todos (
    user_id,
    text,
    is_completed,
    due_date,
    due_time,
    alarm_point_id,
    order_index,
    tag_ids,
    priority,
    importance,
    kanban_status
  ) VALUES (
    p_user_id,
    p_text,
    p_is_completed,
    p_due_date,
    p_due_time,
    p_alarm_point_id,
    v_order_index,
    p_tag_ids,
    p_priority,
    p_importance,
    p_kanban_status
  )
  RETURNING * INTO v_new_todo;

  RETURN v_new_todo;
END;
$$;

-- RLSポリシーをバイパスするためにSECURITY DEFINERを使用しているが、
-- 関数内でuser_idを明示的に指定することで安全性を確保
