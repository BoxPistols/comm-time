# Testing Best Practices - Comm Time

## 目次

1. [テスト設計原則](#テスト設計原則)
2. [ユニットテストのベストプラクティス](#ユニットテストのベストプラクティス)
3. [E2Eテストのベストプラクティス](#e2eテストのベストプラクティス)
4. [ビジュアルテストのベストプラクティス](#ビジュアルテストのベストプラクティス)
5. [アンチパターン](#アンチパターン)
6. [パフォーマンス最適化](#パフォーマンス最適化)
7. [デバッグテクニック](#デバッグテクニック)

---

## テスト設計原則

### 1. FIRST 原則

- **F**ast - 高速に実行できる
- **I**ndependent - 他のテストに依存しない
- **R**epeatable - どの環境でも同じ結果
- **S**elf-validating - 成功/失敗が明確
- **T**imely - 実装と同時にテストを書く

### 2. 適切なテストレベル

```
費用・時間 ↑                     E2E Tests (少)
          |                  ┌──────────────┐
          |               ┌──────────────────────┐
          |            ┌──────────────────────────────┐
          |         Unit/Integration Tests (多)
          └────────────────────────────────────────────→ カバレッジ
```

**ガイドライン:**
- **ユニット**: ビジネスロジック、ユーティリティ関数
- **統合**: コンポーネント間の連携
- **E2E**: クリティカルなユーザーフロー
- **ビジュアル**: 重要なUI状態

### 3. テストの可読性

```typescript
// ❌ Bad: 何をテストしているか不明
it('test 1', async () => {
  const x = render(<App />);
  const y = screen.getByRole('button');
  await user.click(y);
  expect(screen.getByText('z')).toBeInTheDocument();
});

// ✅ Good: テスト内容が明確
it('should display success message after clicking submit button', async () => {
  const user = userEvent.setup();
  render(<App />);

  const submitButton = screen.getByRole('button', { name: /submit/i });
  await user.click(submitButton);

  expect(screen.getByText('Success!')).toBeInTheDocument();
});
```

---

## ユニットテストのベストプラクティス

### 1. AAA (Arrange-Act-Assert) パターン

```typescript
it('should add TODO to the list', async () => {
  // Arrange: テスト環境の準備
  const user = userEvent.setup();
  render(<CommTimeComponent />);
  const todoInput = screen.getByPlaceholderText(/新しいTODO/);

  // Act: アクションの実行
  await user.type(todoInput, 'Buy groceries');
  await user.keyboard('{Enter}');

  // Assert: 結果の検証
  await waitFor(() => {
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });
});
```

### 2. 非同期処理の適切なハンドリング

```typescript
// ✅ Good: waitForを使用
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, { timeout: 3000 });

// ✅ Good: actでラップ
await act(async () => {
  await user.click(button);
});

// ❌ Bad: 固定のsleep
await new Promise(resolve => setTimeout(resolve, 1000));
```

### 3. テストの独立性を保つ

```typescript
// ✅ Good: 各テストで環境をリセット
beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

// ❌ Bad: テスト間で状態を共有
let sharedTodos = [];
it('test 1', () => {
  sharedTodos.push('TODO 1');
});
it('test 2', () => {
  // sharedTodosに依存（テストの順序に依存）
  expect(sharedTodos).toHaveLength(1);
});
```

### 4. モックの適切な使用

```typescript
// ✅ Good: 外部依存をモック
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

// ✅ Good: 最小限のモック
const confirmMock = jest.fn(() => true);
global.confirm = confirmMock;

// ❌ Bad: 過度なモック（実装詳細）
jest.mock('../components/comm-time', () => ({
  CommTimeComponent: () => <div>Mocked</div>,
}));
```

### 5. エッジケースとエラーケースのテスト

```typescript
// ✅ Good: 境界値テスト
it('should handle 0 TODOs', async () => {
  render(<CommTimeComponent />);
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
});

it('should handle 100 TODOs', async () => {
  const largeTodoList = Array.from({ length: 100 }, (_, i) => ({
    id: `${i}`,
    text: `TODO ${i}`,
    isCompleted: false,
  }));
  // テスト...
});

// ✅ Good: エラーケース
it('should show error when API fails', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // エラーを発生させる
  // エラーメッセージを確認
});
```

### 6. セレクタの優先順位

React Testing Libraryの推奨順序：

```typescript
// 1. ✅ Best: アクセシビリティロール
screen.getByRole('button', { name: /submit/i });

// 2. ✅ Good: ラベルテキスト
screen.getByLabelText('Email address');

// 3. ✅ Good: プレースホルダー
screen.getByPlaceholderText('Enter email');

// 4. ⚠️ OK: テキストコンテンツ
screen.getByText('Submit');

// 5. ❌ Avoid: テストID（最終手段）
screen.getByTestId('submit-button');

// 6. ❌ Bad: 実装詳細
container.querySelector('.submit-btn');
```

---

## E2Eテストのベストプラクティス

### 1. Page Object Model (簡易版)

```typescript
// ✅ Good: セレクタを再利用
class TodoPage {
  constructor(private page: Page) {}

  async addTodo(text: string) {
    const input = this.page.locator('input[placeholder*="新しいTODO"]');
    await input.fill(text);
    await input.press('Enter');
  }

  async getTodoCount() {
    return await this.page.locator('[data-testid="todo-item"]').count();
  }
}

test('should add TODO', async ({ page }) => {
  const todoPage = new TodoPage(page);
  await page.goto('/');
  await todoPage.addTodo('New Task');
  expect(await todoPage.getTodoCount()).toBe(1);
});
```

### 2. 適切な待機戦略

```typescript
// ✅ Good: 条件を待つ
await expect(page.locator('text=Loaded')).toBeVisible();

// ✅ Good: ネットワーク完了を待つ
await page.waitForLoadState('networkidle');

// ⚠️ OK: 特定の要素を待つ
await page.waitForSelector('[data-loaded="true"]');

// ❌ Bad: 固定時間待機（最終手段のみ）
await page.waitForTimeout(3000);
```

### 3. ダイアログとポップアップのハンドリング

```typescript
// ✅ Good: ダイアログリスナーを設定
test('should handle confirmation', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());

  await page.locator('button[title="すべて削除"]').click();

  // ダイアログが処理された後の検証
  await expect(page.locator('text=TODO 1')).not.toBeVisible();
});

// ✅ Good: 新しいページを処理
const [newPage] = await Promise.all([
  context.waitForEvent('page'),
  page.click('a[target="_blank"]')
]);
await newPage.waitForLoadState();
```

### 4. データの分離

```typescript
// ✅ Good: 各テストで環境をクリーン
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

// ✅ Good: テスト用のデータベース
test.use({
  storageState: 'tests/test-user.json',
});
```

### 5. フレーキーテストの回避

```typescript
// ✅ Good: 明示的な待機
await expect(page.locator('text=Loaded')).toBeVisible();

// ✅ Good: リトライ設定
test.describe.configure({ retries: 2 });

// ❌ Bad: レースコンディション
await page.click('button');
expect(await page.textContent('div')).toBe('Updated');
// ↑ clickとtextContentの間にタイミング問題
```

---

## ビジュアルテストのベストプラクティス

### 1. 動的コンテンツのマスキング

```typescript
// ✅ Good: 変動する要素をマスク
await expect(page).toHaveScreenshot('timer.png', {
  mask: [
    page.locator('text=/\\d{2}:\\d{2}:\\d{2}/'), // タイマー
    page.locator('[data-dynamic="timestamp"]'),  // タイムスタンプ
  ],
});

// ❌ Bad: マスクなしで動的コンテンツをキャプチャ
// テストが不安定になる
```

### 2. アニメーションの無効化

```typescript
// ✅ Good: アニメーションを無効化
await expect(page).toHaveScreenshot('page.png', {
  animations: 'disabled',
});

// CSS アニメーションを無効化
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `,
});
```

### 3. ビューポート設定

```typescript
// ✅ Good: 明示的なビューポート
test('mobile view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page).toHaveScreenshot('mobile.png');
});

// ✅ Good: デバイスエミュレーション
test.use({ ...devices['iPhone 12'] });
```

### 4. ベースライン管理

```bash
# ✅ Good: ベースラインを明示的に更新
npm run test:visual -- --update-snapshots

# ✅ Good: 特定のテストのみ更新
npm run test:visual -- --update-snapshots meeting-timer

# ❌ Bad: 自動的にすべて更新
# レビューなしで変更を受け入れる
```

---

## アンチパターン

### 1. テストの実装詳細への依存

```typescript
// ❌ Bad: 内部状態に依存
const { container } = render(<CommTimeComponent />);
expect(container.querySelector('.internal-class')).toBeTruthy();

// ✅ Good: ユーザーの視点でテスト
expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
```

### 2. 複数の概念を1つのテストで検証

```typescript
// ❌ Bad: 1つのテストで複数のことをテスト
it('should handle everything', async () => {
  // TODO追加
  // TODO完了
  // TODO削除
  // メモ追加
  // タイマー開始
  // ...10個の機能をテスト
});

// ✅ Good: 1テスト1概念
it('should add TODO', async () => { /* ... */ });
it('should complete TODO', async () => { /* ... */ });
it('should delete TODO', async () => { /* ... */ });
```

### 3. テスト間での状態共有

```typescript
// ❌ Bad: テスト間で状態を共有
let globalTodos = [];

it('test 1', () => {
  globalTodos.push('TODO 1');
});

it('test 2', () => {
  expect(globalTodos).toHaveLength(1); // test 1に依存
});

// ✅ Good: 各テストが独立
it('test 1', () => {
  const todos = ['TODO 1'];
  expect(todos).toHaveLength(1);
});

it('test 2', () => {
  const todos = []; // 独自のデータ
  expect(todos).toHaveLength(0);
});
```

### 4. 過度なモック

```typescript
// ❌ Bad: すべてをモック（統合テストの価値がない）
jest.mock('./ComponentA');
jest.mock('./ComponentB');
jest.mock('./ComponentC');
jest.mock('./utils');
jest.mock('./hooks');

// ✅ Good: 外部依存のみモック
jest.mock('@/lib/supabase');
// 実際のコンポーネントとロジックをテスト
```

### 5. 脆弱なセレクタ

```typescript
// ❌ Bad: CSSクラスに依存
page.locator('.btn-primary.submit-btn.large');

// ❌ Bad: 複雑なXPath
page.locator('//div[@class="container"]/div[2]/button[1]');

// ✅ Good: セマンティックなセレクタ
page.locator('button[aria-label="Submit form"]');
page.getByRole('button', { name: /submit/i });
```

---

## パフォーマンス最適化

### 1. 並列実行

```typescript
// Jest
export default {
  maxWorkers: '50%',
};

// Playwright
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
});
```

### 2. テストの選択的実行

```bash
# 変更されたファイルのみ
npm test -- --onlyChanged

# 特定のパターン
npm test -- --testPathPattern=database-sync

# 特定のブラウザのみ
npm run test:e2e -- --project=chromium
```

### 3. キャッシュの活用

```bash
# Jestキャッシュ
npm test -- --cache

# Playwrightブラウザのキャッシュを保持
~/.cache/ms-playwright/
```

### 4. 不要な再レンダリングの回避

```typescript
// ✅ Good: 1回のrenderで複数の検証
const { rerender } = render(<Component prop="initial" />);
expect(screen.getByText('initial')).toBeInTheDocument();

rerender(<Component prop="updated" />);
expect(screen.getByText('updated')).toBeInTheDocument();

// ❌ Bad: 各検証で再レンダリング
render(<Component prop="initial" />);
expect(screen.getByText('initial')).toBeInTheDocument();

render(<Component prop="updated" />);
expect(screen.getByText('updated')).toBeInTheDocument();
```

---

## デバッグテクニック

### 1. スクリーンショットとビデオ

```typescript
// Playwright: 失敗時に自動保存
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
}

// 手動でスクリーンショット
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### 2. DOM状態の出力

```typescript
// React Testing Library
import { screen, debug } from '@testing-library/react';

// DOMツリーを出力
debug();

// 特定の要素を出力
const element = screen.getByRole('button');
debug(element);

// Playwright
console.log(await page.content()); // HTML全体
console.log(await page.locator('div').innerHTML()); // 特定要素
```

### 3. インタラクティブデバッグ

```bash
# Playwright UIモード
npm run test:e2e:ui

# Playwright デバッグモード
PWDEBUG=1 npm run test:e2e

# Jest ウォッチモード
npm run test:watch
```

### 4. ログ出力

```typescript
// ✅ Good: デバッグ情報を出力
test('debug example', async ({ page }) => {
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  const element = page.locator('button');
  console.log('Button count:', await element.count());
  console.log('Button text:', await element.textContent());
});
```

### 5. ブレークポイント

```typescript
// ✅ Good: debuggerを使用
test('with breakpoint', async () => {
  render(<CommTimeComponent />);

  debugger; // ここで停止

  expect(screen.getByText('Title')).toBeInTheDocument();
});
```

---

## チェックリスト

### 新しいテストを書く前に

- [ ] どのレベルのテストが適切か考える
- [ ] 似たようなテストが既に存在しないか確認
- [ ] テストの目的を明確にする

### テストを書いている時

- [ ] AAAパターンに従う
- [ ] 1テスト1概念
- [ ] わかりやすい変数名・関数名
- [ ] 適切な待機戦略を使用
- [ ] エッジケースを考慮

### テストを書いた後

- [ ] テストが失敗する理由を確認（実装を壊してテスト）
- [ ] テストの独立性を確認
- [ ] 実行時間をチェック（遅すぎないか）
- [ ] CIで実行できるか確認
- [ ] ドキュメントを更新

---

## まとめ

### 重要なポイント

1. **適切なテストレベル** - ユニット > E2E > ビジュアル
2. **テストの独立性** - 他のテストに依存しない
3. **可読性** - 何をテストしているか明確
4. **保守性** - 実装変更に強い
5. **パフォーマンス** - 高速なフィードバック

### 避けるべきこと

1. **実装詳細へのテスト** - ユーザー視点でテスト
2. **過度なモック** - 実際の統合をテスト
3. **フレーキーテスト** - 安定性を重視
4. **遅いテスト** - 並列化と最適化
5. **テスト間の依存** - 完全な独立性

### テスト文化

- **レビュー** - テストコードもレビュー対象
- **継続的改善** - フレーキーなテストは修正
- **ドキュメント** - テスト戦略を文書化
- **共有** - ベストプラクティスをチームで共有

高品質なテストは、高品質なコードの基盤です！
