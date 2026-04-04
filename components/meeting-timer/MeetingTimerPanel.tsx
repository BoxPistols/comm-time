"use client";

import {
  Timer,
  Clock,
  RefreshCw,
  Play,
  Pause,
  Plus,
  X,
  Volume2,
} from "lucide-react";
import type { AlarmPoint, AlarmSettings, TodoItem } from "@/types";

export interface MeetingTimerPanelProps {
  // Timer state
  isMeetingRunning: boolean;
  meetingStartTime: Date | null;
  meetingElapsedTime: number;

  // Alarm points
  alarmPoints: AlarmPoint[];
  alarmPointMinutesInput: Record<string, string>;
  setAlarmPointMinutesInput: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;

  // Alarm settings
  meetingAlarmSettings: AlarmSettings;
  setMeetingAlarmSettings: React.Dispatch<React.SetStateAction<AlarmSettings>>;
  defaultMeetingAlarmSettings: AlarmSettings;

  // Countdown / end-time mode
  countdownMode: boolean;
  setCountdownMode: (v: boolean) => void;
  targetEndTime: string;
  setTargetEndTime: (v: string) => void;
  countdownSeconds: number;
  endTimeInputMode: boolean;
  setEndTimeInputMode: (v: boolean) => void;
  progressPreset: number[];
  setProgressPreset: (v: number[]) => void;

  // Duration helpers
  remainingMeetingMinutes: number;
  meetingTotalDurationMinutes: number;

  // Timer controls
  toggleMeetingTimer: () => void;
  resetMeetingTimer: () => void;

  // Alarm point CRUD
  addAlarmPoint: () => void;
  updateAlarmPoint: (id: string, minutes: number) => void;
  removeAlarmPoint: (id: string) => void;
  generateAlarmPointsFromEndTime: (
    endTime: string,
    presets: number[]
  ) => void;

  // Formatting / display helpers
  formatTime: (seconds: number) => string;
  getEndTime: (startTime: Date | null, seconds: number) => string;

  // Sound
  playAlarm: (settings: AlarmSettings, label: string) => void;

  // Focus option
  forceFocus: boolean;
  setForceFocus: (v: boolean) => void;

  // Linked todos
  sharedTodos: TodoItem[];
}

