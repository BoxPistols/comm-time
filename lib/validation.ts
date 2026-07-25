// UUID v4 形式の検証 regex（Postgres uuid 型の事前バリデーション用）
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
