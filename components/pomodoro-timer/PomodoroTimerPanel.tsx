"use client";

import React from "react";
import {
  Play,
  Pause,
  Save,
  Edit,
  List,
  X,
  Volume2,
} from "lucide-react";
import type {
  PomodoroSettings,
  AlarmSettings,
  TodoItem,
  FilterState,
} from "@/types";

export interface PomodoroTimerPanelProps {
  // Timer state
  isPomodoroRunning: boolean;
  pomodoroStartTime: Date | null;
  pomodoroElapsedTime: number;
  pomodoroState: "work" | "break";
  pomodoroSettings: PomodoroSettings;
  setPomodoroSettings: React.Dispatch<React.SetStateAction<PomodoroSettings>>;
  pomodoroCycles: number;

  // Task state
  currentPomodoroTask: string;
  setCurrentPomodoroTask: (v: string) => void;
  currentPomodoroTaskId: string | null;
  isEditingPomodoroTask: boolean;
  setIsEditingPomodoroTask: (v: boolean) => void;
  showTodoPicker: boolean;
  setShowTodoPicker: (v: boolean) => void;
  pomodoroTaskInputRef: React.RefObject<HTMLInputElement>;

  // IME composition ref (shared with parent)
  isComposingRef: React.MutableRefObject<boolean>;

  // Timer controls
  togglePomodoroTimer: () => Promise<void>;
  resetPomodoroTimer: () => void;

  // Task controls
  updatePomodoroTask: (text: string, todoId?: string | null) => void;
  clearPomodoroTask: () => void;

  // Utility functions
  formatTime: (seconds: number) => string;
  getEndTime: (startTime: Date | null, durationInSeconds: number) => string;
  getCountdown: (totalSeconds: number, elapsedSeconds: number) => string;

  // Alarm
  playAlarm: (settings: AlarmSettings, message?: string) => void;

  // Theme
  darkMode: boolean;

  // TODO picker data (for filter badge)
  filteredTodos: TodoItem[];
  filterState: FilterState;
}

