import type {
  AlarmPoint,
  AlarmSettings,
  PomodoroSettings,
  KanbanStatusColumn,
  PriorityLevel,
  ImportanceLevel,
  FilterState,
} from "@/types";

// ミーティングタイマーの初期アラームポイント
export const INITIAL_MEETING_ALARM_POINTS: AlarmPoint[] = [
  { id: "1", minutes: 30, isDone: false, remainingTime: 30 * 60 },
  { id: "2", minutes: 50, isDone: false, remainingTime: 50 * 60 },
  { id: "3", minutes: 60, isDone: false, remainingTime: 60 * 60 },
];

// ミーティングタイマーの初期アラーム設定
export const INITIAL_MEETING_ALARM_SETTINGS: AlarmSettings = {
  volume: 44,
  frequency: 340,
};

// ポモドーロタイマーの初期設定
export const INITIAL_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  cycles: 4,
  infiniteMode: false,
  workAlarm: {
    volume: 65,
    frequency: 240,
  },
  breakAlarm: {
    volume: 36,
    frequency: 740,
  },
};

// デフォルトのプログレスプリセット
export const DEFAULT_PROGRESS_PRESET = [25, 50, 75, 100];

// デフォルトのアラームポイント（分）
export const DEFAULT_MEETING_ALARM_POINT_MINUTES = [30, 50, 60];

// カレンダー連携 UI の表示文字列（i18n 対象のため定数化）
export const CALENDAR_TEXT = {
  tabLabel: "カレンダー",
  tabLabelShort: "カレンダー",
  viewToday: "今日",
  viewDays: "4日",
  viewWeek: "週",
  viewMonth: "月",
  viewAgenda: "予定リスト",
  connectTitle: "Google カレンダーと連携",
  connectDescription:
    "Google カレンダーを連携すると、予定の確認・メモ・優先度づけを comm-time 内で行えます。予定の読み取りのみで、カレンダー側のデータは変更しません。",
  connectButton: "Google カレンダーを連携する",
  connectRequiresLogin: "カレンダー連携にはログインが必要です",
  connectNotConfigured:
    "サーバーに Google API の設定がありません。環境変数（GOOGLE_CLIENT_ID など）を設定してください。",
  connectedAs: "連携中:",
  disconnectButton: "連携を解除",
  disconnectConfirm: "Google カレンダーとの連携を解除しますか？（メモや優先度は残ります）",
  calendarSelectLabel: "表示するカレンダー",
  syncButton: "今すぐ同期",
  syncInProgress: "同期中...",
  lastSyncedPrefix: "最終同期:",
  neverSynced: "未同期",
  reauthRequired: "Google との接続が切れています。再連携してください。",
  noEventsToday: "今日の予定はありません",
  noEventsWeek: "今週の予定はありません",
  noEventsMonth: "今月の予定はありません",
  noEventsAgenda: "表示できる予定はありません",
  navPrev: "前へ",
  navNext: "次へ",
  navToday: "今日",
  bulkTodoButton: "予定をTODO化",
  bulkTodoTitle: "予定をまとめてTODOに追加",
  bulkTodoDescription: "選択した予定をTODOとして作成し、予定にリンクします。",
  bulkTodoSelectAll: "すべて選択",
  bulkTodoDeselectAll: "選択を解除",
  bulkTodoEmpty: "TODO化できる予定はありません",
  bulkTodoAlreadyLinked: "リンク済み",
  bulkTodoSubmit: "選択した予定をTODOに追加",
  bulkTodoSubmitting: "追加中...",
  bulkTodoSelectedCount: "件選択中",
  bulkTodoResultSuccess: "件のTODOを作成しました",
  bulkTodoResultPartial: "件の作成に失敗しました",
  bulkTodoResultUnlinked: "件はTODOを作成しましたが予定へのリンクに失敗しました",
  allDayLabel: "終日",
  openMeetingLink: "会議に参加",
  eventDetailTitle: "予定の詳細",
  memoLabel: "メモ（Markdown 対応）",
  memoPlaceholder: "この予定に関するメモ・アジェンダ・ナレッジを記録...",
  priorityLabel: "優先度",
  importanceLabel: "重要度",
  scopeLabel: "適用範囲",
  scopeInstance: "この回のみ",
  scopeSeries: "繰り返し全体",
  saveAnnotation: "保存",
  savingAnnotation: "保存中...",
  deleteAnnotation: "注釈を削除",
  annotationSaved: "保存しました",
  attendeesSuffix: "人参加",
  locationLabel: "場所",
  priorityNames: {
    high: "高",
    medium: "中",
    low: "低",
    none: "なし",
  },
  weekdayLabels: ["月", "火", "水", "木", "金", "土", "日"],
  todayBadge: "今日",
  errorLoadFailed: "予定の取得に失敗しました",
  errorSyncFailed: "同期に失敗しました",
  errorConnectFailed: "連携の開始に失敗しました",
  connectedToast: "Google カレンダーを連携しました",
  connectErrorToast: "Google カレンダーの連携に失敗しました",
} as const;

// ---
// TODO / カンバン / タグ 定数（types/index.ts から移動）
// ---

// 優先度・重要度設定の共通型（PRIORITY_CONFIG と IMPORTANCE_CONFIG は値が同一）
type LevelConfig = {
  label: string;
  color: string;
  icon: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
  activeClass: string;
};

