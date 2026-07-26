// タイマー関連の型定義
export type AlarmPoint = {
  id: string;
  minutes: number;
  isDone: boolean;
  linkedTodo?: string;
  remainingTime: number;
};

export type AlarmSettings = {
  volume: number;
  frequency: number;
};

// カレンダー連携によりデフォルトタブは calendar（docs/CALENDAR_INTEGRATION_PLAN.md FR-2.0）
export type TabType = "calendar" | "meeting" | "pomodoro";

export type PomodoroState = "work" | "break";

export type PomodoroSettings = {
  workDuration: number;
  breakDuration: number;
  cycles: number;
  infiniteMode: boolean;
  workAlarm: AlarmSettings;
  breakAlarm: AlarmSettings;
};

// TODO関連の型定義
export type TodoItem = {
  id: string;
  text: string;
  isCompleted: boolean;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  tagIds?: string[]; // タグIDの配列
  priority?: PriorityLevel; // 優先度
  importance?: ImportanceLevel; // 重要度
  kanbanStatus?: KanbanStatus; // カンバンステータス
};

// Supabase/ローカル両対応の TODO 型（alarmPointId を含む）
export type LocalTodoItem = {
  id: string;
  text: string;
  isCompleted: boolean;
  dueDate?: string;
  dueTime?: string;
  alarmPointId?: string;
  tagIds?: string[];
  priority?: PriorityLevel;
  importance?: ImportanceLevel;
  kanbanStatus?: KanbanStatus;
};

// ゴミ箱に入ったTODOの型
export type TrashedTodoItem = TodoItem & {
  deletedAt: string; // ISO形式の日時
};

// TODOのバージョン履歴の型
export type TodoVersion = {
  id: string;
  todoId: string;
  text: string;
  timestamp: string; // ISO形式の日時
  changeType: "create" | "update" | "delete";
};

// ゴミ箱に入ったメモの型
export type TrashedMemoItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  deletedAt: string;
};

// タグの型定義
export type Tag = {
  id: string;
  name: string;
  color: string; // Tailwindのカラークラス or hex
};

// 優先度レベル
export type PriorityLevel = "high" | "medium" | "low" | "none";

// 重要度レベル
export type ImportanceLevel = "high" | "medium" | "low" | "none";

// カンバンステータス（動的に管理されるため、string型を許容）
export type KanbanStatus = string;

// カンバンステータスの型定義（DBから取得）
export type KanbanStatusColumn = {
  id: string;
  user_id: string;
  name: string;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  activeClass: string;
  sortOrder: number;
  isDefault: boolean;
  created_at?: string;
  updated_at?: string;
};

// フィルター状態の型
export type FilterState = {
  tags: string[]; // タグIDの配列
  priority: PriorityLevel | "all";
  importance: ImportanceLevel | "all";
  kanbanStatus: KanbanStatus | "all";
};
