"use client";

import { useState, useCallback, useEffect } from "react";
import type { AlarmSettings, PomodoroSettings } from "@/types";
import {
  INITIAL_MEETING_ALARM_SETTINGS,
  INITIAL_POMODORO_SETTINGS,
  DEFAULT_MEETING_ALARM_POINT_MINUTES,
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

export type DefaultSettingsState = {
  defaultMeetingAlarmSettings: AlarmSettings;
  setDefaultMeetingAlarmSettings: React.Dispatch<React.SetStateAction<AlarmSettings>>;
  defaultMeetingAlarmPoints: number[];
  setDefaultMeetingAlarmPoints: React.Dispatch<React.SetStateAction<number[]>>;
  defaultPomodoroWorkDuration: number;
  setDefaultPomodoroWorkDuration: React.Dispatch<React.SetStateAction<number>>;
  defaultPomodoroBreakDuration: number;
  setDefaultPomodoroBreakDuration: React.Dispatch<React.SetStateAction<number>>;
  defaultPomodoroCycles: number;
  setDefaultPomodoroCycles: React.Dispatch<React.SetStateAction<number>>;
  defaultPomodoroWorkAlarm: AlarmSettings;
  setDefaultPomodoroWorkAlarm: React.Dispatch<React.SetStateAction<AlarmSettings>>;
  defaultPomodoroBreakAlarm: AlarmSettings;
  setDefaultPomodoroBreakAlarm: React.Dispatch<React.SetStateAction<AlarmSettings>>;
  resetToDefaults: (
    setMeetingAlarmSettings: React.Dispatch<React.SetStateAction<AlarmSettings>>,
    setPomodoroSettings: React.Dispatch<React.SetStateAction<PomodoroSettings>>,
    pomodoroSettings: PomodoroSettings,
  ) => void;
};

export function useDefaultSettings(): DefaultSettingsState {
  const [defaultMeetingAlarmSettings, setDefaultMeetingAlarmSettings] =
    useState<AlarmSettings>(INITIAL_MEETING_ALARM_SETTINGS);
  const [defaultMeetingAlarmPoints, setDefaultMeetingAlarmPoints] =
    useState<number[]>(DEFAULT_MEETING_ALARM_POINT_MINUTES);
  const [defaultPomodoroWorkDuration, setDefaultPomodoroWorkDuration] =
    useState(INITIAL_POMODORO_SETTINGS.workDuration);
  const [defaultPomodoroBreakDuration, setDefaultPomodoroBreakDuration] =
    useState(INITIAL_POMODORO_SETTINGS.breakDuration);
  const [defaultPomodoroCycles, setDefaultPomodoroCycles] =
    useState(INITIAL_POMODORO_SETTINGS.cycles);
  const [defaultPomodoroWorkAlarm, setDefaultPomodoroWorkAlarm] =
    useState<AlarmSettings>(INITIAL_POMODORO_SETTINGS.workAlarm);
  const [defaultPomodoroBreakAlarm, setDefaultPomodoroBreakAlarm] =
    useState<AlarmSettings>(INITIAL_POMODORO_SETTINGS.breakAlarm);

  // 初期データのロード
  useEffect(() => {
    setDefaultMeetingAlarmSettings(
      getStorageValue("defaultMeetingAlarmSettings", INITIAL_MEETING_ALARM_SETTINGS)
    );
    setDefaultMeetingAlarmPoints(
      getStorageValue("defaultMeetingAlarmPoints", DEFAULT_MEETING_ALARM_POINT_MINUTES)
    );
    setDefaultPomodoroWorkDuration(
      getStorageValue("defaultPomodoroWorkDuration", INITIAL_POMODORO_SETTINGS.workDuration)
    );
    setDefaultPomodoroBreakDuration(
      getStorageValue("defaultPomodoroBreakDuration", INITIAL_POMODORO_SETTINGS.breakDuration)
    );
    setDefaultPomodoroCycles(
      getStorageValue("defaultPomodoroCycles", INITIAL_POMODORO_SETTINGS.cycles)
    );
    setDefaultPomodoroWorkAlarm(
      getStorageValue("defaultPomodoroWorkAlarm", INITIAL_POMODORO_SETTINGS.workAlarm)
    );
    setDefaultPomodoroBreakAlarm(
      getStorageValue("defaultPomodoroBreakAlarm", INITIAL_POMODORO_SETTINGS.breakAlarm)
    );
  }, []);

  // localStorage保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("defaultMeetingAlarmSettings", JSON.stringify(defaultMeetingAlarmSettings));
    localStorage.setItem("defaultMeetingAlarmPoints", JSON.stringify(defaultMeetingAlarmPoints));
    localStorage.setItem("defaultPomodoroWorkDuration", JSON.stringify(defaultPomodoroWorkDuration));
    localStorage.setItem("defaultPomodoroBreakDuration", JSON.stringify(defaultPomodoroBreakDuration));
    localStorage.setItem("defaultPomodoroCycles", JSON.stringify(defaultPomodoroCycles));
    localStorage.setItem("defaultPomodoroWorkAlarm", JSON.stringify(defaultPomodoroWorkAlarm));
    localStorage.setItem("defaultPomodoroBreakAlarm", JSON.stringify(defaultPomodoroBreakAlarm));
  }, [
    defaultMeetingAlarmSettings, defaultMeetingAlarmPoints,
    defaultPomodoroWorkDuration, defaultPomodoroBreakDuration, defaultPomodoroCycles,
    defaultPomodoroWorkAlarm, defaultPomodoroBreakAlarm,
  ]);

  const resetToDefaults = useCallback(
    (
      setMeetingAlarmSettings: React.Dispatch<React.SetStateAction<AlarmSettings>>,
      setPomodoroSettings: React.Dispatch<React.SetStateAction<PomodoroSettings>>,
      pomodoroSettings: PomodoroSettings,
    ) => {
      setMeetingAlarmSettings(defaultMeetingAlarmSettings);
      setPomodoroSettings({
        ...pomodoroSettings,
        workDuration: defaultPomodoroWorkDuration,
        breakDuration: defaultPomodoroBreakDuration,
        cycles: defaultPomodoroCycles,
        workAlarm: defaultPomodoroWorkAlarm,
        breakAlarm: defaultPomodoroBreakAlarm,
      });
    },
    [
      defaultMeetingAlarmSettings, defaultPomodoroWorkDuration,
      defaultPomodoroBreakDuration, defaultPomodoroCycles,
      defaultPomodoroWorkAlarm, defaultPomodoroBreakAlarm,
    ]
  );

  return {
    defaultMeetingAlarmSettings, setDefaultMeetingAlarmSettings,
    defaultMeetingAlarmPoints, setDefaultMeetingAlarmPoints,
    defaultPomodoroWorkDuration, setDefaultPomodoroWorkDuration,
    defaultPomodoroBreakDuration, setDefaultPomodoroBreakDuration,
    defaultPomodoroCycles, setDefaultPomodoroCycles,
    defaultPomodoroWorkAlarm, setDefaultPomodoroWorkAlarm,
    defaultPomodoroBreakAlarm, setDefaultPomodoroBreakAlarm,
    resetToDefaults,
  };
}
