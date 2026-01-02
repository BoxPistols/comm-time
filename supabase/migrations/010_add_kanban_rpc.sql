-- 1. create_kanban_status RPC
CREATE OR REPLACE FUNCTION create_kanban_status(
  p_name TEXT,
  p_label TEXT,
  p_color TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  label TEXT,
  color TEXT,
  bg_class TEXT,
  text_class TEXT,
  border_class TEXT,
  active_class TEXT,
  sort_order INTEGER,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  new_sort_order INTEGER;
  color_config RECORD;
  new_status kanban_statuses;
BEGIN
  -- Get color configuration
  SELECT * FROM get_color_config_values(p_color) INTO color_config;

  -- Atomically get the next sort order
  SELECT COALESCE(MAX(ks.sort_order), -1) + 1
  INTO new_sort_order
  FROM kanban_statuses ks
  WHERE ks.user_id = auth.uid();

  -- Insert the new status
  INSERT INTO kanban_statuses (
    user_id, name, label, color, bg_class, text_class, border_class, active_class, sort_order, is_default
  )
  VALUES (
    auth.uid(), p_name, p_label, color_config.color, color_config.bg_class, color_config.text_class, color_config.border_class, color_config.active_class, new_sort_order, false
  )
  RETURNING * INTO new_status;
  
  RETURN QUERY SELECT * FROM kanban_statuses WHERE kanban_statuses.id = new_status.id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get color values (purely for use in other SQL functions)
CREATE OR REPLACE FUNCTION get_color_config_values(color_name TEXT)
RETURNS TABLE(color TEXT, bg_class TEXT, text_class TEXT, border_class TEXT, active_class TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.color, t.bg_class, t.text_class, t.border_class, t.active_class
  FROM (
    VALUES
      ('gray', 'bg-gray-500', 'text-gray-600', 'border-gray-300', 'bg-gray-500 text-white'),
      ('blue', 'bg-blue-500', 'text-blue-600', 'border-blue-300', 'bg-blue-500 text-white'),
      ('yellow', 'bg-yellow-500', 'text-yellow-600', 'border-yellow-300', 'bg-yellow-500 text-black'),
      ('green', 'bg-green-500', 'text-green-600', 'border-green-300', 'bg-green-500 text-white'),
      ('red', 'bg-red-500', 'text-red-600', 'border-red-300', 'bg-red-500 text-white'),
      ('orange', 'bg-orange-500', 'text-orange-600', 'border-orange-300', 'bg-orange-500 text-white'),
      ('purple', 'bg-purple-500', 'text-purple-600', 'border-purple-300', 'bg-purple-500 text-white'),
      ('pink', 'bg-pink-500', 'text-pink-600', 'border-pink-300', 'bg-pink-500 text-white'),
      ('indigo', 'bg-indigo-500', 'text-indigo-600', 'border-indigo-300', 'bg-indigo-500 text-white'),
      ('teal', 'bg-teal-500', 'text-teal-600', 'border-teal-300', 'bg-teal-500 text-white')
  ) AS t(color, bg_class, text_class, border_class, active_class)
  WHERE t.color = color_name;
END;
$$ LANGUAGE plpgsql;


-- 2. update_kanban_status RPC
CREATE OR REPLACE FUNCTION update_kanban_status(
  p_id UUID,
  p_name TEXT,
  p_label TEXT,
  p_color TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  label TEXT,
  color TEXT,
  bg_class TEXT,
  text_class TEXT,
  border_class TEXT,
  active_class TEXT,
  sort_order INTEGER,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  old_name TEXT;
  color_config RECORD;
  updated_status kanban_statuses;
BEGIN
  -- Get the old name for comparison
  SELECT ks.name INTO old_name FROM kanban_statuses ks WHERE ks.id = p_id AND ks.user_id = auth.uid();

  IF old_name IS NULL THEN
    RAISE EXCEPTION 'Status not found or you do not have permission to update it.';
  END IF;

  -- Get color configuration if color is being updated
  IF p_color IS NOT NULL THEN
    SELECT * FROM get_color_config_values(p_color) INTO color_config;
  END IF;

  -- Update status
  UPDATE kanban_statuses
  SET
    name = COALESCE(p_name, kanban_statuses.name),
    label = COALESCE(p_label, kanban_statuses.label),
    color = COALESCE(color_config.color, kanban_statuses.color),
    bg_class = COALESCE(color_config.bg_class, kanban_statuses.bg_class),
    text_class = COALESCE(color_config.text_class, kanban_statuses.text_class),
    border_class = COALESCE(color_config.border_class, kanban_statuses.border_class),
    active_class = COALESCE(color_config.active_class, kanban_statuses.active_class)
  WHERE kanban_statuses.id = p_id AND kanban_statuses.user_id = auth.uid()
  RETURNING * INTO updated_status;

  -- If name changed, update todos table
  IF p_name IS NOT NULL AND p_name != old_name THEN
    UPDATE todos
    SET kanban_status = p_name
    WHERE todos.user_id = auth.uid() AND todos.kanban_status = old_name;
  END IF;
  
  RETURN QUERY SELECT * FROM kanban_statuses WHERE kanban_statuses.id = updated_status.id;
END;
$$ LANGUAGE plpgsql;

-- 3. delete_kanban_status RPC
CREATE OR REPLACE FUNCTION delete_kanban_status(p_id UUID)
RETURNS VOID AS $$
DECLARE
  status_to_delete RECORD;
  default_status_name TEXT;
BEGIN
  -- Find the status to delete
  SELECT * INTO status_to_delete FROM kanban_statuses WHERE id = p_id AND user_id = auth.uid();

  IF status_to_delete IS NULL THEN
    RAISE EXCEPTION 'Status not found or you do not have permission to delete it.';
  END IF;

  -- Prevent deletion of default status
  IF status_to_delete.is_default THEN
    RAISE EXCEPTION 'Cannot delete the default status.';
  END IF;

  -- Find the user's default status
  SELECT name INTO default_status_name FROM kanban_statuses WHERE user_id = auth.uid() AND is_default = true;
  IF default_status_name IS NULL THEN
    RAISE EXCEPTION 'Default status not found.';
  END IF;
  
  -- Update related todos to the default status
  UPDATE todos
  SET kanban_status = default_status_name
  WHERE user_id = auth.uid() AND kanban_status = status_to_delete.name;

  -- Delete the status
  DELETE FROM kanban_statuses WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;


-- 4. reorder_kanban_statuses RPC
CREATE OR REPLACE FUNCTION reorder_kanban_statuses(p_status_ids UUID[])
RETURNS VOID AS $$
BEGIN
  FOR i IN 1..array_length(p_status_ids, 1) LOOP
    UPDATE kanban_statuses
    SET sort_order = i - 1
    WHERE id = p_status_ids[i] AND user_id = auth.uid();
  END LOOP;
END;
$$ LANGUAGE plpgsql;
