"use client";

import React from "react";
import {
  Bell,
  Database,
  LogIn,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  Vibrate,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  VIBRATION_PATTERNS,
  VIBRATION_PATTERN_KEYS,
  type VibrationPatternKey,
} from "@/hooks/useHapticFeedback";
import type { AlarmSettings, PomodoroSettings } from "@/types";
import type { User } from "@supabase/supabase-js";

export interface SettingsDialogProps {
  // Dialog open state
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // Tick sound settings
  tickSoundEnabled: boolean;
  setTickSoundEnabled: (enabled: boolean) => void;
  tickSoundVolume: number;
  setTickSoundVolume: (volume: number) => void;

  // Alarm summary
  meetingAlarmSettings: AlarmSettings;
  pomodoroSettings: PomodoroSettings;

  // Notification & effects
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (enabled: boolean) => void;
  vibrationPattern: VibrationPatternKey;
  setVibrationPattern: (pattern: VibrationPatternKey) => void;
  triggerAlarmVibration: (pattern: VibrationPatternKey) => void;
  flashEnabled: boolean;
  setFlashEnabled: (enabled: boolean) => void;
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;

  // Default value settings - meeting alarm
  defaultMeetingAlarmPoints: number[];
  setDefaultMeetingAlarmPoints: (points: number[]) => void;
  defaultMeetingAlarmSettings: AlarmSettings;
  setDefaultMeetingAlarmSettings: (settings: AlarmSettings) => void;

  // Default value settings - pomodoro
  defaultPomodoroWorkDuration: number;
  setDefaultPomodoroWorkDuration: (duration: number) => void;
  defaultPomodoroBreakDuration: number;
  setDefaultPomodoroBreakDuration: (duration: number) => void;
  defaultPomodoroCycles: number;
  setDefaultPomodoroCycles: (cycles: number) => void;
  defaultPomodoroWorkAlarm: AlarmSettings;
  setDefaultPomodoroWorkAlarm: (settings: AlarmSettings) => void;
  defaultPomodoroBreakAlarm: AlarmSettings;
  setDefaultPomodoroBreakAlarm: (settings: AlarmSettings) => void;

  // Sound preview
  previewSound: (settings: AlarmSettings) => void;

  // Account settings
  isAuthenticated: boolean;
  user: User | null;
  signOut: () => void;
  useDatabase: boolean;
  setUseDatabase: (enabled: boolean) => void;
  setAuthDialogOpen: (open: boolean) => void;

  // Reset
  resetToDefaults: () => void;
}

