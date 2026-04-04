"use client";

import React from "react";
import {
  Clock,
  Volume2,
  Bell,
  BellOff,
  Vibrate,
  Zap,
  Settings,
  LogIn,
  LogOut,
  Database,
  Briefcase,
  AlarmClock,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

export interface AppHeaderProps {
  currentTime: Date | null;
  showLoginButton: boolean;
  isAuthenticated: boolean;
  user: User | null;
  isSupabaseConfigured: boolean;
  useDatabase: boolean;
  setUseDatabase: (value: boolean) => void;
  setAuthDialogOpen: (value: boolean) => void;
  signOut: () => void;
  isAlarmRinging: boolean;
  stopAlarm: () => void;
  setSettingsOpen: (value: boolean) => void;
  tickSoundEnabled: boolean;
  setTickSoundEnabled: (value: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (value: boolean) => void;
  flashEnabled: boolean;
  setFlashEnabled: (value: boolean) => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  deadlineAlertEnabled: boolean;
  setDeadlineAlertEnabled: (value: boolean) => void;
  deadlineAlertMinutes: number;
  setDeadlineAlertMinutes: (value: number) => void;
  workMode: boolean;
  setWorkMode: (value: boolean) => void;
}

export function AppHeader({
  currentTime,
  showLoginButton,
  isAuthenticated,
  user,
  isSupabaseConfigured,
  useDatabase,
  setUseDatabase,
  setAuthDialogOpen,
  signOut,
  isAlarmRinging,
  stopAlarm,
  setSettingsOpen,
  tickSoundEnabled,
  setTickSoundEnabled,
  vibrationEnabled,
  setVibrationEnabled,
  flashEnabled,
  setFlashEnabled,
  notificationsEnabled,
  toggleNotifications,
  deadlineAlertEnabled,
  setDeadlineAlertEnabled,
  deadlineAlertMinutes,
  setDeadlineAlertMinutes,
  workMode,
  setWorkMode,
}: AppHeaderProps) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-white/20 dark:border-gray-700/20">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              Comm Time
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-700 dark:text-gray-300 font-semibold tabular-nums">
              現在時刻:{" "}
              {currentTime ? currentTime.toLocaleTimeString() : "--:--:--"}
            </p>
          </div>
        </div>

        {/* 設定ボタン群 */}
        <div className="flex gap-2 items-center">
          {/* ログイン/ユーザー情報 (URLパラメータ ?user=login の時のみ表示) */}
          {showLoginButton && (
            <>
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2">
                  <div
                    className="hidden sm:flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-bold text-sm uppercase"
                    title={user.email}
                  >
                    {user.email?.slice(0, 2) || "U"}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSupabaseConfigured && !useDatabase) {
                        alert(
                          "Supabaseが設定されていません。\n\n" +
                            "データベース機能を使用するには：\n" +
                            "1. https://supabase.com/dashboard でプロジェクトを作成\n" +
                            "2. プロジェクトのURLとAPIキーを取得\n" +
                            "3. .env.local ファイルに以下を設定：\n" +
                            "   NEXT_PUBLIC_SUPABASE_URL=your-project-url\n" +
                            "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n" +
                            "4. 開発サーバーを再起動\n\n" +
                            "詳細は SUPABASE_SETUP.md を参照してください。"
                        );
                        return;
                      }
                      setUseDatabase(!useDatabase);
                    }}
                    className={`p-2 rounded-xl transition-all duration-200 ${
                      useDatabase
                        ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                    title={
                      useDatabase
                        ? "データベース連携 ON"
                        : "データベース連携 OFF"
                    }
                  >
                    <Database className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="p-2 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 text-white hover:shadow-lg transition-all"
                    title="ログアウト"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthDialogOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">ログイン</span>
                </button>
              )}
            </>
          )}

          {/* アラーム停止ボタン（鳴っている時のみ表示） */}
          {isAlarmRinging && (
            <button
              type="button"
              onClick={stopAlarm}
              className="px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow-lg hover:shadow-xl animate-pulse"
            >
              <span className="text-sm sm:text-base">アラーム停止</span>
            </button>
          )}

          {/* 設定ボタン */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            title="設定"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* チクタク音設定 */}
          <button
            type="button"
            onClick={() => setTickSoundEnabled(!tickSoundEnabled)}
            className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${
              tickSoundEnabled
                ? "bg-gradient-to-br from-green-500 to-teal-500 text-white shadow-lg"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title={tickSoundEnabled ? "チクタク音 ON" : "チクタク音 OFF"}
          >
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* バイブレーション設定 */}
          <button
            type="button"
            onClick={() => setVibrationEnabled(!vibrationEnabled)}
            className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${
              vibrationEnabled
                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title={
              vibrationEnabled
                ? "バイブレーション ON"
                : "バイブレーション OFF"
            }
          >
            <Vibrate className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* フラッシュ設定 */}
          <button
            type="button"
            onClick={() => setFlashEnabled(!flashEnabled)}
            className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${
              flashEnabled
                ? "bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title={flashEnabled ? "フラッシュ ON" : "フラッシュ OFF"}
          >
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* 通知設定 */}
          <button
            type="button"
            onClick={toggleNotifications}
            className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${
              notificationsEnabled
                ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title={notificationsEnabled ? "通知 ON" : "通知 OFF"}
          >
            {notificationsEnabled ? (
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <BellOff className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* 締切アラート設定 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDeadlineAlertEnabled(!deadlineAlertEnabled)}
              className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${
                deadlineAlertEnabled
                  ? "bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              title={deadlineAlertEnabled ? `締切アラート ON (${deadlineAlertMinutes}分前)` : "締切アラート OFF"}
            >
              <AlarmClock className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            {deadlineAlertEnabled && (
              <select
                value={deadlineAlertMinutes}
                onChange={(e) => setDeadlineAlertMinutes(Number(e.target.value))}
                className="absolute top-full left-0 mt-1 px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg z-10 dark:[color-scheme:dark]"
                title="締切何分前にアラートするか"
              >
                <option value={15}>15分前</option>
                <option value={30}>30分前</option>
                <option value={60}>1時間前</option>
                <option value={120}>2時間前</option>
                <option value={180}>3時間前</option>
                <option value={1440}>1日前</option>
              </select>
            )}
          </div>

          {/* ワークモード設定（モバイルでToDo/メモを上部に表示） */}
          <button
            type="button"
            onClick={() => setWorkMode(!workMode)}
            className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 lg:hidden ${
              workMode
                ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title={
              workMode
                ? "ワークモード ON（ToDo/メモ優先）"
                : "ワークモード OFF（タイマー優先）"
            }
          >
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
