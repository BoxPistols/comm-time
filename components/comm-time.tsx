"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  Plus,
  Check,
  X,
  Edit,
  Save,
  Volume2,
  Clock,
  List,
  Timer,
  Settings,
  Calendar,
  ChevronDown,
  Trash2,
  RotateCcw,
  Tag as TagIcon,
  Filter,
  Columns,
  Flag,
  Star,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import {
  DragDropContext,
  Draggable,
} from "react-beautiful-dnd";
import { StrictModeDroppable } from "@/components/strict-mode-droppable";
// Dialog は SettingsDialog 内部で使用
import { AuthDialog } from "@/components/auth-dialog";
import { useAuth } from "@/hooks/useAuth";
// useSupabaseTodos は useTodoManager 内部で使用
// useSupabaseTags は useTagManager 内部で使用
import { useSupabasePomodoroTask } from "@/hooks/useSupabasePomodoroTask";
// import { useSupabaseMemos } from "@/hooks/useSupabaseMemos";
import { useMultipleMemos } from "@/hooks/useMultipleMemos";
import { MemoSwiper } from "@/components/memo-swiper";
import { type MemoData } from "@/components/markdown-memo";
import { isSupabaseConfigured } from "@/lib/supabase";
import { TagManager } from "@/components/tag-manager";
import { KanbanBoard } from "@/components/kanban-board";
import { KanbanStatusManager } from "@/components/kanban-status-manager";
import { FilterPanel } from "@/components/filter-panel";
import { TodoEditDialog } from "@/components/todo-edit-dialog";
import { AIChat } from "@/components/ai-chat";
import { SearchModal, type SearchResult } from "@/components/search-modal";
import { RichTextWithLinks } from "@/components/rich-text-with-links";
import { FlashOverlay } from "@/components/flash-overlay";
import { TabSwitcher } from "@/components/tab-switcher";
import { AppHeader } from "@/components/app-header";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useKanbanStatuses } from "@/hooks/useKanbanStatuses";
// VIBRATION_PATTERNS は SettingsDialog 内部で使用
import { useAlarmSystem } from "@/hooks/useAlarmSystem";
import { useMeetingTimer } from "@/hooks/useMeetingTimer";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { useDefaultSettings } from "@/hooks/useDefaultSettings";
import { useTagManager } from "@/hooks/useTagManager";
import { useTodoManager } from "@/hooks/useTodoManager";
import {
  type TabType,
  PRIORITY_CONFIG,
  IMPORTANCE_CONFIG,
  TAG_COLORS,
} from "@/types";
export function CommTimeComponent() {
  // クライアントサイドマウント状態（Hydration error回避）
  const [mounted, setMounted] = useState(false);

  // 認証関連
  const { user, isAuthenticated, signOut } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [useDatabase, setUseDatabase] = useState(() => {
    // ログイン状態かつSupabase設定済みの場合はデフォルトでON
    if (typeof window !== "undefined" && isSupabaseConfigured) {
      const saved = localStorage.getItem("useDatabase");
      if (saved !== null) {
        return JSON.parse(saved);
      }
      // 初期値: ログイン済みならtrue、未ログインならfalse
      return isAuthenticated;
    }
    return false;
  });
  // クライアントサイドのマウント状態
  const [showLoginButton, setShowLoginButton] = useState(false);

  // ローカルストレージから安全に値を取得するヘルパー関数
  const getStorageValue = (key: string, defaultValue: unknown) => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return saved; // JSON以外の文字列の場合
        }
      }
    }
    return defaultValue;
  };

  // 状態変数の定義
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // ローカルストレージからアクティブタブを復元
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("activeTab");
      if (saved && (saved === "meeting" || saved === "pomodoro")) {
        return saved as TabType;
      }
    }
    return "meeting";
  });

  // Supabaseフック
  const supabasePomodoroTask = useSupabasePomodoroTask(useDatabase ? user : null);

  // 複数メモ管理フック
  const multipleMemos = useMultipleMemos(user, useDatabase);

  // メモの閲覧位置を保存・復元
  const [memoActiveIndex, setMemoActiveIndex] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("memoActiveIndex");
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // メモインデックス変更時にlocalStorageに保存
  const handleMemoIndexChange = useCallback((index: number) => {
    setMemoActiveIndex(index);
    localStorage.setItem("memoActiveIndex", String(index));
  }, []);

  // カンバンステータス管理フック
  const kanbanStatusesHook = useKanbanStatuses(useDatabase ? user : null);

  // アラーム/通知/振動/フラッシュ/チクタク音システム
  const alarm = useAlarmSystem();
  const {
    isAlarmRinging, isFlashing, flashEnabled, setFlashEnabled,
    forceFocus, setForceFocus,
    notificationsEnabled,
    vibrationEnabled, setVibrationEnabled,
    vibrationPattern, setVibrationPattern,
    tickSoundEnabled, setTickSoundEnabled,
    tickSoundVolume, setTickSoundVolume,
    playAlarm, stopAlarm, playTickSound, previewSound,
    toggleNotifications, triggerAlarmVibration,
    tickAudioContextRef,
  } = alarm;

  // ミーティングタイマー
  const meeting = useMeetingTimer({ playAlarm, playTickSound, tickSoundEnabled, tickAudioContextRef });
  const {
    isMeetingRunning, meetingStartTime, meetingElapsedTime,
    alarmPoints, setAlarmPoints, meetingAlarmSettings, setMeetingAlarmSettings,
    alarmPointMinutesInput, setAlarmPointMinutesInput,
    countdownMode, setCountdownMode, targetEndTime, setTargetEndTime,
    countdownSeconds, endTimeInputMode, setEndTimeInputMode,
    progressPreset, setProgressPreset,
    remainingMeetingMinutes, meetingTotalDurationMinutes,
    toggleMeetingTimer, resetMeetingTimer,
    addAlarmPoint, updateAlarmPoint, removeAlarmPoint,
    generateAlarmPointsFromEndTime, formatTime, getEndTime, getCountdown,
  } = meeting;

  // ポモドーロタイマー
  const pomodoro = usePomodoroTimer({
    playAlarm, playTickSound, tickSoundEnabled, tickAudioContextRef,
    useDatabase, user,
    supabasePomodoroTask: supabasePomodoroTask,
  });
  const {
    isPomodoroRunning, pomodoroStartTime, pomodoroElapsedTime,
    pomodoroState, pomodoroSettings, setPomodoroSettings,
    pomodoroCycles,
    currentPomodoroTask, setCurrentPomodoroTask,
    currentPomodoroTaskId, setCurrentPomodoroTaskId,
    isEditingPomodoroTask, setIsEditingPomodoroTask,
    showTodoPicker, setShowTodoPicker,
    pomodoroTaskInputRef,
    togglePomodoroTimer, resetPomodoroTimer, startWithTodo,
    updatePomodoroTask, clearPomodoroTask,
  } = pomodoro;

  // TODO管理
  const todoManager = useTodoManager({ useDatabase, user, setAlarmPoints });
  const {
    sharedTodos, setSharedTodos,
    filteredTodos,
    editingTodoId, setEditingTodoId,
    setEditDialogTodoId, editDialogTodo,
    expandedDeadlineTodoId, setExpandedDeadlineTodoId,
    expandedTodoContentId, setExpandedTodoContentId,
    filterState, setFilterState, hasActiveFilters,
    sortByDeadline, setSortByDeadline,
    trashedTodos, setTrashedMemos,
    showTrash, setShowTrash,
    deadlineAlertEnabled, setDeadlineAlertEnabled,
    deadlineAlertMinutes, setDeadlineAlertMinutes,
    alertedTodoIdsRef,
    addTodo, toggleTodo, removeTodo, updateTodo,
    startEditingTodo, cancelEditingTodo,
    clearAllTodos, clearCompletedTodos,
    restoreTodo, permanentlyDeleteTodo, emptyTrash,
    updateTodoKanbanStatus, handleSaveTodoDetails,
    updateTodoDeadline, extendDeadline, getDeadlineStatus,
    sortTodosByDeadline, onDragEnd,
  } = todoManager;

  // タグ管理
  const tagManager = useTagManager({ useDatabase, user, setSharedTodos });
  const { tags, tagsMap, addTag, updateTag, deleteTag } = tagManager;

  // 設定モーダルの状態
  const [settingsOpen, setSettingsOpen] = useState(false);

  // タグ管理パネルの表示状態
  const [showTagManager, setShowTagManager] = useState(false);

  // カンバンモーダルの表示状態
  const [showKanbanModal, setShowKanbanModal] = useState(false);

  // ステータス管理モーダルの表示状態
  const [showStatusManager, setShowStatusManager] = useState(false);

  // AIチャットの表示状態
  const [showAIChat, setShowAIChat] = useState(false);

  // フィルターパネルの表示状態
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // ダークモードの状態
  const [darkMode, setDarkMode] = useState(false);

  // ワークモードの状態（モバイルでToDo/メモを上部に表示）
  const [workMode, setWorkMode] = useState(false);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [highlightedTodoId, setHighlightedTodoId] = useState<string | null>(null);
  const [highlightedMemoId, setHighlightedMemoId] = useState<string | null>(null);

  // 初期値設定
  const defaults = useDefaultSettings();
  const {
    defaultMeetingAlarmSettings, setDefaultMeetingAlarmSettings,
    defaultMeetingAlarmPoints, setDefaultMeetingAlarmPoints,
    defaultPomodoroWorkDuration, setDefaultPomodoroWorkDuration,
    defaultPomodoroBreakDuration, setDefaultPomodoroBreakDuration,
    defaultPomodoroCycles, setDefaultPomodoroCycles,
    defaultPomodoroWorkAlarm, setDefaultPomodoroWorkAlarm,
    defaultPomodoroBreakAlarm, setDefaultPomodoroBreakAlarm,
    resetToDefaults: resetToDefaultsFn,
  } = defaults;

  // refs
  const todoInputRef = useRef<HTMLInputElement>(null);
  const editingInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false); // 日本語入力（IME）変換中フラグ

  // クライアントサイドの初期化（Hydration error回避）
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());

    // URLパラメータチェック
    const params = new URLSearchParams(window.location.search);
    setShowLoginButton(params.get("user") === "login");
  }, []);

  // 初期データのロード
  useEffect(() => {
    setDarkMode(getStorageValue("darkMode", false));
    setWorkMode(getStorageValue("workMode", false));
  }, []);

  // アプリ設定の自動保存
  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
      localStorage.setItem("workMode", JSON.stringify(workMode));
      localStorage.setItem("useDatabase", JSON.stringify(useDatabase));
      localStorage.setItem("activeTab", activeTab);
    }
  }, [mounted, darkMode, workMode, useDatabase, activeTab]);

  // ポモドーロタスクのSupabase同期
  useEffect(() => {
    if (useDatabase && user && !supabasePomodoroTask.loading) {
      setCurrentPomodoroTask(supabasePomodoroTask.task.taskText);
      setCurrentPomodoroTaskId(supabasePomodoroTask.task.todoId);
    }
  }, [useDatabase, user, supabasePomodoroTask.task, supabasePomodoroTask.loading]);

  // 認証状態が変化した時にuseDatabaseを自動的に有効化
  useEffect(() => {
    if (isAuthenticated && isSupabaseConfigured && !useDatabase) {
      // ログイン状態でuseDatabaseがfalseの場合、自動的に有効にする
      setUseDatabase(true);
    }
  }, [isAuthenticated, useDatabase]);

  // ダークモード適用
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [darkMode]);

  // (アラーム関連: useAlarmSystem hookに移動済み)
  // (formatTime: useMeetingTimer hookに移動済み)

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // カンバンモーダルのESCキーで閉じる
  useEffect(() => {
    if (!showKanbanModal) return;

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowKanbanModal(false);
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [showKanbanModal]);

  // Cmd+K / Ctrl+K で検索モーダルを開く
  // Cmd+Shift+K / Ctrl+Shift+K でAIチャットを開く
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (e.shiftKey) {
          // Cmd+Shift+K: AIチャットを開く/閉じる
          if (isAuthenticated) {
            setShowAIChat((prev) => !prev);
          }
        } else {
          // Cmd+K: 検索モーダルを開く
          setShowSearchModal(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated]);

  // 検索結果選択時のハンドラ
  const handleSearchResultSelect = useCallback(
    (result: SearchResult) => {
      if (result.type === "todo") {
        // TODOタブに移動し、該当TODOをハイライト
        setActiveTab("meeting");
        setHighlightedTodoId(result.id);
        // 3秒後にハイライト解除
        setTimeout(() => setHighlightedTodoId(null), 3000);
        // 該当TODOにスクロール
        setTimeout(() => {
          const todoElement = document.getElementById(`todo-${result.id}`);
          if (todoElement) {
            todoElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      } else if (result.type === "memo") {
        // メモタブに移動し、該当メモをハイライト
        setActiveTab("meeting");
        setHighlightedMemoId(result.id);
        // 3秒後にハイライト解除
        setTimeout(() => setHighlightedMemoId(null), 3000);
        if (result.memoIndex !== undefined) {
          // メモのインデックスに移動
          handleMemoIndexChange(result.memoIndex);
        }
      }
    },
    [handleMemoIndexChange]
  );

  // 締切アラート設定の保存
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("deadlineAlertEnabled", String(deadlineAlertEnabled));
    localStorage.setItem("deadlineAlertMinutes", String(deadlineAlertMinutes));
  }, [deadlineAlertEnabled, deadlineAlertMinutes, mounted]);

  // 締切アラートのチェック（currentTimeの分が変わった時のみ実行）
  const lastCheckedMinuteRef = useRef<number>(-1);
  useEffect(() => {
    if (!deadlineAlertEnabled || !currentTime) return;

    const currentMinute = currentTime.getMinutes();
    // 分が変わっていなければスキップ
    if (lastCheckedMinuteRef.current === currentMinute) return;
    lastCheckedMinuteRef.current = currentMinute;

    const alertThreshold = deadlineAlertMinutes * 60 * 1000;

    sharedTodos.forEach((todo) => {
      if (todo.isCompleted || !todo.dueDate || alertedTodoIdsRef.current.has(todo.id)) {
        return;
      }

      const deadline = new Date(`${todo.dueDate}T${todo.dueTime || "23:59"}`);
      const timeUntilDeadline = deadline.getTime() - currentTime.getTime();

      if (timeUntilDeadline < 0) return;

      if (timeUntilDeadline <= alertThreshold) {
        const minutesLeft = Math.ceil(timeUntilDeadline / (60 * 1000));
        const message = `「${todo.text.slice(0, 20)}${todo.text.length > 20 ? "..." : ""}」の締切まであと${minutesLeft}分です`;
        playAlarm(meetingAlarmSettings, message);
        alertedTodoIdsRef.current.add(todo.id);
      }
    });
  }, [deadlineAlertEnabled, deadlineAlertMinutes, sharedTodos, currentTime, playAlarm, meetingAlarmSettings]);

  // (タイマーロジック: useMeetingTimer / usePomodoroTimer hookに移動済み)

  // 設定を初期値にリセット
  const resetToDefaults = useCallback(() => {
    resetToDefaultsFn(setMeetingAlarmSettings, setPomodoroSettings, pomodoroSettings);
  }, [resetToDefaultsFn, setMeetingAlarmSettings, setPomodoroSettings, pomodoroSettings]);

  // メモをゴミ箱に移動
  const moveMemotoTrash = useCallback((memo: MemoData) => {
    const trashedMemo = { ...memo, deletedAt: new Date().toISOString() };
    setTrashedMemos((prev) => [...prev, trashedMemo]);
  }, [setTrashedMemos]);

  // メモを削除（ゴミ箱に移動）
  const handleDeleteMemo = useCallback(
    (id: string) => { multipleMemos.deleteMemo(id, moveMemotoTrash); },
    [multipleMemos, moveMemotoTrash]
  );

  // SSR時はローディング表示（Hydration error回避）
  // CSSが読み込まれる前でも正しく表示されるようinline styleを使用
  if (!mounted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #eef2ff, #faf5ff, #fdf2f8)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {/* タイマー風ローディングアニメーション */}
          <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 24px' }}>
            <svg
              width="96"
              height="96"
              viewBox="0 0 100 100"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#loadingGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset="70"
                style={{
                  animation: 'spin 2s linear infinite',
                  transformOrigin: 'center',
                }}
              />
              <defs>
                <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            {/* 中央のタイマーアイコン（インラインSVG） */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: 'pulse 2s ease-in-out infinite' }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          {/* アプリ名 */}
          <h1
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 8,
            }}
          >
            Comm Time
          </h1>
          {/* ローディングテキスト */}
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p>
        </div>
        {/* アニメーション用のstyleタグ */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-4 px-4 sm:px-6 lg:px-8 relative">
      <FlashOverlay isFlashing={isFlashing} onStop={stopAlarm} />

      <div className="max-w-7xl mx-auto">
        <AppHeader
          currentTime={currentTime}
          showLoginButton={showLoginButton}
          isAuthenticated={isAuthenticated}
          user={user}
          isSupabaseConfigured={isSupabaseConfigured}
          useDatabase={useDatabase}
          setUseDatabase={setUseDatabase}
          setAuthDialogOpen={setAuthDialogOpen}
          signOut={signOut}
          isAlarmRinging={isAlarmRinging}
          stopAlarm={stopAlarm}
          setSettingsOpen={setSettingsOpen}
          tickSoundEnabled={tickSoundEnabled}
          setTickSoundEnabled={setTickSoundEnabled}
          vibrationEnabled={vibrationEnabled}
          setVibrationEnabled={setVibrationEnabled}
          flashEnabled={flashEnabled}
          setFlashEnabled={setFlashEnabled}
          notificationsEnabled={notificationsEnabled}
          toggleNotifications={toggleNotifications}
          deadlineAlertEnabled={deadlineAlertEnabled}
          setDeadlineAlertEnabled={setDeadlineAlertEnabled}
          deadlineAlertMinutes={deadlineAlertMinutes}
          setDeadlineAlertMinutes={setDeadlineAlertMinutes}
          workMode={workMode}
          setWorkMode={setWorkMode}
        />
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        <div
          className={`flex gap-4 sm:gap-6 lg:flex-row ${ 
            workMode
              ? "flex-col-reverse"
              : "flex-col"
          }`}
        >
          <div className="w-full lg:w-2/3">
            {activeTab === "meeting" && (
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
                          const lastAlarmMinutes = alarmPoints[alarmPoints.length - 1]?.minutes || 60;
                          const endTime = new Date(now.getTime() + lastAlarmMinutes * 60 * 1000);
                          const hours = endTime.getHours().toString().padStart(2, "0");
                          const minutes = endTime.getMinutes().toString().padStart(2, "0");
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
                                JSON.stringify(progressPreset) === JSON.stringify(preset.value)
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
                        onClick={() => generateAlarmPointsFromEndTime(targetEndTime, progressPreset)}
                        disabled={!targetEndTime}
                        className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>アラームポイントを自動生成</span>
                      </button>

                      {/* プレビュー表示 */}
                      {targetEndTime && (meetingTotalDurationMinutes || remainingMeetingMinutes) > 0 && (
                        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            生成されるアラームポイント:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {progressPreset.map((percent) => {
                              const baseMinutes = meetingTotalDurationMinutes || remainingMeetingMinutes;
                              const minutes = Math.round((baseMinutes * percent) / 100);
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
                  {endTimeInputMode && isMeetingRunning && meetingTotalDurationMinutes > 0 && (() => {
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
                            const clampedPosition = Math.max(0, Math.min(100, position));
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
                          <span className="font-medium">{Math.round(progressPercent)}% 経過</span>
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
                            alarmPoints[alarmPoints.length - 1]?.minutes * 60 ||
                              0
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
                          value={alarmPointMinutesInput[point.id] ?? String(point.minutes)}
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
            )}

            {activeTab === "pomodoro" && (
              <div id="pomodoro-timer-section" className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-white/20 dark:border-gray-700/20">
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
                    {pomodoroState === 'work' ? (
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
                                e.key === 'Process' ||
                                (e as React.KeyboardEvent & { keyCode?: number }).keyCode === 229
                              ) return;
                              if (e.key === 'Enter') {
                                updatePomodoroTask(pomodoroTaskInputRef.current?.value || '', null);
                                setIsEditingPomodoroTask(false);
                              } else if (e.key === 'Escape') {
                                // キャンセル時は保存しない
                                setIsEditingPomodoroTask(false);
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updatePomodoroTask(pomodoroTaskInputRef.current?.value || '', null);
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
                    {pomodoroSettings.infiniteMode
                      ? "∞"
                      : pomodoroSettings.cycles}
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
            )}
          </div>

          <div
            className={`w-full lg:w-1/3 flex flex-col gap-4 ${
              workMode ? "flex-col-reverse lg:flex-col" : ""
            }`}
          >
            {/* メモセクション（Markdownプレビュー対応） */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 max-h-[400px] lg:max-h-[450px] overflow-hidden">
              <MemoSwiper
                memos={multipleMemos.memos}
                onCreateMemo={multipleMemos.createMemo}
                onUpdateMemo={multipleMemos.updateMemo}
                onDeleteMemo={handleDeleteMemo}
                onReorderMemos={multipleMemos.reorderMemos}
                darkMode={darkMode}
                initialIndex={memoActiveIndex}
                onIndexChange={handleMemoIndexChange}
                highlightedMemoId={highlightedMemoId}
              />
            </div>

            {/* TODOリストセクション */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/20">
              <div className="flex flex-col gap-2 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  TODOリスト
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSortByDeadline(!sortByDeadline)}
                    className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${
                      sortByDeadline
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                    title="期限順にソート"
                  >
                    <Calendar className="w-3 h-3" />
                    期限順
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("完了したTODOを削除しますか？")) {
                        clearCompletedTodos();
                      }
                    }}
                    className="text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                    title="完了済みを削除"
                  >
                    完了削除
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "すべてのTODOを削除しますか？この操作は取り消せません。"
                        )
                      ) {
                        clearAllTodos();
                      }
                    }}
                    className="text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                    title="すべて削除"
                  >
                    全削除
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTrash(!showTrash)}
                    className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${
                      showTrash
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                    title={`ゴミ箱 (${trashedTodos.length}件)`}
                  >
                    <Trash2 className="w-3 h-3" />
                    {trashedTodos.length > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {trashedTodos.length}
                      </span>
                    )}
                  </button>
                  <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button
                    type="button"
                    onClick={() => setShowTagManager(!showTagManager)}
                    className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${
                      showTagManager
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                    title="タグ管理"
                  >
                    <TagIcon className="w-3 h-3" />
                    タグ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${
                      showFilterPanel || hasActiveFilters
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                    title="フィルター"
                  >
                    <Filter className="w-3 h-3" />
                    絞込
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKanbanModal(true)}
                    className="text-xs px-2 py-1 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    title="カンバン表示"
                  >
                    <Columns className="w-3 h-3" />
                    看板
                  </button>
                </div>
              </div>

              {/* タグ管理パネル */}
              {showTagManager && (
                <div className="mb-4">
                  <TagManager
                    tags={tags}
                    onAddTag={addTag}
                    onUpdateTag={updateTag}
                    onDeleteTag={deleteTag}
                    darkMode={darkMode}
                    onClose={() => setShowTagManager(false)}
                  />
                </div>
              )}

              {/* フィルターパネル */}
              {showFilterPanel && (
                <div className="mb-4">
                  <FilterPanel
                    tags={tags}
                    columns={kanbanStatusesHook.statuses}
                    filterState={filterState}
                    onFilterChange={setFilterState}
                    darkMode={darkMode}
                    onClose={() => setShowFilterPanel(false)}
                  />
                </div>
              )}

              {/* ゴミ箱UI */}
              {showTrash && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                      <Trash2 className="w-4 h-4" />
                      ゴミ箱 ({trashedTodos.length}件)
                    </h4>
                    {trashedTodos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "ゴミ箱を空にしますか？この操作は取り消せません。"
                            )
                          ) {
                            emptyTrash();
                          }
                        }}
                        className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded transition-colors"
                      >
                        ゴミ箱を空にする
                      </button>
                    )}
                  </div>
                  {trashedTodos.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ゴミ箱は空です
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                      {trashedTodos.map((todo) => {
                        const deletedDate = new Date(todo.deletedAt);
                        const daysAgo = Math.floor(
                          (Date.now() - deletedDate.getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        const expiresIn = 30 - daysAgo;
                        return (
                          <li
                            key={todo.id}
                            className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-xs text-gray-700 dark:text-gray-300 truncate"
                                title={todo.text}
                              >
                                <RichTextWithLinks
                                  text={todo.text}
                                  darkMode={darkMode}
                                  maxLength={80}
                                />
                              </div>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                削除: {deletedDate.toLocaleDateString("ja-JP")}{" "}
                                (残り{expiresIn}
                                日で完全削除)
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => restoreTodo(todo)}
                                className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                                title="復元"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "このTODOを完全に削除しますか？"
                                    )
                                  ) {
                                    permanentlyDeleteTodo(todo.id);
                                  }
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                                title="完全に削除"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    ※ 削除から30日経過したアイテムは自動的に完全削除されます
                  </p>
                </div>
              )}

              {/* TODOリスト */}
              <DragDropContext onDragEnd={onDragEnd}>
                <StrictModeDroppable
                  droppableId={
                    activeTab === "meeting" ? "meetingTodos" : "pomodoroTodos"
                  }
                >
                  {(provided) => (
                    <ul
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2 mb-3 sm:mb-4 max-h-[400px] overflow-y-auto"
                    >
                      {(sortByDeadline
                        ? sortTodosByDeadline(filteredTodos)
                        : filteredTodos
                      ).map((todo, index) => (
                        <Draggable
                          key={todo.id}
                          draggableId={todo.id}
                          index={index}
                          isDragDisabled={sortByDeadline}
                        >
                          {(provided, snapshot) => (
                            <li
                              id={`todo-${todo.id}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`grid grid-cols-[1fr_auto] gap-1 p-2 sm:p-3 rounded-xl transition-all duration-200 ${
                                todo.isCompleted
                                  ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800"
                                  : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                              } ${
                                snapshot.isDragging
                                  ? "shadow-2xl scale-105"
                                  : "shadow-sm hover:shadow-md"
                              } ${
                                highlightedTodoId === todo.id
                                  ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800 bg-indigo-50 dark:bg-indigo-900/30 transition-all duration-500"
                                  : ""
                              }`}
                            >
                              {editingTodoId === todo.id ? (
                                <>
                                  <input
                                    type="text"
                                    defaultValue={todo.text}
                                    ref={editingInputRef}
                                    onCompositionStart={() => {
                                      isComposingRef.current = true;
                                    }}
                                    onCompositionEnd={() => {
                                      // IME変換確定後のEnterキーによる誤送信を防ぐため、遅延してフラグをリセット
                                      setTimeout(() => {
                                        isComposingRef.current = false;
                                      }, 50);
                                    }}
                                    onKeyDown={(e) => {
                                      if (
                                        isComposingRef.current ||
                                        e.nativeEvent.isComposing ||
                                        e.key === "Process" ||
                                        (e as React.KeyboardEvent & { keyCode?: number }).keyCode === 229
                                      )
                                        return;
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const value =
                                          editingInputRef.current?.value.trim() ||
                                          "";
                                        if (value) {
                                          updateTodo(todo.id, value);
                                        }
                                      } else if (e.key === "Escape") {
                                        cancelEditingTodo();
                                      }
                                    }}
                                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const value =
                                          editingInputRef.current?.value.trim() ||
                                          "";
                                        if (value) {
                                          updateTodo(todo.id, value);
                                        }
                                      }}
                                      className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                                    >
                                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditingTodo}
                                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                    >
                                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="min-w-0 space-y-1">
                                    {/* TODO内容 - 3行省略+クリック展開 */}
                                    <div
                                      className={`text-xs sm:text-sm ${
                                        todo.isCompleted
                                          ? "line-through text-gray-500 dark:text-gray-400"
                                          : "text-gray-800 dark:text-gray-200"
                                      }`}
                                    >
                                      {expandedTodoContentId === todo.id ? (
                                        // 展開表示
                                        <div>
                                          <RichTextWithLinks
                                            text={todo.text}
                                            darkMode={darkMode}
                                            className="whitespace-pre-wrap break-words"
                                          />
                                          {todo.text.length > 100 && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedTodoContentId(null)
                                              }
                                              className="ml-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs"
                                            >
                                              [閉じる]
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        // 省略表示（3行まで）
                                        <div
                                          className="cursor-pointer"
                                          onClick={() => {
                                            if (todo.text.length > 100) {
                                              setExpandedTodoContentId(todo.id);
                                            }
                                          }}
                                          title={todo.text}
                                        >
                                          <span className="line-clamp-3 whitespace-pre-wrap break-words">
                                            <RichTextWithLinks
                                              text={todo.text}
                                              darkMode={darkMode}
                                            />
                                          </span>
                                          {todo.text.length > 100 && (
                                            <span className="text-indigo-500 dark:text-indigo-400 text-xs ml-1">
                                              [続きを見る]
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* 期限表示 - コンパクト版（クリックで詳細展開） */}
                                    {(() => {
                                      const status = getDeadlineStatus(todo);
                                      if (!status) return null;

                                      // ステータスに応じたスタイルクラス
                                      const statusClasses = status.isOverdue
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-medium"
                                        : status.isSoon
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 font-medium"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";

                                      // 残り時間テキスト（短縮版）
                                      const remainingText = status.isOverdue
                                        ? "期限切れ"
                                        : status.isSoon
                                        ? `${status.diffHours}h`
                                        : `${status.diffDays}d`;

                                      const isExpanded =
                                        expandedDeadlineTodoId === todo.id;

                                      return (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedDeadlineTodoId(
                                              isExpanded ? null : todo.id
                                            )
                                          }
                                          className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity ${statusClasses}`}
                                          title={`${todo.dueDate}${todo.dueTime ? ` ${todo.dueTime}` : ""} - クリックで編集`}
                                        >
                                          <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                                          <span>{remainingText}</span>
                                          <ChevronDown
                                            className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${
                                              isExpanded ? "rotate-180" : ""
                                            }`}
                                          />
                                        </button>
                                      );
                                    })()}

                                    {/* 期限設定フォーム - 折りたたみ式 */}
                                    {expandedDeadlineTodoId === todo.id && (
                                      <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg mt-1">
                                        {/* 日付・時刻入力行 */}
                                        <div className="flex gap-1 items-center flex-wrap">
                                          <input
                                            type="date"
                                            value={todo.dueDate || ""}
                                            onChange={(e) =>
                                              updateTodoDeadline(
                                                todo.id,
                                                e.target.value || undefined,
                                                todo.dueTime,
                                              )
                                            }
                                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:[color-scheme:dark]"
                                            placeholder="期限日"
                                          />
                                          <input
                                            type="time"
                                            value={todo.dueTime || ""}
                                            onChange={(e) =>
                                              updateTodoDeadline(
                                                todo.id,
                                                todo.dueDate,
                                                e.target.value || undefined,
                                              )
                                            }
                                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:[color-scheme:dark]"
                                            placeholder="時刻"
                                          />
                                          {(todo.dueDate || todo.dueTime) && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateTodoDeadline(
                                                  todo.id,
                                                  undefined,
                                                  undefined
                                                )
                                              }
                                              className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded transition-colors"
                                              title="期限をクリア"
                                            >
                                              解除
                                            </button>
                                          )}
                                        </div>
                                        {/* 延長ボタン行 - 期限が設定されている場合のみ */}
                                        {todo.dueDate && (
                                          <div className="flex gap-1 items-center">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              延長:
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                extendDeadline(todo.id, 1)
                                              }
                                              className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                                              title="1日延長"
                                            >
                                              +1日
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                extendDeadline(todo.id, 3)
                                              }
                                              className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                                              title="3日延長"
                                            >
                                              +3日
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                extendDeadline(todo.id, 7)
                                              }
                                              className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                                              title="1週間延長"
                                            >
                                              +7日
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* タグ・優先度・重要度表示 - コンパクト */}
                                    <div className="flex flex-wrap items-center gap-0.5">
                                      {/* タグ表示 - コンパクト */}
                                      {todo.tagIds && todo.tagIds.length > 0 && (
                                        <>
                                          {todo.tagIds.slice(0, 2).map((tagId) => {
                                            const tag = tagsMap.get(tagId);
                                            if (!tag) return null;
                                            const textColor = TAG_COLORS.find((c) => c.value === tag.color)?.textColor || "text-white";
                                            return (
                                              <span
                                                key={tagId}
                                                className={`text-[10px] px-1 py-0.5 rounded ${tag.color} ${textColor}`}
                                              >
                                                {tag.name}
                                              </span>
                                            );
                                          })}
                                          {todo.tagIds.length > 2 && (
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                              +{todo.tagIds.length - 2}
                                            </span>
                                          )}
                                        </>
                                      )}
                                      {/* 優先度バッジ - コンパクト */}
                                      {todo.priority && todo.priority !== "none" && (
                                        <span
                                          className={`text-[10px] px-1 py-0.5 rounded flex items-center ${PRIORITY_CONFIG[todo.priority].badgeClass}`}
                                          title={`優先度: ${PRIORITY_CONFIG[todo.priority].label}`}
                                        >
                                          <Flag className="w-2.5 h-2.5" />
                                        </span>
                                      )}
                                      {/* 重要度バッジ - コンパクト */}
                                      {todo.importance && todo.importance !== "none" && (
                                        <span
                                          className={`text-[10px] px-1 py-0.5 rounded flex items-center ${IMPORTANCE_CONFIG[todo.importance].badgeClass}`}
                                          title={`重要度: ${IMPORTANCE_CONFIG[todo.importance].label}`}
                                        >
                                          <Star className="w-2.5 h-2.5" />
                                        </span>
                                      )}
                                      {/* カンバンステータスバッジ - コンパクト */}
                                      {todo.kanbanStatus && todo.kanbanStatus !== "backlog" && (
                                        <span
                                          className={`text-[10px] px-1 py-0.5 rounded ${
                                            todo.kanbanStatus === "done"
                                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                              : todo.kanbanStatus === "doing"
                                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                          }`}
                                        >
                                          {kanbanStatusesHook.statuses.find((c) => c.name === todo.kanbanStatus)?.label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* アクションボタン - コンパクト配置 */}
                                  <div className="flex gap-0.5 items-center self-start">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleTodo(todo.id)
                                      }
                                      className={`p-1 rounded transition-colors ${
                                        todo.isCompleted
                                          ? "text-green-600 bg-green-100 dark:bg-green-900/50"
                                          : "text-gray-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                                      }`}
                                      title="完了/未完了"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedDeadlineTodoId(
                                          expandedDeadlineTodoId === todo.id
                                            ? null
                                            : todo.id
                                        )
                                      }
                                      className={`p-1 rounded transition-colors ${
                                        expandedDeadlineTodoId === todo.id ||
                                        todo.dueDate
                                          ? "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50"
                                          : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                      }`}
                                      title="期限を設定"
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditDialogTodoId(todo.id)}
                                      className={`p-1 rounded transition-colors ${
                                        (todo.tagIds && todo.tagIds.length > 0) ||
                                        (todo.priority && todo.priority !== "none") ||
                                        (todo.importance && todo.importance !== "none")
                                          ? "text-purple-600 bg-purple-100 dark:bg-purple-900/50"
                                          : "text-gray-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                                      }`}
                                      title="タグ・優先度・重要度"
                                    >
                                      <TagIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => startEditingTodo(todo.id)}
                                      className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
                                      title="編集"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        startWithTodo(todo.text, todo.id);
                                        setActiveTab("pomodoro");
                                        // スムーズスクロールでタイマー表示位置へ
                                        const timerElement = document.getElementById('pomodoro-timer-section');
                                        if (timerElement) {
                                          timerElement.scrollIntoView({ behavior: 'smooth' });
                                        }
                                      }}
                                      className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded transition-colors"
                                      title="このタスクでポモドーロを開始"
                                    >
                                      <Timer className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeTodo(todo.id)
                                      }
                                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                                      title="削除"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </StrictModeDroppable>
              </DragDropContext>

              {/* TODO追加フォーム */}
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue=""
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    // IME変換確定後のEnterキーによる誤送信を防ぐため、遅延してフラグをリセット
                    setTimeout(() => {
                      isComposingRef.current = false;
                    }, 50);
                  }}
                  onKeyDown={(e) => {
                    // 日本語入力（IME）の変換中はスキップ
                    if (
                      isComposingRef.current ||
                      e.nativeEvent.isComposing ||
                      e.key === "Process" ||
                      (e as React.KeyboardEvent & { keyCode?: number }).keyCode === 229
                    )
                      return;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const value = todoInputRef.current?.value.trim() || "";
                      if (value) {
                        addTodo(value);
                        if (todoInputRef.current) {
                          todoInputRef.current.value = "";
                          todoInputRef.current.focus();
                        }
                      }
                    }
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="新しいTODOを入力..."
                  ref={todoInputRef}
                />
                <button
                  type="button"
                  onClick={() => {
                    const value = todoInputRef.current?.value.trim() || "";
                    if (value) {
                      addTodo(value);
                      if (todoInputRef.current) {
                        todoInputRef.current.value = "";
                        todoInputRef.current.focus();
                      }
                    }
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base whitespace-nowrap flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">追加</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 設定モーダル */}
        <SettingsDialog
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          tickSoundEnabled={tickSoundEnabled}
          setTickSoundEnabled={setTickSoundEnabled}
          tickSoundVolume={tickSoundVolume}
          setTickSoundVolume={setTickSoundVolume}
          meetingAlarmSettings={meetingAlarmSettings}
          pomodoroSettings={pomodoroSettings}
          notificationsEnabled={notificationsEnabled}
          toggleNotifications={toggleNotifications}
          vibrationEnabled={vibrationEnabled}
          setVibrationEnabled={setVibrationEnabled}
          vibrationPattern={vibrationPattern}
          setVibrationPattern={setVibrationPattern}
          triggerAlarmVibration={triggerAlarmVibration}
          flashEnabled={flashEnabled}
          setFlashEnabled={setFlashEnabled}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          defaultMeetingAlarmPoints={defaultMeetingAlarmPoints}
          setDefaultMeetingAlarmPoints={setDefaultMeetingAlarmPoints}
          defaultMeetingAlarmSettings={defaultMeetingAlarmSettings}
          setDefaultMeetingAlarmSettings={setDefaultMeetingAlarmSettings}
          defaultPomodoroWorkDuration={defaultPomodoroWorkDuration}
          setDefaultPomodoroWorkDuration={setDefaultPomodoroWorkDuration}
          defaultPomodoroBreakDuration={defaultPomodoroBreakDuration}
          setDefaultPomodoroBreakDuration={setDefaultPomodoroBreakDuration}
          defaultPomodoroCycles={defaultPomodoroCycles}
          setDefaultPomodoroCycles={setDefaultPomodoroCycles}
          defaultPomodoroWorkAlarm={defaultPomodoroWorkAlarm}
          setDefaultPomodoroWorkAlarm={setDefaultPomodoroWorkAlarm}
          defaultPomodoroBreakAlarm={defaultPomodoroBreakAlarm}
          setDefaultPomodoroBreakAlarm={setDefaultPomodoroBreakAlarm}
          previewSound={previewSound}
          isAuthenticated={isAuthenticated}
          user={user}
          signOut={signOut}
          useDatabase={useDatabase}
          setUseDatabase={setUseDatabase}
          setAuthDialogOpen={setAuthDialogOpen}
          resetToDefaults={resetToDefaults}
        />

        {/* 認証ダイアログ */}
        <AuthDialog
          open={authDialogOpen}
          onOpenChange={setAuthDialogOpen}
          onSuccess={() => {
            // ログイン成功時にデータベース連携を有効化
            setUseDatabase(true);
          }}
        />

        {/* ポモドーロTODO選択モーダル */}
        {showTodoPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowTodoPicker(false)}
            />
            <div
              className={`relative w-full max-w-md max-h-[70vh] rounded-2xl shadow-2xl overflow-hidden ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div
                className={`flex items-center justify-between px-4 py-3 border-b ${
                  darkMode ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    集中するTODOを選択
                  </h3>
                  {(filterState.tags.length > 0 || filterState.priority !== "all" || filterState.importance !== "all" || filterState.kanbanStatus !== "all") && (
                    <span className="px-2 py-0.5 text-xs bg-indigo-500 text-white rounded-full flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      絞込中
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowTodoPicker(false)}
                  className={`p-1 rounded-full transition-colors ${
                    darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[50vh] p-2">
                {filteredTodos.filter(t => !t.isCompleted).length === 0 ? (
                  <p className={`text-center py-8 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {filterState.tags.length > 0 || filterState.priority !== "all" || filterState.importance !== "all" || filterState.kanbanStatus !== "all"
                      ? "フィルター条件に一致するTODOがありません"
                      : "未完了のTODOがありません"}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredTodos
                      .filter(t => !t.isCompleted)
                      .map((todo) => (
                        <button
                          key={todo.id}
                          onClick={() => {
                            updatePomodoroTask(todo.text, todo.id);
                            setShowTodoPicker(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            currentPomodoroTaskId === todo.id
                              ? darkMode
                                ? "bg-indigo-600 text-white"
                                : "bg-indigo-500 text-white"
                              : darkMode
                              ? "hover:bg-gray-700 text-gray-200"
                              : "hover:bg-gray-100 text-gray-800"
                          }`}
                        >
                          <div className="text-sm truncate">
                            <RichTextWithLinks
                              text={todo.text}
                              darkMode={darkMode}
                              maxLength={60}
                            />
                          </div>
                          {todo.dueDate && (
                            <p className={`text-xs mt-0.5 ${
                              currentPomodoroTaskId === todo.id
                                ? "text-white/70"
                                : darkMode ? "text-gray-400" : "text-gray-500"
                            }`}>
                              締切: {todo.dueDate} {todo.dueTime || ""}
                            </p>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* カンバンモーダル */}
        {showKanbanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* オーバーレイ */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowKanbanModal(false)}
            />
            {/* モーダルコンテンツ */}
            <div
              className={`relative w-[95vw] h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${
                darkMode ? "bg-gray-900" : "bg-white"
              }`}
            >
              {/* ヘッダー */}
              <div
                className={`flex items-center justify-between px-6 py-4 border-b ${
                  darkMode ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <h2
                  className={`text-xl font-bold flex items-center gap-2 ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  <Columns className="w-5 h-5" />
                  <span className="hidden sm:inline">カンバンボード</span>
                  <span className="sm:hidden">看板</span>
                </h2>
                <div className="flex items-center gap-4">
                  {/* ステータス管理ボタン */}
                  <button
                    onClick={() => setShowStatusManager(true)}
                    disabled={!isAuthenticated || !isSupabaseConfigured}
                    title={!isAuthenticated || !isSupabaseConfigured ? "ログインするとカスタムステータスを作成できます" : "ステータスを追加・編集・削除できます"}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      !isAuthenticated || !isSupabaseConfigured
                        ? darkMode
                          ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                          : "bg-gray-50 text-gray-400 cursor-not-allowed"
                        : darkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    ステータス管理
                  </button>
                  <button
                    onClick={() => setShowKanbanModal(false)}
                    className={`p-2 rounded-full transition-colors ${
                      darkMode
                        ? "hover:bg-gray-700 text-gray-400"
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* カンバンボード */}
              <div className="p-6 h-[calc(90vh-80px)] overflow-auto">
                <KanbanBoard
                  todos={filteredTodos}
                  tags={tags}
                  columns={kanbanStatusesHook.statuses}
                  darkMode={darkMode}
                  onStatusChange={updateTodoKanbanStatus}
                  onToggleTodo={(id) => toggleTodo(id)}
                  onEditTodo={(id) => {
                    setEditingTodoId(id);
                    setShowKanbanModal(false);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ステータス管理モーダル（ログイン時のみ表示） */}
        {showStatusManager && isAuthenticated && isSupabaseConfigured && (
          <KanbanStatusManager
            statuses={kanbanStatusesHook.statuses}
            darkMode={darkMode}
            onClose={() => setShowStatusManager(false)}
            onAddStatus={kanbanStatusesHook.addStatus}
            onUpdateStatus={kanbanStatusesHook.updateStatus}
            onDeleteStatus={kanbanStatusesHook.deleteStatus}
            onReorderStatuses={kanbanStatusesHook.reorderStatuses}
          />
        )}

        {/* TODO編集ダイアログ */}
        {editDialogTodo && (
          <TodoEditDialog
            todo={editDialogTodo}
            tags={tags}
            darkMode={darkMode}
            onSave={handleSaveTodoDetails}
            onClose={() => setEditDialogTodoId(null)}
          />
        )}

        {/* AIチャット（ログイン時のみ表示） */}
        {isAuthenticated && (
          <AIChat
            darkMode={darkMode}
            isOpen={showAIChat}
            onClose={() => setShowAIChat(false)}
          />
        )}

        {/* AIチャットボタン（ログイン時のみ表示、チャット非表示時のみ） */}
        {isAuthenticated && !showAIChat && (
          <button
            onClick={() => setShowAIChat(true)}
            className={`fixed bottom-6 right-6 z-[9999] p-4 rounded-full shadow-xl transition-all duration-200 ${
              darkMode
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
            aria-label="AIアシスタントを開く"
          >
            <MessageSquare size={28} />
          </button>
        )}

        {/* 検索モーダル (Cmd+K) */}
        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          darkMode={darkMode}
          todos={sharedTodos}
          memos={multipleMemos.memos}
          onSelectResult={handleSearchResultSelect}
        />
      </div>
    </div>
  );
}
