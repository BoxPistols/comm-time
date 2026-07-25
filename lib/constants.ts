import type { AlarmPoint, AlarmSettings, PomodoroSettings } from "@/types";

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
