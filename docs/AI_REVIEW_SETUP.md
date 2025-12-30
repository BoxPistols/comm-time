# AI Code Review セットアップガイド

## 概要

このリポジトリでは、Gemini 1.5 Flash を使用したAIコードレビューシステムを提供しています。

## 利用可能なコマンド

PR の `Add a comment` 欄で以下のコマンドを入力：

| コマンド | 機能 |
|----------|------|
| `/review` | コード差分をAIがレビュー |
| `/summary` | PR の変更内容をサマリー化 |
| `/fix` | 具体的な修正提案を生成 |

## セットアップ手順

### 1. Gemini API キーの取得

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. 「Get API key」をクリック
3. API キーを生成・コピー

### 2. GitHub Secrets に登録

1. リポジトリの `Settings` → `Secrets and variables` → `Actions`
2. `New repository secret` をクリック
3. 以下を設定:
   - Name: `GEMINI_API_KEY`
   - Secret: 取得した API キー

## コスト

- **Gemini 1.5 Flash**: 無料枠あり（1分あたり15リクエスト）
- 有料プランでも非常に安価（$0.075 / 1M tokens）

## GitHub Copilot との併用（推奨）

| 用途 | ツール |
|------|--------|
| エディタでのコード補完 | GitHub Copilot |
| PR レビュー・サマリー | Gemini (このシステム) |

## トラブルシューティング

### レビューが生成されない

1. `GEMINI_API_KEY` が正しく設定されているか確認
2. Actions タブでワークフローのログを確認
3. API キーの無料枠を超えていないか確認

### 差分が大きすぎる場合

30,000文字を超える差分は自動的にトリミングされます。
大きな PR は分割することを推奨します。
