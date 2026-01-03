
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommTimeComponent } from '@/components/comm-time';
import '@testing-library/jest-dom';

// Supabaseのモック
jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// フックのモック
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    signOut: jest.fn(),
  }),
}));

// LocalStorageのモック
let mockStorage: { [key: string]: string } = {};

beforeEach(() => {
  mockStorage = {};
  Storage.prototype.setItem = jest.fn((key, value) => {
    mockStorage[key] = value;
  });
  Storage.prototype.getItem = jest.fn((key) => mockStorage[key] || null);
});


describe('Pomodoro Task Integration', () => {

  test('should display and allow editing the current pomodoro task', async () => {
    render(<CommTimeComponent />);
    const user = userEvent.setup();

    // ポモドーロタブに切り替え
    const pomodoroTab = screen.getByText('ポモドーロ');
    await user.click(pomodoroTab);

    // 初期状態のタスク表示を確認
    let taskDisplay = await screen.findByText('集中するタスクを設定...');
    expect(taskDisplay).toBeInTheDocument();

    // タスク表示をクリックして編集モードにする
    await user.click(taskDisplay);

    // 入力欄に新しいタスクを入力
    const taskInput = await screen.findByPlaceholderText('現在のタスクを入力...');
    expect(taskInput).toBeInTheDocument();
    await user.clear(taskInput);
    await user.type(taskInput, '新しいポモドーロタスク');

    // 保存ボタンをクリック
    const saveButton = screen.getByLabelText('保存');
    await user.click(saveButton);

    // タスクが更新されて表示されることを確認
    taskDisplay = await screen.findByText('新しいポモドーロタスク');
    expect(taskDisplay).toBeInTheDocument();

    // localStorageに保存されているか確認
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'currentPomodoroTask',
      '新しいポモドーロタスク'
    );
  });

  test('should set pomodoro task from a TODO item', async () => {
    render(<CommTimeComponent />);
    const user = userEvent.setup();

    // ポモドーロタブにいることを確認
    const pomodoroTab = screen.getByText('ポモドーロ');
    await user.click(pomodoroTab);

    // 新しいTODOを追加
    const todoInput = screen.getByPlaceholderText('新しいTODOを入力...');
    await user.type(todoInput, 'テスト用のTODOタスク{enter}');

    // 追加されたTODOアイテムを見つける
    const todoItem = await screen.findByText('テスト用のTODOタスク');
    expect(todoItem).toBeInTheDocument();

    // TODOアイテムの親要素(li)からタイマーボタンを見つける
    const todoListItem = todoItem.closest('li');
    expect(todoListItem).not.toBeNull();
    const startPomodoroButton = todoListItem?.querySelector('button[title="このタスクでポモドーロを開始"]');
    expect(startPomodoroButton).toBeInTheDocument();

    // タイマーボタンをクリック
    if (startPomodoroButton) {
        await user.click(startPomodoroButton);
    }
    
    // ポモドーロタイマーセクションに移動していることを確認（UI上の確認は難しいので、タスクが設定されたかで代用）
    // 現在のタスクが更新されたことを確認
    await waitFor(() => {
        const taskDisplay = screen.getByText('テスト用のTODOタスク');
        expect(taskDisplay).toBeInTheDocument();
    });

    // タイマーが開始されているか確認（UIのテキストで判断）
    // "作業時間"が表示されていることを確認
    const workTimeIndicator = screen.getByText('🎯 作業時間');
    expect(workTimeIndicator).toBeInTheDocument();
  });

  test('should load current pomodoro task from localStorage on initial render', () => {
    // localStorageに値を設定
    mockStorage['currentPomodoroTask'] = 'ローカルストレージからのタスク';
    mockStorage['activeTab'] = 'pomodoro';

    render(<CommTimeComponent />);

    // ポモドーロタブに切り替えられていること
    const pomodoroTab = screen.getByText('ポモドーロ');
    expect(pomodoroTab).toHaveClass('bg-gradient-to-r'); // active class

    // localStorageから読み込んだタスクが表示されていることを確認
    const taskDisplay = screen.getByText('ローカルストレージからのタスク');
    expect(taskDisplay).toBeInTheDocument();
  });
});