const LEVEL_CONFIG: Record<PriorityLevel, LevelConfig> = {
  high: { label: "高", color: "red", icon: "", bgClass: "bg-red-500", textClass: "text-red-600", badgeClass: "bg-red-100 text-red-700", activeClass: "bg-red-500 text-white" },
  medium: { label: "中", color: "yellow", icon: "", bgClass: "bg-yellow-500", textClass: "text-yellow-600", badgeClass: "bg-yellow-100 text-yellow-700", activeClass: "bg-yellow-500 text-black" },
  low: { label: "低", color: "blue", icon: "", bgClass: "bg-blue-500", textClass: "text-blue-600", badgeClass: "bg-blue-100 text-blue-700", activeClass: "bg-blue-500 text-white" },
  none: { label: "-", color: "gray", icon: "", bgClass: "bg-gray-500", textClass: "text-gray-600", badgeClass: "bg-gray-100 text-gray-700", activeClass: "bg-gray-500 text-white" },
};

export const PRIORITY_CONFIG: Record<PriorityLevel, LevelConfig> = LEVEL_CONFIG;
export const IMPORTANCE_CONFIG: Record<ImportanceLevel, LevelConfig> = LEVEL_CONFIG;

export const KANBAN_STATUS_COLORS = [
  { name: "グレー", color: "gray", bgClass: "bg-gray-500", textClass: "text-gray-600", borderClass: "border-gray-300", activeClass: "bg-gray-500 text-white" },
  { name: "ブルー", color: "blue", bgClass: "bg-blue-500", textClass: "text-blue-600", borderClass: "border-blue-300", activeClass: "bg-blue-500 text-white" },
  { name: "イエロー", color: "yellow", bgClass: "bg-yellow-500", textClass: "text-yellow-600", borderClass: "border-yellow-300", activeClass: "bg-yellow-500 text-black" },
  { name: "グリーン", color: "green", bgClass: "bg-green-500", textClass: "text-green-600", borderClass: "border-green-300", activeClass: "bg-green-500 text-white" },
  { name: "レッド", color: "red", bgClass: "bg-red-500", textClass: "text-red-600", borderClass: "border-red-300", activeClass: "bg-red-500 text-white" },
  { name: "オレンジ", color: "orange", bgClass: "bg-orange-500", textClass: "text-orange-600", borderClass: "border-orange-300", activeClass: "bg-orange-500 text-white" },
  { name: "パープル", color: "purple", bgClass: "bg-purple-500", textClass: "text-purple-600", borderClass: "border-purple-300", activeClass: "bg-purple-500 text-white" },
  { name: "ピンク", color: "pink", bgClass: "bg-pink-500", textClass: "text-pink-600", borderClass: "border-pink-300", activeClass: "bg-pink-500 text-white" },
  { name: "インディゴ", color: "indigo", bgClass: "bg-indigo-500", textClass: "text-indigo-600", borderClass: "border-indigo-300", activeClass: "bg-indigo-500 text-white" },
  { name: "ティール", color: "teal", bgClass: "bg-teal-500", textClass: "text-teal-600", borderClass: "border-teal-300", activeClass: "bg-teal-500 text-white" },
];

export const TAG_COLORS = [
  { name: "レッド", value: "bg-red-500", textColor: "text-white" },
  { name: "オレンジ", value: "bg-orange-500", textColor: "text-white" },
  { name: "イエロー", value: "bg-yellow-500", textColor: "text-black" },
  { name: "グリーン", value: "bg-green-500", textColor: "text-white" },
  { name: "ブルー", value: "bg-blue-500", textColor: "text-white" },
  { name: "インディゴ", value: "bg-indigo-500", textColor: "text-white" },
  { name: "パープル", value: "bg-purple-500", textColor: "text-white" },
  { name: "ピンク", value: "bg-pink-500", textColor: "text-white" },
  { name: "グレー", value: "bg-gray-500", textColor: "text-white" },
  { name: "ティール", value: "bg-teal-500", textColor: "text-white" },
];

export const DEFAULT_KANBAN_COLUMNS: KanbanStatusColumn[] = [
  { id: "backlog", user_id: "", name: "backlog", label: "Backlog", color: "gray", bgClass: "bg-gray-500", textClass: "text-gray-600", borderClass: "border-gray-300", activeClass: "bg-gray-500 text-white", sortOrder: 0, isDefault: true },
  { id: "todo", user_id: "", name: "todo", label: "Todo", color: "blue", bgClass: "bg-blue-500", textClass: "text-blue-600", borderClass: "border-blue-300", activeClass: "bg-blue-500 text-white", sortOrder: 1, isDefault: false },
  { id: "doing", user_id: "", name: "doing", label: "Doing", color: "yellow", bgClass: "bg-yellow-500", textClass: "text-yellow-600", borderClass: "border-yellow-300", activeClass: "bg-yellow-500 text-black", sortOrder: 2, isDefault: false },
  { id: "done", user_id: "", name: "done", label: "Done", color: "green", bgClass: "bg-green-500", textClass: "text-green-600", borderClass: "border-green-300", activeClass: "bg-green-500 text-white", sortOrder: 3, isDefault: false },
];

export const KANBAN_COLUMNS = DEFAULT_KANBAN_COLUMNS;

export const initialFilterState: FilterState = {
  tags: [],
  priority: "all",
  importance: "all",
  kanbanStatus: "all",
};
