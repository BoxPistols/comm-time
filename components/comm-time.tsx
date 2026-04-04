"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Settings, Columns, Filter, MessageSquare } from "lucide-react";
import { RichTextWithLinks } from "@/components/rich-text-with-links";
import { AuthDialog } from "@/components/auth-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useSupabasePomodoroTask } from "@/hooks/useSupabasePomodoroTask";
import { useMultipleMemos } from "@/hooks/useMultipleMemos";
import { MemoSwiper } from "@/components/memo-swiper";
import { type MemoData } from "@/components/markdown-memo";
import { isSupabaseConfigured } from "@/lib/supabase";
import { KanbanBoard } from "@/components/kanban-board";
import { KanbanStatusManager } from "@/components/kanban-status-manager";
import { TodoEditDialog } from "@/components/todo-edit-dialog";
import { AIChat } from "@/components/ai-chat";
import { SearchModal, type SearchResult } from "@/components/search-modal";
import { FlashOverlay } from "@/components/flash-overlay";
import { TabSwitcher } from "@/components/tab-switcher";
import { AppHeader } from "@/components/app-header";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { MeetingTimerPanel } from "@/components/meeting-timer/MeetingTimerPanel";
import { PomodoroTimerPanel } from "@/components/pomodoro-timer/PomodoroTimerPanel";
import { TodoListPanel } from "@/components/todo-list/TodoListPanel";
import { useKanbanStatuses } from "@/hooks/useKanbanStatuses";
import { useAlarmSystem } from "@/hooks/useAlarmSystem";
import { useMeetingTimer } from "@/hooks/useMeetingTimer";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { useDefaultSettings } from "@/hooks/useDefaultSettings";
import { useTagManager } from "@/hooks/useTagManager";
import { useTodoManager } from "@/hooks/useTodoManager";
import { type TabType } from "@/types";
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

  // パネル比率モード: "timer" = タイマー大(2/3), "equal" = 均等(1/2), "notes" = ノート大(2/3)
  type LayoutMode = "timer" | "equal" | "notes";
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("layoutMode");
      if (saved === "timer" || saved === "equal" || saved === "notes") return saved;
    }
    return "timer";
  });
  const cycleLayoutMode = useCallback(() => {
    setLayoutMode(prev => {
      const next = prev === "timer" ? "equal" : prev === "equal" ? "notes" : "timer";
      localStorage.setItem("layoutMode", next);
      return next;
    });
  }, []);

  const leftWidth = layoutMode === "timer" ? "lg:w-2/3" : layoutMode === "equal" ? "lg:w-1/2" : "lg:w-1/3";
  const rightWidth = layoutMode === "timer" ? "lg:w-1/3" : layoutMode === "equal" ? "lg:w-1/2" : "lg:w-2/3";
  const layoutLabel = layoutMode === "timer" ? "タイマー優先" : layoutMode === "equal" ? "均等" : "ノート優先";

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
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <button
            type="button"
            onClick={cycleLayoutMode}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-md hover:shadow-lg transition-all text-xs font-medium whitespace-nowrap"
            title={`レイアウト: ${layoutLabel}`}
          >
            <Columns className="w-4 h-4" />
            {layoutLabel}
          </button>
        </div>

        <div
          className={`flex gap-4 sm:gap-6 lg:flex-row ${ 
            workMode
              ? "flex-col-reverse"
              : "flex-col"
          }`}
        >
          <div className={`w-full ${leftWidth} transition-all duration-300`}>
            {activeTab === "meeting" && (
              <MeetingTimerPanel
                isMeetingRunning={isMeetingRunning}
                meetingStartTime={meetingStartTime}
                meetingElapsedTime={meetingElapsedTime}
                alarmPoints={alarmPoints}
                alarmPointMinutesInput={alarmPointMinutesInput}
                setAlarmPointMinutesInput={setAlarmPointMinutesInput}
                meetingAlarmSettings={meetingAlarmSettings}
                setMeetingAlarmSettings={setMeetingAlarmSettings}
                defaultMeetingAlarmSettings={defaultMeetingAlarmSettings}
                countdownMode={countdownMode}
                setCountdownMode={setCountdownMode}
                targetEndTime={targetEndTime}
                setTargetEndTime={setTargetEndTime}
                countdownSeconds={countdownSeconds}
                endTimeInputMode={endTimeInputMode}
                setEndTimeInputMode={setEndTimeInputMode}
                progressPreset={progressPreset}
                setProgressPreset={setProgressPreset}
                remainingMeetingMinutes={remainingMeetingMinutes}
                meetingTotalDurationMinutes={meetingTotalDurationMinutes}
                toggleMeetingTimer={toggleMeetingTimer}
                resetMeetingTimer={resetMeetingTimer}
                addAlarmPoint={addAlarmPoint}
                updateAlarmPoint={updateAlarmPoint}
                removeAlarmPoint={removeAlarmPoint}
                generateAlarmPointsFromEndTime={generateAlarmPointsFromEndTime}
                formatTime={formatTime}
                getEndTime={getEndTime}
                playAlarm={playAlarm}
                forceFocus={forceFocus}
                setForceFocus={setForceFocus}
                sharedTodos={sharedTodos}
              />
            )}

            {activeTab === "pomodoro" && (
              <PomodoroTimerPanel
                isPomodoroRunning={isPomodoroRunning}
                pomodoroStartTime={pomodoroStartTime}
                pomodoroElapsedTime={pomodoroElapsedTime}
                pomodoroState={pomodoroState}
                pomodoroSettings={pomodoroSettings}
                setPomodoroSettings={setPomodoroSettings}
                pomodoroCycles={pomodoroCycles}
                currentPomodoroTask={currentPomodoroTask}
                setCurrentPomodoroTask={setCurrentPomodoroTask}
                currentPomodoroTaskId={currentPomodoroTaskId}
                isEditingPomodoroTask={isEditingPomodoroTask}
                setIsEditingPomodoroTask={setIsEditingPomodoroTask}
                showTodoPicker={showTodoPicker}
                setShowTodoPicker={setShowTodoPicker}
                pomodoroTaskInputRef={pomodoroTaskInputRef}
                isComposingRef={isComposingRef}
                togglePomodoroTimer={togglePomodoroTimer}
                resetPomodoroTimer={resetPomodoroTimer}
                updatePomodoroTask={updatePomodoroTask}
                clearPomodoroTask={clearPomodoroTask}
                formatTime={formatTime}
                getEndTime={getEndTime}
                getCountdown={getCountdown}
                playAlarm={playAlarm}
                darkMode={darkMode}
                filteredTodos={filteredTodos}
                filterState={filterState}
              />
            )}
          </div>
          <div
            className={`w-full ${rightWidth} flex flex-col gap-4 transition-all duration-300 ${
              workMode ? "flex-col-reverse lg:flex-col" : ""
            }`}
          >
            {/* メモセクション（Markdownプレビュー対応） */}
            <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 overflow-hidden ${
              layoutMode === "notes" ? "max-h-[600px] lg:max-h-[700px]" : "max-h-[400px] lg:max-h-[450px]"
            }`}>
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

            <TodoListPanel
              sharedTodos={sharedTodos}
              filteredTodos={filteredTodos}
              trashedTodos={trashedTodos}
              tags={tags}
              tagsMap={tagsMap}
              kanbanStatuses={kanbanStatusesHook.statuses}
              editingTodoId={editingTodoId}
              startEditingTodo={startEditingTodo}
              cancelEditingTodo={cancelEditingTodo}
              expandedDeadlineTodoId={expandedDeadlineTodoId}
              setExpandedDeadlineTodoId={setExpandedDeadlineTodoId}
              expandedTodoContentId={expandedTodoContentId}
              setExpandedTodoContentId={setExpandedTodoContentId}
              highlightedTodoId={highlightedTodoId}
              sortByDeadline={sortByDeadline}
              setSortByDeadline={setSortByDeadline}
              sortTodosByDeadline={sortTodosByDeadline}
              addTag={addTag}
              updateTag={updateTag}
              deleteTag={deleteTag}
              showTagManager={showTagManager}
              setShowTagManager={setShowTagManager}
              filterState={filterState}
              setFilterState={setFilterState}
              hasActiveFilters={hasActiveFilters}
              showFilterPanel={showFilterPanel}
              setShowFilterPanel={setShowFilterPanel}
              showTrash={showTrash}
              setShowTrash={setShowTrash}
              restoreTodo={restoreTodo}
              permanentlyDeleteTodo={permanentlyDeleteTodo}
              emptyTrash={emptyTrash}
              addTodo={addTodo}
              toggleTodo={toggleTodo}
              removeTodo={removeTodo}
              updateTodo={updateTodo}
              clearAllTodos={clearAllTodos}
              clearCompletedTodos={clearCompletedTodos}
              updateTodoDeadline={updateTodoDeadline}
              extendDeadline={extendDeadline}
              getDeadlineStatus={getDeadlineStatus}
              updateTodoKanbanStatus={updateTodoKanbanStatus}
              handleSaveTodoDetails={handleSaveTodoDetails}
              setEditDialogTodoId={setEditDialogTodoId}
              onDragEnd={onDragEnd}
              darkMode={darkMode}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isAuthenticated={isAuthenticated}
              isSupabaseConfigured={isSupabaseConfigured}
              showKanbanModal={showKanbanModal}
              setShowKanbanModal={setShowKanbanModal}
              startWithTodo={startWithTodo}
              editingInputRef={editingInputRef}
              todoInputRef={todoInputRef}
              isComposingRef={isComposingRef}
            />
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
