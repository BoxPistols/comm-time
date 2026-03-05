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
  Bell,
  BellOff,
  Vibrate,
  Timer,
  Zap,
  Settings,
  Calendar,
  Moon,
  Sun,
  LogIn,
  LogOut,
  Database,
  ChevronDown,
  Trash2,
  RotateCcw,
  Briefcase,
  Tag as TagIcon,
  Filter,
  Columns,
  Flag,
  Star,
  MessageSquare,
  AlarmClock,
  RefreshCw,
} from "lucide-react";
import {
  DragDropContext,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";
import { StrictModeDroppable } from "@/components/strict-mode-droppable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AuthDialog } from "@/components/auth-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseTodos } from "@/hooks/useSupabaseTodos";
import { useSupabaseTags } from "@/hooks/useSupabaseTags";
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
import { useKanbanStatuses } from "@/hooks/useKanbanStatuses";
import {
  useHapticFeedback,
  VIBRATION_PATTERNS,
  VIBRATION_PATTERN_KEYS,
  VibrationPatternKey,
} from "@/hooks/useHapticFeedback";
import {
  type Tag,
  type PriorityLevel,
  type ImportanceLevel,
  type KanbanStatus,
  type FilterState,
  initialFilterState,
  PRIORITY_CONFIG,
  IMPORTANCE_CONFIG,
  TAG_COLORS,
} from "@/types";

// 型定義
type AlarmPoint = {
  id: string;
  minutes: number;
  isDone: boolean;
  linkedTodo?: string;
  remainingTime: number;
};

type AlarmSettings = {
  volume: number;
  frequency: number;
};

type TabType = "meeting" | "pomodoro";

type TodoItem = {
  id: string;
  text: string;
  isCompleted: boolean;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  tagIds?: string[]; // タグIDの配列
  priority?: PriorityLevel; // 優先度
  importance?: ImportanceLevel; // 重要度
  kanbanStatus?: KanbanStatus; // カンバンステータス
};

// ゴミ箱に入ったTODOの型
type TrashedTodoItem = TodoItem & {
  deletedAt: string; // ISO形式の日時
};

// TODOのバージョン履歴の型
type TodoVersion = {
  id: string;
  todoId: string;
  text: string;
  timestamp: string; // ISO形式の日時
  changeType: "create" | "update" | "delete";
};

// 初期値の設定
const initialMeetingAlarmPoints: AlarmPoint[] = [
  { id: "1", minutes: 30, isDone: false, remainingTime: 30 * 60 },
  { id: "2", minutes: 50, isDone: false, remainingTime: 50 * 60 },
  { id: "3", minutes: 60, isDone: false, remainingTime: 60 * 60 },
];

const initialMeetingAlarmSettings: AlarmSettings = {
  volume: 44,
  frequency: 340,
};

