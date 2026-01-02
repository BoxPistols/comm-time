/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@supabase/supabase-js';
import { type KanbanStatusColumn, DEFAULT_KANBAN_COLUMNS } from '@/types';

// isSupabaseConfiguredのモック用フラグ
let mockIsConfigured = true;

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
    get isSupabaseConfigured() {
      return mockIsConfigured;
    },
  };
});

// モックの後にフックをインポート
import { useKanbanStatuses } from '../hooks/useKanbanStatuses';
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

// テスト用のステータスデータ
const mockStatusesData = [
  {
    id: 'status-1',
    user_id: mockUser.id,
    name: 'backlog',
    label: 'Backlog',
    color: 'gray',
    bg_class: 'bg-gray-500',
    text_class: 'text-gray-600',
    border_class: 'border-gray-300',
    active_class: 'bg-gray-500 text-white',
    sort_order: 0,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'status-2',
    user_id: mockUser.id,
    name: 'todo',
    label: 'Todo',
    color: 'blue',
    bg_class: 'bg-blue-500',
    text_class: 'text-blue-600',
    border_class: 'border-blue-300',
    active_class: 'bg-blue-500 text-white',
    sort_order: 1,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'status-3',
    user_id: mockUser.id,
    name: 'doing',
    label: 'Doing',
    color: 'yellow',
    bg_class: 'bg-yellow-500',
    text_class: 'text-yellow-600',
    border_class: 'border-yellow-300',
    active_class: 'bg-yellow-500 text-black',
    sort_order: 2,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('useKanbanStatuses Hook', () => {
  // 共通のチャンネルモック
  let mockOn: jest.Mock;
  let mockSubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured = true;

    // チャンネルモックを共通設定
    mockOn = jest.fn().mockReturnThis();
    mockSubscribe = jest.fn().mockReturnValue({});
    mockSupabaseClient.channel.mockReturnValue({
      on: mockOn,
      subscribe: mockSubscribe,
    });
  });

  describe('Initialization', () => {
    it('should return default statuses when user is null', async () => {
      const TestComponent = () => {
        const { statuses, isInitialized } = useKanbanStatuses(null);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <div data-testid="initialized">{isInitialized ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('yes');
        expect(screen.getByTestId('status-count')).toHaveTextContent(
          DEFAULT_KANBAN_COLUMNS.length.toString()
        );
      });
    });

    it('should return default statuses when Supabase is not configured', async () => {
      mockIsConfigured = false;

      const TestComponent = () => {
        const { statuses, isInitialized } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <div data-testid="initialized">{isInitialized ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('yes');
        expect(screen.getByTestId('status-count')).toHaveTextContent(
          DEFAULT_KANBAN_COLUMNS.length.toString()
        );
      });
    });
  });

  describe('Fetch Statuses', () => {
    it('should fetch statuses from database on mount', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockStatusesData,
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      } as any);

      const TestComponent = () => {
        const { statuses, loading, isInitialized } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <div data-testid="loading">{loading ? 'yes' : 'no'}</div>
            <div data-testid="initialized">{isInitialized ? 'yes' : 'no'}</div>
            {statuses.map((s) => (
              <div key={s.id} data-testid={`status-${s.id}`}>
                {s.label}
              </div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('kanban_statuses');
        expect(screen.getByTestId('status-count')).toHaveTextContent('3');
      });
    });

    it('should handle fetch error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '500' },
      });
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      } as any);

      const TestComponent = () => {
        const { statuses, error } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <div data-testid="error">{error || 'no error'}</div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        // エラー時はデフォルト値にフォールバック
        expect(screen.getByTestId('status-count')).toHaveTextContent(
          DEFAULT_KANBAN_COLUMNS.length.toString()
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle table not exists error (42P01)', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'relation does not exist', code: '42P01' },
      });
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      } as any);

      const TestComponent = () => {
        const { statuses, isInitialized } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <div data-testid="initialized">{isInitialized ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('yes');
        expect(screen.getByTestId('status-count')).toHaveTextContent(
          DEFAULT_KANBAN_COLUMNS.length.toString()
        );
      });
    });
  });

  describe('Add Status', () => {
    it('should add a new status to database', async () => {
      const newStatusData = {
        id: 'new-status-id',
        user_id: mockUser.id,
        name: 'review',
        label: 'Review',
        color: 'purple',
        bg_class: 'bg-purple-500',
        text_class: 'text-purple-600',
        border_class: 'border-purple-300',
        active_class: 'bg-purple-500 text-white',
        sort_order: 3,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Fetchモック
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockStatusesData,
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelectFetch = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      // Insertモック
      const mockSingle = jest.fn().mockResolvedValue({
        data: newStatusData,
        error: null,
      });
      const mockSelectInsert = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelectInsert,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        return {
          select: mockSelectFetch,
          eq: mockEq,
          order: mockOrder,
          insert: mockInsert,
        } as any;
      });

      const TestComponent = () => {
        const { statuses, addStatus } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <button onClick={() => addStatus('review', 'Review', 'purple')}>
              Add Status
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('3');
      });

      await act(async () => {
        await user.click(screen.getByText('Add Status'));
      });

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: mockUser.id,
            name: 'review',
            label: 'Review',
            color: 'purple',
          })
        );
        expect(screen.getByTestId('status-count')).toHaveTextContent('4');
      });
    });

    it('should handle duplicate name error (23505)', async () => {
      // Fetchモック
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockStatusesData,
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelectFetch = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      // Insertエラーモック
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value', code: '23505' },
      });
      const mockSelectInsert = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelectInsert,
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelectFetch,
        eq: mockEq,
        order: mockOrder,
        insert: mockInsert,
      } as any));

      const TestComponent = () => {
        const { statuses, addStatus, error } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <div data-testid="error">{error || 'no error'}</div>
            <button onClick={() => addStatus('backlog', 'Backlog', 'gray')}>
              Add Duplicate
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('3');
      });

      await act(async () => {
        await user.click(screen.getByText('Add Duplicate'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          '同じ名前のステータスが既に存在します'
        );
      });
    });
  });

  describe('Update Status', () => {
    it('should update an existing status', async () => {
      const updatedStatusData = {
        ...mockStatusesData[1],
        label: 'Updated Todo',
        color: 'indigo',
        bg_class: 'bg-indigo-500',
      };

      // Fetchモック
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockStatusesData,
        error: null,
      });
      const mockEqFetch = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelectFetch = jest.fn().mockReturnValue({
        eq: mockEqFetch,
      });

      // Updateモック
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedStatusData,
        error: null,
      });
      const mockSelectUpdate = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockEqUpdate2 = jest.fn().mockReturnValue({
        select: mockSelectUpdate,
      });
      const mockEqUpdate1 = jest.fn().mockReturnValue({
        eq: mockEqUpdate2,
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEqUpdate1,
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelectFetch,
        eq: mockEqFetch,
        order: mockOrder,
        update: mockUpdate,
      } as any));

      const TestComponent = () => {
        const { statuses, updateStatus } = useKanbanStatuses(mockUser);
        return (
          <div>
            {statuses.map((s) => (
              <div key={s.id} data-testid={`status-${s.id}`}>
                {s.label}
              </div>
            ))}
            <button
              onClick={() =>
                updateStatus('status-2', { label: 'Updated Todo', color: 'indigo' })
              }
            >
              Update Status
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status-status-2')).toHaveTextContent('Todo');
      });

      await act(async () => {
        await user.click(screen.getByText('Update Status'));
      });

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            label: 'Updated Todo',
            color: 'indigo',
          })
        );
      });
    });
  });

  describe('Delete Status', () => {
    it('should delete a non-default status', async () => {
      // Fetchモック
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockStatusesData,
        error: null,
      });
      const mockEqFetch = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelectFetch = jest.fn().mockReturnValue({
        eq: mockEqFetch,
      });

      // Deleteモック
      const mockEqDelete2 = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockEqDelete1 = jest.fn().mockReturnValue({
        eq: mockEqDelete2,
      });
      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEqDelete1,
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelectFetch,
        eq: mockEqFetch,
        order: mockOrder,
        delete: mockDelete,
      } as any));

      const TestComponent = () => {
        const { statuses, deleteStatus } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <button onClick={() => deleteStatus('status-2')}>Delete Status</button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('3');
      });

      await act(async () => {
        await user.click(screen.getByText('Delete Status'));
      });

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
        expect(screen.getByTestId('status-count')).toHaveTextContent('2');
      });
    });

    it('should not delete a default status', async () => {
      // Fetchモック
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockStatusesData,
        error: null,
      });
      const mockEqFetch = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelectFetch = jest.fn().mockReturnValue({
        eq: mockEqFetch,
      });

      const mockDelete = jest.fn();

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelectFetch,
        eq: mockEqFetch,
        order: mockOrder,
        delete: mockDelete,
      } as any));

      const TestComponent = () => {
        const { statuses, deleteStatus, error } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <div data-testid="error">{error || 'no error'}</div>
            <button onClick={() => deleteStatus('status-1')}>
              Delete Default Status
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent('3');
      });

      await act(async () => {
        await user.click(screen.getByText('Delete Default Status'));
      });

      await waitFor(() => {
        // デフォルトステータスは削除できない
        expect(mockDelete).not.toHaveBeenCalled();
        expect(screen.getByTestId('error')).toHaveTextContent(
          'デフォルトステータスは削除できません'
        );
        expect(screen.getByTestId('status-count')).toHaveTextContent('3');
      });
    });
  });

  describe('Reorder Statuses', () => {
    it('should reorder statuses optimistically', async () => {
      // Fetchモック
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockStatusesData,
        error: null,
      });
      const mockEqFetch = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelectFetch = jest.fn().mockReturnValue({
        eq: mockEqFetch,
      });

      // Updateモック
      const mockEqUpdate2 = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockEqUpdate1 = jest.fn().mockReturnValue({
        eq: mockEqUpdate2,
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEqUpdate1,
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelectFetch,
        eq: mockEqFetch,
        order: mockOrder,
        update: mockUpdate,
      } as any));

      const TestComponent = () => {
        const { statuses, reorderStatuses } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-order">
              {statuses.map((s) => s.label).join(',')}
            </div>
            <button
              onClick={() => {
                // status-2とstatus-3を入れ替え
                const newOrder = [...statuses];
                const temp = newOrder[1];
                newOrder[1] = newOrder[2];
                newOrder[2] = temp;
                reorderStatuses(newOrder);
              }}
            >
              Reorder
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status-order')).toHaveTextContent(
          'Backlog,Todo,Doing'
        );
      });

      await act(async () => {
        await user.click(screen.getByText('Reorder'));
      });

      // Optimistic update: 即座に更新される
      await waitFor(() => {
        expect(screen.getByTestId('status-order')).toHaveTextContent(
          'Backlog,Doing,Todo'
        );
      });

      // API呼び出しが行われる
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
    });

    it('should revert on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Fetchモック
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockStatusesData,
        error: null,
      });
      const mockEqFetch = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelectFetch = jest.fn().mockReturnValue({
        eq: mockEqFetch,
      });

      // Updateエラーモック
      const mockEqUpdate2 = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed', code: '500' },
      });
      const mockEqUpdate1 = jest.fn().mockReturnValue({
        eq: mockEqUpdate2,
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEqUpdate1,
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelectFetch,
        eq: mockEqFetch,
        order: mockOrder,
        update: mockUpdate,
      } as any));

      const TestComponent = () => {
        const { statuses, reorderStatuses, error } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-order">
              {statuses.map((s) => s.label).join(',')}
            </div>
            <div data-testid="error">{error || 'no error'}</div>
            <button
              onClick={() => {
                const newOrder = [...statuses];
                const temp = newOrder[1];
                newOrder[1] = newOrder[2];
                newOrder[2] = temp;
                reorderStatuses(newOrder);
              }}
            >
              Reorder
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status-order')).toHaveTextContent(
          'Backlog,Todo,Doing'
        );
      });

      await act(async () => {
        await user.click(screen.getByText('Reorder'));
      });

      // エラー後に元に戻る
      await waitFor(() => {
        expect(screen.getByTestId('status-order')).toHaveTextContent(
          'Backlog,Todo,Doing'
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Real-time Subscription', () => {
    it('should set up real-time subscription for authenticated user', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockStatusesData,
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      } as any);

      const TestComponent = () => {
        const { statuses } = useKanbanStatuses(mockUser);
        return <div data-testid="status-count">{statuses.length}</div>;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
          `kanban-statuses-${mockUser.id}`
        );
        expect(mockOn).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: '*',
            schema: 'public',
            table: 'kanban_statuses',
          }),
          expect.any(Function)
        );
        expect(mockSubscribe).toHaveBeenCalled();
      });
    });

    it('should not set up subscription when Supabase is not configured', async () => {
      mockIsConfigured = false;

      const TestComponent = () => {
        const { statuses } = useKanbanStatuses(mockUser);
        return <div data-testid="status-count">{statuses.length}</div>;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(mockSupabaseClient.channel).not.toHaveBeenCalled();
      });
    });
  });

  describe('LocalStorage Mode', () => {
    it('should return null when adding status in LocalStorage mode', async () => {
      mockIsConfigured = false;

      const TestComponent = () => {
        const { statuses, addStatus } = useKanbanStatuses(mockUser);
        const [result, setResult] = React.useState<KanbanStatusColumn | null | undefined>(
          undefined
        );

        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <div data-testid="result">
              {result === undefined ? 'pending' : result === null ? 'null' : 'success'}
            </div>
            <button
              onClick={async () => {
                const res = await addStatus('test', 'Test', 'gray');
                setResult(res);
              }}
            >
              Add Status
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status-count')).toHaveTextContent(
          DEFAULT_KANBAN_COLUMNS.length.toString()
        );
      });

      await act(async () => {
        await user.click(screen.getByText('Add Status'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('null');
      });
    });

    it('should not call Supabase in LocalStorage mode', async () => {
      mockIsConfigured = false;

      const TestComponent = () => {
        const { statuses, updateStatus, deleteStatus } = useKanbanStatuses(mockUser);
        return (
          <div>
            <div data-testid="status-count">{statuses.length}</div>
            <button onClick={() => updateStatus('id', { label: 'Test' })}>Update</button>
            <button onClick={() => deleteStatus('id')}>Delete</button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      await act(async () => {
        await user.click(screen.getByText('Update'));
        await user.click(screen.getByText('Delete'));
      });

      // Supabaseは呼ばれない
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });
});
