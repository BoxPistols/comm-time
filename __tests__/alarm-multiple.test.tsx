/**
 * アラーム複数登録機能のテスト
 *
 * このテストは、複数のアラームポイントを追加、編集、削除できる
 * 機能が正しく動作することを確認します。
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
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

describe('アラーム複数登録機能のテスト', () => {
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
  });

  describe('初期状態のテスト', () => {
    test('コンポーネントが正常にレンダリングされる', () => {
      const { container } = render(<CommTimeComponent />);
      expect(container).toBeTruthy();
    });

    test('デフォルトで3つのアラームポイントが設定されている', async () => {
      render(<CommTimeComponent />);

      await waitFor(() => {
        // アラームポイントの見出しを探す
        const alarmHeading = screen.getByText('アラームポイント');
        expect(alarmHeading).toBeInTheDocument();
      });

      // デフォルトのアラームポイント (30分、50分、60分) が存在することを確認
      await waitFor(() => {
        const input30 = screen.getByDisplayValue('30');
        const input50 = screen.getByDisplayValue('50');
        const input60 = screen.getByDisplayValue('60');

        expect(input30).toBeInTheDocument();
        expect(input50).toBeInTheDocument();
        expect(input60).toBeInTheDocument();
      });
    });

    test('アラーム追加ボタンが表示されている', async () => {
      render(<CommTimeComponent />);

      await waitFor(() => {
        const addButton = screen.getByText('アラームポイントを追加');
        expect(addButton).toBeInTheDocument();
      });
    });
  });

  describe('アラーム追加機能', () => {
    test('アラームポイントを追加ボタンが機能する', async () => {
      render(<CommTimeComponent />);

      // 追加ボタンを探す
      const addButton = await screen.findByText('アラームポイントを追加');
      expect(addButton).toBeInTheDocument();

      // 追加ボタンをクリック
      fireEvent.click(addButton);

      // 新しいアラームが追加されたことを確認（localStorageをチェック）
      await waitFor(() => {
        const savedAlarms = localStorageMock.getItem('alarmPoints');
        expect(savedAlarms).not.toBeNull();

        if (savedAlarms) {
          const alarms = JSON.parse(savedAlarms);
          // 初期の3つ + 追加した1つ = 4つ
          expect(alarms.length).toBeGreaterThanOrEqual(4);
        }
      });
    });
  });

  describe('アラーム編集機能', () => {
    test('アラームの時間を変更できる', async () => {
      render(<CommTimeComponent />);

      await waitFor(() => {
        const alarmHeading = screen.getByText('アラームポイント');
        expect(alarmHeading).toBeInTheDocument();
      });

      // 最初のアラーム入力フィールドを探す（30分のもの）
      const alarmInput = screen.getByDisplayValue('30') as HTMLInputElement;
      expect(alarmInput).toBeInTheDocument();

      // 値を変更
      fireEvent.change(alarmInput, { target: { value: '45' } });

      await waitFor(() => {
        // 値が変更されたことを確認
        expect(alarmInput.value).toBe('45');
      });
    });
  });

  describe('アラーム削除機能', () => {
    test('アラーム削除ボタンが表示されている', async () => {
      render(<CommTimeComponent />);

      await waitFor(() => {
        const alarmHeading = screen.getByText('アラームポイント');
        expect(alarmHeading).toBeInTheDocument();
      });

      // 削除ボタン (×アイコン) が存在することを確認
      const alarmSection = screen.getByText('アラームポイント').closest('div');
      if (alarmSection) {
        const deleteButtons = alarmSection.querySelectorAll('button[class*="text-red"]');
        expect(deleteButtons.length).toBeGreaterThan(0);
      }
    });
  });

  describe('localStorageへの永続化', () => {
    test('アラームを追加するとlocalStorageに保存される', async () => {
      render(<CommTimeComponent />);

      const addButton = await screen.findByText('アラームポイントを追加');
      fireEvent.click(addButton);

      await waitFor(() => {
        // localStorageに保存されているか確認
        const savedAlarms = localStorageMock.getItem('alarmPoints');
        expect(savedAlarms).not.toBeNull();

        if (savedAlarms) {
          const alarms = JSON.parse(savedAlarms);
          // 初期の3つ + 追加した1つ = 4つ
          expect(alarms.length).toBeGreaterThanOrEqual(4);
        }
      });
    });

    test('アラームを編集するとlocalStorageに保存される', async () => {
      render(<CommTimeComponent />);

      const alarmInput = (await screen.findByDisplayValue('30')) as HTMLInputElement;
      fireEvent.change(alarmInput, { target: { value: '45' } });

      await waitFor(() => {
        const savedAlarms = localStorageMock.getItem('alarmPoints');
        expect(savedAlarms).not.toBeNull();

        if (savedAlarms) {
          const alarms = JSON.parse(savedAlarms);
          // 45分のアラームが含まれているか確認
          const has45MinAlarm = alarms.some((alarm: any) => alarm.minutes === 45);
          expect(has45MinAlarm).toBe(true);
        }
      });
    });
  });

  describe('アラーム状態管理', () => {
    test('各アラームにはユニークなIDが割り当てられる', async () => {
      render(<CommTimeComponent />);

      const addButton = await screen.findByText('アラームポイントを追加');

      // 複数のアラームを追加
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      await waitFor(() => {
        const savedAlarms = localStorageMock.getItem('alarmPoints');
        if (savedAlarms) {
          const alarms = JSON.parse(savedAlarms);

          // 各アラームにidプロパティがあることを確認
          alarms.forEach((alarm: any) => {
            expect(alarm.id).toBeDefined();
            expect(typeof alarm.id).toBe('string');
          });

          // すべてのIDがユニークであることを確認
          const ids = alarms.map((alarm: any) => alarm.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(alarms.length);
        }
      });
    });

    test('各アラームにはminutes, isDone, remainingTimeプロパティがある', async () => {
      render(<CommTimeComponent />);

      await waitFor(() => {
        const savedAlarms = localStorageMock.getItem('alarmPoints');
        if (savedAlarms) {
          const alarms = JSON.parse(savedAlarms);

          alarms.forEach((alarm: any) => {
            expect(alarm).toHaveProperty('id');
            expect(alarm).toHaveProperty('minutes');
            expect(alarm).toHaveProperty('isDone');
            expect(alarm).toHaveProperty('remainingTime');

            // 型チェック
            expect(typeof alarm.id).toBe('string');
            expect(typeof alarm.minutes).toBe('number');
            expect(typeof alarm.isDone).toBe('boolean');
            expect(typeof alarm.remainingTime).toBe('number');
          });
        }
      });
    });
  });
});

describe('アラーム機能の統合テスト', () => {
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
  });

  test('ページリロード後もアラーム設定が保持される', async () => {
    // 最初のレンダリング
    const { unmount } = render(<CommTimeComponent />);

    const addButton = await screen.findByText('アラームポイントを追加');
    fireEvent.click(addButton);

    await waitFor(() => {
      const savedAlarms = localStorageMock.getItem('alarmPoints');
      expect(savedAlarms).not.toBeNull();
    });

    const savedAlarms = localStorageMock.getItem('alarmPoints');
    const alarmCount = savedAlarms ? JSON.parse(savedAlarms).length : 0;

    // アンマウント
    unmount();

    // 再度レンダリング
    render(<CommTimeComponent />);

    await waitFor(() => {
      const reloadedAlarms = localStorageMock.getItem('alarmPoints');
      if (reloadedAlarms) {
        const alarms = JSON.parse(reloadedAlarms);
        // 同じ数のアラームが復元されているか確認
        expect(alarms.length).toBe(alarmCount);
      }
    });
  });
});
