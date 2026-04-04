"use client";

import { useState, useCallback, useEffect } from "react";
import type { AlarmPoint, AlarmSettings } from "@/types";
import {
  INITIAL_MEETING_ALARM_POINTS,
  INITIAL_MEETING_ALARM_SETTINGS,
  DEFAULT_PROGRESS_PRESET,
} from "@/lib/constants";

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

export type MeetingTimerState = {
  // State
  isMeetingRunning: boolean;
  meetingStartTime: Date | null;
  meetingElapsedTime: number;
  alarmPoints: AlarmPoint[];
  setAlarmPoints: React.Dispatch<React.SetStateAction<AlarmPoint[]>>;
  meetingAlarmSettings: AlarmSettings;
  setMeetingAlarmSettings: React.Dispatch<React.SetStateAction<AlarmSettings>>;
  alarmPointMinutesInput: Record<string, string>;
  setAlarmPointMinutesInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  countdownMode: boolean;
  setCountdownMode: (v: boolean) => void;
  targetEndTime: string;
  setTargetEndTime: (v: string) => void;
  countdownSeconds: number;
  endTimeInputMode: boolean;
  setEndTimeInputMode: (v: boolean) => void;
  progressPreset: number[];
  setProgressPreset: (v: number[]) => void;
  remainingMeetingMinutes: number;
  meetingTotalDurationMinutes: number;
  // Functions
  toggleMeetingTimer: () => Promise<void>;
  resetMeetingTimer: () => void;
  addAlarmPoint: () => void;
  updateAlarmPoint: (id: string, minutes: number) => void;
  removeAlarmPoint: (id: string) => void;
  generateAlarmPointsFromEndTime: (endTimeStr: string, presets: number[]) => void;
  formatTime: (seconds: number) => string;
  getEndTime: (startTime: Date | null, durationInSeconds: number) => string;
  getCountdown: (totalSeconds: number, elapsedSeconds: number) => string;
};

type MeetingTimerOptions = {
  playAlarm: (settings: AlarmSettings, message?: string) => void;
  playTickSound: () => Promise<void>;
  tickSoundEnabled: boolean;
  tickAudioContextRef: React.RefObject<AudioContext | null>;
};

