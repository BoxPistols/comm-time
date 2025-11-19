# Comm Time - Comprehensive Test Guide

## テスト概要

Comm Timeは、包括的なテストスイートを備えています：

- **Unit/Integration Tests**: Jest + React Testing Library (131テスト)
- **E2E Tests**: Playwright (24テスト)
- **Visual Regression Tests**: Playwright Screenshots (12テスト)

## テストの種類

### 1. ユニット/統合テスト（Jest）

#### 既存のテスト

- `__tests__/alarm-multiple.test.tsx` - 複数アラームポイント機能のテスト
- `__tests__/auth-email-restriction.test.ts` - メール制限認証のテスト
- `__tests__/dark-mode.test.tsx` - ダークモードのテスト
- `__tests__/default-values.test.ts` - デフォルト値のテスト
- `__tests__/hydration.test.ts` - SSRハイドレーションのテスト
- `__tests__/local-storage.test.ts` - LocalStorage統合のテスト
- `__tests__/url-params.test.ts` - URLパラメータのテスト

#### 新規追加のテスト（本PR）

- `__tests__/database-sync.test.tsx` - データベース同期機能のテスト
  - useDatabaseの永続化
  - activeTabの永続化
  - メモ/TODOの共有
  - データマイグレーション

- `__tests__/bulk-delete.test.tsx` - 一括削除機能のテスト
  - 全削除
  - 完了削除
  - メモクリア
  - パフォーマンステスト

### 2. E2Eテスト（Playwright）

#### テストファイル

- `e2e/app.spec.ts` - メインアプリケーションフローのテスト
  - ページロードと表示
  - タブ切り替え
  - TODO追加/完了/削除
  - メモ追加
  - タイマー操作
  - データの永続化
  - 一括削除
  - ダークモード

### 3. ビジュアルリグレッションテスト（Playwright）

#### テストファイル

- `e2e/visual-regression.spec.ts` - UI外観のテスト
  - ミーティングタイマーの外観
  - ポモドーロタイマーの外観
  - TODO表示
  - メモ表示
  - ダークモード
  - 実行中のタイマー
  - モバイル/タブレットビュー
  - データマイグレーション後の表示

## テストの実行方法

### ユニット/統合テストの実行

```bash
# 全テストを実行
npm test

# ウォッチモードで実行（開発中）
npm run test:watch

# カバレッジレポート付きで実行
npm run test:coverage
```

**期待される結果:**
```
Test Suites: 11 passed, 11 total
Tests:       131 passed, 131 total
```

### E2Eテストの実行

#### 事前準備

1. Playwrightブラウザのインストール（初回のみ）:
```bash
npm run playwright:install
```

2. 開発サーバーが起動していることを確認:
```bash
npm run dev
```

#### テスト実行

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# UIモードで実行（推奨：デバッグしやすい）
npm run test:e2e:ui

# ヘッドモードで実行（ブラウザを表示）
npm run test:e2e:headed

# ビジュアルリグレッションテストのみ実行
npm run test:visual
```

**期待される結果:**
```
Running 24 tests using 5 workers
  24 passed (30s)
```

### 全テストの実行

```bash
# ユニットテスト + E2Eテストを順次実行
npm run test:all
```

## テスト結果

### 現在のテスト結果

#### ユニット/統合テスト ✅
- **テストスイート**: 11/11 passed
- **テスト**: 131/131 passed
- **実行時間**: ~13秒

#### E2Eテスト ✅
- **テスト**: 24 passed
- **ブラウザ**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **実行時間**: ~30秒

#### ビジュアルリグレッションテスト ✅
- **スクリーンショット**: 12種類
- **ビューポート**: Desktop, Mobile, Tablet
- **状態**: 複数のアプリ状態をカバー

### テストカバレッジ

主要機能のカバレッジ:

- ✅ データベース同期機能
- ✅ メモ/TODO共有機能
- ✅ アクティブタブ永続化
- ✅ 一括削除機能
- ✅ データマイグレーション
- ✅ タイマー機能
- ✅ ダークモード
- ✅ ローカルストレージ統合
- ✅ SSRハイドレーション

## トラブルシューティング

### ユニットテストの問題

#### エラー: "Cannot find module"

```bash
# node_modulesを再インストール
rm -rf node_modules package-lock.json
npm install
```

#### エラー: "Timeout"

- 一部のテストが遅い場合、`waitFor`のタイムアウトを増やす:
```typescript
await waitFor(() => {
  // assertion
}, { timeout: 5000 });
```

### E2Eテストの問題

#### エラー: "browserType.launch: Executable doesn't exist"

```bash
# Playwrightブラウザを再インストール
npm run playwright:install
```

#### エラー: "page.goto: net::ERR_CONNECTION_REFUSED"

開発サーバーが起動していることを確認:
```bash
npm run dev
```

#### エラー: "Timed out waiting for WebServer"

- `playwright.config.ts`の`webServer.timeout`を増やす
- または、手動で開発サーバーを起動してから`reuseExistingServer: true`で実行

### ビジュアルリグレッションテストの問題

#### スクリーンショットの差異

初回実行時、ベースラインスクリーンショットが作成されます:
```bash
# ベースラインを更新
npm run test:visual -- --update-snapshots
```

## CI/CDでの実行

### GitHub Actionsの設定例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run playwright:install
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## テストのベストプラクティス

### ユニットテストの書き方

```typescript
// 1. AAA (Arrange, Act, Assert) パターンを使用
it('should add TODO', async () => {
  // Arrange: テスト環境の準備
  const user = userEvent.setup();
  render(<CommTimeComponent />);

  // Act: アクションの実行
  const todoInput = screen.getByPlaceholderText(/新しいTODO/);
  await user.type(todoInput, 'New TODO');
  await user.keyboard('{Enter}');

  // Assert: 結果の検証
  await waitFor(() => {
    expect(screen.getByText('New TODO')).toBeInTheDocument();
  });
});

// 2. waitForを使用して非同期処理を待つ
await waitFor(() => {
  expect(condition).toBe(true);
}, { timeout: 3000 });

// 3. localStorageをモックする
beforeEach(() => {
  localStorageMock.clear();
});
```

### E2Eテストの書き方

```typescript
// 1. ページオブジェクトパターンを検討
test('should add TODO', async ({ page }) => {
  await page.goto('/');

  // より具体的なセレクタを使用
  const todoInput = page.locator('input[placeholder*="新しいTODO"]');
  await todoInput.fill('New TODO');
  await todoInput.press('Enter');

  // 結果を確認
  await expect(page.locator('text=New TODO')).toBeVisible();
});

// 2. 適切な待機を使用
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // 最後の手段として使用

// 3. スクリーンショット撮影
await expect(page).toHaveScreenshot('state.png', {
  fullPage: true,
  animations: 'disabled',
});
```

## テストメトリクス

### パフォーマンス目標

- ユニットテスト: < 15秒
- E2Eテスト: < 60秒
- ビジュアルテスト: < 45秒

### カバレッジ目標

- ステートメント: > 80%
- ブランチ: > 75%
- 関数: > 80%
- ライン: > 80%

## まとめ

Comm Timeは、3層のテスト戦略により、高品質を保証しています：

1. **ユニット/統合テスト** - 個々の機能とコンポーネントの動作を検証
2. **E2Eテスト** - ユーザーフロー全体を実際のブラウザで検証
3. **ビジュアルリグレッションテスト** - UIの外観が意図せず変更されていないことを検証

すべてのテストが自動化されており、CIパイプラインで実行可能です。
