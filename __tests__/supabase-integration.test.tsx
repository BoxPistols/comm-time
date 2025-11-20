/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@supabase/supabase-js';

// Supabaseクライアントのモック
jest.mock('../lib/supabase', () => {
  const mockFrom = jest.fn();
  const mockChannel = jest.fn();
  const mockRemoveChannel = jest.fn();

  return {
    supabase: {
      from: mockFrom,
      channel: mockChannel,
      removeChannel: mockRemoveChannel,
    },
  };
});

// モックの後にフックをインポート
import { useSupabaseMemos } from '../hooks/useSupabaseMemos';
import { useSupabaseTodos } from '../hooks/useSupabaseTodos';
import { supabase } from '../lib/supabase';

// supabaseをモックとして取得
const mockSupabaseClient = supabase as jest.Mocked<typeof supabase>;

// テスト用のユーザーオブジェクト
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

describe('Supabase Integration Tests', () => {
  // 共通のチャンネルモック
  let mockOn: jest.Mock;
  let mockSubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // チャンネルモックを共通設定
    mockOn = jest.fn().mockReturnThis();
    mockSubscribe = jest.fn().mockReturnValue({});
    mockSupabaseClient.channel.mockReturnValue({
      on: mockOn,
      subscribe: mockSubscribe,
    });
  });

  describe('useSupabaseMemos', () => {
    it('should save memo to database when saveMemo is called', async () => {
      // モックの設定
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'memo-id-1',
          user_id: mockUser.id,
          content: 'Test memo content',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });
      const mockUpsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      mockSupabaseClient.from.mockReturnValue({
        upsert: mockUpsert,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      // テスト用のコンポーネント
      const TestComponent = () => {
        const { memo, saveMemo, loading } = useSupabaseMemos(mockUser);

        return (
          <div>
            <div data-testid="memo-content">{memo}</div>
            <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
            <button onClick={() => saveMemo('Test memo content')}>
              Save Memo
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      // 保存ボタンをクリック
      const saveButton = screen.getByText('Save Memo');
      await act(async () => {
        await user.click(saveButton);
      });

      // saveMemoが呼ばれたことを確認
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('memos');
        expect(mockUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: mockUser.id,
            content: 'Test memo content',
          }),
          expect.objectContaining({
            onConflict: 'user_id',
            ignoreDuplicates: false,
          })
        );
      });
    });

    it('should fetch memo from database on mount', async () => {
      const mockMemoData = {
        id: 'memo-id-1',
        user_id: mockUser.id,
        content: 'Fetched memo content',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // モックの設定
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: mockMemoData,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      });

      // テスト用のコンポーネント
      const TestComponent = () => {
        const { memo, loading } = useSupabaseMemos(mockUser);

        return (
          <div>
            <div data-testid="memo-content">{memo}</div>
            <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
          </div>
        );
      };

      render(<TestComponent />);

      // メモが読み込まれることを確認
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('memos');
        expect(mockMaybeSingle).toHaveBeenCalled();
      });

      // メモの内容が表示されることを確認
      await waitFor(() => {
        const memoContent = screen.getByTestId('memo-content');
        expect(memoContent).toHaveTextContent('Fetched memo content');
      });
    });

    it('should handle errors when saving memo', async () => {
      // エラーのモック
      const mockError = new Error('Database error');
      const mockUpsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        upsert: mockUpsert,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      // コンソールエラーのモック
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const TestComponent = () => {
        const { saveMemo, error } = useSupabaseMemos(mockUser);

        return (
          <div>
            <div data-testid="error">{error || 'no error'}</div>
            <button onClick={() => saveMemo('Test memo')}>Save Memo</button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      const saveButton = screen.getByText('Save Memo');
      await act(async () => {
        await user.click(saveButton);
      });

      // エラーが処理されることを確認
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error saving memo:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useSupabaseTodos', () => {
    it('should add todo to database when addTodo is called', async () => {
      const mockTodoData = {
        id: 'todo-id-1',
        user_id: mockUser.id,
        text: 'Test todo',
        is_completed: false,
        order_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // モックの設定
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockTodoData,
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      });

      const TestComponent = () => {
        const { todos, addTodo } = useSupabaseTodos(mockUser);

        return (
          <div>
            <div data-testid="todo-count">{todos.length}</div>
            <button onClick={() => addTodo('Test todo')}>Add Todo</button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      const addButton = screen.getByText('Add Todo');
      await act(async () => {
        await user.click(addButton);
      });

      // addTodoが呼ばれたことを確認
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos');
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: mockUser.id,
            text: 'Test todo',
            is_completed: false,
            order_index: 0,
          })
        );
      });
    });

    it('should update todo in database when updateTodo is called', async () => {
      const mockTodoData = {
        id: 'todo-id-1',
        user_id: mockUser.id,
        text: 'Test todo',
        is_completed: false,
        order_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 更新用モックを事前に定義
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });

      // モックの設定 - updateを含めて初期設定
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockTodoData],
          error: null,
        }),
        update: mockUpdate,
      });

      const TestComponent = () => {
        const { todos, updateTodo } = useSupabaseTodos(mockUser);

        return (
          <div>
            <div data-testid="todo-count">{todos.length}</div>
            {todos.length > 0 && (
              <button onClick={() => updateTodo(todos[0].id, { isCompleted: true })}>
                Complete Todo
              </button>
            )}
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        const todoCount = screen.getByTestId('todo-count');
        expect(todoCount).toHaveTextContent('1');
      });

      const completeButton = screen.getByText('Complete Todo');
      await act(async () => {
        await user.click(completeButton);
      });

      // updateTodoが呼ばれたことを確認
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos');
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            is_completed: true,
          })
        );
      });
    });

    it('should delete todo from database when removeTodo is called', async () => {
      const mockTodoData = {
        id: 'todo-id-1',
        user_id: mockUser.id,
        text: 'Test todo',
        is_completed: false,
        order_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 削除用モックを事前に定義
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });

      // モックの設定 - deleteを含めて初期設定
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockTodoData],
          error: null,
        }),
        delete: mockDelete,
      });

      const TestComponent = () => {
        const { todos, removeTodo } = useSupabaseTodos(mockUser);

        return (
          <div>
            <div data-testid="todo-count">{todos.length}</div>
            {todos.length > 0 && (
              <button onClick={() => removeTodo(todos[0].id)}>
                Delete Todo
              </button>
            )}
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        const todoCount = screen.getByTestId('todo-count');
        expect(todoCount).toHaveTextContent('1');
      });

      const deleteButton = screen.getByText('Delete Todo');
      await act(async () => {
        await user.click(deleteButton);
      });

      // removeTodoが呼ばれたことを確認
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos');
        expect(mockDelete).toHaveBeenCalled();
      });
    });
  });

  describe('Integration: Memo and Todo Database Sync', () => {
    it('should sync memos and todos separately', async () => {
      // メモのモック設定
      const mockMemoData = {
        id: 'memo-id-1',
        user_id: mockUser.id,
        content: 'Test memo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // TODOのモック設定
      const mockTodoData = {
        id: 'todo-id-1',
        user_id: mockUser.id,
        text: 'Test todo',
        is_completed: false,
        order_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // fromの呼び出しに応じて異なるモックを返す
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'memos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockMemoData,
              error: null,
            }),
          };
        } else if (table === 'todos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [mockTodoData],
              error: null,
            }),
          };
        }
        return {};
      });

      const TestComponent = () => {
        const { memo } = useSupabaseMemos(mockUser);
        const { todos } = useSupabaseTodos(mockUser);

        return (
          <div>
            <div data-testid="memo-content">{memo}</div>
            <div data-testid="todo-count">{todos.length}</div>
          </div>
        );
      };

      render(<TestComponent />);

      // メモとTODOが両方取得されることを確認
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('memos');
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos');
      });

      await waitFor(() => {
        const memoContent = screen.getByTestId('memo-content');
        const todoCount = screen.getByTestId('todo-count');
        expect(memoContent).toHaveTextContent('Test memo');
        expect(todoCount).toHaveTextContent('1');
      });
    });
  });
});
