"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AlarmSettings, PomodoroSettings } from "@/types";
import { INITIAL_POMODORO_SETTINGS } from "@/lib/constants";

function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return saved as unknown as T;
      }
    }
  }
  return defaultValue;
}

export type PomodoroTimerState = {
  // State
  isPomodoroRunning: boolean;
  pomodoroStartTime: Date | null;
  pomodoroElapsedTime: number;
  pomodoroState: "work" | "break";
  pomodoroSettings: PomodoroSettings;
  setPomodoroSettings: React.Dispatch<React.SetStateAction<PomodoroSettings>>;
  pomodoroCycles: number;
  currentPomodoroTask: string;
  setCurrentPomodoroTask: (v: string) => void;
  currentPomodoroTaskId: string | null;
  setCurrentPomodoroTaskId: (v: string | null) => void;
  isEditingPomodoroTask: boolean;
  setIsEditingPomodoroTask: (v: boolean) => void;
  showTodoPicker: boolean;
  setShowTodoPicker: (v: boolean) => void;
  pomodoroTaskInputRef: React.RefObject<HTMLInputElement>;
  // Functions
  togglePomodoroTimer: () => Promise<void>;
  resetPomodoroTimer: () => void;
  startWithTodo: (text: string, todoId: string) => void;
  updatePomodoroTask: (text: string, todoId?: string | null) => void;
  clearPomodoroTask: () => void;
};

type PomodoroTimerOptions = {
  playAlarm: (settings: AlarmSettings, message?: string) => void;
  playTickSound: () => Promise<void>;
  tickSoundEnabled: boolean;
  tickAudioContextRef: React.RefObject<AudioContext | null>;
  useDatabase: boolean;
  user: unknown;
  supabasePomodoroTask?: {
    updateTask: (text: string, todoId: string | null) => Promise<void>;
    clearTask: () => Promise<void>;
  };
};

export function usePomodoroTimer(options: PomodoroTimerOptions): PomodoroTimerState {
  const { playAlarm, playTickSound, tickSoundEnabled, tickAudioContextRef, useDatabase, user, supabasePomodoroTask } = options;

  // States
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroStartTime, setPomodoroStartTime] = useState<Date | null>(null);
  const [pomodoroElapsedTime, setPomodoroElapsedTime] = useState(0);
  const [pomodoroState, setPomodoroState] = useState<"work" | "break">("work");
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(INITIAL_POMODORO_SETTINGS);
  const [pomodoroCycles, setPomodoroCycles] = useState(0);
  const [currentPomodoroTask, setCurrentPomodoroTask] = useState("");
  const [currentPomodoroTaskId, setCurrentPomodoroTaskId] = useState<string | null>(null);
  const [isEditingPomodoroTask, setIsEditingPomodoroTask] = useState(false);
  const [showTodoPicker, setShowTodoPicker] = useState(false);
  const pomodoroTaskInputRef = useRef<HTMLInputElement>(null!);

  // 初期データのロード
  useEffect(() => {
    setPomodoroSettings(getStorageValue("pomodoroSettings", INITIAL_POMODORO_SETTINGS));
    setCurrentPomodoroTask(getStorageValue("currentPomodoroTask", ""));
  }, []);

  // localStorage保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("pomodoroSettings", JSON.stringify(pomodoroSettings));
    localStorage.setItem("currentPomodoroTask", currentPomodoroTask);
  }, [pomodoroSettings, currentPomodoroTask]);

  // タイマー更新
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPomodoroRunning && pomodoroStartTime) {
      timer = setInterval(() => {
        const now = new Date();
        setPomodoroElapsedTime(
          Math.floor((now.getTime() - pomodoroStartTime.getTime()) / 1000)
        );
        playTickSound();
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPomodoroRunning, pomodoroStartTime, playTickSound]);

  // ポモドーロの状態管理（work/break切り替え）
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
  }, [pomodoroElapsedTime, isPomodoroRunning, pomodoroState, pomodoroSettings, pomodoroCycles, playAlarm]);

  // タイマー制御
  const togglePomodoroTimer = useCallback(async () => {
    if (isPomodoroRunning) {
      setIsPomodoroRunning(false);
    } else {
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
  }, [isPomodoroRunning, pomodoroStartTime, pomodoroElapsedTime, tickSoundEnabled, tickAudioContextRef]);

  const resetPomodoroTimer = useCallback(() => {
    setIsPomodoroRunning(false);
    setPomodoroStartTime(null);
    setPomodoroElapsedTime(0);
    setPomodoroState("work");
    setPomodoroCycles(0);
    setPomodoroSettings(INITIAL_POMODORO_SETTINGS);
  }, []);

  // TODOからポモドーロを直接起動
  const startWithTodo = useCallback(
    (text: string, todoId: string) => {
      setCurrentPomodoroTask(text);
      setCurrentPomodoroTaskId(todoId);
      if (useDatabase && user && supabasePomodoroTask) {
        supabasePomodoroTask.updateTask(text, todoId);
      }
      if (!isPomodoroRunning || pomodoroState !== "work") {
        setPomodoroState("work");
        setPomodoroElapsedTime(0);
        setPomodoroStartTime(new Date());
        setIsPomodoroRunning(true);
      }
    },
    [isPomodoroRunning, pomodoroState, useDatabase, user, supabasePomodoroTask]
  );

  // タスク管理
  const updatePomodoroTask = useCallback(
    (text: string, todoId?: string | null) => {
      setCurrentPomodoroTask(text);
      setCurrentPomodoroTaskId(todoId ?? null);
      if (useDatabase && user && supabasePomodoroTask) {
        supabasePomodoroTask.updateTask(text, todoId ?? null);
      }
    },
    [useDatabase, user, supabasePomodoroTask]
  );

  const clearPomodoroTask = useCallback(() => {
    setCurrentPomodoroTask("");
    setCurrentPomodoroTaskId(null);
    if (useDatabase && user && supabasePomodoroTask) {
      supabasePomodoroTask.clearTask();
    }
  }, [useDatabase, user, supabasePomodoroTask]);

  return {
    isPomodoroRunning,
    pomodoroStartTime,
    pomodoroElapsedTime,
    pomodoroState,
    pomodoroSettings,
    setPomodoroSettings,
    pomodoroCycles,
    currentPomodoroTask,
    setCurrentPomodoroTask,
    currentPomodoroTaskId,
    setCurrentPomodoroTaskId,
    isEditingPomodoroTask,
    setIsEditingPomodoroTask,
    showTodoPicker,
    setShowTodoPicker,
    pomodoroTaskInputRef,
    togglePomodoroTimer,
    resetPomodoroTimer,
    startWithTodo,
    updatePomodoroTask,
    clearPomodoroTask,
  };
}