export function useMeetingTimer(options: MeetingTimerOptions): MeetingTimerState {
  const { playAlarm, playTickSound, tickSoundEnabled, tickAudioContextRef } = options;

  // States
  const [isMeetingRunning, setIsMeetingRunning] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);
  const [meetingElapsedTime, setMeetingElapsedTime] = useState(0);
  const [alarmPoints, setAlarmPoints] = useState<AlarmPoint[]>(INITIAL_MEETING_ALARM_POINTS);
  const [meetingAlarmSettings, setMeetingAlarmSettings] =
    useState<AlarmSettings>(INITIAL_MEETING_ALARM_SETTINGS);
  const [alarmPointMinutesInput, setAlarmPointMinutesInput] = useState<Record<string, string>>({});
  const [countdownMode, setCountdownMode] = useState(false);
  const [targetEndTime, setTargetEndTime] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [endTimeInputMode, setEndTimeInputMode] = useState(false);
  const [progressPreset, setProgressPreset] = useState<number[]>(DEFAULT_PROGRESS_PRESET);
  const [remainingMeetingMinutes, setRemainingMeetingMinutes] = useState(0);
  const [meetingTotalDurationMinutes, setMeetingTotalDurationMinutes] = useState(0);

  // 初期データのロード
  useEffect(() => {
    setAlarmPoints(getStorageValue("alarmPoints", INITIAL_MEETING_ALARM_POINTS));
    setMeetingAlarmSettings(getStorageValue("meetingAlarmSettings", INITIAL_MEETING_ALARM_SETTINGS));
    setCountdownMode(getStorageValue("countdownMode", false));
    setTargetEndTime(getStorageValue("targetEndTime", ""));
    setEndTimeInputMode(getStorageValue("endTimeInputMode", false));
    setProgressPreset(getStorageValue("progressPreset", DEFAULT_PROGRESS_PRESET));
  }, []);

  // localStorage保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("alarmPoints", JSON.stringify(alarmPoints));
    localStorage.setItem("meetingAlarmSettings", JSON.stringify(meetingAlarmSettings));
    localStorage.setItem("countdownMode", JSON.stringify(countdownMode));
    localStorage.setItem("targetEndTime", targetEndTime);
    localStorage.setItem("endTimeInputMode", JSON.stringify(endTimeInputMode));
    localStorage.setItem("progressPreset", JSON.stringify(progressPreset));
  }, [alarmPoints, meetingAlarmSettings, countdownMode, targetEndTime, endTimeInputMode, progressPreset]);

  // 時間のフォーマット関数
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  // タイマー更新
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMeetingRunning && meetingStartTime) {
      timer = setInterval(() => {
        const now = new Date();

        if (countdownMode && targetEndTime) {
          const [hours, minutes] = targetEndTime.split(":").map(Number);
          const targetDate = new Date();
          targetDate.setHours(hours, minutes, 0, 0);

          if (targetDate < meetingStartTime) {
            targetDate.setDate(targetDate.getDate() + 1);
          }

          const remainingMs = targetDate.getTime() - now.getTime();
          const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

          setCountdownSeconds((prevSeconds) => {
            if (prevSeconds > 0 && remainingSec === 0) {
              playAlarm(meetingAlarmSettings, "時間になりました！");
              setIsMeetingRunning(false);
            }
            return remainingSec;
          });

          document.title = `CT (${formatTime(remainingSec)})`;
        } else {
          const newElapsedTime = Math.floor(
            (now.getTime() - meetingStartTime.getTime()) / 1000
          );
          setMeetingElapsedTime(newElapsedTime);
          document.title = `CT (${formatTime(newElapsedTime)})`;
        }

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
                return { ...point, isDone: true, remainingTime: newRemainingTime };
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

  // 終了時刻からの残り時間を計算
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
    const interval = setInterval(calculateRemainingMinutes, 60000);
    return () => clearInterval(interval);
  }, [targetEndTime, endTimeInputMode]);

  // タイマー制御
  const toggleMeetingTimer = useCallback(async () => {
    if (isMeetingRunning) {
      setIsMeetingRunning(false);
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

      if (meetingStartTime === null) {
        setMeetingStartTime(new Date());
      } else {
        const now = new Date();
        const pausedDuration =
          now.getTime() - (meetingStartTime.getTime() + meetingElapsedTime * 1000);
        setMeetingStartTime(new Date(now.getTime() - pausedDuration));
      }
      setIsMeetingRunning(true);
    }
  }, [isMeetingRunning, meetingStartTime, meetingElapsedTime, tickSoundEnabled, tickAudioContextRef]);

  const resetMeetingTimer = useCallback(() => {
    setIsMeetingRunning(false);
    setMeetingStartTime(null);
    setMeetingElapsedTime(0);
    setAlarmPoints(INITIAL_MEETING_ALARM_POINTS);
  }, []);

  // アラームポイント管理
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
            ? { ...point, minutes: Math.max(1, minutes), remainingTime: Math.max(1, minutes) * 60 }
            : point
        )
        .sort((a, b) => a.minutes - b.minutes)
    );
  }, []);

  const removeAlarmPoint = useCallback((id: string) => {
    setAlarmPoints((prevPoints) => prevPoints.filter((point) => point.id !== id));
  }, []);

  const generateAlarmPointsFromEndTime = useCallback((endTimeStr: string, presets: number[]) => {
    if (!endTimeStr) return;

    const now = new Date();
    const [hours, minutes] = endTimeStr.split(":").map(Number);
    const endTime = new Date();
    endTime.setHours(hours, minutes, 0, 0);

    if (endTime <= now) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const totalMs = endTime.getTime() - now.getTime();
    const totalMinutes = Math.floor(totalMs / 60000);
    setMeetingTotalDurationMinutes(totalMinutes);
    setRemainingMeetingMinutes(Math.max(0, totalMinutes));

    if (totalMinutes <= 0) return;

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
        arr.findIndex(p => p.minutes === point.minutes) === index
      )
      .sort((a, b) => a.minutes - b.minutes);

    setAlarmPoints(newAlarmPoints);
  }, []);

  const getEndTime = useCallback(
    (startTime: Date | null, durationInSeconds: number) => {
      if (!startTime) return "--:--:--";
      const endTime = new Date(startTime.getTime() + durationInSeconds * 1000);
      return endTime.toLocaleTimeString();
    },
    []
  );

  const getCountdown = useCallback(
    (totalSeconds: number, elapsedSeconds: number) => {
      const remainingSeconds = totalSeconds - elapsedSeconds;
      return formatTime(Math.max(0, remainingSeconds));
    },
    [formatTime]
  );

  return {
    isMeetingRunning,
    meetingStartTime,
    meetingElapsedTime,
    alarmPoints,
    setAlarmPoints,
    meetingAlarmSettings,
    setMeetingAlarmSettings,
    alarmPointMinutesInput,
    setAlarmPointMinutesInput,
    countdownMode,
    setCountdownMode,
    targetEndTime,
    setTargetEndTime,
    countdownSeconds,
    endTimeInputMode,
    setEndTimeInputMode,
    progressPreset,
    setProgressPreset,
    remainingMeetingMinutes,
    meetingTotalDurationMinutes,
    toggleMeetingTimer,
    resetMeetingTimer,
    addAlarmPoint,
    updateAlarmPoint,
    removeAlarmPoint,
    generateAlarmPointsFromEndTime,
    formatTime,
    getEndTime,
    getCountdown,
  };
}
