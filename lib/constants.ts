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
