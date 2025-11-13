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
  Bell,
  BellOff,
  Vibrate,
  Timer,
  Zap,
  Settings,
  Calendar,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // カウントダウンモードの状態
  const [countdownMode, setCountdownMode] = useState(false);
  const [targetEndTime, setTargetEndTime] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  // チクタク音の状態
  const [tickSoundEnabled, setTickSoundEnabled] = useState(false);
  const [tickSoundVolume, setTickSoundVolume] = useState(5); // 0-100
  const tickAudioContextRef = useRef<AudioContext | null>(null);

  // 設定モーダルの状態
  const [settingsOpen, setSettingsOpen] = useState(false);

  // TODOソート状態
  const [sortByDeadline, setSortByDeadline] = useState(false);

  // フラッシュの状態
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(true);

  // アラーム状態（繰り返し用）
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const titleBlinkIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    setNotificationsEnabled(getStorageValue("notificationsEnabled", false));
    setVibrationEnabled(getStorageValue("vibrationEnabled", true));
    setCountdownMode(getStorageValue("countdownMode", false));
    setTargetEndTime(getStorageValue("targetEndTime", ""));
    setTickSoundEnabled(getStorageValue("tickSoundEnabled", false));
    setTickSoundVolume(getStorageValue("tickSoundVolume", 5));
    setFlashEnabled(getStorageValue("flashEnabled", true));

    // 通知権限の確認
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
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
      localStorage.setItem("notificationsEnabled", JSON.stringify(notificationsEnabled));
      localStorage.setItem("vibrationEnabled", JSON.stringify(vibrationEnabled));
      localStorage.setItem("countdownMode", JSON.stringify(countdownMode));
      localStorage.setItem("targetEndTime", targetEndTime);
      localStorage.setItem("tickSoundEnabled", JSON.stringify(tickSoundEnabled));
      localStorage.setItem("tickSoundVolume", JSON.stringify(tickSoundVolume));
      localStorage.setItem("flashEnabled", JSON.stringify(flashEnabled));
    }
  }, [
    alarmPoints,
    meetingAlarmSettings,
    pomodoroSettings,
    meetingMemo,
    pomodoroMemo,
    meetingTodos,
    pomodoroTodos,
    notificationsEnabled,
    vibrationEnabled,
    countdownMode,
    targetEndTime,
    tickSoundEnabled,
    tickSoundVolume,
    flashEnabled,
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

  // Safari対応のアラーム音生成（HTMLAudioElement使用）
  const createAlarmAudio = useCallback((settings: AlarmSettings) => {
    try {
      // Web Audio APIで音を生成してBlobを作成
      const win = window as typeof window & { webkitAudioContext?: typeof AudioContext };
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
        channelData[i] = Math.sin(2 * Math.PI * settings.frequency * t) * (settings.volume / 100);
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

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // PCMデータを書き込み
    let offset = 44;
    for (let i = 0; i < len; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // アラーム停止機能
  const stopAlarm = useCallback(() => {
    setIsAlarmRinging(false);
    setIsFlashing(false);
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (titleBlinkIntervalRef.current) {
      clearInterval(titleBlinkIntervalRef.current);
      titleBlinkIntervalRef.current = null;
    }
    document.title = "Comm Time";
  }, []);

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

          // バイブレーション（毎回）
          if (vibrationEnabled && "vibrate" in navigator) {
            navigator.vibrate([500, 200, 500, 200, 500]);
          }
        }
      }, 5000);

      // 強力なバイブレーション（iPhone対応）
      if (vibrationEnabled && "vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
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
        document.title = titleBlink ? "🔔🔔🔔 " + message + " 🔔🔔🔔" : "⚠️⚠️⚠️ TIME UP! ⚠️⚠️⚠️";
      }, 500);

      // フォーカス
      if (forceFocus) {
        window.focus();
      }
    },
    [forceFocus, vibrationEnabled, notificationsEnabled, notificationPermission, flashEnabled, createAlarmAudio, stopAlarm]
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
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [isAlarmRinging, isFlashing, stopAlarm]);

  // チクタク音を再生する関数（モバイル対応）
  const playTickSound = useCallback(async () => {
    if (typeof window === "undefined" || !tickSoundEnabled) return;

    try {
      if (!tickAudioContextRef.current) {
        const win = window as typeof window & { webkitAudioContext?: typeof AudioContext };
        const AudioContextClass = win.AudioContext || win.webkitAudioContext;
        if (AudioContextClass) {
          tickAudioContextRef.current = new AudioContextClass();
        }
      }

      const audioContext = tickAudioContextRef.current;
      if (!audioContext) return;

      // モバイルブラウザ対応: AudioContextがsuspendedの場合はresume
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // AudioContextがrunning状態の時のみ音を再生
      if (audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(tickSoundVolume / 100, audioContext.currentTime);

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
  }, [isMeetingRunning, meetingStartTime, formatTime, countdownMode, targetEndTime, playAlarm, meetingAlarmSettings, playTickSound]);

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
                playAlarm(meetingAlarmSettings, `${point.minutes}分経過しました`);
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
          newState === "work" ? "休憩終了！作業を開始してください" : "お疲れ様です！休憩時間です"
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
          if (tickAudioContextRef.current.state === 'suspended') {
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
  }, [isMeetingRunning, meetingStartTime, meetingElapsedTime, tickSoundEnabled]);

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
          if (tickAudioContextRef.current.state === 'suspended') {
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
  }, [isPomodoroRunning, pomodoroStartTime, pomodoroElapsedTime, tickSoundEnabled]);

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
  }, [notificationPermission, notificationsEnabled, requestNotificationPermission]);

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

  // 期限の更新機能
  const updateTodoDeadline = useCallback(
    (id: string, dueDate: string | undefined, dueTime: string | undefined, isPomodoro: boolean) => {
      const updateFunc = (prev: TodoItem[]) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, dueDate, dueTime } : todo
        );

      if (isPomodoro) {
        setPomodorTodos(updateFunc);
      } else {
        setMeetingTodos(updateFunc);
      }
    },
    []
  );

  // 期限延長機能
  const extendDeadline = useCallback(
    (id: string, days: number, isPomodoro: boolean) => {
      const updateFunc = (prev: TodoItem[]) =>
        prev.map((todo) => {
          if (todo.id === id) {
            const currentDate = todo.dueDate ? new Date(todo.dueDate) : new Date();
            currentDate.setDate(currentDate.getDate() + days);
            const newDueDate = currentDate.toISOString().split('T')[0];
            return { ...todo, dueDate: newDueDate };
          }
          return todo;
        });

      if (isPomodoro) {
        setPomodorTodos(updateFunc);
      } else {
        setMeetingTodos(updateFunc);
      }
    },
    []
  );

  // 期限までの残り時間を取得
  const getDeadlineStatus = useCallback((todo: TodoItem) => {
    if (!todo.dueDate) return null;

    const now = new Date();
    const deadline = new Date(todo.dueDate);

    if (todo.dueTime) {
      const [hours, minutes] = todo.dueTime.split(':').map(Number);
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
        const [hoursA, minutesA] = a.dueTime.split(':').map(Number);
        dateA.setHours(hoursA, minutesA);
      }
      if (b.dueTime) {
        const [hoursB, minutesB] = b.dueTime.split(':').map(Number);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-4 px-4 sm:px-6 lg:px-8 relative">
      {/* フラッシュオーバーレイ - タップでアラーム停止 */}
      {isFlashing && (
        <div
          className="fixed inset-0 bg-white z-50 animate-pulse cursor-pointer flex items-center justify-center"
          onClick={stopAlarm}
        >
          <div className="text-center">
            <p className="text-4xl sm:text-5xl lg:text-6xl font-bold text-red-600 mb-4 animate-bounce">
              ⏰ TIME UP! ⏰
            </p>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 font-semibold">
              タップして停止
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-white/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Comm Time
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-gray-700 font-semibold tabular-nums">
                  現在時刻: {currentTime.toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* 設定ボタン群 */}
            <div className="flex gap-2 items-center">
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
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
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
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
                title={vibrationEnabled ? "バイブレーション ON" : "バイブレーション OFF"}
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
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
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
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
                title={notificationsEnabled ? "通知 ON" : "通知 OFF"}
              >
                {notificationsEnabled ? (
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <BellOff className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
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
                : "bg-white/80 backdrop-blur-lg text-gray-700 hover:bg-white shadow-md hover:shadow-lg"
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
                : "bg-white/80 backdrop-blur-lg text-gray-700 hover:bg-white shadow-md hover:shadow-lg"
            }`}
          >
            <List className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">ポモドーロタイマー</span>
            <span className="sm:hidden">ポモドーロ</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          <div className="w-full lg:w-2/3">
            {activeTab === "meeting" && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-white/20">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ミーティングタイマー
                </h2>

                {/* カウントダウンモード切り替え */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 mb-4 border border-cyan-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-cyan-600" />
                      <span className="text-sm sm:text-base font-semibold text-gray-800">
                        カウントダウンモード
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCountdownMode(!countdownMode)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        countdownMode
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {countdownMode ? "ON" : "OFF"}
                    </button>
                  </div>
                  {countdownMode && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        終了時刻:
                      </label>
                      <input
                        type="time"
                        value={targetEndTime}
                        onChange={(e) => setTargetEndTime(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
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
                    {countdownMode ? "残り時間" : (
                      <>
                        残り:{" "}
                        {formatTime(
                          Math.max(0, alarmPoints[alarmPoints.length - 1]?.minutes * 60 -
                            meetingElapsedTime)
                        )}
                      </>
                    )}
                  </div>
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
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm sm:text-base">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">開始:</span>
                        <span className="text-gray-900 font-semibold">
                          {meetingStartTime.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">終了予定:</span>
                        <span className="text-gray-900 font-semibold">
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
                  <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-800">
                    アラームポイント
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {alarmPoints.map((point) => (
                      <div
                        key={point.id}
                        className={`flex flex-wrap items-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                          point.isDone
                            ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                            : "bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200"
                        }`}
                      >
                        <input
                          type="number"
                          value={point.minutes}
                          onChange={(e) =>
                            updateAlarmPoint(point.id, parseInt(e.target.value) || 1)
                          }
                          min="1"
                          className="w-16 sm:w-20 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <span className="text-sm sm:text-base font-medium text-gray-700">分</span>
                        <span className="text-sm sm:text-base font-mono font-semibold text-gray-900 bg-white px-2 sm:px-3 py-1 rounded-lg">
                          {formatTime(point.remainingTime)}
                        </span>
                        {point.isDone ? (
                          <span className="text-xs sm:text-sm font-semibold text-green-600 bg-green-100 px-2 sm:px-3 py-1 rounded-full">
                            ✓ 完了
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                            終了予定: {getEndTime(meetingStartTime, point.minutes * 60)}
                          </span>
                        )}
                        {point.linkedTodo && (
                          <span className="text-xs sm:text-sm text-blue-600 bg-blue-100 px-2 sm:px-3 py-1 rounded-full">
                            {meetingTodos.find((todo) => todo.id === point.linkedTodo)?.text}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAlarmPoint(point.id)}
                          className="ml-auto p-1.5 sm:p-2 text-red-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
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
                    <span className="text-sm sm:text-base">アラームポイントを追加</span>
                  </button>
                </div>

                {/* アラーム設定 */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 sm:p-6 border border-purple-100">
                  <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800">
                    ミーティングアラーム設定
                  </h3>

                  <div className="space-y-4">
                    {/* 音量設定 */}
                    <div className="bg-white rounded-lg p-3 sm:p-4">
                      <label className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                            <span className="text-sm sm:text-base font-semibold text-gray-700">音量</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-indigo-600">
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
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </label>
                    </div>

                    {/* 周波数設定 */}
                    <div className="bg-white rounded-lg p-3 sm:p-4">
                      <label className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-sm sm:text-base font-semibold text-gray-700">周波数:</span>
                        <input
                          type="number"
                          value={meetingAlarmSettings.frequency}
                          onChange={(e) =>
                            setMeetingAlarmSettings({
                              ...meetingAlarmSettings,
                              frequency: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <span className="text-sm sm:text-base text-gray-600">Hz</span>
                      </label>
                    </div>

                    {/* ボタン群 */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => playAlarm(meetingAlarmSettings, "アラームテスト")}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                      >
                        テスト
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeetingAlarmSettings(initialMeetingAlarmSettings)}
                        className="px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                      >
                        リセット
                      </button>
                    </div>
                  </div>

                  {/* その他オプション */}
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceFocus}
                        onChange={(e) => setForceFocus(e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs sm:text-sm text-gray-700">
                        アラーム時に強制的にこのタブにフォーカスする
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pomodoro" && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-white/20">
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
                    {formatTime(pomodoroElapsedTime)}
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-center text-white/90 mb-2">
                    {pomodoroState === "work" ? "🎯 作業時間" : "☕ 休憩時間"}
                  </div>
                  <div className="text-base sm:text-lg text-center text-white/80 font-medium">
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
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">開始:</span>
                        <span className="text-gray-900 font-semibold">
                          {pomodoroStartTime.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">終了予定:</span>
                        <span className="text-gray-900 font-semibold">
                          {getEndTime(
                            pomodoroStartTime,
                            (pomodoroState === "work"
                              ? pomodoroSettings.workDuration
                              : pomodoroSettings.breakDuration) * 60
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">残り:</span>
                        <span className="text-gray-900 font-semibold">
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
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 mb-6 border border-blue-100">
                  <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800">
                    ポモドーロ設定
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">
                          作業時間
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={pomodoroSettings.workDuration}
                            onChange={(e) =>
                              setPomodoroSettings({
                                ...pomodoroSettings,
                                workDuration: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-600 whitespace-nowrap">分</span>
                        </div>
                      </label>
                    </div>

                    <div className="bg-white rounded-lg p-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">
                          休憩時間
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={pomodoroSettings.breakDuration}
                            onChange={(e) =>
                              setPomodoroSettings({
                                ...pomodoroSettings,
                                breakDuration: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-600 whitespace-nowrap">分</span>
                        </div>
                      </label>
                    </div>

                    <div className="bg-white rounded-lg p-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">
                          サイクル数
                        </span>
                        <input
                          type="number"
                          value={pomodoroSettings.cycles}
                          onChange={(e) =>
                            setPomodoroSettings({
                              ...pomodoroSettings,
                              cycles: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          min="1"
                          disabled={pomodoroSettings.infiniteMode}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3">
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
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">
                        無限モード（サイクル数無制限）
                      </span>
                    </label>
                  </div>
                </div>

                {/* 作業時間アラーム設定 */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 sm:p-6 mb-4 border border-blue-100">
                  <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800">
                    🎯 作業時間アラーム設定
                  </h3>

                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-3 sm:p-4">
                      <label className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            <span className="text-sm sm:text-base font-semibold text-gray-700">音量</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-blue-600">
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
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <div className="bg-white rounded-lg p-3 sm:p-4 flex-1">
                        <label className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-sm sm:text-base font-semibold text-gray-700">周波数:</span>
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
                            className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span className="text-sm sm:text-base text-gray-600">Hz</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => playAlarm(pomodoroSettings.workAlarm, "作業時間アラームテスト")}
                        className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base whitespace-nowrap"
                      >
                        テスト
                      </button>
                    </div>
                  </div>
                </div>

                {/* 休憩時間アラーム設定 */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 sm:p-6 border border-orange-100">
                  <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800">
                    ☕ 休憩時間アラーム設定
                  </h3>

                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-3 sm:p-4">
                      <label className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                            <span className="text-sm sm:text-base font-semibold text-gray-700">音量</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-orange-600">
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
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <div className="bg-white rounded-lg p-3 sm:p-4 flex-1">
                        <label className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-sm sm:text-base font-semibold text-gray-700">周波数:</span>
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
                            className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base font-semibold focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                          <span className="text-sm sm:text-base text-gray-600">Hz</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => playAlarm(pomodoroSettings.breakAlarm, "休憩時間アラームテスト")}
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

          <div className="w-full lg:w-1/3">
            {/* メモセクション */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 mb-4 border border-white/20">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                📝 メモ
              </h3>
              <textarea
                value={activeTab === "meeting" ? meetingMemo : pomodoroMemo}
                onChange={(e) =>
                  activeTab === "meeting"
                    ? setMeetingMemo(e.target.value)
                    : setPomodoroMemo(e.target.value)
                }
                className="w-full h-32 sm:h-40 p-3 sm:p-4 border border-gray-300 rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="メモを入力してください..."
              />
            </div>

            {/* TODOリストセクション */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ✅ TODOリスト
                </h3>
                <button
                  type="button"
                  onClick={() => setSortByDeadline(!sortByDeadline)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${
                    sortByDeadline
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                  title="期限順にソート"
                >
                  <Calendar className="w-3 h-3" />
                  期限順
                </button>
              </div>

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
                      className="space-y-2 mb-3 sm:mb-4 max-h-[400px] overflow-y-auto"
                    >
                      {(sortByDeadline
                        ? sortTodosByDeadline(activeTab === "meeting" ? meetingTodos : pomodoroTodos)
                        : (activeTab === "meeting" ? meetingTodos : pomodoroTodos)
                      ).map((todo, index) => (
                        <Draggable
                          key={todo.id}
                          draggableId={todo.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-start gap-2 p-2 sm:p-3 rounded-xl transition-all duration-200 ${
                                todo.isCompleted
                                  ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                                  : "bg-white border border-gray-200"
                              } ${
                                snapshot.isDragging
                                  ? "shadow-2xl scale-105"
                                  : "shadow-sm hover:shadow-md"
                              }`}
                            >
                              {editingTodoId === todo.id ? (
                                <>
                                  <input
                                    type="text"
                                    value={editingTodoText}
                                    onChange={(e) =>
                                      setEditingTodoText(e.target.value)
                                    }
                                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateTodo(
                                          todo.id,
                                          editingTodoText,
                                          activeTab === "pomodoro"
                                        )
                                      }
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
                                  <div className="flex-1 space-y-2">
                                    <span
                                      className={`text-xs sm:text-sm block ${
                                        todo.isCompleted
                                          ? "line-through text-gray-500"
                                          : "text-gray-800"
                                      }`}
                                    >
                                      {todo.text}
                                    </span>

                                    {/* 期限表示 */}
                                    {(() => {
                                      const status = getDeadlineStatus(todo);
                                      if (status) {
                                        return (
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <div
                                              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                                                status.isOverdue
                                                  ? "bg-red-100 text-red-700 font-semibold"
                                                  : status.isSoon
                                                  ? "bg-yellow-100 text-yellow-700 font-semibold"
                                                  : "bg-blue-100 text-blue-700"
                                              }`}
                                            >
                                              <Calendar className="w-3 h-3" />
                                              {todo.dueDate}
                                              {todo.dueTime && ` ${todo.dueTime}`}
                                              {status.isOverdue && " (期限切れ)"}
                                              {!status.isOverdue && status.isSoon && ` (残り${status.diffHours}時間)`}
                                              {!status.isOverdue && !status.isSoon && ` (残り${status.diffDays}日)`}
                                            </div>

                                            {/* 延長ボタン */}
                                            <div className="flex gap-1">
                                              <button
                                                type="button"
                                                onClick={() => extendDeadline(todo.id, 1, activeTab === "pomodoro")}
                                                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                                                title="1日延長"
                                              >
                                                +1日
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => extendDeadline(todo.id, 3, activeTab === "pomodoro")}
                                                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                                                title="3日延長"
                                              >
                                                +3日
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => extendDeadline(todo.id, 7, activeTab === "pomodoro")}
                                                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                                                title="1週間延長"
                                              >
                                                +7日
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}

                                    {/* 期限設定フォーム */}
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
                                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                                          className="text-xs px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors"
                                          title="期限をクリア"
                                        >
                                          期限解除
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0 items-start">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleTodo(
                                          todo.id,
                                          activeTab === "pomodoro"
                                        )
                                      }
                                      className={`p-1.5 rounded-lg transition-colors duration-200 ${
                                        todo.isCompleted
                                          ? "text-green-600 bg-green-100"
                                          : "text-gray-400 hover:text-green-600 hover:bg-green-100"
                                      }`}
                                    >
                                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        startEditingTodo(todo.id, todo.text)
                                      }
                                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                    >
                                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeTodo(
                                          todo.id,
                                          activeTab === "pomodoro"
                                        )
                                      }
                                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                    >
                                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveTodoUp(
                                          index,
                                          activeTab === "pomodoro"
                                        )
                                      }
                                      disabled={index === 0}
                                      className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveTodoDown(
                                          index,
                                          activeTab === "pomodoro"
                                        )
                                      }
                                      disabled={
                                        index ===
                                        (activeTab === "meeting"
                                          ? meetingTodos
                                          : pomodoroTodos
                                        ).length -
                                          1
                                      }
                                      className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                </Droppable>
              </DragDropContext>

              {/* TODO追加フォーム */}
              <div className="flex gap-2">
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
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
                    }
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ⚙️ 設定
              </DialogTitle>
              <DialogDescription>
                サウンド、通知、その他の設定を調整できます
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* チクタク音設定 */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 border border-green-200">
                <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-green-600" />
                  チクタク音設定
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">チクタク音を有効にする</span>
                    <button
                      type="button"
                      onClick={() => setTickSoundEnabled(!tickSoundEnabled)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        tickSoundEnabled
                          ? "bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {tickSoundEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  {tickSoundEnabled && (
                    <div className="bg-white rounded-lg p-4">
                      <label className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">音量</span>
                          <span className="text-sm font-bold text-green-600">{tickSoundVolume}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={tickSoundVolume}
                          onChange={(e) => setTickSoundVolume(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* アラーム設定サマリー */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <h3 className="text-lg font-bold mb-4 text-gray-800">アラーム設定</h3>

                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">ミーティングアラーム</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>音量: {meetingAlarmSettings.volume}</span>
                      <span>周波数: {meetingAlarmSettings.frequency}Hz</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">作業時間アラーム</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>音量: {pomodoroSettings.workAlarm.volume}</span>
                      <span>周波数: {pomodoroSettings.workAlarm.frequency}Hz</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">休憩時間アラーム</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>音量: {pomodoroSettings.breakAlarm.volume}</span>
                      <span>周波数: {pomodoroSettings.breakAlarm.frequency}Hz</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  ※ 各タイマーの設定画面で詳細を調整できます
                </p>
              </div>

              {/* 通知・エフェクト設定 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-lg font-bold mb-4 text-gray-800">通知・エフェクト</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">通知</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleNotifications}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        notificationsEnabled
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {notificationsEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Vibrate className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">バイブレーション</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVibrationEnabled(!vibrationEnabled)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        vibrationEnabled
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {vibrationEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700">フラッシュ</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlashEnabled(!flashEnabled)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        flashEnabled
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {flashEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
