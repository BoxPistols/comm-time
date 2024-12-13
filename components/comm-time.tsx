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
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabType>("meeting");

  // ミーティングタイマー関連の状態
  const [isMeetingRunning, setIsMeetingRunning] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);
  const [meetingElapsedTime, setMeetingElapsedTime] = useState(0);
  const [alarmPoints, setAlarmPoints] = useState<AlarmPoint[]>(
    initialMeetingAlarmPoints
  );
  const [meetingAlarmSettings, setMeetingAlarmSettings] =
    useState<AlarmSettings>(initialMeetingAlarmSettings);
  const [meetingMemo, setMeetingMemo] = useState("");
  const [meetingTodos, setMeetingTodos] = useState<TodoItem[]>([]);

  // ポモドーロタイマー関連の状態
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroStartTime, setPomodoroStartTime] = useState<Date | null>(null);
  const [pomodoroElapsedTime, setPomodoroElapsedTime] = useState(0);
  const [pomodoroState, setPomodoroState] = useState<"work" | "break">("work");
  const [pomodoroSettings, setPomodoroSettings] = useState(
    initialPomodoroSettings
  );
  const [pomodoroMemo, setPomodoroMemo] = useState("");
  const [pomodoroCycles, setPomodoroCycles] = useState(0);
  const [pomodoroTodos, setPomodorTodos] = useState<TodoItem[]>([]);

  // TODO関連の状態
  const [newMeetingTodo, setNewMeetingTodo] = useState("");
  const [newPomodoroTodo, setNewPomodoroTodo] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState("");

  // その他の状態
  const [forceFocus, setForceFocus] = useState(false);

  // refs
  const todoInputRef = useRef<HTMLInputElement>(null);

  // 初期データのロード
  useEffect(() => {
    // ローカルストレージからすべての保存データを読み込む
    setAlarmPoints(getStorageValue("alarmPoints", initialMeetingAlarmPoints));
    setMeetingAlarmSettings(
      getStorageValue("meetingAlarmSettings", initialMeetingAlarmSettings)
    );
    setMeetingMemo(getStorageValue("meetingMemo", ""));
    setMeetingTodos(getStorageValue("meetingTodos", []));
    setPomodoroSettings(
      getStorageValue("pomodoroSettings", initialPomodoroSettings)
    );
    setPomodoroMemo(getStorageValue("pomodoroMemo", ""));
    setPomodorTodos(getStorageValue("pomodoroTodos", []));
  }, []);

  // データの自動保存
  useEffect(() => {
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
      localStorage.setItem("meetingMemo", meetingMemo);
      localStorage.setItem("pomodoroMemo", pomodoroMemo);
      localStorage.setItem("meetingTodos", JSON.stringify(meetingTodos));
      localStorage.setItem("pomodoroTodos", JSON.stringify(pomodoroTodos));
    }
  }, [
    alarmPoints,
    meetingAlarmSettings,
    pomodoroSettings,
    meetingMemo,
    pomodoroMemo,
    meetingTodos,
    pomodoroTodos,
  ]);

  // 時間のフォーマット関数
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  // アラーム再生機能
  const playAlarm = useCallback(
    (settings: AlarmSettings) => {
      if (typeof window === "undefined") return;

      const audioContext = new ((
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        settings.frequency,
        audioContext.currentTime
      );
      gainNode.gain.setValueAtTime(
        settings.volume / 100,
        audioContext.currentTime
      );

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(
        0.00001,
        audioContext.currentTime + 1
      );
      oscillator.stop(audioContext.currentTime + 1);

      if (forceFocus) {
        window.focus();
        document.title = "アラーム!";
        setTimeout(() => {
          document.title = `CT (${formatTime(meetingElapsedTime)})`;
        }, 5000);
      }
    },
    [forceFocus, meetingElapsedTime, formatTime]
  );

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ミーティングタイマーの更新
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMeetingRunning && meetingStartTime) {
      timer = setInterval(() => {
        const now = new Date();
        const newElapsedTime = Math.floor(
          (now.getTime() - meetingStartTime.getTime()) / 1000
        );
        setMeetingElapsedTime(newElapsedTime);
        document.title = `CT (${formatTime(newElapsedTime)})`;
      }, 1000);
    }
    return () => {
      clearInterval(timer);
      if (!isMeetingRunning) {
        document.title = "CT";
      }
    };
  }, [isMeetingRunning, meetingStartTime, formatTime]);

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
                playAlarm(meetingAlarmSettings);
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

  // ポモドーロタイマーの更新
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPomodoroRunning && pomodoroStartTime) {
      timer = setInterval(() => {
        const now = new Date();
        setPomodoroElapsedTime(
          Math.floor((now.getTime() - pomodoroStartTime.getTime()) / 1000)
        );
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPomodoroRunning, pomodoroStartTime]);

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
            : pomodoroSettings.breakAlarm
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
  const toggleMeetingTimer = useCallback(() => {
    if (isMeetingRunning) {
      setIsMeetingRunning(false);
    } else {
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
  }, [isMeetingRunning, meetingStartTime, meetingElapsedTime]);

  const resetMeetingTimer = useCallback(() => {
    setIsMeetingRunning(false);
    setMeetingStartTime(null);
    setMeetingElapsedTime(0);
    setAlarmPoints(initialMeetingAlarmPoints);
  }, []);

  const togglePomodoroTimer = useCallback(() => {
    if (isPomodoroRunning) {
      setIsPomodoroRunning(false);
    } else {
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
  }, [isPomodoroRunning, pomodoroStartTime, pomodoroElapsedTime]);

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

  // TODO管理機能
  const addTodo = useCallback((text: string, isPomodoro: boolean) => {
    if (!text.trim()) return; // 空のTODOは追加しない

    const newTodo = {
      id: Date.now().toString(),
      text: text.trim(),
      isCompleted: false,
    };

    if (isPomodoro) {
      setPomodorTodos((prev) => [...prev, newTodo]);
    } else {
      setMeetingTodos((prev) => [...prev, newTodo]);
    }
  }, []);

  const toggleTodo = useCallback((id: string, isPomodoro: boolean) => {
    const updateTodos = (prev: TodoItem[]) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, isCompleted: !todo.isCompleted } : todo
      );

    if (isPomodoro) {
      setPomodorTodos(updateTodos);
    } else {
      setMeetingTodos(updateTodos);
    }
  }, []);

  const removeTodo = useCallback((id: string, isPomodoro: boolean) => {
    if (isPomodoro) {
      setPomodorTodos((prev) => prev.filter((todo) => todo.id !== id));
    } else {
      setMeetingTodos((prev) => prev.filter((todo) => todo.id !== id));
    }
  }, []);

  const updateTodo = useCallback(
    (id: string, newText: string, isPomodoro: boolean) => {
      if (!newText.trim()) return; // 空のテキストの場合は更新しない

      const updateFunc = (prev: TodoItem[]) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, text: newText.trim() } : todo
        );

      if (isPomodoro) {
        setPomodorTodos(updateFunc);
      } else {
        setMeetingTodos(updateFunc);
      }
      setEditingTodoId(null);
      setEditingTodoText("");
    },
    []
  );

  const startEditingTodo = useCallback((id: string, text: string) => {
    setEditingTodoId(id);
    setEditingTodoText(text);
  }, []);

  const cancelEditingTodo = useCallback(() => {
    setEditingTodoId(null);
    setEditingTodoText("");
  }, []);

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
          setPomodorTodos(reorderedItems);
        }
      } else if (destId.startsWith("alarmPoint")) {
        // TODOをアラームポイントにリンク
        const todoId = result.draggableId;
        const alarmPointId = destId.split("-")[1];
        linkTodoToAlarmPoint(todoId, alarmPointId);
      }
    },
    [meetingTodos, pomodoroTodos, linkTodoToAlarmPoint]
  );

  // TODOの順序変更機能
  const moveTodoUp = useCallback(
    (index: number, isPomodoro: boolean) => {
      if (index === 0) return;

      const todos = isPomodoro ? pomodoroTodos : meetingTodos;
      const newTodos = [...todos];
      [newTodos[index - 1], newTodos[index]] = [
        newTodos[index],
        newTodos[index - 1],
      ];

      if (isPomodoro) {
        setPomodorTodos(newTodos);
      } else {
        setMeetingTodos(newTodos);
      }
    },
    [pomodoroTodos, meetingTodos]
  );

  const moveTodoDown = useCallback(
    (index: number, isPomodoro: boolean) => {
      const todos = isPomodoro ? pomodoroTodos : meetingTodos;
      if (index === todos.length - 1) return;

      const newTodos = [...todos];
      [newTodos[index], newTodos[index + 1]] = [
        newTodos[index + 1],
        newTodos[index],
      ];

      if (isPomodoro) {
        setPomodorTodos(newTodos);
      } else {
        setMeetingTodos(newTodos);
      }
    },
    [pomodoroTodos, meetingTodos]
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">
          Comm Time
        </h1>

        <div className="text-xl font-semibold mb-4 text-center">
          現在時刻: {currentTime.toLocaleTimeString()}
        </div>

        <div className="flex mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("meeting")}
            className={`flex-1 py-2 ${
              activeTab === "meeting" ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
          >
            <Clock className="inline mr-2" /> ミーティングタイマー
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pomodoro")}
            className={`flex-1 py-2 ${
              activeTab === "pomodoro"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            <List className="inline mr-2" /> ポモドーロタイマー
          </button>
        </div>

        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-3/4 pr-0 md:pr-4 mb-4 md:mb-0">
            {activeTab === "meeting" && (
              <div className="p-6 bg-gray-50 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">
                  ミーティングタイマー
                </h2>
                <div className="text-6xl font-bold text-center mb-4">
                  {formatTime(meetingElapsedTime)}
                </div>
                <div className="text-4xl font-bold text-center mb-4">
                  残り時間:{" "}
                  {formatTime(
                    alarmPoints[alarmPoints.length - 1]?.minutes * 60 -
                      meetingElapsedTime
                  )}
                </div>
                <div className="flex justify-center space-x-4 mb-4">
                  <button
                    type="button"
                    onClick={toggleMeetingTimer}
                    className={`px-6 py-2 rounded-full ${
                      isMeetingRunning
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    } text-white`}
                  >
                    {isMeetingRunning ? (
                      <Pause className="inline mr-2" />
                    ) : (
                      <Play className="inline mr-2" />
                    )}
                    {isMeetingRunning ? "一時停止" : "開始"}
                  </button>
                  <button
                    type="button"
                    onClick={resetMeetingTimer}
                    className="px-6 py-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    リセット
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      localStorage.setItem(
                        "meetingAlarmPoints",
                        JSON.stringify(alarmPoints)
                      )
                    }
                    className="px-6 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    保存
                  </button>
                </div>

                {meetingStartTime && (
                  <div className="text-center mb-4">
                    <p>開始時間: {meetingStartTime.toLocaleTimeString()}</p>
                    <p>
                      推定終了時間:{" "}
                      {getEndTime(
                        meetingStartTime,
                        alarmPoints[alarmPoints.length - 1].minutes * 60
                      )}
                    </p>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-2">
                    アラームポイント
                  </h3>
                  {alarmPoints.map((point) => (
                    <div
                      key={point.id}
                      className="flex items-center space-x-2 mb-2"
                    >
                      <input
                        type="number"
                        value={point.minutes}
                        onChange={(e) =>
                          updateAlarmPoint(point.id, parseInt(e.target.value))
                        }
                        min="1"
                        className="w-16 px-2 py-1 border rounded"
                      />
                      <span>分</span>
                      <span>{formatTime(point.remainingTime)}</span>
                      {point.isDone ? (
                        <span className="text-green-500">完了!</span>
                      ) : (
                        <span className="text-gray-500">
                          保留中 (終了予定:{" "}
                          {getEndTime(meetingStartTime, point.minutes * 60)})
                        </span>
                      )}
                      {point.linkedTodo && (
                        <span className="text-blue-500">
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
                        className="text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAlarmPoint}
                    className="mt-2 text-blue-500 hover:text-blue-600"
                  >
                    <Plus className="inline mr-1" /> アラームポイントを追加
                  </button>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">
                    ミーティングアラーム設定
                  </h3>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <Volume2 className="mr-2" />
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
                        className="w-32"
                      />
                      <span className="ml-2">
                        {meetingAlarmSettings.volume}
                      </span>
                    </label>
                    <label className="flex items-center">
                      周波数:
                      <input
                        type="number"
                        value={meetingAlarmSettings.frequency}
                        onChange={(e) =>
                          setMeetingAlarmSettings({
                            ...meetingAlarmSettings,
                            frequency: parseInt(e.target.value),
                          })
                        }
                        className="w-16 ml-2 px-2 py-1 border rounded"
                      />
                      Hz
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setMeetingAlarmSettings(initialMeetingAlarmSettings)
                      }
                      className="px-4 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                    >
                      リセット
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        localStorage.setItem(
                          "meetingAlarmSettings",
                          JSON.stringify(meetingAlarmSettings)
                        )
                      }
                      className="px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                    >
                      保存
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => playAlarm(meetingAlarmSettings)}
                    className="mt-2 px-4 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                  >
                    ミーティングアラームをテスト
                  </button>
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={forceFocus}
                      onChange={(e) => setForceFocus(e.target.checked)}
                      className="mr-2"
                    />
                    アラーム時に強制的にこのタブにフォーカスする
                  </label>
                </div>
              </div>
            )}

            {activeTab === "pomodoro" && (
              <div
                className={`p-6 rounded-lg ${
                  pomodoroState === "work" ? "bg-blue-100" : "bg-yellow-100"
                }`}
              >
                <h2 className="text-2xl font-semibold mb-4">
                  ポモドーロタイマー
                </h2>
                <div className="text-6xl font-bold text-center mb-4">
                  {formatTime(pomodoroElapsedTime)}
                </div>
                <div className="text-center mb-4">
                  {pomodoroState === "work" ? "作業時間" : "休憩時間"}
                </div>
                <div className="text-center mb-4">
                  サイクル: {pomodoroCycles} /{" "}
                  {pomodoroSettings.infiniteMode
                    ? "∞"
                    : pomodoroSettings.cycles}
                </div>
                <div className="flex justify-center space-x-4 mb-4">
                  <button
                    type="button"
                    onClick={togglePomodoroTimer}
                    className={`px-6 py-2 rounded-full ${
                      isPomodoroRunning
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    } text-white`}
                  >
                    {isPomodoroRunning ? (
                      <Pause className="inline mr-2" />
                    ) : (
                      <Play className="inline mr-2" />
                    )}
                    {isPomodoroRunning ? "一時停止" : "開始"}
                  </button>
                  <button
                    type="button"
                    onClick={resetPomodoroTimer}
                    className="px-6 py-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    リセット
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      localStorage.setItem(
                        "pomodoroSettings",
                        JSON.stringify(pomodoroSettings)
                      )
                    }
                    className="px-6 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    保存
                  </button>
                </div>

                {pomodoroStartTime && (
                  <div className="text-center mb-4">
                    <p>開始時間: {pomodoroStartTime.toLocaleTimeString()}</p>
                    <p>
                      推定終了時間:{" "}
                      {getEndTime(
                        pomodoroStartTime,
                        (pomodoroState === "work"
                          ? pomodoroSettings.workDuration
                          : pomodoroSettings.breakDuration) * 60
                      )}
                    </p>
                    <p>
                      カウントダウン:{" "}
                      {getCountdown(
                        (pomodoroState === "work"
                          ? pomodoroSettings.workDuration
                          : pomodoroSettings.breakDuration) * 60,
                        pomodoroElapsedTime
                      )}
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">ポモドーロ設定</h3>
                  <div className="flex items-center space-x-4 mb-2">
                    <label className="flex items-center">
                      作業時間:
                      <input
                        type="number"
                        value={pomodoroSettings.workDuration}
                        onChange={(e) =>
                          setPomodoroSettings({
                            ...pomodoroSettings,
                            workDuration: Math.max(1, parseInt(e.target.value)),
                          })
                        }
                        min="1"
                        className="w-16 ml-2 px-2 py-1 border rounded"
                      />
                      分
                    </label>
                    <label className="flex items-center">
                      休憩時間:
                      <input
                        type="number"
                        value={pomodoroSettings.breakDuration}
                        onChange={(e) =>
                          setPomodoroSettings({
                            ...pomodoroSettings,
                            breakDuration: Math.max(
                              1,
                              parseInt(e.target.value)
                            ),
                          })
                        }
                        min="1"
                        className="w-16 ml-2 px-2 py-1 border rounded"
                      />
                      分
                    </label>
                    <label className="flex items-center">
                      サイクル数:
                      <input
                        type="number"
                        value={pomodoroSettings.cycles}
                        onChange={(e) =>
                          setPomodoroSettings({
                            ...pomodoroSettings,
                            cycles: Math.max(1, parseInt(e.target.value)),
                          })
                        }
                        min="1"
                        className="w-16 ml-2 px-2 py-1 border rounded"
                      />
                    </label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={pomodoroSettings.infiniteMode}
                        onChange={(e) =>
                          setPomodoroSettings({
                            ...pomodoroSettings,
                            infiniteMode: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      無限モード
                    </label>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">
                    作業時間アラーム設定
                  </h3>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <Volume2 className="mr-2" />
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
                        className="w-32"
                      />
                      <span className="ml-2">
                        {pomodoroSettings.workAlarm.volume}
                      </span>
                    </label>
                    <label className="flex items-center">
                      周波数:
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
                        className="w-16 ml-2 px-2 py-1 border rounded"
                      />
                      Hz
                    </label>
                    <button
                      type="button"
                      onClick={() => playAlarm(pomodoroSettings.workAlarm)}
                      className="px-4 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                    >
                      テスト
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">
                    休憩時間アラーム設定
                  </h3>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <Volume2 className="mr-2" />
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
                        className="w-32"
                      />
                      <span className="ml-2">
                        {pomodoroSettings.breakAlarm.volume}
                      </span>
                    </label>
                    <label className="flex items-center">
                      周波数:
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
                        className="w-16 ml-2 px-2 py-1 border rounded"
                      />
                      Hz
                    </label>
                    <button
                      type="button"
                      onClick={() => playAlarm(pomodoroSettings.breakAlarm)}
                      className="px-4 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                    >
                      テスト
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-full md:w-1/4">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="text-lg font-semibold mb-2">メモ</h3>
              <textarea
                value={activeTab === "meeting" ? meetingMemo : pomodoroMemo}
                onChange={(e) =>
                  activeTab === "meeting"
                    ? setMeetingMemo(e.target.value)
                    : setPomodoroMemo(e.target.value)
                }
                className="w-full h-32 p-2 border rounded"
                placeholder="メモを入力..."
              />
              <button
                type="button"
                onClick={() =>
                  localStorage.setItem(
                    activeTab === "meeting" ? "meetingMemo" : "pomodoroMemo",
                    activeTab === "meeting" ? meetingMemo : pomodoroMemo
                  )
                }
                className="mt-2 px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                保存
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">TODOリスト</h3>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable
                  droppableId={
                    activeTab === "meeting" ? "meetingTodos" : "pomodoroTodos"
                  }
                >
                  {(provided) => (
                    <ul
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {(activeTab === "meeting"
                        ? meetingTodos
                        : pomodoroTodos
                      ).map((todo, index) => (
                        <Draggable
                          key={todo.id}
                          draggableId={todo.id}
                          index={index}
                        >
                          {(provided) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="flex items-center justify-between p-2 bg-white rounded shadow"
                            >
                              {editingTodoId === todo.id ? (
                                <input
                                  type="text"
                                  value={editingTodoText}
                                  onChange={(e) =>
                                    setEditingTodoText(e.target.value)
                                  }
                                  className="flex-grow mr-2 px-2 py-1 border rounded"
                                />
                              ) : (
                                <span
                                  className={
                                    todo.isCompleted ? "line-through" : ""
                                  }
                                >
                                  {todo.text}
                                </span>
                              )}
                              <div>
                                {editingTodoId === todo.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateTodo(
                                          todo.id,
                                          editingTodoText,
                                          activeTab === "pomodoro"
                                        )
                                      }
                                      className="text-green-500 mr-2"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditingTodo}
                                      className="text-red-500 mr-2"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleTodo(
                                          todo.id,
                                          activeTab === "pomodoro"
                                        )
                                      }
                                      className="text-green-500 mr-2"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        startEditingTodo(todo.id, todo.text)
                                      }
                                      className="text-blue-500 mr-2"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeTodo(
                                          todo.id,
                                          activeTab === "pomodoro"
                                        )
                                      }
                                      className="text-red-500 mr-2"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveTodoUp(
                                          index,
                                          activeTab === "pomodoro"
                                        )
                                      }
                                      className="text-blue-500 mr-2"
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveTodoDown(
                                          index,
                                          activeTab === "pomodoro"
                                        )
                                      }
                                      className="text-blue-500"
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
              <div className="mt-2 flex">
                <input
                  type="text"
                  value={
                    activeTab === "meeting" ? newMeetingTodo : newPomodoroTodo
                  }
                  onChange={(e) =>
                    activeTab === "meeting"
                      ? setNewMeetingTodo(e.target.value)
                      : setNewPomodoroTodo(e.target.value)
                  }
                  className="flex-grow mr-2 px-2 py-1 border rounded"
                  placeholder="新しいTODOを入力..."
                  ref={todoInputRef}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "meeting") {
                      addTodo(newMeetingTodo, false);
                      setNewMeetingTodo("");
                    } else {
                      addTodo(newPomodoroTodo, true);
                      setNewPomodoroTodo("");
                    }
                    if (todoInputRef.current) {
                      todoInputRef.current.focus();
                    }
                  }}
                  className="px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded whitespace-nowrap"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
