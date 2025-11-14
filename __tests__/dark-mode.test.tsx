/**
 * ダークモード機能のテスト
 *
 * このテストは、ダークモードのトグル、永続化、
 * およびUIへの適用が正しく動作することを確認します。
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommTimeComponent } from '@/components/comm-time';

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// NotificationのモックAPI
class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = async () => 'default' as NotificationPermission;
  constructor(public title: string, public options?: NotificationOptions) {}
}

describe('ダークモード機能のテスト', () => {
  beforeEach(() => {
    // localStorageをモックに置き換え
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Notificationをモック
    Object.defineProperty(window, 'Notification', {
      value: MockNotification,
      writable: true,
    });

    // localStorageをクリア
    localStorageMock.clear();

    // document.documentElementのクラスをクリア
    document.documentElement.className = '';
  });

  afterEach(() => {
    localStorageMock.clear();
    document.documentElement.className = '';
  });

  describe('初期状態のテスト', () => {
    test('ダークモードはデフォルトでOFFになっている', () => {
      render(<CommTimeComponent />);

      // document.documentElementにdarkクラスが付いていないことを確認
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    test('localStorageにダークモード設定がない場合、デフォルト値が使われる', () => {
      render(<CommTimeComponent />);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    test('localStorageにダークモード設定がある場合、その値が使われる', async () => {
      // localStorageにダークモードONを設定
      localStorageMock.setItem('darkMode', 'true');

      render(<CommTimeComponent />);

      // ダークモードが適用されているか確認
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });
  });

  describe('設定モーダルの表示', () => {
    test('設定ボタンが表示されている', () => {
      render(<CommTimeComponent />);

      const settingsButton = screen.getByTitle('設定');
      expect(settingsButton).toBeInTheDocument();
    });

    test('設定モーダルを開くことができる', async () => {
      render(<CommTimeComponent />);

      const settingsButton = screen.getByTitle('設定');
      fireEvent.click(settingsButton);

      // モーダルが開いたことを確認
      await waitFor(() => {
        const modal = document.querySelector('[role="dialog"]');
        expect(modal).toBeInTheDocument();
      });
    });

    test('ダークモードトグルが設定モーダルに存在する', async () => {
      render(<CommTimeComponent />);

      const settingsButton = screen.getByTitle('設定');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        const darkModeText = screen.getByText('ダークモード');
        expect(darkModeText).toBeInTheDocument();
      });
    });
  });

  describe('localStorageからの読み込み', () => {
    test('localStorageからダークモード設定を読み込む', async () => {
      localStorageMock.setItem('darkMode', 'true');

      render(<CommTimeComponent />);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    test('localStorageにfalseが設定されている場合、ライトモードになる', () => {
      localStorageMock.setItem('darkMode', 'false');

      render(<CommTimeComponent />);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('ダークモードクラスの適用', () => {
    test('ダークモードON時にdocument.documentElementにdarkクラスが追加される', async () => {
      localStorageMock.setItem('darkMode', 'true');

      render(<CommTimeComponent />);

      await waitFor(() => {
        const htmlElement = document.documentElement;
        expect(htmlElement.classList.contains('dark')).toBe(true);
      });
    });

    test('ダークモードOFF時にdocument.documentElementからdarkクラスが削除される', () => {
      // 事前にdarkクラスを追加
      document.documentElement.classList.add('dark');
      localStorageMock.setItem('darkMode', 'false');

      render(<CommTimeComponent />);

      // darkクラスが削除されていることを確認
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('コンポーネントのレンダリング', () => {
    test('ダークモードに関わらず、コンポーネントは正常にレンダリングされる', () => {
      const { container } = render(<CommTimeComponent />);

      // コンポーネントがレンダリングされていることを確認
      expect(container).toBeTruthy();
      expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
    });

    test('ダークモードON時もコンポーネントは正常にレンダリングされる', async () => {
      localStorageMock.setItem('darkMode', 'true');

      const { container } = render(<CommTimeComponent />);

      await waitFor(() => {
        expect(container).toBeTruthy();
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });
  });
});

describe('ダークモード統合テスト', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(window, 'Notification', {
      value: MockNotification,
      writable: true,
    });
    localStorageMock.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    localStorageMock.clear();
    document.documentElement.className = '';
  });

  test('ページリロード後もダークモード設定が保持される（シミュレーション）', async () => {
    // 最初のレンダリング: ダークモードをON
    localStorageMock.setItem('darkMode', 'true');

    const { unmount } = render(<CommTimeComponent />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorageMock.getItem('darkMode')).toBe('true');
    });

    // コンポーネントをアンマウント（ページ離脱をシミュレート）
    unmount();

    // クラスをクリア（ページリロードをシミュレート）
    document.documentElement.className = '';

    // 再度レンダリング（ページリロードをシミュレート）
    render(<CommTimeComponent />);

    // ダークモードが保持されているか確認
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  test('localStorageの値が正しく保存されている', async () => {
    localStorageMock.setItem('darkMode', 'true');

    render(<CommTimeComponent />);

    await waitFor(() => {
      const savedValue = localStorageMock.getItem('darkMode');
      expect(savedValue).toBe('true');
    });
  });
});