export function MeetingTimerPanel({
  isMeetingRunning,
  meetingStartTime,
  meetingElapsedTime,
  alarmPoints,
  alarmPointMinutesInput,
  setAlarmPointMinutesInput,
  meetingAlarmSettings,
  setMeetingAlarmSettings,
  defaultMeetingAlarmSettings,
  countdownMode,
  setCountdownMode,
  targetEndTime,
  setTargetEndTime,
  countdownSeconds,
  endTimeInputMode,
  setEndTimeInputMode,
  progressPreset,
  setProgressPreset,
  remainingMeetingMinutes,
  meetingTotalDurationMinutes,
  toggleMeetingTimer,
  resetMeetingTimer,
  addAlarmPoint,
  updateAlarmPoint,
  removeAlarmPoint,
  generateAlarmPointsFromEndTime,
  formatTime,
  getEndTime,
  playAlarm,
  forceFocus,
  setForceFocus,
  sharedTodos,
}: MeetingTimerPanelProps) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-white/20 dark:border-gray-700/20">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
        ミーティングタイマー
      </h2>

      {/* カウントダウンモード切り替え */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 rounded-xl p-4 mb-4 border border-cyan-100 dark:border-cyan-900">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
              カウントダウンモード
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const newMode = !countdownMode;
              setCountdownMode(newMode);
              // カウントダウンモードをONにしたとき、終了時刻が未設定なら最後のアラームポイント分後を設定
              if (newMode && !targetEndTime) {
                const now = new Date();
                const lastAlarmMinutes =
                  alarmPoints[alarmPoints.length - 1]?.minutes || 60;
                const endTime = new Date(
                  now.getTime() + lastAlarmMinutes * 60 * 1000
                );
                const hours = endTime.getHours().toString().padStart(2, "0");
                const minutes = endTime
                  .getMinutes()
                  .toString()
                  .padStart(2, "0");
                setTargetEndTime(`${hours}:${minutes}`);
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              countdownMode
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {countdownMode ? "ON" : "OFF"}
          </button>
        </div>
        {countdownMode && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              終了時刻:
            </label>
            <input
              type="time"
              value={targetEndTime}
              onChange={(e) => setTargetEndTime(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:[color-scheme:dark]"
            />
          </div>
        )}
      </div>

      {/* エンド時間入力モード */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-xl p-4 mb-4 border border-amber-100 dark:border-amber-900">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
              終了時刻から逆算モード
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !endTimeInputMode;
              setEndTimeInputMode(next);
              if (next && !countdownMode) {
                setCountdownMode(true);
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              endTimeInputMode
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {endTimeInputMode ? "ON" : "OFF"}
          </button>
        </div>

        {endTimeInputMode && (
          <div className="space-y-4">
            {/* 終了時刻入力 */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                終了時刻:
              </label>
              <input
                type="time"
                value={targetEndTime}
                onChange={(e) => {
                  setTargetEndTime(e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:[color-scheme:dark]"
              />
              {targetEndTime && remainingMeetingMinutes > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  （残り約{remainingMeetingMinutes}分）
                </span>
              )}
            </div>

            {/* 進行率プリセット選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                アラーム進行率:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "25/50/75/100%", value: [25, 50, 75, 100] },
                  { label: "33/66/100%", value: [33, 66, 100] },
                  { label: "50/100%", value: [50, 100] },
                  { label: "25/50/100%", value: [25, 50, 100] },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setProgressPreset(preset.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                      JSON.stringify(progressPreset) ===
                      JSON.stringify(preset.value)
                        ? "bg-amber-500 text-white shadow-md"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* アラーム自動生成ボタン */}
            <button
              type="button"
              onClick={() =>
                generateAlarmPointsFromEndTime(targetEndTime, progressPreset)
              }
              disabled={!targetEndTime}
              className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>アラームポイントを自動生成</span>
            </button>

            {/* プレビュー表示 */}
            {targetEndTime &&
              (meetingTotalDurationMinutes || remainingMeetingMinutes) > 0 && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    生成されるアラームポイント:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {progressPreset.map((percent) => {
                      const baseMinutes =
                        meetingTotalDurationMinutes || remainingMeetingMinutes;
                      const minutes = Math.round(
                        (baseMinutes * percent) / 100
                      );
                      return (
                        <span
                          key={percent}
                          className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded text-xs font-medium"
                        >
                          {percent}% = {minutes}分
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* タイマー表示 */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 sm:p-8 mb-4 sm:mb-6 shadow-2xl">
        <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center mb-3 sm:mb-4 text-white tabular-nums tracking-tight">
          {countdownMode
            ? formatTime(countdownSeconds)
            : formatTime(meetingElapsedTime)}
        </div>
        <div className="text-xl sm:text-2xl lg:text-3xl font-semibold text-center text-white/90 tabular-nums">
          {countdownMode ? (
            "残り時間"
          ) : (
            <>
              残り:{" "}
              {formatTime(
                Math.max(
                  0,
                  alarmPoints[alarmPoints.length - 1]?.minutes * 60 -
                    meetingElapsedTime
                )
              )}
            </>
          )}
        </div>

        {/* プログレスバー */}
        {endTimeInputMode &&
          isMeetingRunning &&
          meetingTotalDurationMinutes > 0 &&
          (() => {
            const totalSeconds = meetingTotalDurationMinutes * 60;
            const progressPercent =
              totalSeconds > 0
                ? Math.min(100, (meetingElapsedTime / totalSeconds) * 100)
                : 0;

            return (
              <div className="mt-4 space-y-2">
                <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-1000 ease-linear"
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                  {/* アラームポイントマーカー */}
                  {alarmPoints.map((point) => {
                    const position =
                      meetingTotalDurationMinutes > 0
                        ? (point.minutes / meetingTotalDurationMinutes) * 100
                        : 0;
                    const clampedPosition = Math.max(
                      0,
                      Math.min(100, position)
                    );
                    return (
                      <div
                        key={point.id}
                        className={`absolute top-0 w-1 h-full ${point.isDone ? "bg-green-300" : "bg-white/60"}`}
                        style={{ left: `${clampedPosition}%` }}
                        title={`${point.minutes}分 (${Math.round(clampedPosition)}%)`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-white/70">
                  <span>0%</span>
                  <span className="font-medium">
                    {Math.round(progressPercent)}% 経過
                  </span>
                  <span>100%</span>
                </div>
              </div>
            );
          })()}
      </div>

      {/* コントロールボタン */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <button
          type="button"
          onClick={toggleMeetingTimer}
          className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 ${
            isMeetingRunning
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
              : "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
          }`}
        >
          {isMeetingRunning ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span className="hidden sm:inline">
            {isMeetingRunning ? "一時停止" : "開始"}
          </span>
          <span className="sm:hidden">
            {isMeetingRunning ? "停止" : "開始"}
          </span>
        </button>
        <button
          type="button"
          onClick={resetMeetingTimer}
          className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <span>リセット</span>
        </button>
      </div>

      {/* 時間情報 */}
      {meetingStartTime && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-100 dark:border-blue-900">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                開始:
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {meetingStartTime.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                終了予定:
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {getEndTime(
                  meetingStartTime,
                  alarmPoints[alarmPoints.length - 1]?.minutes * 60 || 0
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* アラームポイント */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">
          アラームポイント
        </h3>
        <div className="space-y-2 sm:space-y-3">
          {alarmPoints.map((point) => (
            <div
              key={point.id}
              className={`flex flex-wrap items-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                point.isDone
                  ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800"
                  : "bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-950 border border-gray-200 dark:border-gray-700"
              }`}
            >
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={
                  alarmPointMinutesInput[point.id] ?? String(point.minutes)
                }
                onChange={(e) => {
                  const value = e.target.value;
                  // 空 or 数字のみ許可（編集途中の文字列は保持して、確定はblurで行う）
                  if (value === "" || /^\d+$/.test(value)) {
                    setAlarmPointMinutesInput((prev) => ({
                      ...prev,
                      [point.id]: value,
                    }));

                    if (value !== "") {
                      const numValue = parseInt(value, 10);
                      if (!Number.isNaN(numValue) && numValue > 0) {
                        updateAlarmPoint(point.id, numValue);
                      }
                    }
                  }
                }}
                onBlur={(e) => {
                  const raw = e.target.value;
                  const numValue = parseInt(raw, 10);
                  const normalized =
                    Number.isNaN(numValue) || numValue <= 0 ? 1 : numValue;

                  updateAlarmPoint(point.id, normalized);
                  setAlarmPointMinutesInput((prev) => {
                    const next = { ...prev };
                    delete next[point.id];
                    return next;
                  });
                }}
                onFocus={(e) => e.target.select()}
                className="w-16 sm:w-20 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                分
              </span>
              <span className="text-sm sm:text-base font-mono font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 px-2 sm:px-3 py-1 rounded-lg">
                {formatTime(point.remainingTime)}
              </span>
              {point.isDone ? (
                <span className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 sm:px-3 py-1 rounded-full">
                  ✓ 完了
                </span>
              ) : (
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                  終了予定:{" "}
                  {getEndTime(meetingStartTime, point.minutes * 60)}
                </span>
              )}
              {point.linkedTodo && (
                <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 sm:px-3 py-1 rounded-full">
                  {
                    sharedTodos.find(
                      (todo) => todo.id === point.linkedTodo
                    )?.text
                  }
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAlarmPoint(point.id)}
                className="ml-auto p-1.5 sm:p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addAlarmPoint}
          className="mt-3 sm:mt-4 w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">
            アラームポイントを追加
          </span>
        </button>
      </div>

      {/* アラーム設定 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl p-4 sm:p-6 border border-purple-100 dark:border-purple-900">
        <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
          ミーティングアラーム設定
        </h3>

        <div className="space-y-4">
          {/* 音量設定 */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3 sm:p-4">
            <label className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                    音量
                  </span>
                </div>
                <span className="text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {meetingAlarmSettings.volume}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={meetingAlarmSettings.volume}
                onChange={(e) =>
                  setMeetingAlarmSettings({
                    ...meetingAlarmSettings,
                    volume: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </label>
          </div>

          {/* 周波数設定 */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3 sm:p-4">
            <label className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                周波数:
              </span>
              <input
                type="number"
                value={meetingAlarmSettings.frequency}
                onChange={(e) =>
                  setMeetingAlarmSettings({
                    ...meetingAlarmSettings,
                    frequency: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full sm:w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Hz
              </span>
            </label>
          </div>

          {/* ボタン群 */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                playAlarm(meetingAlarmSettings, "アラームテスト")
              }
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
            >
              テスト
            </button>
            <button
              type="button"
              onClick={() =>
                setMeetingAlarmSettings(defaultMeetingAlarmSettings)
              }
              className="px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
            >
              リセット
            </button>
          </div>
        </div>

        {/* その他オプション */}
        <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={forceFocus}
              onChange={(e) => setForceFocus(e.target.checked)}
              className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              アラーム時に強制的にこのタブにフォーカスする
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
