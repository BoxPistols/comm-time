"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Check,
  X,
  Edit,
  Save,
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
import { MeetingTimerPanel } from "@/components/meeting-timer/MeetingTimerPanel";
import { PomodoroTimerPanel } from "@/components/pomodoro-timer/PomodoroTimerPanel";
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