export function PomodoroTimerPanel({
  isPomodoroRunning,
  pomodoroStartTime,
  pomodoroElapsedTime,
  pomodoroState,
  pomodoroSettings,
  setPomodoroSettings,
  pomodoroCycles,
  currentPomodoroTask,
  isEditingPomodoroTask,
  setIsEditingPomodoroTask,
  setShowTodoPicker,
  pomodoroTaskInputRef,
  isComposingRef,
  togglePomodoroTimer,
  resetPomodoroTimer,
  updatePomodoroTask,
  clearPomodoroTask,
  formatTime,
  getEndTime,
  getCountdown,
  playAlarm,
}: PomodoroTimerPanelProps) {
  return (
    <div
      id="pomodoro-timer-section"
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-white/20 dark:border-gray-700/20"
    >
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        ポモドーロタイマー
      </h2>

      {/* タイマー表示 */}
      <div
        className={`rounded-2xl p-6 sm:p-8 mb-4 sm:mb-6 shadow-2xl transition-all duration-500 ${
          pomodoroState === "work"
            ? "bg-gradient-to-br from-blue-500 to-indigo-600"
            : "bg-gradient-to-br from-yellow-500 to-orange-600"
        }`}
      >
        <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center mb-3 sm:mb-4 text-white tabular-nums tracking-tight">
          {formatTime(
            Math.max(
              0,
              (pomodoroState === "work"
                ? pomodoroSettings.workDuration
                : pomodoroSettings.breakDuration) *
                60 -
                pomodoroElapsedTime
            )
          )}
        </div>
        <div className="text-xl sm:text-2xl font-semibold text-center text-white/90 mb-2">
          {pomodoroState === "work" ? "🎯 作業時間" : "☕ 休憩時間"}
        </div>

        {/* 現在のタスク表示 */}
        <div className="mt-4 text-center min-h-14 flex flex-col items-center justify-center">
          {pomodoroState === "work" ? (
            isEditingPomodoroTask ? (
              <div className="flex gap-2 justify-center items-center">
                <input
                  ref={pomodoroTaskInputRef}
                  type="text"
                  defaultValue={currentPomodoroTask}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 w-64"
                  placeholder="現在のタスクを入力..."
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    setTimeout(() => {
                      isComposingRef.current = false;
                    }, 50);
                  }}
                  onKeyDown={(e) => {
                    if (
                      isComposingRef.current ||
                      e.nativeEvent.isComposing ||
                      e.key === "Process" ||
                      (
                        e as React.KeyboardEvent & {
                          keyCode?: number;
                        }
                      ).keyCode === 229
                    )
                      return;
                    if (e.key === "Enter") {
                      updatePomodoroTask(
                        pomodoroTaskInputRef.current?.value || "",
                        null
                      );
                      setIsEditingPomodoroTask(false);
                    } else if (e.key === "Escape") {
                      // キャンセル時は保存しない
                      setIsEditingPomodoroTask(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    updatePomodoroTask(
                      pomodoroTaskInputRef.current?.value || "",
                      null
                    );
                    setIsEditingPomodoroTask(false);
                  }}
                  className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  aria-label="保存"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 w-full">
                <div
                  className="cursor-pointer group p-2 rounded-lg hover:bg-white/10 transition-colors w-full"
                  onClick={() => setIsEditingPomodoroTask(true)}
                >
                  <h3 className="text-lg font-semibold text-white/90 break-words min-h-[28px]">
                    {currentPomodoroTask || "集中するタスクを設定..."}
                    <Edit className="w-4 h-4 inline-block ml-2 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTodoPicker(true)}
                    className="px-3 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-1"
                    title="TODOから選択"
                  >
                    <List className="w-3 h-3" />
                    TODO選択
                  </button>
                  {currentPomodoroTask && (
                    <button
                      type="button"
                      onClick={clearPomodoroTask}
                      className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition-colors flex items-center gap-1"
                      title="タスクをクリア"
                    >
                      <X className="w-3 h-3" />
                      クリア
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            <h3 className="text-lg font-semibold text-white/90">
              リフレッシュしましょう！
            </h3>
          )}
        </div>

        <div className="mt-3 text-base sm:text-lg text-center text-white/80 font-medium">
          サイクル: {pomodoroCycles} /{" "}
          {pomodoroSettings.infiniteMode ? "∞" : pomodoroSettings.cycles}
        </div>
      </div>

      {/* コントロールボタン */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <button
          type="button"
          onClick={togglePomodoroTimer}
          className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 ${
            isPomodoroRunning
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
              : "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
          }`}
        >
          {isPomodoroRunning ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span className="hidden sm:inline">
            {isPomodoroRunning ? "一時停止" : "開始"}
          </span>
          <span className="sm:hidden">
            {isPomodoroRunning ? "停止" : "開始"}
          </span>
        </button>
        <button
          type="button"
          onClick={resetPomodoroTimer}
          className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <span className="hidden sm:inline">リセット</span>
          <span className="sm:inline">Reset</span>
        </button>
      </div>

      {/* 時間情報 */}
      {pomodoroStartTime && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-100 dark:border-blue-900">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                開始:
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {pomodoroStartTime.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                終了予定:
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {getEndTime(
                  pomodoroStartTime,
                  (pomodoroState === "work"
                    ? pomodoroSettings.workDuration
                    : pomodoroSettings.breakDuration) * 60
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                残り:
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {getCountdown(
                  (pomodoroState === "work"
                    ? pomodoroSettings.workDuration
                    : pomodoroSettings.breakDuration) * 60,
                  pomodoroElapsedTime
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ポモドーロ設定 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-4 sm:p-6 mb-6 border border-blue-100 dark:border-blue-900">
        <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
          ポモドーロ設定
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
            <label className="flex flex-col gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                作業時間
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pomodoroSettings.workDuration}
                  onChange={(e) =>
                    setPomodoroSettings({
                      ...pomodoroSettings,
                      workDuration: Math.max(
                        1,
                        parseInt(e.target.value) || 1
                      ),
                    })
                  }
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  分
                </span>
              </div>
            </label>
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
            <label className="flex flex-col gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                休憩時間
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pomodoroSettings.breakDuration}
                  onChange={(e) =>
                    setPomodoroSettings({
                      ...pomodoroSettings,
                      breakDuration: Math.max(
                        1,
                        parseInt(e.target.value) || 1
                      ),
                    })
                  }
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  分
                </span>
              </div>
            </label>
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
            <label className="flex flex-col gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                サイクル数
              </span>
              <input
                type="number"
                value={pomodoroSettings.cycles}
                onChange={(e) =>
                  setPomodoroSettings({
                    ...pomodoroSettings,
                    cycles: Math.max(
                      1,
                      parseInt(e.target.value) || 1
                    ),
                  })
                }
                min="1"
                disabled={pomodoroSettings.infiniteMode}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500"
              />
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pomodoroSettings.infiniteMode}
              onChange={(e) =>
                setPomodoroSettings({
                  ...pomodoroSettings,
                  infiniteMode: e.target.checked,
                })
              }
              className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
              無限モード（サイクル数無制限）
            </span>
          </label>
        </div>
      </div>

      {/* 作業時間アラーム設定 */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-xl p-4 sm:p-6 mb-4 border border-blue-100 dark:border-blue-900">
        <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
          🎯 作業時間アラーム設定
        </h3>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3 sm:p-4">
            <label className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                    音量
                  </span>
                </div>
                <span className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">
                  {pomodoroSettings.workAlarm.volume}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={pomodoroSettings.workAlarm.volume}
                onChange={(e) =>
                  setPomodoroSettings({
                    ...pomodoroSettings,
                    workAlarm: {
                      ...pomodoroSettings.workAlarm,
                      volume: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 sm:p-4 flex-1">
              <label className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                  周波数:
                </span>
                <input
                  type="number"
                  value={pomodoroSettings.workAlarm.frequency}
                  onChange={(e) =>
                    setPomodoroSettings({
                      ...pomodoroSettings,
                      workAlarm: {
                        ...pomodoroSettings.workAlarm,
                        frequency: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full sm:w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Hz
                </span>
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                playAlarm(
                  pomodoroSettings.workAlarm,
                  "作業時間アラームテスト"
                )
              }
              className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base whitespace-nowrap"
            >
              テスト
            </button>
          </div>
        </div>
      </div>

      {/* 休憩時間アラーム設定 */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950 rounded-xl p-4 sm:p-6 border border-orange-100 dark:border-orange-900">
        <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
          ☕ 休憩時間アラーム設定
        </h3>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3 sm:p-4">
            <label className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                    音量
                  </span>
                </div>
                <span className="text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400">
                  {pomodoroSettings.breakAlarm.volume}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={pomodoroSettings.breakAlarm.volume}
                onChange={(e) =>
                  setPomodoroSettings({
                    ...pomodoroSettings,
                    breakAlarm: {
                      ...pomodoroSettings.breakAlarm,
                      volume: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 sm:p-4 flex-1">
              <label className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                  周波数:
                </span>
                <input
                  type="number"
                  value={pomodoroSettings.breakAlarm.frequency}
                  onChange={(e) =>
                    setPomodoroSettings({
                      ...pomodoroSettings,
                      breakAlarm: {
                        ...pomodoroSettings.breakAlarm,
                        frequency: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full sm:w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Hz
                </span>
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                playAlarm(
                  pomodoroSettings.breakAlarm,
                  "休憩時間アラームテスト"
                )
              }
              className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base whitespace-nowrap"
            >
              テスト
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