export function SettingsDialog({
  settingsOpen,
  setSettingsOpen,
  tickSoundEnabled,
  setTickSoundEnabled,
  tickSoundVolume,
  setTickSoundVolume,
  meetingAlarmSettings,
  pomodoroSettings,
  notificationsEnabled,
  toggleNotifications,
  vibrationEnabled,
  setVibrationEnabled,
  vibrationPattern,
  setVibrationPattern,
  triggerAlarmVibration,
  flashEnabled,
  setFlashEnabled,
  darkMode,
  setDarkMode,
  defaultMeetingAlarmPoints,
  setDefaultMeetingAlarmPoints,
  defaultMeetingAlarmSettings,
  setDefaultMeetingAlarmSettings,
  defaultPomodoroWorkDuration,
  setDefaultPomodoroWorkDuration,
  defaultPomodoroBreakDuration,
  setDefaultPomodoroBreakDuration,
  defaultPomodoroCycles,
  setDefaultPomodoroCycles,
  defaultPomodoroWorkAlarm,
  setDefaultPomodoroWorkAlarm,
  defaultPomodoroBreakAlarm,
  setDefaultPomodoroBreakAlarm,
  previewSound,
  isAuthenticated,
  user,
  signOut,
  useDatabase,
  setUseDatabase,
  setAuthDialogOpen,
  resetToDefaults,
}: SettingsDialogProps) {
  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-7xl h-[95vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 shadow-sm">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ⚙️ 設定
          </DialogTitle>
          <DialogDescription>
            サウンド、通知、その他の設定を調整できます
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* チクタク音設定 */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                チクタク音設定
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    チクタク音を有効にする
                  </span>
                  <button
                    type="button"
                    onClick={() => setTickSoundEnabled(!tickSoundEnabled)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      tickSoundEnabled
                        ? "bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {tickSoundEnabled ? "ON" : "OFF"}
                  </button>
                </div>

                {tickSoundEnabled && (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                    <label className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          音量
                        </span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {tickSoundVolume}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={tickSoundVolume}
                        onChange={(e) =>
                          setTickSoundVolume(parseInt(e.target.value))
                        }
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* アラーム設定サマリー */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
                アラーム設定
              </h3>

              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      ミーティングアラーム
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>音量: {meetingAlarmSettings.volume}</span>
                    <span>
                      周波数: {meetingAlarmSettings.frequency}
                      Hz
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      作業時間アラーム
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>音量: {pomodoroSettings.workAlarm.volume}</span>
                    <span>
                      周波数: {pomodoroSettings.workAlarm.frequency}
                      Hz
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      休憩時間アラーム
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>音量: {pomodoroSettings.breakAlarm.volume}</span>
                    <span>
                      周波数: {pomodoroSettings.breakAlarm.frequency}
                      Hz
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                ※ 各タイマーの設定画面で詳細を調整できます
              </p>
            </div>

            {/* 通知・エフェクト設定 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
                通知・エフェクト
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      通知
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleNotifications}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      notificationsEnabled
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {notificationsEnabled ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Vibrate className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      バイブレーション
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVibrationEnabled(!vibrationEnabled)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      vibrationEnabled
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {vibrationEnabled ? "ON" : "OFF"}
                  </button>
                </div>

                {/* 振動パターン選択 */}
                {vibrationEnabled && (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Vibrate className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        振動パターン
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {VIBRATION_PATTERN_KEYS.map((key) => {
                        const pattern = VIBRATION_PATTERNS[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setVibrationPattern(key);
                              triggerAlarmVibration(key);
                            }}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-left ${
                              vibrationPattern === key
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md ring-2 ring-purple-300 dark:ring-purple-700"
                                : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500"
                            }`}
                          >
                            <div className="font-semibold">
                              {pattern.label}
                            </div>
                            <div
                              className={`text-[10px] mt-0.5 ${
                                vibrationPattern === key
                                  ? "text-purple-100"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {pattern.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      フラッシュ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFlashEnabled(!flashEnabled)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      flashEnabled
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {flashEnabled ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    {darkMode ? (
                      <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      ダークモード
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDarkMode(!darkMode)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      darkMode
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {darkMode ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>

            {/* 初期値設定 */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                初期値設定
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                アラームやタイマーのデフォルト値を設定できます。これらの値は、設定をリセットする際に使用されます。
              </p>

              <div className="space-y-4">
                {/* ミーティングアラーム初期値 */}
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">
                    ミーティングアラーム
                  </h4>
                  <div className="space-y-4">
                    {/* アラームポイント設定 */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        デフォルトアラームポイント (分)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {defaultMeetingAlarmPoints.map((point, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900 px-2 py-1 rounded"
                          >
                            <input
                              type="number"
                              min="1"
                              max="180"
                              value={point}
                              onChange={(e) => {
                                const newPoints = [
                                  ...defaultMeetingAlarmPoints,
                                ];
                                newPoints[index] =
                                  parseInt(e.target.value) || 1;
                                setDefaultMeetingAlarmPoints(newPoints);
                              }}
                              className="w-14 px-1 py-0.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs"
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              分
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setDefaultMeetingAlarmPoints(
                                  defaultMeetingAlarmPoints.filter(
                                    (_, i) => i !== index
                                  )
                                );
                              }}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setDefaultMeetingAlarmPoints([
                              ...defaultMeetingAlarmPoints,
                              30,
                            ])
                          }
                          className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          追加
                        </button>
                      </div>
                    </div>

                    {/* 音量設定 */}
                    <label className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          デフォルト音量
                        </span>
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                          {defaultMeetingAlarmSettings.volume}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={defaultMeetingAlarmSettings.volume}
                        onChange={(e) =>
                          setDefaultMeetingAlarmSettings({
                            ...defaultMeetingAlarmSettings,
                            volume: parseInt(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                    </label>

                    {/* 周波数設定 */}
                    <label className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          デフォルト周波数 (Hz)
                        </span>
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                          {defaultMeetingAlarmSettings.frequency}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="100"
                        max="1000"
                        step="10"
                        value={defaultMeetingAlarmSettings.frequency}
                        onChange={(e) =>
                          setDefaultMeetingAlarmSettings({
                            ...defaultMeetingAlarmSettings,
                            frequency: Math.max(
                              100,
                              parseInt(e.target.value) || 100
                            ),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
                      />
                    </label>

                    {/* テストボタン */}
                    <button
                      type="button"
                      onClick={() =>
                        previewSound(defaultMeetingAlarmSettings)
                      }
                      className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <Volume2 className="w-4 h-4" />
                      音をテスト
                    </button>
                  </div>
                </div>

                {/* ポモドーロ初期値 */}
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">
                    ポモドーロタイマー
                  </h4>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        作業時間 (分)
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={defaultPomodoroWorkDuration}
                        onChange={(e) =>
                          setDefaultPomodoroWorkDuration(
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        休憩時間 (分)
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={defaultPomodoroBreakDuration}
                        onChange={(e) =>
                          setDefaultPomodoroBreakDuration(
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        サイクル数
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={defaultPomodoroCycles}
                        onChange={(e) =>
                          setDefaultPomodoroCycles(
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-sm"
                      />
                    </label>
                  </div>

                  <div className="space-y-3 mt-3">
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        作業アラーム
                      </h5>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              音量: {defaultPomodoroWorkAlarm.volume}
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={defaultPomodoroWorkAlarm.volume}
                              onChange={(e) =>
                                setDefaultPomodoroWorkAlarm({
                                  ...defaultPomodoroWorkAlarm,
                                  volume: parseInt(e.target.value),
                                })
                              }
                              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-600"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              周波数: {defaultPomodoroWorkAlarm.frequency}
                              Hz
                            </span>
                            <input
                              type="number"
                              min="100"
                              max="1000"
                              step="10"
                              value={defaultPomodoroWorkAlarm.frequency}
                              onChange={(e) =>
                                setDefaultPomodoroWorkAlarm({
                                  ...defaultPomodoroWorkAlarm,
                                  frequency: Math.max(
                                    100,
                                    parseInt(e.target.value) || 100
                                  ),
                                })
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            previewSound(defaultPomodoroWorkAlarm)
                          }
                          className="w-full px-2 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-semibold rounded transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          音をテスト
                        </button>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        休憩アラーム
                      </h5>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              音量: {defaultPomodoroBreakAlarm.volume}
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={defaultPomodoroBreakAlarm.volume}
                              onChange={(e) =>
                                setDefaultPomodoroBreakAlarm({
                                  ...defaultPomodoroBreakAlarm,
                                  volume: parseInt(e.target.value),
                                })
                              }
                              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-600"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              周波数: {defaultPomodoroBreakAlarm.frequency}
                              Hz
                            </span>
                            <input
                              type="number"
                              min="100"
                              max="1000"
                              step="10"
                              value={defaultPomodoroBreakAlarm.frequency}
                              onChange={(e) =>
                                setDefaultPomodoroBreakAlarm({
                                  ...defaultPomodoroBreakAlarm,
                                  frequency: Math.max(
                                    100,
                                    parseInt(e.target.value) || 100
                                  ),
                                })
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            previewSound(defaultPomodoroBreakAlarm)
                          }
                          className="w-full px-2 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-semibold rounded transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          音をテスト
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* アカウント設定 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    アカウント・データ同期
                  </h3>

                  {isAuthenticated && user ? (
                    <div className="space-y-4">
                      {/* ログイン中のユーザー情報 */}
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {user.email}
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                ログイン中
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => signOut()}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm rounded-lg transition-colors flex items-center gap-1"
                          >
                            <LogOut className="w-4 h-4" />
                            ログアウト
                          </button>
                        </div>
                      </div>

                      {/* データベース同期設定 */}
                      <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            クラウド同期
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            メモ・TODOをデータベースに保存
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUseDatabase(!useDatabase)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            useDatabase
                              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                              : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                          }`}
                        >
                          {useDatabase ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ログインすると、メモやTODOをクラウドに保存して複数デバイスで同期できます。
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsOpen(false);
                          setAuthDialogOpen(true);
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-5 h-5" />
                        ログイン / 新規登録
                      </button>
                    </div>
                  )}
                </div>

                {/* リセットボタン */}
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  現在の設定を初期値にリセット
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
