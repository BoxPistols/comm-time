"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useHapticFeedback,
  type VibrationPatternKey,
} from "@/hooks/useHapticFeedback";
import type { AlarmSettings } from "@/types";
import { getStorageValue } from "@/lib/storage";

export type AlarmSystem = {
  // State
  isAlarmRinging: boolean;
  isFlashing: boolean;
  flashEnabled: boolean;
  setFlashEnabled: (v: boolean) => void;
  forceFocus: boolean;
  setForceFocus: (v: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (v: boolean) => void;
  vibrationPattern: VibrationPatternKey;
  setVibrationPattern: (v: VibrationPatternKey) => void;
  notificationPermission: NotificationPermission;
  tickSoundEnabled: boolean;
  setTickSoundEnabled: (v: boolean) => void;
  tickSoundVolume: number;
  setTickSoundVolume: (v: number) => void;
  // Functions
  playAlarm: (settings: AlarmSettings, message?: string) => void;
  stopAlarm: () => void;
  playTickSound: () => Promise<void>;
  previewSound: (settings: AlarmSettings) => void;
  toggleNotifications: () => void;
  requestNotificationPermission: () => Promise<void>;
  triggerAlarmVibration: (pattern: VibrationPatternKey) => void;
  // Refs
  tickAudioContextRef: React.RefObject<AudioContext | null>;
};

export function useAlarmSystem(): AlarmSystem {
  const { triggerAlarmVibration, cancelVibration } = useHapticFeedback();

  // States
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [forceFocus, setForceFocus] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [vibrationPattern, setVibrationPattern] =
    useState<VibrationPatternKey>("standard");
  const vibrationPatternRef = useRef<VibrationPatternKey>("standard");
  vibrationPatternRef.current = vibrationPattern;
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [tickSoundEnabled, setTickSoundEnabled] = useState(false);
  const [tickSoundVolume, setTickSoundVolume] = useState(5);

  // Refs
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const titleBlinkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickAudioContextRef = useRef<AudioContext | null>(null);

  // 初期データのロード
  useEffect(() => {
    setNotificationsEnabled(getStorageValue("notificationsEnabled", false));
    setVibrationEnabled(getStorageValue("vibrationEnabled", true));
    setVibrationPattern(getStorageValue("vibrationPattern", "standard"));
    setTickSoundEnabled(getStorageValue("tickSoundEnabled", false));
    setTickSoundVolume(getStorageValue("tickSoundVolume", 5));
    setFlashEnabled(getStorageValue("flashEnabled", true));

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // localStorage保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("notificationsEnabled", JSON.stringify(notificationsEnabled));
    localStorage.setItem("vibrationEnabled", JSON.stringify(vibrationEnabled));
    localStorage.setItem("vibrationPattern", vibrationPattern);
    localStorage.setItem("tickSoundEnabled", JSON.stringify(tickSoundEnabled));
    localStorage.setItem("tickSoundVolume", JSON.stringify(tickSoundVolume));
    localStorage.setItem("flashEnabled", JSON.stringify(flashEnabled));
  }, [notificationsEnabled, vibrationEnabled, vibrationPattern, tickSoundEnabled, tickSoundVolume, flashEnabled]);

  // バッファをWAVに変換
  const bufferToWave = (buffer: AudioBuffer, len: number) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const data = new Float32Array(len);
    buffer.copyFromChannel(data, 0, 0);

    const dataLength = len * numChannels * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(arrayBuffer);

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

  // Safari対応のアラーム音生成
  const createAlarmAudio = useCallback((settings: AlarmSettings) => {
    try {
      const win = window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextClass = win.AudioContext || win.webkitAudioContext;
      if (!AudioContextClass) return null;

      const audioContext = new AudioContextClass();
      const sampleRate = audioContext.sampleRate;
      const duration = 0.5;
      const numSamples = sampleRate * duration;
      const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
      const channelData = buffer.getChannelData(0);

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        channelData[i] =
          Math.sin(2 * Math.PI * settings.frequency * t) *
          (settings.volume / 100);
      }

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

  // アラーム停止
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

  // アラーム再生（Safari対応・繰り返し対応）
  const playAlarm = useCallback(
    (settings: AlarmSettings, message: string = "アラーム!") => {
      if (typeof window === "undefined") return;

      stopAlarm();
      setIsAlarmRinging(true);

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
      playSound();
      let alarmCount = 0;
      alarmIntervalRef.current = setInterval(() => {
        alarmCount++;
        if (alarmCount >= 6) {
          stopAlarm();
        } else {
          playSound();
          if (vibrationEnabled) {
            triggerAlarmVibration(vibrationPatternRef.current);
          }
        }
      }, 5000);

      if (vibrationEnabled) {
        triggerAlarmVibration(vibrationPatternRef.current);
      }

      if (flashEnabled) {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 30000);
      }

      if (notificationsEnabled && notificationPermission === "granted") {
        new Notification("Comm Time", {
          body: message,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          tag: "comm-time-alarm",
          requireInteraction: true,
        });
      }

      let titleBlink = false;
      titleBlinkIntervalRef.current = setInterval(() => {
        titleBlink = !titleBlink;
        document.title = titleBlink
          ? "🔔🔔🔔 " + message + " 🔔🔔🔔"
          : "⚠️⚠️⚠️ TIME UP! ⚠️⚠️⚠️";
      }, 500);

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

  // チクタク音再生（モバイル対応）
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

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

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

  // 音のプレビュー
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

  // 通知権限のリクエスト
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window) || !window.Notification) {
      console.log("このブラウザでは通知機能が利用できません");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        setNotificationsEnabled(true);
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

  // クリーンアップ
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

  return {
    isAlarmRinging,
    isFlashing,
    flashEnabled,
    setFlashEnabled,
    forceFocus,
    setForceFocus,
    notificationsEnabled,
    setNotificationsEnabled,
    vibrationEnabled,
    setVibrationEnabled,
    vibrationPattern,
    setVibrationPattern,
    notificationPermission,
    tickSoundEnabled,
    setTickSoundEnabled,
    tickSoundVolume,
    setTickSoundVolume,
    playAlarm,
    stopAlarm,
    playTickSound,
    previewSound,
    toggleNotifications,
    requestNotificationPermission,
    triggerAlarmVibration,
    tickAudioContextRef,
  };
}
