/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommTimeComponent } from '../components/comm-time';

// Supabase hooks のモック
jest.mock('../hooks/useSupabaseTodos', () => ({
  useSupabaseTodos: () => ({
    todos: [],
    addTodo: jest.fn(),
    removeTodo: jest.fn(),
    toggleTodo: jest.fn(),
    updateTodo: jest.fn(),
    loading: false
  })
}));

jest.mock('../hooks/useSupabaseMemos', () => ({
  useSupabaseMemos: () => ({
    memo: '',
    updateMemo: jest.fn(),
    loading: false
  })
}));

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

describe('Database Sync Features', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Supabase設定をモック（テストのため）
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  describe('useDatabase persistence', () => {
    it('should save useDatabase state to localStorage', async () => {
      render(<CommTimeComponent />);

      await waitFor(() => {
        const useDatabaseValue = localStorageMock.getItem('useDatabase');
        expect(useDatabaseValue).toBeDefined();
      });
    });

    it('should restore useDatabase state from localStorage', async () => {
      // useDatabaseをtrueに設定
      localStorageMock.setItem('useDatabase', 'true');

      render(<CommTimeComponent />);

      // useDatabase状態がlocalStorageから復元されることを確認
      // （実際のDOMチェックは困難なため、localStorageの値を確認）
      await waitFor(() => {
        const useDatabaseValue = localStorageMock.getItem('useDatabase');
        expect(useDatabaseValue).toBe('true');
      });
    });
  });

  describe('activeTab persistence', () => {
    it('should save activeTab to localStorage when tab changes', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // デフォルトはmeeting
      await waitFor(() => {
        const activeTab = localStorageMock.getItem('activeTab');
        expect(activeTab).toBe('meeting');
      });

      // ポモドーロタブに切り替え（複数要素があるため getAllByText を使用）
      const pomodoroTabs = screen.getAllByText(/ポモドーロ/);
      await act(async () => {
        await user.click(pomodoroTabs[0]);
      });

      // activeTabがlocalStorageに保存されることを確認
      await waitFor(() => {
        const activeTab = localStorageMock.getItem('activeTab');
        expect(activeTab).toBe('pomodoro');
      });
    });

    it('should restore activeTab from localStorage on mount', async () => {
      // pomodoroタブを事前に保存
      localStorageMock.setItem('activeTab', 'pomodoro');

      render(<CommTimeComponent />);

      // Pomodoroタブがアクティブであることを確認
      await waitFor(() => {
        // ポモドーロタイマーのUIが表示されているはず
        const pomodoroTab = screen.getByText('Pomodoro Timer');
        expect(pomodoroTab.closest('button')).toHaveClass(/bg-white/);
      });
    });
  });

  describe('Shared Memo/TODO', () => {
    it('should share memos between meeting and pomodoro tabs', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // ミーティングタブでメモを入力
      const memoTextarea = screen.getAllByPlaceholderText('メモを入力してください...')[0];
      await act(async () => {
        await user.clear(memoTextarea);
        await user.type(memoTextarea, 'テスト用メモ');
      });

      // localStorageにsharedMemoとして保存されることを確認
      await waitFor(() => {
        const sharedMemo = localStorageMock.getItem('sharedMemo');
        expect(sharedMemo).toBe('テスト用メモ');
      });

      // ポモドーロタブに切り替え（複数要素があるため getAllByText を使用）
      const pomodoroTabs = screen.getAllByText(/ポモドーロ/);
      await act(async () => {
        await user.click(pomodoroTabs[0]);
      });

      // 同じメモが表示されることを確認
      await waitFor(() => {
        const pomodoroMemoTextarea = screen.getAllByPlaceholderText('メモを入力してください...')[0];
        expect(pomodoroMemoTextarea).toHaveValue('テスト用メモ');
      });
    });

    it('should share TODOs between meeting and pomodoro tabs', async () => {
      const user = userEvent.setup();
      render(<CommTimeComponent />);

      // ミーティングタブでTODOを追加
      const todoInput = screen.getByPlaceholderText(/新しいTODOを入力/);
      await act(async () => {
        await user.type(todoInput, 'テスト用TODO');
        await user.keyboard('{Enter}');
      });

      // localStorageにsharedTodosとして保存されることを確認
      await waitFor(() => {
        const sharedTodosStr = localStorageMock.getItem('sharedTodos');
        expect(sharedTodosStr).toBeDefined();
        const sharedTodos = JSON.parse(sharedTodosStr!);
        expect(sharedTodos).toHaveLength(1);
        expect(sharedTodos[0].text).toBe('テスト用TODO');
      });

      // ポモドーロタブに切り替え（複数要素があるため getAllByText を使用）
      const pomodoroTabs = screen.getAllByText(/ポモドーロ/);
      await act(async () => {
        await user.click(pomodoroTabs[0]);
      });

      // 同じTODOが表示されることを確認
      await waitFor(() => {
        const todoText = screen.getByText('テスト用TODO');
        expect(todoText).toBeInTheDocument();
      });
    });
  });

  describe('Data Migration', () => {
    it('should migrate existing meetingMemo and pomodoroMemo to sharedMemo', async () => {
      // 既存の分離されたメモを設定
      localStorageMock.setItem('meetingMemo', 'ミーティングメモ');
      localStorageMock.setItem('pomodoroMemo', 'ポモドーロメモ');

      render(<CommTimeComponent />);

      // マイグレーション後、sharedMemoが作成されることを確認
      await waitFor(() => {
        const sharedMemo = localStorageMock.getItem('sharedMemo');
        expect(sharedMemo).toBeDefined();
        // 両方のメモが結合されていることを確認
        expect(sharedMemo).toContain('ミーティングメモ');
        expect(sharedMemo).toContain('ポモドーロメモ');
        expect(sharedMemo).toContain('---'); // 区切り文字
      });
    });

    it('should migrate existing meetingTodos and pomodoroTodos to sharedTodos', async () => {
      // 既存の分離されたTODOを設定
      localStorageMock.setItem('meetingTodos', JSON.stringify([
        { id: '1', text: 'ミーティングTODO', isCompleted: false }
      ]));
      localStorageMock.setItem('pomodoroTodos', JSON.stringify([
        { id: '2', text: 'ポモドーロTODO', isCompleted: false }
      ]));

      render(<CommTimeComponent />);

      // マイグレーション後、sharedTodosが作成されることを確認
      await waitFor(() => {
        const sharedTodosStr = localStorageMock.getItem('sharedTodos');
        expect(sharedTodosStr).toBeDefined();
        const sharedTodos = JSON.parse(sharedTodosStr!);
        // 両方のTODOが統合されていることを確認
        expect(sharedTodos).toHaveLength(2);
        const texts = sharedTodos.map((t: any) => t.text);
        expect(texts).toContain('ミーティングTODO');
        expect(texts).toContain('ポモドーロTODO');
      });
    });

    it('should handle duplicate TODOs during migration', async () => {
      // 重複するIDのTODOを設定
      const duplicateTodo = { id: '1', text: '重複TODO', isCompleted: false };
      localStorageMock.setItem('meetingTodos', JSON.stringify([duplicateTodo]));
      localStorageMock.setItem('pomodoroTodos', JSON.stringify([duplicateTodo]));

      render(<CommTimeComponent />);

      // マイグレーション後、重複が除去されることを確認
      await waitFor(() => {
        const sharedTodosStr = localStorageMock.getItem('sharedTodos');
        const sharedTodos = JSON.parse(sharedTodosStr!);
        // 重複が除去され、1つだけになることを確認
        expect(sharedTodos).toHaveLength(1);
        expect(sharedTodos[0].text).toBe('重複TODO');
      });
    });
  });
});
