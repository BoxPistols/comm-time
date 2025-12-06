# 修正内容の概要

## 1. メモのCRUD問題 (Supabase)
**原因:**
- データベースの `memos` テーブルに `user_id` に対するユニーク制約（1ユーザー1メモ）が残っていました。
- これにより、2つ目以降のメモを作成しようとするとデータベースエラーが発生していました。
- また、古い `useSupabaseMemos` フックが「1ユーザー1メモ」を前提とした動作をしており、新しい複数メモ機能と競合していました。

**修正:**
- **マイグレーションファイルの作成:** `supabase/migrations/004_allow_multiple_memos.sql` を作成し、ユニーク制約を削除するSQLを用意しました。
- **競合フックの無効化:** `components/comm-time.tsx` 内で、古い `useSupabaseMemos` の使用を停止しました。これからは `useMultipleMemos` が一元管理します。

**必要な操作:**
- SupabaseのSQLエディタで `supabase/migrations/004_allow_multiple_memos.sql` の内容を実行してください。

## 2. メモの拡大表示問題
**原因:**
- メモの拡大表示が親要素（Swiperやコンテナ）の `overflow: hidden` やサイズ制限の影響を受けていました。

**修正:**
- **Portalの使用:** `components/markdown-memo.tsx` で `createPortal` を使用するように変更しました。
- これにより、全画面モード時はDOM階層のトップ（`document.body`）に直接レンダリングされるため、親要素の制約を受けずに画面いっぱいに表示されます（80vw/80vhではなく、より没入感のある90vw/90vh + 背景ぼかしに調整しました）。

## 確認事項
1. SupabaseでSQLを実行する。
2. アプリをリロードする。
3. 新しいメモが作成・保存できることを確認する。
4. メモの拡大ボタンを押して、画面全体にモーダル表示されることを確認する。
