# メモ重複エラーのクイックフィックス

## エラーメッセージ
```
Error fetching memo: PGRST116
"Results contain 3 rows, application/vnd.pgrst.object+json requires 1 row"
```

このエラーが表示された場合、データベースに重複したメモが存在しています。

## 🚀 すぐに修正する方法

### ステップ1: Supabase SQL Editorを開く

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. 左サイドバーの「SQL Editor」をクリック
4. 「New Query」をクリック

### ステップ2: マイグレーションSQLを実行

以下のSQLをコピーして、SQL Editorにペーストし、「Run」をクリック：

```sql
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
```

### ステップ3: 確認

1. SQL実行後、最後のクエリ結果で各ユーザー・タイプの`count`が`1`になっていることを確認
2. アプリをリロード（ブラウザで `Ctrl+R` または `Cmd+R`）
3. エラーが消えていることを確認

## ✅ 修正完了後

- ✅ エラーメッセージが表示されなくなります
- ✅ メモが正常に読み込まれます
- ✅ メモ入力時のエラーもなくなります
- ✅ 今後、重複メモは作成されません（ユニーク制約により）

## 📝 技術的な詳細

このマイグレーションは以下を実行します：

1. **重複削除**: 各ユーザー・タイプの組み合わせで最新のメモのみを残し、古いものを削除
2. **ユニーク制約追加**: `(user_id, type)` の組み合わせに対してUNIQUE制約を追加
3. **確認**: 各ユーザー・タイプごとに1つのメモのみ存在することを確認

## 🔧 トラブルシューティング

### エラー: "relation "memos" does not exist"
→ まず `001_init_schema.sql` を実行して、テーブルを作成してください

### エラー: "constraint "unique_user_memo_type" already exists"
→ すでにユニーク制約が追加されています。このエラーは無視して大丈夫です

### まだエラーが出る
→ ブラウザのキャッシュをクリアしてページをリロードしてください

## 📚 参考資料

- 詳細な修正内容: `FIXES_SUMMARY.md`
- Supabaseセットアップ: `SUPABASE_SETUP.md`
- マイグレーションファイル: `supabase/migrations/002_add_unique_constraints.sql`
