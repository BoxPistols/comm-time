# Debug Test Command

## Description
失敗したテストをデバッグし、原因を特定して修正方法を提案します。

## Task

失敗しているテストを分析し、以下を提供：
1. 失敗の原因
2. 修正方法
3. 予防策

## Steps

### 1. 失敗したテストの特定

```bash
# すべてのテストを実行して失敗を確認
npm test

# または特定のテストのみ
npm test -- [test-name]
```

失敗したテストのエラーメッセージを収集。

### 2. エラーの分類

#### タイムアウトエラー

```
Error: Timeout - Async callback was not invoked within timeout
```

**原因:**
- 非同期処理の完了を待っていない
- 要素が表示されるまでの時間が長すぎる

**修正方法:**
```typescript
// ✅ Good: waitForを使用
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, { timeout: 5000 }); // タイムアウトを延長

// ✅ Good: Playwrightで明示的な待機
await page.waitForLoadState('networkidle');
```

#### 要素が見つからないエラー

```
TestingLibraryElementError: Unable to find an element with the text: Expected Text
```

**原因:**
- セレクタが間違っている
- 要素が実際に表示されていない
- タイミング問題

**デバッグ方法:**
```typescript
// DOMツリーを出力
import { debug } from '@testing-library/react';
debug();

// または特定の要素
debug(screen.getByRole('button'));

// Playwrightでスクリーンショット
await page.screenshot({ path: 'debug.png' });
```

**修正方法:**
```typescript
// ✅ 正しいセレクタを使用
screen.getByRole('button', { name: /submit/i });

// ✅ 条件付きで検証
if (screen.queryByText('Optional')) {
  // オプショナル要素の処理
}
```

#### Act Warning

```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**原因:**
- Reactの状態更新がactでラップされていない

**修正方法:**
```typescript
// ✅ Good: actでラップ
await act(async () => {
  await user.click(button);
});

// ✅ Good: waitForで待機
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

#### フレーキーテスト（時々失敗する）

**原因:**
- レースコンディション
- 非決定論的な動作（Math.random()など）
- 外部依存（ネットワーク、時間）

**修正方法:**
```typescript
// ✅ ランダム性を排除
const mockMath = Object.create(global.Math);
mockMath.random = () => 0.5;
global.Math = mockMath;

// ✅ 日付を固定
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-01'));

// ✅ 外部依存をモック
jest.mock('@/lib/api');
```

### 3. インタラクティブデバッグ

#### Jest ウォッチモード

```bash
npm run test:watch

# 特定のテストのみ
npm run test:watch -- database-sync
```

**使い方:**
- `p` - ファイル名でフィルター
- `t` - テスト名でフィルター
- `a` - すべてのテストを実行
- `q` - 終了

#### Playwright UIモード

```bash
npm run test:e2e:ui
```

**機能:**
- ステップバイステップ実行
- タイムトラベルデバッグ
- ネットワーク監視
- スクリーンショット表示

#### Playwright デバッグモード

```bash
PWDEBUG=1 npm run test:e2e
```

**機能:**
- ブラウザが自動的に開く
- ステップ実行
- セレクタの検証

### 4. 一般的な修正パターン

#### パターン1: 非同期待機の追加

```typescript
// ❌ Before
const button = screen.getByRole('button');
expect(button).toBeInTheDocument();

// ✅ After
await waitFor(() => {
  const button = screen.getByRole('button');
  expect(button).toBeInTheDocument();
});
```

#### パターン2: セレクタの改善

```typescript
// ❌ Before
page.locator('.submit-btn');

// ✅ After
page.getByRole('button', { name: /submit/i });
```

#### パターン3: モックの追加

```typescript
// ❌ Before
// 実際のAPIを呼び出している

// ✅ After
jest.mock('@/lib/api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: [] })),
}));
```

#### パターン4: テストの分離

```typescript
// ❌ Before
it('should do A and B and C', () => {
  // 複数の概念をテスト
});

// ✅ After
it('should do A', () => { /* ... */ });
it('should do B', () => { /* ... */ });
it('should do C', () => { /* ... */ });
```

### 5. 修正の検証

```bash
# 修正したテストを実行
npm test -- [test-name]

# すべてのテストを実行して回帰がないか確認
npm test

# E2Eテストも確認
npm run test:e2e
```

### 6. 予防策

#### CI/CDで早期発見

```yaml
# .github/workflows/test.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
      - run: npm run test:e2e
```

#### テストカバレッジの監視

```bash
npm run test:coverage

# カバレッジが低下していないか確認
```

#### コードレビュー

- テストコードもレビュー対象
- ベストプラクティスに従っているか確認
- フレーキーなテストは早期に修正

## Common Issues and Solutions

### Issue 1: "Cannot find module"

**Solution:**
```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install
```

### Issue 2: "Port already in use" (E2E)

**Solution:**
```bash
# ポートを使用しているプロセスを終了
lsof -ti:3000 | xargs kill -9

# または別のポートを使用
PORT=3001 npm run dev
```

### Issue 3: "Playwright browser not found"

**Solution:**
```bash
# ブラウザを再インストール
npm run playwright:install
```

## Related Documentation

- TESTING_BEST_PRACTICES.md - ベストプラクティス
- TEST_ARCHITECTURE.md - アーキテクチャ詳細
- TEST_GUIDE.md - トラブルシューティング