const initialPomodoroSettings = {
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

  // ミーティングタイマー関連の状態
  const [isMeetingRunning, setIsMeetingRunning] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);
  const [meetingElapsedTime, setMeetingElapsedTime] = useState(0);
  const [alarmPoints, setAlarmPoints] = useState<AlarmPoint[]>(
    initialMeetingAlarmPoints
  );
  const [meetingAlarmSettings, setMeetingAlarmSettings] =
    useState<AlarmSettings>(initialMeetingAlarmSettings);

  // 共通のメモ/TODO（meeting/pomodoro共有）
  const [sharedMemo, setSharedMemo] = useState("");
  const [sharedTodos, setSharedTodos] = useState<TodoItem[]>([]);

  // 後方互換性のため、共通データを参照するエイリアス
  const meetingTodos = sharedTodos;
  const setMeetingTodos = setSharedTodos;

  // ポモドーロタイマー関連の状態
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroStartTime, setPomodoroStartTime] = useState<Date | null>(null);
  const [pomodoroElapsedTime, setPomodoroElapsedTime] = useState(0);
  const [pomodoroState, setPomodoroState] = useState<"work" | "break">("work");
  const [pomodoroSettings, setPomodoroSettings] = useState(
    initialPomodoroSettings
  );

  const [pomodoroCycles, setPomodoroCycles] = useState(0);

  // ポモドーロもShared TODOを参照
  const pomodoroTodos = sharedTodos;
  const setPomodoroTodos = setSharedTodos;

  // TODO関連の状態
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);

  // Supabaseフック（データベースモード有効時に使用）
  // メモ・TODOは共通化されているため、meeting/pomodoroの区別なし
  const sharedSupabaseTodos = useSupabaseTodos(useDatabase ? user : null);
  // const sharedSupabaseMemos = useSupabaseMemos(useDatabase ? user : null);
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

  // タグ管理フック（データベースモード用）
  const supabaseTags = useSupabaseTags(useDatabase ? user : null);

  // カンバンステータス管理フック
  const kanbanStatusesHook = useKanbanStatuses(useDatabase ? user : null);

  // ハプティックフィードバック（iOS Safari対応）
  const { triggerAlarmVibration, cancelVibration } = useHapticFeedback();

  // その他の状態
  const [forceFocus, setForceFocus] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [vibrationPattern, setVibrationPattern] =
    useState<VibrationPatternKey>("standard");
  const vibrationPatternRef = useRef<VibrationPatternKey>("standard");
  vibrationPatternRef.current = vibrationPattern;
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  // カウントダウンモードの状態
  const [countdownMode, setCountdownMode] = useState(false);
  const [targetEndTime, setTargetEndTime] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  // エンド時間入力モードの状態
  const [endTimeInputMode, setEndTimeInputMode] = useState(false);
  const [progressPreset, setProgressPreset] = useState<number[]>([25, 50, 75, 100]);
  const [remainingMeetingMinutes, setRemainingMeetingMinutes] = useState(0);
  const [meetingTotalDurationMinutes, setMeetingTotalDurationMinutes] = useState(0);

  // アラームポイント入力（編集中の文字列を保持）
  const [alarmPointMinutesInput, setAlarmPointMinutesInput] = useState<Record<string, string>>({});

  // チクタク音の状態
  const [tickSoundEnabled, setTickSoundEnabled] = useState(false);
  const [tickSoundVolume, setTickSoundVolume] = useState(5); // 0-100
  const tickAudioContextRef = useRef<AudioContext | null>(null);

  // 設定モーダルの状態
  const [settingsOpen, setSettingsOpen] = useState(false);

  // TODOソート状態
  const [sortByDeadline, setSortByDeadline] = useState(false);

  // 締切アラート設定
  const [deadlineAlertEnabled, setDeadlineAlertEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("deadlineAlertEnabled") === "true";
    }
    return false;
  });
  const [deadlineAlertMinutes, setDeadlineAlertMinutes] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deadlineAlertMinutes");
      return saved ? parseInt(saved, 10) : 60;
    }
    return 60;
  });
  const alertedTodoIdsRef = useRef<Set<string>>(new Set());

  // タグ管理の状態（ローカルストレージ用）
  const [localTags, setLocalTags] = useState<Tag[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tags");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // タグはデータベースモードに応じて切り替え
  const tags = useDatabase && user ? supabaseTags.tags : localTags;

  // tagsをMapに変換してO(1)検索を実現
  const tagsMap = React.useMemo(() => {
    return new Map(tags.map(tag => [tag.id, tag]));
  }, [tags]);

  // フィルター状態
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);

  // フィルターがアクティブかどうかを判定
  const hasActiveFilters = React.useMemo(() => {
    return filterState.tags.length > 0 ||
           filterState.priority !== "all" ||
           filterState.importance !== "all" ||
           filterState.kanbanStatus !== "all";
  }, [filterState]);

  // 表示モード（リスト / カンバン）
  const [viewMode] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("todoViewMode");
      if (saved === "kanban" || saved === "list") {
        return saved;
      }
    }
    return "list";
  });

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

  // TODO編集ダイアログの状態
  const [editDialogTodoId, setEditDialogTodoId] = useState<string | null>(null);
  const editDialogTodo = React.useMemo(() => editDialogTodoId
    ? sharedTodos.find((todo) => todo.id === editDialogTodoId) || null
    : null, [editDialogTodoId, sharedTodos]);

  // 期限入力を展開中のTodoのID
  const [expandedDeadlineTodoId, setExpandedDeadlineTodoId] = useState<
    string | null
  >(null);

  // TODO内容を展開中のTodoのID（3行以上の場合に使用）
  const [expandedTodoContentId, setExpandedTodoContentId] = useState<
    string | null
  >(null);

  // ゴミ箱の状態（30日間保存）
  const [trashedTodos, setTrashedTodos] = useState<TrashedTodoItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trashedTodos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // 30日経過したアイテムを除外
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return parsed.filter(
            (item: TrashedTodoItem) => new Date(item.deletedAt) > thirtyDaysAgo
          );
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // ゴミ箱UIの表示状態
  const [showTrash, setShowTrash] = useState(false);

  // メモのゴミ箱（30日間保存）
  type TrashedMemoItem = {
    id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    deletedAt: string;
  };

  const [trashedMemos, setTrashedMemos] = useState<TrashedMemoItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trashedMemos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // 30日経過したアイテムを除外
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return parsed.filter(
            (item: TrashedMemoItem) => new Date(item.deletedAt) > thirtyDaysAgo
          );
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // バージョン履歴（削除・10文字以上の変更のみ保存）
  const [todoVersions, setTodoVersions] = useState<TodoVersion[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("todoVersions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // 30日経過したバージョンを除外
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return parsed.filter(
            (item: TodoVersion) => new Date(item.timestamp) > thirtyDaysAgo
          );
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // フラッシュの状態
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(true);

  // ダークモードの状態
  const [darkMode, setDarkMode] = useState(false);

  // ワークモードの状態（モバイルでToDo/メモを上部に表示）
  const [workMode, setWorkMode] = useState(false);

  // アラーム状態（繰り返し用）
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const titleBlinkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ポモドーロで取り組む現在のタスク
  const [currentPomodoroTask, setCurrentPomodoroTask] = useState("");
  const [currentPomodoroTaskId, setCurrentPomodoroTaskId] = useState<string | null>(null);
  const [isEditingPomodoroTask, setIsEditingPomodoroTask] = useState(false);
  const [showTodoPicker, setShowTodoPicker] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [highlightedTodoId, setHighlightedTodoId] = useState<string | null>(null);
  const [highlightedMemoId, setHighlightedMemoId] = useState<string | null>(null);
  const pomodoroTaskInputRef = useRef<HTMLInputElement>(null);

  // 初期値設定用のstate
  const [defaultMeetingAlarmSettings, setDefaultMeetingAlarmSettings] =
    useState<AlarmSettings>(initialMeetingAlarmSettings);
  const [defaultMeetingAlarmPoints, setDefaultMeetingAlarmPoints] = useState<
    number[]
  >([30, 50, 60]);
  const [defaultPomodoroWorkDuration, setDefaultPomodoroWorkDuration] =
    useState(initialPomodoroSettings.workDuration);
  const [defaultPomodoroBreakDuration, setDefaultPomodoroBreakDuration] =
    useState(initialPomodoroSettings.breakDuration);
  const [defaultPomodoroCycles, setDefaultPomodoroCycles] = useState(
    initialPomodoroSettings.cycles
  );
  const [defaultPomodoroWorkAlarm, setDefaultPomodoroWorkAlarm] =
    useState<AlarmSettings>(initialPomodoroSettings.workAlarm);
  const [defaultPomodoroBreakAlarm, setDefaultPomodoroBreakAlarm] =
    useState<AlarmSettings>(initialPomodoroSettings.breakAlarm);

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
    // ローカルストレージからすべての保存データを読み込む
    setAlarmPoints(getStorageValue("alarmPoints", initialMeetingAlarmPoints));
    setMeetingAlarmSettings(
      getStorageValue("meetingAlarmSettings", initialMeetingAlarmSettings)
    );
    setPomodoroSettings(
      getStorageValue("pomodoroSettings", initialPomodoroSettings)
    );

    // メモ/TODOのマイグレーション: 既存の分離データを共通データに統合
    const savedSharedMemo = getStorageValue("sharedMemo", "");
    const savedSharedTodos = getStorageValue("sharedTodos", []);

    if (savedSharedMemo || savedSharedTodos.length > 0) {
      // すでに共通データが存在する場合はそれを使用
      setSharedMemo(savedSharedMemo);
      setSharedTodos(savedSharedTodos);
    } else {
      // 既存のmeeting/pomodoroデータをマイグレーション
      const oldMeetingMemo = getStorageValue("meetingMemo", "");
      const oldPomodoroMemo = getStorageValue("pomodoroMemo", "");
      const oldMeetingTodos = getStorageValue("meetingTodos", []);
      const oldPomodoroTodos = getStorageValue("pomodoroTodos", []);

      // 両方のメモを結合して保持（データを失わないため）
      const migratedMemo = [oldMeetingMemo, oldPomodoroMemo]
        .filter(Boolean)
        .join("\n\n---\n\n");

      // TODOは両方を統合（重複を除く）
      const allTodos = [...oldMeetingTodos, ...oldPomodoroTodos];
      const uniqueTodos = allTodos.filter(
        (todo, index, self) => index === self.findIndex((t) => t.id === todo.id)
      );

      setSharedMemo(migratedMemo);
      setSharedTodos(uniqueTodos);

      // マイグレーション完了後、共通データとして保存
      if (typeof window !== "undefined") {
        localStorage.setItem("sharedMemo", migratedMemo);
        localStorage.setItem("sharedTodos", JSON.stringify(uniqueTodos));
      }
    }
    setNotificationsEnabled(getStorageValue("notificationsEnabled", false));
    setVibrationEnabled(getStorageValue("vibrationEnabled", true));
    setVibrationPattern(getStorageValue("vibrationPattern", "standard"));
    setCountdownMode(getStorageValue("countdownMode", false));
    setTargetEndTime(getStorageValue("targetEndTime", ""));
    setEndTimeInputMode(getStorageValue("endTimeInputMode", false));
    setProgressPreset(getStorageValue("progressPreset", [25, 50, 75, 100]));
    setTickSoundEnabled(getStorageValue("tickSoundEnabled", false));
    setTickSoundVolume(getStorageValue("tickSoundVolume", 5));
    setFlashEnabled(getStorageValue("flashEnabled", true));
    setDarkMode(getStorageValue("darkMode", false));
    setWorkMode(getStorageValue("workMode", false));
    setCurrentPomodoroTask(getStorageValue("currentPomodoroTask", ""));

    // 初期値設定の読み込み
    setDefaultMeetingAlarmSettings(
      getStorageValue(
        "defaultMeetingAlarmSettings",
        initialMeetingAlarmSettings
      )
    );
    setDefaultMeetingAlarmPoints(
      getStorageValue("defaultMeetingAlarmPoints", [30, 50, 60])
    );
    setDefaultPomodoroWorkDuration(
      getStorageValue(
        "defaultPomodoroWorkDuration",
        initialPomodoroSettings.workDuration
      )
    );
    setDefaultPomodoroBreakDuration(
      getStorageValue(
        "defaultPomodoroBreakDuration",
        initialPomodoroSettings.breakDuration
      )
    );
    setDefaultPomodoroCycles(
      getStorageValue("defaultPomodoroCycles", initialPomodoroSettings.cycles)
    );
    setDefaultPomodoroWorkAlarm(
      getStorageValue(
        "defaultPomodoroWorkAlarm",
        initialPomodoroSettings.workAlarm
      )
    );
    setDefaultPomodoroBreakAlarm(
      getStorageValue(
        "defaultPomodoroBreakAlarm",
        initialPomodoroSettings.breakAlarm
      )
    );

    // 通知権限の確認
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // データの自動保存（初期データ読み込み後のみ）
  useEffect(() => {
    // mountedフラグで初回レンダリング時の保存を防ぐ
    if (!mounted) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("alarmPoints", JSON.stringify(alarmPoints));
      localStorage.setItem(
        "meetingAlarmSettings",
        JSON.stringify(meetingAlarmSettings)
      );
      localStorage.setItem(
        "pomodoroSettings",
        JSON.stringify(pomodoroSettings)
      );
      // 共通のメモ/TODOとして保存
      localStorage.setItem("sharedMemo", sharedMemo);
      localStorage.setItem("sharedTodos", JSON.stringify(sharedTodos));
      localStorage.setItem(
        "notificationsEnabled",
        JSON.stringify(notificationsEnabled)
      );
      localStorage.setItem(
        "vibrationEnabled",
        JSON.stringify(vibrationEnabled)
      );
      localStorage.setItem("vibrationPattern", vibrationPattern);
      localStorage.setItem("countdownMode", JSON.stringify(countdownMode));
      localStorage.setItem("targetEndTime", targetEndTime);
      localStorage.setItem("endTimeInputMode", JSON.stringify(endTimeInputMode));
      localStorage.setItem("progressPreset", JSON.stringify(progressPreset));
      localStorage.setItem(
        "tickSoundEnabled",
        JSON.stringify(tickSoundEnabled)
      );
      localStorage.setItem("tickSoundVolume", JSON.stringify(tickSoundVolume));
      localStorage.setItem("flashEnabled", JSON.stringify(flashEnabled));
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
      localStorage.setItem("workMode", JSON.stringify(workMode));
      localStorage.setItem("useDatabase", JSON.stringify(useDatabase));
      localStorage.setItem("activeTab", activeTab);
      localStorage.setItem("currentPomodoroTask", currentPomodoroTask);

      // 初期値設定の保存
      localStorage.setItem(
        "defaultMeetingAlarmSettings",
        JSON.stringify(defaultMeetingAlarmSettings)
      );
      localStorage.setItem(
        "defaultMeetingAlarmPoints",
        JSON.stringify(defaultMeetingAlarmPoints)
      );
      localStorage.setItem(
        "defaultPomodoroWorkDuration",
        JSON.stringify(defaultPomodoroWorkDuration)
      );
      localStorage.setItem(
        "defaultPomodoroBreakDuration",
        JSON.stringify(defaultPomodoroBreakDuration)
      );
      localStorage.setItem(
        "defaultPomodoroCycles",
        JSON.stringify(defaultPomodoroCycles)
      );
      localStorage.setItem(
        "defaultPomodoroWorkAlarm",
        JSON.stringify(defaultPomodoroWorkAlarm)
      );
      localStorage.setItem(
        "defaultPomodoroBreakAlarm",
        JSON.stringify(defaultPomodoroBreakAlarm)
      );

      // ゴミ箱とバージョン履歴の保存
      localStorage.setItem("trashedTodos", JSON.stringify(trashedTodos));
      localStorage.setItem("todoVersions", JSON.stringify(todoVersions));
      localStorage.setItem("trashedMemos", JSON.stringify(trashedMemos));

      // タグ、フィルター、ビューモードの保存（ローカルタグのみ保存）
      localStorage.setItem("tags", JSON.stringify(localTags));
      localStorage.setItem("todoViewMode", viewMode);
    }
  }, [
    mounted, // mountedを依存配列に追加
    alarmPoints,
    meetingAlarmSettings,
    pomodoroSettings,
    sharedMemo,
    sharedTodos,
    notificationsEnabled,
    vibrationEnabled,
    vibrationPattern,
    countdownMode,
    targetEndTime,
    tickSoundEnabled,
    tickSoundVolume,
    flashEnabled,
    darkMode,
    workMode,
    useDatabase,
    activeTab,
    defaultMeetingAlarmSettings,
    defaultMeetingAlarmPoints,
    defaultPomodoroWorkDuration,
    defaultPomodoroBreakDuration,
    defaultPomodoroCycles,
    defaultPomodoroWorkAlarm,
    defaultPomodoroBreakAlarm,
    trashedTodos,
    todoVersions,
    trashedMemos,
    localTags,
    viewMode,
    currentPomodoroTask,
    endTimeInputMode,
    progressPreset,
  ]);

  // Supabaseデータの同期（データベースモード有効時）
  // 共通データとして1つのuseEffectで同期
  useEffect(() => {
    if (useDatabase && user) {
      // TODOsをSupabaseから同期
      if (
        sharedSupabaseTodos.todos.length > 0 ||
        !sharedSupabaseTodos.loading
      ) {
        setSharedTodos(sharedSupabaseTodos.todos);
      }
    }
  }, [
    useDatabase,
    user,
    sharedSupabaseTodos.todos,
    sharedSupabaseTodos.loading,
  ]);

  // ポモドーロタスクのSupabase同期
  useEffect(() => {
    if (useDatabase && user && !supabasePomodoroTask.loading) {
      setCurrentPomodoroTask(supabasePomodoroTask.task.taskText);
      setCurrentPomodoroTaskId(supabasePomodoroTask.task.todoId);
    }
  }, [
    useDatabase,
    user,
    supabasePomodoroTask.task,
    supabasePomodoroTask.loading,
  ]);

  /*
  useEffect(() => {
    if (useDatabase && user) {
      // メモをSupabaseから同期
      if (!sharedSupabaseMemos.loading) {
        setSharedMemo(sharedSupabaseMemos.memo);
        // textareaにフォーカスがなく、composing中でない場合のみ更新
        if (
          memoTextareaRef.current &&
          document.activeElement !== memoTextareaRef.current &&
          !isComposingRef.current
        ) {
          memoTextareaRef.current.value = sharedSupabaseMemos.memo;
        }
      }
    }
  }, [
    useDatabase,
    user,
    sharedSupabaseMemos.memo,
    sharedSupabaseMemos.loading,
  ]);
  */

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

  // 時間のフォーマット関数
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  // Safari対応のアラーム音生成（HTMLAudioElement使用）
  const createAlarmAudio = useCallback((settings: AlarmSettings) => {
    try {
      // Web Audio APIで音を生成してBlobを作成
      const win = window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextClass = win.AudioContext || win.webkitAudioContext;
      if (!AudioContextClass) return null;

      const audioContext = new AudioContextClass();
      const sampleRate = audioContext.sampleRate;
      const duration = 0.5; // 0.5秒
      const numSamples = sampleRate * duration;
      const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
      const channelData = buffer.getChannelData(0);

      // サイン波を生成
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        channelData[i] =
          Math.sin(2 * Math.PI * settings.frequency * t) *
          (settings.volume / 100);
      }

      // WAVファイルとしてエンコード
      const wavBlob = bufferToWave(buffer, numSamples);
      const audioUrl = URL.createObjectURL(wavBlob);
      const audio = new Audio(audioUrl);
      audio.volume = settings.volume / 100;

      return audio;
    } catch (error) {
      console.error("アラーム音の生成に失敗:", error);
      return null;
    }
  }, []);

  // バッファをWAVに変換
  const bufferToWave = (buffer: AudioBuffer, len: number) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const data = new Float32Array(len);
    buffer.copyFromChannel(data, 0, 0);

    const dataLength = len * numChannels * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(arrayBuffer);

    // WAVヘッダーを書き込み
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    // PCMデータを書き込み
    let offset = 44;
    for (let i = 0; i < len; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  // アラーム停止機能
  const stopAlarm = useCallback(() => {
    setIsAlarmRinging(false);
    setIsFlashing(false);
    cancelVibration();
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (titleBlinkIntervalRef.current) {
      clearInterval(titleBlinkIntervalRef.current);
      titleBlinkIntervalRef.current = null;
    }
    document.title = "Comm Time";
  }, [cancelVibration]);

  // アラーム再生機能（Safari対応・繰り返し対応）
  const playAlarm = useCallback(
    (settings: AlarmSettings, message: string = "アラーム!") => {
      if (typeof window === "undefined") return;

      // 既存のアラームを停止
      stopAlarm();
      setIsAlarmRinging(true);

      // Safari対応の音声再生
      const playSound = () => {
        try {
          const audio = createAlarmAudio(settings);
          if (audio) {
            audio.play().catch((e) => console.error("音声再生エラー:", e));
          }
        } catch (error) {
          console.error("音声再生に失敗:", error);
        }
      };

      // 繰り返しアラーム（5秒ごとに30秒間）
      playSound(); // 最初の再生
      let alarmCount = 0;
      alarmIntervalRef.current = setInterval(() => {
        alarmCount++;
        if (alarmCount >= 6) {
          stopAlarm();
        } else {
          playSound();

          // バイブレーション（毎回・iOS Safari対応）
          if (vibrationEnabled) {
            triggerAlarmVibration(vibrationPatternRef.current);
          }
        }
      }, 5000);

      // 強力なバイブレーション（iOS Safari対応）
      if (vibrationEnabled) {
        triggerAlarmVibration(vibrationPatternRef.current);
      }

      // フラッシュエフェクト（長めに）
      if (flashEnabled) {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 30000); // 30秒間点滅
      }

      // 通知（バックグラウンドでユーザーに知らせる）
      if (notificationsEnabled && notificationPermission === "granted") {
        new Notification("Comm Time", {
          body: message,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          tag: "comm-time-alarm",
          requireInteraction: true,
        });
      }

      // タイトル点滅（目立つように）
      let titleBlink = false;
      titleBlinkIntervalRef.current = setInterval(() => {
        titleBlink = !titleBlink;
        document.title = titleBlink
          ? "🔔🔔🔔 " + message + " 🔔🔔🔔"
          : "⚠️⚠️⚠️ TIME UP! ⚠️⚠️⚠️";
      }, 500);

      // フォーカス
      if (forceFocus) {
        window.focus();
      }
    },
    [
      forceFocus,
      vibrationEnabled,
      notificationsEnabled,
      notificationPermission,
      flashEnabled,
      createAlarmAudio,
      stopAlarm,
      triggerAlarmVibration,
    ]
  );

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // クリーンアップ: コンポーネントアンマウント時にアラーム停止
  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
      if (titleBlinkIntervalRef.current) {
        clearInterval(titleBlinkIntervalRef.current);
      }
    };
  }, []);

  // 画面クリックでアラーム停止（フラッシュがない場合）
  useEffect(() => {
    const handleClick = () => {
      if (isAlarmRinging && !isFlashing) {
        stopAlarm();
      }
    };

    if (isAlarmRinging && !isFlashing) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [isAlarmRinging, isFlashing, stopAlarm]);

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  // チクタク音を再生する関数（モバイル対応）
  const playTickSound = useCallback(async () => {
    if (typeof window === "undefined" || !tickSoundEnabled) return;

    try {
      if (!tickAudioContextRef.current) {
        const win = window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        };
        const AudioContextClass = win.AudioContext || win.webkitAudioContext;
        if (AudioContextClass) {
          tickAudioContextRef.current = new AudioContextClass();
        }
      }

      const audioContext = tickAudioContextRef.current;
      if (!audioContext) return;

      // モバイルブラウザ対応: AudioContextがsuspendedの場合はresume
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // AudioContextがrunning状態の時のみ音を再生
      if (audioContext.state === "running") {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(
          tickSoundVolume / 100,
          audioContext.currentTime
        );

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(
          0.00001,
          audioContext.currentTime + 0.05
        );
        oscillator.stop(audioContext.currentTime + 0.05);
      }
    } catch (error) {
      console.error("チクタク音の再生に失敗しました:", error);
    }
  }, [tickSoundEnabled, tickSoundVolume]);

  // ミーティングタイマーの更新
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMeetingRunning && meetingStartTime) {
      timer = setInterval(() => {
        const now = new Date();

        if (countdownMode && targetEndTime) {
          // カウントダウンモード: 終了時刻までの残り時間を計算
          const [hours, minutes] = targetEndTime.split(":").map(Number);
          const targetDate = new Date();
          targetDate.setHours(hours, minutes, 0, 0);

          // 終了時刻が過去の場合は明日として扱う
          if (targetDate < meetingStartTime) {
            targetDate.setDate(targetDate.getDate() + 1);
          }

          const remainingMs = targetDate.getTime() - now.getTime();
          const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

          setCountdownSeconds((prevSeconds) => {
            // カウントダウンが0になったらアラーム（前回の値が0より大きく、今回0になった場合）
            if (prevSeconds > 0 && remainingSec === 0) {
              playAlarm(meetingAlarmSettings, "時間になりました！");
              setIsMeetingRunning(false);
            }
            return remainingSec;
          });

          document.title = `CT (${formatTime(remainingSec)})`;
        } else {
          // 通常モード: 経過時間を計算
          const newElapsedTime = Math.floor(
            (now.getTime() - meetingStartTime.getTime()) / 1000
          );
          setMeetingElapsedTime(newElapsedTime);
          document.title = `CT (${formatTime(newElapsedTime)})`;
        }

        // チクタク音を再生
        playTickSound();
      }, 1000);
    }
    return () => {
      clearInterval(timer);
      if (!isMeetingRunning) {
        document.title = "CT";
      }
    };
  }, [
    isMeetingRunning,
    meetingStartTime,
    formatTime,
    countdownMode,
    targetEndTime,
    playAlarm,
    meetingAlarmSettings,
    playTickSound,
  ]);

  // アラームポイントの更新
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMeetingRunning) {
      timer = setInterval(() => {
        setAlarmPoints((prevPoints) =>
          prevPoints.map((point) => {
            if (!point.isDone) {
              const newRemainingTime = Math.max(0, point.remainingTime - 1);
              if (newRemainingTime === 0) {
                playAlarm(
                  meetingAlarmSettings,
                  `${point.minutes}分経過しました`
                );
                return {
                  ...point,
                  isDone: true,
                  remainingTime: newRemainingTime,
                };
              }
              return { ...point, remainingTime: newRemainingTime };
            }
            return point;
          })
        );
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isMeetingRunning, meetingAlarmSettings, playAlarm]);

  // 終了時刻からの残り時間を計算（エンド時間入力モード用）
  useEffect(() => {
    if (!targetEndTime || !endTimeInputMode) {
      setRemainingMeetingMinutes(0);
      return;
    }

    const calculateRemainingMinutes = () => {
      const now = new Date();
      const [hours, minutes] = targetEndTime.split(":").map(Number);
      const endTime = new Date();
      endTime.setHours(hours, minutes, 0, 0);

      if (endTime <= now) {
        endTime.setDate(endTime.getDate() + 1);
      }

      const totalMs = endTime.getTime() - now.getTime();
      const totalMinutes = Math.floor(totalMs / 60000);
      setRemainingMeetingMinutes(Math.max(0, totalMinutes));
    };

    calculateRemainingMinutes();
    // 1分ごとに更新
    const interval = setInterval(calculateRemainingMinutes, 60000);
    return () => clearInterval(interval);
  }, [targetEndTime, endTimeInputMode]);

  // ポモドーロタイマーの更新
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPomodoroRunning && pomodoroStartTime) {
      timer = setInterval(() => {
        const now = new Date();
        setPomodoroElapsedTime(
          Math.floor((now.getTime() - pomodoroStartTime.getTime()) / 1000)
        );
        // チクタク音を再生
        playTickSound();
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPomodoroRunning, pomodoroStartTime, playTickSound]);

  // ポモドーロの状態管理
  useEffect(() => {
    if (isPomodoroRunning) {
      const currentDuration =
        pomodoroState === "work"
          ? pomodoroSettings.workDuration
          : pomodoroSettings.breakDuration;

      if (pomodoroElapsedTime >= currentDuration * 60) {
        const newState = pomodoroState === "work" ? "break" : "work";
        setPomodoroState(newState);
        setPomodoroElapsedTime(0);
        setPomodoroStartTime(new Date());
        playAlarm(
          newState === "work"
            ? pomodoroSettings.workAlarm
            : pomodoroSettings.breakAlarm,
          newState === "work"
            ? "休憩終了！作業を開始してください"
            : "お疲れ様です！休憩時間です"
        );

        if (newState === "work") {
          setPomodoroCycles((prev) => prev + 1);
        }

        if (
          !pomodoroSettings.infiniteMode &&
          pomodoroCycles >= pomodoroSettings.cycles
        ) {
          setIsPomodoroRunning(false);
        }
      }
    }
  }, [
    pomodoroElapsedTime,
    isPomodoroRunning,
    pomodoroState,
    pomodoroSettings,
    pomodoroCycles,
    playAlarm,
  ]);

  // タイマーの制御機能
  const toggleMeetingTimer = useCallback(async () => {
    if (isMeetingRunning) {
      setIsMeetingRunning(false);
    } else {
      // タイマー開始時にAudioContextをresumeする（モバイル対応）
      if (tickSoundEnabled && tickAudioContextRef.current) {
        try {
          if (tickAudioContextRef.current.state === "suspended") {
            await tickAudioContextRef.current.resume();
          }
        } catch (error) {
          console.error("AudioContextのresume失敗:", error);
        }
      }

      if (meetingStartTime === null) {
        setMeetingStartTime(new Date());
      } else {
        const now = new Date();
        const pausedDuration =
          now.getTime() -
          (meetingStartTime.getTime() + meetingElapsedTime * 1000);
        setMeetingStartTime(new Date(now.getTime() - pausedDuration));
      }
      setIsMeetingRunning(true);
    }
  }, [
    isMeetingRunning,
    meetingStartTime,
    meetingElapsedTime,
    tickSoundEnabled,
  ]);

  const resetMeetingTimer = useCallback(() => {
    setIsMeetingRunning(false);
    setMeetingStartTime(null);
    setMeetingElapsedTime(0);
    setAlarmPoints(initialMeetingAlarmPoints);
  }, []);

  const togglePomodoroTimer = useCallback(async () => {
    if (isPomodoroRunning) {
      setIsPomodoroRunning(false);
    } else {
      // タイマー開始時にAudioContextをresumeする（モバイル対応）
      if (tickSoundEnabled && tickAudioContextRef.current) {
        try {
          if (tickAudioContextRef.current.state === "suspended") {
            await tickAudioContextRef.current.resume();
          }
        } catch (error) {
          console.error("AudioContextのresume失敗:", error);
        }
      }

      if (pomodoroStartTime === null) {
        setPomodoroStartTime(new Date());
        setPomodoroElapsedTime(0);
      } else {
        const now = new Date();
        const adjustedStartTime = new Date(
          now.getTime() - pomodoroElapsedTime * 1000
        );
        setPomodoroStartTime(adjustedStartTime);
      }
      setIsPomodoroRunning(true);
    }
  }, [
    isPomodoroRunning,
    pomodoroStartTime,
    pomodoroElapsedTime,
    tickSoundEnabled,
  ]);

  const resetPomodoroTimer = useCallback(() => {
    setIsPomodoroRunning(false);
    setPomodoroStartTime(null);
    setPomodoroElapsedTime(0);
    setPomodoroState("work");
    setPomodoroCycles(0);
    setPomodoroSettings(initialPomodoroSettings);
  }, []);

  // アラームポイントの管理機能
  const addAlarmPoint = useCallback(() => {
    const newId = Date.now().toString();
    const newMinutes = Math.max(1, Math.floor(meetingElapsedTime / 60) + 1);
    const newPoint = {
      id: newId,
      minutes: newMinutes,
      isDone: false,
      remainingTime: newMinutes * 60,
    };
    setAlarmPoints((prevPoints) =>
      [...prevPoints, newPoint].sort((a, b) => a.minutes - b.minutes)
    );
  }, [meetingElapsedTime]);

  const updateAlarmPoint = useCallback((id: string, minutes: number) => {
    setAlarmPoints((prevPoints) =>
      prevPoints
        .map((point) =>
          point.id === id
            ? {
                ...point,
                minutes: Math.max(1, minutes),
                remainingTime: Math.max(1, minutes) * 60,
              }
            : point
        )
        .sort((a, b) => a.minutes - b.minutes)
    );
  }, []);

  const removeAlarmPoint = useCallback((id: string) => {
    setAlarmPoints((prevPoints) =>
      prevPoints.filter((point) => point.id !== id)
    );
  }, []);

  // エンド時間入力モード: 終了時刻から進行率ベースでアラームポイントを自動生成
  const generateAlarmPointsFromEndTime = useCallback((endTimeStr: string, presets: number[]) => {
    if (!endTimeStr) return;

    const now = new Date();
    const [hours, minutes] = endTimeStr.split(":").map(Number);
    const endTime = new Date();
    endTime.setHours(hours, minutes, 0, 0);

    // 終了時刻が過去の場合は翌日として扱う
    if (endTime <= now) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const totalMs = endTime.getTime() - now.getTime();
    const totalMinutes = Math.floor(totalMs / 60000);
    setMeetingTotalDurationMinutes(totalMinutes);
    setRemainingMeetingMinutes(Math.max(0, totalMinutes));

    if (totalMinutes <= 0) return;

    // 進行率プリセットに基づいてアラームポイントを生成
    const newAlarmPoints: AlarmPoint[] = presets
      .filter((percent) => percent > 0 && percent <= 100)
      .map((percent, index) => {
        const alarmMinutes = Math.round((totalMinutes * percent) / 100);
        return {
          id: `auto-${Date.now()}-${index}`,
          minutes: alarmMinutes,
          isDone: false,
          remainingTime: alarmMinutes * 60,
        };
      })
      .filter((point) => point.minutes > 0)
      .filter((point, index, arr) =>
        // 重複する分数を除去
        arr.findIndex(p => p.minutes === point.minutes) === index
      )
      .sort((a, b) => a.minutes - b.minutes);

    setAlarmPoints(newAlarmPoints);
  }, []);

  // 終了時刻の計算機能
  const getEndTime = useCallback(
    (startTime: Date | null, durationInSeconds: number) => {
      if (!startTime) return "--:--:--";
      const endTime = new Date(startTime.getTime() + durationInSeconds * 1000);
      return endTime.toLocaleTimeString();
    },
    []
  );

  // カウントダウン時間の計算
  const getCountdown = useCallback(
    (totalSeconds: number, elapsedSeconds: number) => {
      const remainingSeconds = totalSeconds - elapsedSeconds;
      return formatTime(Math.max(0, remainingSeconds));
    },
    [formatTime]
  );

  // 通知権限のリクエスト
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined") return;

    // iOS Safariなど、一部のブラウザでは通知がサポートされていない
    if (!("Notification" in window) || !window.Notification) {
      // 通知が使えない場合は、何もせずに戻る（エラーメッセージを出さない）
      console.log("このブラウザでは通知機能が利用できません");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        setNotificationsEnabled(true);
        // テスト通知を送信
        try {
          new Notification("Comm Time", {
            body: "通知が有効になりました！",
            icon: "/favicon.svg",
          });
        } catch (e) {
          console.log("通知の送信に失敗しました:", e);
        }
      } else if (permission === "denied") {
        console.log("通知が拒否されました");
      }
    } catch (error) {
      console.error("通知権限のリクエストに失敗しました:", error);
    }
  }, []);

  // 通知トグル
  const toggleNotifications = useCallback(() => {
    if (notificationPermission !== "granted") {
      requestNotificationPermission();
    } else {
      setNotificationsEnabled(!notificationsEnabled);
    }
  }, [
    notificationPermission,
    notificationsEnabled,
    requestNotificationPermission,
  ]);

  // 設定を初期値にリセット
  const resetToDefaults = useCallback(() => {
    setMeetingAlarmSettings(defaultMeetingAlarmSettings);
    setPomodoroSettings({
      ...pomodoroSettings,
      workDuration: defaultPomodoroWorkDuration,
      breakDuration: defaultPomodoroBreakDuration,
      cycles: defaultPomodoroCycles,
      workAlarm: defaultPomodoroWorkAlarm,
      breakAlarm: defaultPomodoroBreakAlarm,
    });
  }, [
    defaultMeetingAlarmSettings,
    defaultPomodoroWorkDuration,
    defaultPomodoroBreakDuration,
    defaultPomodoroCycles,
    defaultPomodoroWorkAlarm,
    defaultPomodoroBreakAlarm,
    pomodoroSettings,
  ]);

  // 音のプレビュー機能
  const previewSound = useCallback(
    (settings: AlarmSettings) => {
      const audio = createAlarmAudio(settings);
      if (audio) {
        audio.play().catch((error) => {
          console.error("音のプレビュー再生に失敗:", error);
        });
      }
    },
    [createAlarmAudio]
  );

  // タグCRUD関数（データベースモード対応）
  const addTag = useCallback(
    async (name: string, color: string) => {
      if (useDatabase && user) {
        // データベースモード: Supabaseに保存
        const newTag = await supabaseTags.addTag(name, color);
        return newTag || { id: "", name, color };
      } else {
        // ローカルモード: LocalStorageに保存
        const newTag: Tag = {
          id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          color,
        };
        setLocalTags((prev) => [...prev, newTag]);
        return newTag;
      }
    },
    [useDatabase, user, supabaseTags]
  );

  const updateTag = useCallback(
    (id: string, name: string, color: string) => {
      if (useDatabase && user) {
        supabaseTags.updateTag(id, name, color);
      } else {
        setLocalTags((prev) =>
          prev.map((tag) => (tag.id === id ? { ...tag, name, color } : tag))
        );
      }
    },
    [useDatabase, user, supabaseTags]
  );

  const deleteTag = useCallback(
    (id: string) => {
      if (useDatabase && user) {
        // データベースモード: RPCがTODOからのタグ参照も一括削除
        supabaseTags.deleteTag(id);
      } else {
        setLocalTags((prev) => prev.filter((tag) => tag.id !== id));
        // 関連するTODOからもタグを削除
        setSharedTodos((prev) =>
          prev.map((todo) => ({
            ...todo,
            tagIds: todo.tagIds?.filter((tagId) => tagId !== id),
          }))
        );
      }
    },
    [useDatabase, user, supabaseTags]
  );

  // カンバンステータス更新関数（看板ビューで使用）
  const updateTodoKanbanStatus = useCallback(
    (todoId: string, kanbanStatus: KanbanStatus) => {
      if (useDatabase && user) {
        sharedSupabaseTodos.updateTodo(todoId, { kanbanStatus });
      } else {
        setSharedTodos((prev) =>
          prev.map((todo) =>
            todo.id === todoId ? { ...todo, kanbanStatus } : todo
          )
        );
      }
    },
    [useDatabase, user, sharedSupabaseTodos]
  );

  // TODO詳細保存（タグ・優先度・重要度・ステータス）
  const handleSaveTodoDetails = useCallback(
    (
      todoId: string,
      updates: {
        tagIds?: string[];
        priority?: PriorityLevel;
        importance?: ImportanceLevel;
        kanbanStatus?: KanbanStatus;
      }
    ) => {
      if (useDatabase && user) {
        sharedSupabaseTodos.updateTodo(todoId, updates);
      } else {
        setSharedTodos((prev) =>
          prev.map((todo) =>
            todo.id === todoId ? { ...todo, ...updates } : todo
          )
        );
      }
    },
    [useDatabase, user, sharedSupabaseTodos]
  );

  // ポモドーロタスク更新関数（Supabase連携対応）
  const updatePomodoroTask = useCallback(
    (taskText: string, todoId: string | null = null) => {
      setCurrentPomodoroTask(taskText);
      setCurrentPomodoroTaskId(todoId);
      if (useDatabase && user) {
        supabasePomodoroTask.updateTask(taskText, todoId);
      }
    },
    [useDatabase, user, supabasePomodoroTask]
  );

  // ポモドーロタスククリア関数
  const clearPomodoroTask = useCallback(() => {
    setCurrentPomodoroTask("");
    setCurrentPomodoroTaskId(null);
    if (useDatabase && user) {
      supabasePomodoroTask.clearTask();
    }
  }, [useDatabase, user, supabasePomodoroTask]);

  // フィルタリングされたTODOを取得
  const filteredTodos = React.useMemo(() => {
    return sharedTodos.filter((todo) => {
      // タグフィルター
      if (filterState.tags.length > 0) {
        const todoTags = todo.tagIds || [];
        if (!filterState.tags.some((tagId) => todoTags.includes(tagId))) {
          return false;
        }
      }
      // 優先度フィルター
      if (filterState.priority !== "all") {
        if ((todo.priority || "none") !== filterState.priority) {
          return false;
        }
      }
      // 重要度フィルター
      if (filterState.importance !== "all") {
        if ((todo.importance || "none") !== filterState.importance) {
          return false;
        }
      }
      // カンバンステータスフィルター
      if (filterState.kanbanStatus !== "all") {
        if ((todo.kanbanStatus || "backlog") !== filterState.kanbanStatus) {
          return false;
        }
      }
      return true;
    });
  }, [sharedTodos, filterState]);

  // TODO管理機能
  const addTodo = useCallback(
    (text: string, isPomodoro: boolean) => {
      if (!text.trim()) return; // 空のTODOは追加しない

      if (useDatabase && user) {
        // データベースモード: Supabaseを使用（共通TODO）
        sharedSupabaseTodos.addTodo(text.trim());
      } else {
        // ローカルモード: LocalStorageを使用
        const newTodo = {
          id: Date.now().toString(),
          text: text.trim(),
          isCompleted: false,
        };

        // LocalStorageモードでは個別に保存（後方互換性のため）
        if (isPomodoro) {
          setPomodoroTodos((prev) => [...prev, newTodo]);
        } else {
          setMeetingTodos((prev) => [...prev, newTodo]);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMeetingTodos and setPomodoroTodos are stable aliases of setSharedTodos
    [useDatabase, user, sharedSupabaseTodos]
  );

  const toggleTodo = useCallback(
    (id: string, isPomodoro: boolean) => {
      if (useDatabase && user) {
        // データベースモード: Supabaseを使用（共通TODO）
        sharedSupabaseTodos.toggleTodo(id);
      } else {
        // ローカルモード: LocalStorageを使用（個別に保存）
        const updateTodos = (prev: TodoItem[]) =>
          prev.map((todo) =>
            todo.id === id ? { ...todo, isCompleted: !todo.isCompleted } : todo
          );

        if (isPomodoro) {
          setPomodoroTodos(updateTodos);
        } else {
          setMeetingTodos(updateTodos);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMeetingTodos and setPomodoroTodos are stable aliases of setSharedTodos
    [useDatabase, user, sharedSupabaseTodos]
  );

  // バージョン履歴を追加するヘルパー関数
  const addTodoVersion = useCallback(
    (
      todoId: string,
      text: string,
      changeType: "create" | "update" | "delete"
    ) => {
      const newVersion: TodoVersion = {
        id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        todoId,
        text,
        timestamp: new Date().toISOString(),
        changeType,
      };
      setTodoVersions((prev) => [...prev, newVersion]);
    },
    []
  );

  const removeTodo = useCallback(
    (id: string, isPomodoro: boolean) => {
      // 削除前にTODOを取得してゴミ箱に移動
      const todos = isPomodoro ? pomodoroTodos : meetingTodos;
      const todoToRemove = todos.find((todo) => todo.id === id);

      if (todoToRemove) {
        // ゴミ箱に追加
        const trashedTodo: TrashedTodoItem = {
          ...todoToRemove,
          deletedAt: new Date().toISOString(),
        };
        setTrashedTodos((prev) => [...prev, trashedTodo]);

        // バージョン履歴に追加
        addTodoVersion(id, todoToRemove.text, "delete");
      }

      if (useDatabase && user) {
        // データベースモード: Supabaseを使用（共通TODO）
        sharedSupabaseTodos.removeTodo(id);
      } else {
        // ローカルモード: LocalStorageを使用（個別に保存）
        if (isPomodoro) {
          setPomodoroTodos((prev) => prev.filter((todo) => todo.id !== id));
        } else {
          setMeetingTodos((prev) => prev.filter((todo) => todo.id !== id));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMeetingTodos and setPomodoroTodos are stable aliases of setSharedTodos
    [
      useDatabase,
      user,
      sharedSupabaseTodos,
      pomodoroTodos,
      meetingTodos,
      addTodoVersion,
    ]
  );

  // ゴミ箱からTODOを復元
  const restoreTodo = useCallback(
    (trashedTodo: TrashedTodoItem) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { deletedAt, ...todoItem } = trashedTodo;

      if (useDatabase && user) {
        // データベースモード: Supabaseを使用
        sharedSupabaseTodos.addTodo(todoItem.text);
      } else {
        // ローカルモード: 共有TODOリストに追加
        setMeetingTodos((prev) => [...prev, todoItem]);
      }

      // ゴミ箱から削除
      setTrashedTodos((prev) => prev.filter((t) => t.id !== trashedTodo.id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMeetingTodos is a stable alias of setSharedTodos
    [useDatabase, user, sharedSupabaseTodos]
  );

  // ゴミ箱からTODOを完全削除
  const permanentlyDeleteTodo = useCallback((id: string) => {
    setTrashedTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // メモをゴミ箱に移動
  const moveMemotoTrash = useCallback((memo: MemoData) => {
    const trashedMemo = {
      ...memo,
      deletedAt: new Date().toISOString(),
    };
    setTrashedMemos((prev) => [...prev, trashedMemo]);
  }, []);

  // メモを削除（ゴミ箱に移動）
  const handleDeleteMemo = useCallback(
    (id: string) => {
      multipleMemos.deleteMemo(id, moveMemotoTrash);
    },
    [multipleMemos, moveMemotoTrash]
  );

  // ゴミ箱を空にする
  const emptyTrash = useCallback(() => {
    setTrashedTodos([]);
  }, []);

  const updateTodo = useCallback(
    (id: string, newText: string, isPomodoro: boolean) => {
      if (!newText.trim()) return; // 空のテキストの場合は更新しない

      // 10文字以上の変更の場合、バージョン履歴に追加
      const todos = isPomodoro ? pomodoroTodos : meetingTodos;
      const currentTodo = todos.find((todo) => todo.id === id);
      if (currentTodo) {
        const oldText = currentTodo.text;
        const newTextTrimmed = newText.trim();
        // 文字列の差分が10文字以上の場合のみバージョン保存
        if (
          Math.abs(oldText.length - newTextTrimmed.length) >= 10 ||
          (oldText !== newTextTrimmed && newTextTrimmed.length >= 10)
        ) {
          addTodoVersion(id, oldText, "update");
        }
      }

      if (useDatabase && user) {
        // データベースモード: Supabaseを使用（共通TODO）
        sharedSupabaseTodos.updateTodo(id, { text: newText.trim() });
      } else {
        // ローカルモード: LocalStorageを使用（個別に保存）
        const updateFunc = (prev: TodoItem[]) =>
          prev.map((todo) =>
            todo.id === id ? { ...todo, text: newText.trim() } : todo
          );

        if (isPomodoro) {
          setPomodoroTodos(updateFunc);
        } else {
          setMeetingTodos(updateFunc);
        }
      }
      setEditingTodoId(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMeetingTodos and setPomodoroTodos are stable aliases of setSharedTodos
    [
      useDatabase,
      user,
      sharedSupabaseTodos,
      pomodoroTodos,
      meetingTodos,
      addTodoVersion,
    ]
  );

  const startEditingTodo = useCallback((id: string) => {
    setEditingTodoId(id);
  }, []);

  const cancelEditingTodo = useCallback(() => {
    setEditingTodoId(null);
  }, []);

  // 一括削除機能
  const clearAllTodos = useCallback(async () => {
    if (useDatabase && user) {
      // データベースモード: すべてのTODOを削除
      const allTodos = sharedSupabaseTodos.todos;
      // 複数の削除リクエストを並列で実行してパフォーマンスを向上させます
      const removalPromises = allTodos.map((todo) =>
        sharedSupabaseTodos.removeTodo(todo.id)
      );
      await Promise.all(removalPromises);
    } else {
      // ローカルモード
      setSharedTodos([]);
    }
  }, [useDatabase, user, sharedSupabaseTodos]);

  const clearCompletedTodos = useCallback(async () => {
    if (useDatabase && user) {
      // データベースモード: 完了したTODOを削除
      const completedTodos = sharedSupabaseTodos.todos.filter(
        (t) => t.isCompleted
      );
      // 複数の削除リクエストを並列で実行してパフォーマンスを向上させます
      const removalPromises = completedTodos.map((todo) =>
        sharedSupabaseTodos.removeTodo(todo.id)
      );
      await Promise.all(removalPromises);
    } else {
      // ローカルモード
      setSharedTodos((prev) => prev.filter((todo) => !todo.isCompleted));
    }
  }, [useDatabase, user, sharedSupabaseTodos]);

  // TODOとアラームポイントのリンク機能
  const linkTodoToAlarmPoint = useCallback(
    (todoId: string, alarmPointId: string) => {
      setAlarmPoints((prev) =>
        prev.map((point) =>
          point.id === alarmPointId ? { ...point, linkedTodo: todoId } : point
        )
      );
    },
    []
  );

  // 期限の更新機能
  const updateTodoDeadline = useCallback(
    (
      id: string,
      dueDate: string | undefined,
      dueTime: string | undefined,
      isPomodoro: boolean
    ) => {
      if (useDatabase && user) {
        // データベースモード: Supabaseを使用（共通TODO）
        sharedSupabaseTodos.updateTodo(id, { dueDate, dueTime });
      } else {
        // ローカルモード: LocalStorageを使用（個別に保存）
        const updateFunc = (prev: TodoItem[]) =>
          prev.map((todo) =>
            todo.id === id ? { ...todo, dueDate, dueTime } : todo
          );

        if (isPomodoro) {
          setPomodoroTodos(updateFunc);
        } else {
          setMeetingTodos(updateFunc);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMeetingTodos and setPomodoroTodos are stable aliases of setSharedTodos
    [useDatabase, user, sharedSupabaseTodos]
  );

  // 期限延長機能
  const extendDeadline = useCallback(
    (id: string, days: number, isPomodoro: boolean) => {
      // 現在のTODOを取得して新しい期限を計算
      const todos = isPomodoro ? pomodoroTodos : meetingTodos;
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;

      const currentDate = todo.dueDate ? new Date(todo.dueDate) : new Date();
      currentDate.setDate(currentDate.getDate() + days);
      const newDueDate = currentDate.toISOString().split("T")[0];

      if (useDatabase && user) {
        // データベースモード: Supabaseを使用
        sharedSupabaseTodos.updateTodo(id, {
          dueDate: newDueDate,
          dueTime: todo.dueTime,
        });
      } else {
        // ローカルモード: LocalStorageを使用
        const updateFunc = (prev: TodoItem[]) =>
          prev.map((t) => (t.id === id ? { ...t, dueDate: newDueDate } : t));

        if (isPomodoro) {
          setPomodoroTodos(updateFunc);
        } else {
          setMeetingTodos(updateFunc);
        }
      }
    },
    [
      useDatabase,
      user,
      sharedSupabaseTodos,
      pomodoroTodos,
      meetingTodos,
      setMeetingTodos,
      setPomodoroTodos,
    ]
  );

  // 期限までの残り時間を取得
  const getDeadlineStatus = useCallback((todo: TodoItem) => {
    if (!todo.dueDate) return null;

    const now = new Date();
    const deadline = new Date(todo.dueDate);

    if (todo.dueTime) {
      const [hours, minutes] = todo.dueTime.split(":").map(Number);
      deadline.setHours(hours, minutes, 0, 0);
    } else {
      deadline.setHours(23, 59, 59, 999);
    }

    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    return {
      isOverdue: diffMs < 0,
      isSoon: diffMs > 0 && diffHours <= 24,
      diffDays,
      diffHours,
      diffMs,
    };
  }, []);

  // Todoをソート（期限順）
  const sortTodosByDeadline = useCallback((todos: TodoItem[]) => {
    return [...todos].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);

      if (a.dueTime) {
        const [hoursA, minutesA] = a.dueTime.split(":").map(Number);
        dateA.setHours(hoursA, minutesA);
      }
      if (b.dueTime) {
        const [hoursB, minutesB] = b.dueTime.split(":").map(Number);
        dateB.setHours(hoursB, minutesB);
      }

      return dateA.getTime() - dateB.getTime();
    });
  }, []);

  // ドラッグ&ドロップの処理
  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const sourceId = result.source.droppableId;
      const destId = result.destination.droppableId;

      if (sourceId === destId) {
        // 同じリスト内での並び替え
        const items =
          sourceId === "meetingTodos" ? meetingTodos : pomodoroTodos;
        const reorderedItems = Array.from(items);
        const [removed] = reorderedItems.splice(result.source.index, 1);
        reorderedItems.splice(result.destination.index, 0, removed);

        if (sourceId === "meetingTodos") {
          setMeetingTodos(reorderedItems);
        } else {
          setPomodoroTodos(reorderedItems);
        }

        // Supabaseの順序も更新（データベースモード時のみ）
        if (useDatabase && user) {
          sharedSupabaseTodos.reorderTodos(reorderedItems);
        }
      } else if (destId.startsWith("alarmPoint")) {
        // TODOをアラームポイントにリンク
        const todoId = result.draggableId;
        const alarmPointId = destId.split("-")[1];
        linkTodoToAlarmPoint(todoId, alarmPointId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMeetingTodos and setPomodoroTodos are stable aliases of setSharedTodos
    [
      meetingTodos,
      pomodoroTodos,
      linkTodoToAlarmPoint,
      useDatabase,
      user,
      sharedSupabaseTodos,
    ]
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
      {/* フラッシュオーバーレイ - タップでアラーム停止 */}
      {isFlashing && (
        <div
          className="fixed inset-0 bg-white dark:bg-gray-900 z-50 animate-pulse cursor-pointer flex items-center justify-center"
          onClick={stopAlarm}
        >
          <div className="text-center">
            <p className="text-4xl sm:text-5xl lg:text-6xl font-bold text-red-600 dark:text-red-400 mb-4 animate-bounce">
              ⏰ TIME UP! ⏰
            </p>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 dark:text-gray-300 font-semibold">
              タップして停止
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
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

        {/* タブ切り替え */}
        <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("meeting")}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === "meeting"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl"
                : "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-md hover:shadow-lg"
            }`}
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">ミーティングタイマー</span>
            <span className="sm:hidden">ミーティング</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pomodoro")}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === "pomodoro"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl"
                : "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-md hover:shadow-lg"
            }`}
          >
            <List className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">ポモドーロタイマー</span>
            <span className="sm:hidden">ポモドーロ</span>
          </button>
        </div>

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
                            setMeetingTotalDurationMinutes(0);
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
                              meetingTodos.find(
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
                          setMeetingAlarmSettings(initialMeetingAlarmSettings)
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
                                          updateTodo(
                                            todo.id,
                                            value,
                                            activeTab === "pomodoro"
                                          );
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
                                          updateTodo(
                                            todo.id,
                                            value,
                                            activeTab === "pomodoro"
                                          );
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
                                                activeTab === "pomodoro"
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
                                                activeTab === "pomodoro"
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
                                                  undefined,
                                                  activeTab === "pomodoro"
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
                                                extendDeadline(
                                                  todo.id,
                                                  1,
                                                  activeTab === "pomodoro"
                                                )
                                              }
                                              className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                                              title="1日延長"
                                            >
                                              +1日
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                extendDeadline(
                                                  todo.id,
                                                  3,
                                                  activeTab === "pomodoro"
                                                )
                                              }
                                              className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                                              title="3日延長"
                                            >
                                              +3日
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                extendDeadline(
                                                  todo.id,
                                                  7,
                                                  activeTab === "pomodoro"
                                                )
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
                                        toggleTodo(
                                          todo.id,
                                          activeTab === "pomodoro"
                                        )
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
                                        updatePomodoroTask(todo.text, todo.id);
                                        setActiveTab("pomodoro");
                                        if (!isPomodoroRunning || pomodoroState !== 'work') {
                                          setPomodoroState('work');
                                          setPomodoroElapsedTime(0);
                                          setPomodoroStartTime(new Date());
                                          setIsPomodoroRunning(true);
                                        }
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
                                        removeTodo(
                                          todo.id,
                                          activeTab === "pomodoro"
                                        )
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
                        addTodo(value, activeTab === "pomodoro");
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
                      addTodo(value, activeTab === "pomodoro");
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
                  onToggleTodo={(id) => toggleTodo(id, activeTab === "pomodoro")}
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
