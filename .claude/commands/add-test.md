# Add Test Command

## Description
新しいテストを追加します。適切なテストレベル（ユニット/E2E/ビジュアル）を選択し、ベストプラクティスに従ってテストを作成します。

## Task

ユーザーが追加したい機能やバグ修正について聞き、適切なテストを提案・作成します。

## Steps

### 1. 要件のヒアリング

以下の情報を収集：
- テスト対象の機能は何か？
- どのような動作を検証したいか？
- どのテストレベルが適切か？（ユーザーが不明な場合は提案）

### 2. テストレベルの決定

**ユニット/統合テスト**が適切な場合：
- ロジックやユーティリティ関数のテスト
- 単一コンポーネントの動作確認
- データ変換・計算のテスト

**E2Eテスト**が適切な場合：
- ユーザーフローのテスト
- 複数のコンポーネント間の連携
- クロスブラウザの互換性確認

**ビジュアルテスト**が適切な場合：
- UI外観の確認
- レスポンシブデザインの検証
- スタイルの一貫性確認

### 3. テストファイルの場所を決定

```
__tests__/
├── [feature-name].test.tsx    # ユニット/統合テスト
│
e2e/
├── [flow-name].spec.ts        # E2Eテスト
└── visual-regression.spec.ts  # ビジュアルテスト（既存ファイルに追加）
```

### 4. テストコードの作成

#### ユニット/統合テストのテンプレート

```typescript
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '../components/component-name';

// モックの設定
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Feature Name', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should [具体的な動作]', async () => {
    // Arrange: 準備
    const user = userEvent.setup();
    render(<ComponentName />);

    // Act: 実行
    // ユーザーアクションを実行

    // Assert: 検証
    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
});
```

#### E2Eテストのテンプレート

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should [具体的な動作]', async ({ page }) => {
    // ページ操作
    await page.locator('selector').click();

    // 検証
    await expect(page.locator('text=Expected')).toBeVisible();
  });
});
```

#### ビジュアルテストのテンプレート

```typescript
test('should match screenshot of [state]', async ({ page }) => {
  await page.goto('/');

  // 状態をセットアップ

  await expect(page).toHaveScreenshot('[name].png', {
    fullPage: true,
    animations: 'disabled',
  });
});
```

### 5. テストの実行と検証

作成したテストを実行：

```bash
# ユニットテスト
npm test [test-file-name]

# E2Eテスト
npm run test:e2e -- [spec-file-name]

# ビジュアルテスト
npm run test:visual
```

### 6. コードレビューチェックリスト

- [ ] テスト名が明確か？
- [ ] AAAパターンに従っているか？
- [ ] 適切な待機戦略を使用しているか？
- [ ] テストが独立しているか？
- [ ] エッジケースを考慮しているか？
- [ ] 適切なセレクタを使用しているか？

### 7. ドキュメントの更新

必要に応じて以下を更新：
- TEST_GUIDE.md - 新しいテストの説明を追加
- コミットメッセージに何をテストしたか記載

## Related Documentation

- TESTING_BEST_PRACTICES.md - テストのベストプラクティス
- TEST_ARCHITECTURE.md - テストアーキテクチャ
- TEST_GUIDE.md - テスト実行ガイド
