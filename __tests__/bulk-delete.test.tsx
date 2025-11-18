/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommTimeComponent } from '../components/comm-time';

// window.confirmのモック
global.confirm = jest.fn(() => true);

// LocalStorageのモック
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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Bulk Delete Features', () => {
  beforeEach(() => {
    localStorageMock.clear();
    (global.confirm as jest.Mock).mockClear();
    (global.confirm as jest.Mock).mockReturnValue(true);
    // Supabase設定を無効にする（ローカルモードでテスト）
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
  });

  describe('Clear All TODOs', () => {
    it('should show confirm dialog when clicking clear all button', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // TODOを追加
      const todoInput = screen.getByPlaceholderText(/新しいTODOを入力/);
      await act(async () => {
        await user.type(todoInput, 'TODO1');
        await user.keyboard('{Enter}');
        await user.type(todoInput, 'TODO2');
        await user.keyboard('{Enter}');
      });

      // 全削除ボタンをクリック
      const clearAllButton = screen.getByTitle('すべて削除');
      await act(async () => {
        await user.click(clearAllButton);
      });

      // 確認ダイアログが表示されることを確認
      expect(global.confirm).toHaveBeenCalledWith(
        'すべてのTODOを削除しますか？この操作は取り消せません。'
      );
    });

    it('should delete all TODOs when confirmed', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // TODOを追加
      const todoInput = screen.getByPlaceholderText(/新しいTODOを入力/);
      await act(async () => {
        await user.type(todoInput, 'TODO1');
        await user.keyboard('{Enter}');
        await user.type(todoInput, 'TODO2');
        await user.keyboard('{Enter}');
      });

      // TODOが追加されたことを確認
      await waitFor(() => {
        expect(screen.getByText('TODO1')).toBeInTheDocument();
        expect(screen.getByText('TODO2')).toBeInTheDocument();
      });

      // 全削除ボタンをクリック（確認=true）
      (global.confirm as jest.Mock).mockReturnValue(true);
      const clearAllButton = screen.getByTitle('すべて削除');
      await act(async () => {
        await user.click(clearAllButton);
      });

      // すべてのTODOが削除されることを確認
      await waitFor(() => {
        expect(screen.queryByText('TODO1')).not.toBeInTheDocument();
        expect(screen.queryByText('TODO2')).not.toBeInTheDocument();
      });

      // localStorageも空になることを確認
      await waitFor(() => {
        const sharedTodosStr = localStorageMock.getItem('sharedTodos');
        const sharedTodos = JSON.parse(sharedTodosStr!);
        expect(sharedTodos).toHaveLength(0);
      });
    });

    it('should not delete TODOs when cancelled', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // TODOを追加
      const todoInput = screen.getByPlaceholderText(/新しいTODOを入力/);
      await act(async () => {
        await user.type(todoInput, 'TODO1');
        await user.keyboard('{Enter}');
      });

      // 全削除ボタンをクリック（確認=false）
      (global.confirm as jest.Mock).mockReturnValue(false);
      const clearAllButton = screen.getByTitle('すべて削除');
      await act(async () => {
        await user.click(clearAllButton);
      });

      // TODOが残っていることを確認
      await waitFor(() => {
        expect(screen.getByText('TODO1')).toBeInTheDocument();
      });
    });
  });

  describe('Clear Completed TODOs', () => {
    it('should show confirm dialog when clicking clear completed button', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // TODOを追加して完了にする
      const todoInput = screen.getByPlaceholderText(/新しいTODOを入力/);
      await act(async () => {
        await user.type(todoInput, 'Completed TODO');
        await user.keyboard('{Enter}');
      });

      // TODOを完了にする
      await waitFor(() => {
        const checkbox = screen.getByRole('button', { name: /check/i });
        return act(async () => {
          await user.click(checkbox);
        });
      });

      // 完了削除ボタンをクリック
      const clearCompletedButton = screen.getByTitle('完了済みを削除');
      await act(async () => {
        await user.click(clearCompletedButton);
      });

      // 確認ダイアログが表示されることを確認
      expect(global.confirm).toHaveBeenCalledWith(
        '完了したTODOを削除しますか？'
      );
    });

    it('should delete only completed TODOs', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // 完了TODOと未完了TODOを追加
      const todoInput = screen.getByPlaceholderText(/新しいTODOを入力/);
      await act(async () => {
        await user.type(todoInput, 'Completed TODO');
        await user.keyboard('{Enter}');
        await user.type(todoInput, 'Pending TODO');
        await user.keyboard('{Enter}');
      });

      // 最初のTODOを完了にする
      await waitFor(async () => {
        const checkboxes = screen.getAllByRole('button', { name: /check/i });
        await act(async () => {
          await user.click(checkboxes[0]);
        });
      });

      // 完了削除ボタンをクリック
      (global.confirm as jest.Mock).mockReturnValue(true);
      const clearCompletedButton = screen.getByTitle('完了済みを削除');
      await act(async () => {
        await user.click(clearCompletedButton);
      });

      // 完了TODOだけが削除され、未完了TODOは残ることを確認
      await waitFor(() => {
        expect(screen.queryByText('Completed TODO')).not.toBeInTheDocument();
        expect(screen.getByText('Pending TODO')).toBeInTheDocument();
      });

      // localStorageに未完了TODOだけが残ることを確認
      await waitFor(() => {
        const sharedTodosStr = localStorageMock.getItem('sharedTodos');
        const sharedTodos = JSON.parse(sharedTodosStr!);
        expect(sharedTodos).toHaveLength(1);
        expect(sharedTodos[0].text).toBe('Pending TODO');
      });
    });
  });

  describe('Clear Memo', () => {
    it('should show confirm dialog when clicking clear memo button', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // メモを入力
      const memoTextarea = screen.getAllByPlaceholderText('メモを入力してください...')[0];
      await act(async () => {
        await user.type(memoTextarea, 'テスト用メモ');
      });

      // クリアボタンをクリック
      const clearButton = screen.getByTitle('メモをクリア');
      await act(async () => {
        await user.click(clearButton);
      });

      // 確認ダイアログが表示されることを確認
      expect(global.confirm).toHaveBeenCalledWith('メモをクリアしますか？');
    });

    it('should clear memo when confirmed', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // メモを入力
      const memoTextarea = screen.getAllByPlaceholderText('メモを入力してください...')[0];
      await act(async () => {
        await user.type(memoTextarea, 'テスト用メモ');
      });

      // メモが入力されたことを確認
      await waitFor(() => {
        expect(memoTextarea).toHaveValue('テスト用メモ');
      });

      // クリアボタンをクリック（確認=true）
      (global.confirm as jest.Mock).mockReturnValue(true);
      const clearButton = screen.getByTitle('メモをクリア');
      await act(async () => {
        await user.click(clearButton);
      });

      // メモがクリアされることを確認
      await waitFor(() => {
        expect(memoTextarea).toHaveValue('');
      });

      // localStorageも空になることを確認（少し待つ）
      await waitFor(() => {
        const sharedMemo = localStorageMock.getItem('sharedMemo');
        expect(sharedMemo === '' || sharedMemo === null).toBe(true);
      }, { timeout: 3000 });
    });

    it('should not clear memo when cancelled', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // メモを入力
      const memoTextarea = screen.getAllByPlaceholderText('メモを入力してください...')[0];
      await act(async () => {
        await user.type(memoTextarea, 'テスト用メモ');
      });

      // クリアボタンをクリック（確認=false）
      (global.confirm as jest.Mock).mockReturnValue(false);
      const clearButton = screen.getByTitle('メモをクリア');
      await act(async () => {
        await user.click(clearButton);
      });

      // メモが残っていることを確認
      await waitFor(() => {
        expect(memoTextarea).toHaveValue('テスト用メモ');
      });
    });
  });

  describe('Bulk Delete Performance', () => {
    it('should handle large number of TODOs efficiently in local mode', async () => {
      const user = userEvent.setup();

      // 大量のTODOを事前に設定
      const largeTodoList = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        text: `TODO ${i}`,
        isCompleted: i % 2 === 0, // 半分は完了状態
      }));
      localStorageMock.setItem('sharedTodos', JSON.stringify(largeTodoList));

      render(<CommTimeComponent />);

      // 全削除の実行時間を測定
      const startTime = performance.now();

      (global.confirm as jest.Mock).mockReturnValue(true);
      const clearAllButton = screen.getByTitle('すべて削除');
      await act(async () => {
        await user.click(clearAllButton);
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 1秒以内に完了することを確認
      expect(executionTime).toBeLessThan(1000);

      // すべて削除されたことを確認
      await waitFor(() => {
        const sharedTodosStr = localStorageMock.getItem('sharedTodos');
        const sharedTodos = JSON.parse(sharedTodosStr!);
        expect(sharedTodos).toHaveLength(0);
      });
    });
  });
});
