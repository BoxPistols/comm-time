# AI コードレビュー機能

GitHub ActionsによるAI自動コードレビュー機能のドキュメントです。

## 対応AIプロバイダー

| プロバイダー | モデル | 特徴 |
|-------------|--------|------|
| **Gemini** | gemini-1.5-flash-8b-001 | 無料枠あり（制限厳しい） |
| **GitHub Copilot** | GPT-4o | GitHub契約で利用可能、追加設定不要 |
| **Claude** | claude-sonnet-4-20250514 | 従量課金、高品質 |

## コマンド一覧

### Gemini（デフォルト）

| コマンド | 説明 |
|----------|------|
| `/review` | コードレビュー |
| `/summary` | PRサマリー生成 |
| `/fix` | 修正提案 |

### GitHub Copilot

| コマンド | 説明 |
|----------|------|
| `/copilot_review` | コードレビュー |
| `/copilot_summary` | PRサマリー生成 |
| `/copilot_fix` | 修正提案 |

### Claude

| コマンド | 説明 |
|----------|------|
| `/claude_review` | コードレビュー |
| `/claude_summary` | PRサマリー生成 |
| `/claude_fix` | 修正提案 |

## 使い方

1. PRのコメント欄に上記コマンドを入力
2. GitHub Actionsが自動で実行
3. AIからのレビュー結果がコメントとして投稿される

### 例

```
/review
```

```
/copilot_summary
```

## 自動サマリー機能

PR作成時に自動でサマリーを生成します。

### フォールバック順序

```
1. Gemini（最初に試行）
    ↓ 失敗時
2. GitHub Copilot
    ↓ 失敗時
3. Claude
```

いずれかが成功した時点でサマリーがコメントされます。

## セットアップ

### 必要なシークレット

Settings → Secrets and variables → Actions で設定

| シークレット名 | 取得先 | 必須 |
|---------------|--------|------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | オプション |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) | オプション |
| `GITHUB_TOKEN` | 自動生成 | 設定不要 |

### GitHub Copilotの利用条件

- GitHub Copilot契約が必要（Individual, Business, Enterprise）
- リポジトリでGitHub Modelsが有効であること
- `GITHUB_TOKEN`は自動で利用可能（追加設定不要）

## ワークフローファイル

```
.github/workflows/ai-review.yml
```

## 料金比較

| プロバイダー | 料金体系 |
|-------------|---------|
| Gemini 1.5 Flash 8B | 無料枠あり（1日のリクエスト数制限） |
| GitHub Copilot | GitHub契約に含まれる |
| Claude Sonnet 4 | ~$3/1M入力トークン, ~$15/1M出力トークン |

## トラブルシューティング

### 「サマリーを生成できませんでした」

1. APIキーが正しく設定されているか確認
2. クォータ制限に達していないか確認（Gemini）
3. GitHub ActionsのログでエラーメッセージをCheck

### Geminiでクォータエラーが出る

```
Quota exceeded for metric: generate_content_free_tier_requests
```

**対処法:**
- 24時間待ってクォータ回復を待つ
- `/copilot_summary`や`/claude_summary`を使用
- 有料プランにアップグレード

### GitHub Copilotが動作しない

- GitHub Copilot契約があるか確認
- リポジトリの設定でGitHub Modelsが有効か確認

## 参考リンク

- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [GitHub Copilot Code Review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [Claude Code Action](https://github.com/anthropics/claude-code-action)
- [Anthropic API Docs](https://docs.anthropic.com/)
