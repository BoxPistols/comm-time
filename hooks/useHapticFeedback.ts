"use client";

import { useCallback, useEffect, useRef } from "react";

/** 振動パターンのプリセット定義 */
export type VibrationPatternKey =
  | "standard"
  | "bee"
  | "heartbeat"
  | "sos";

type PatternDef = {
  label: string;
  description: string;
  webHaptics: { duration: number; intensity: number; delay?: number }[];
  vibrateApi: number[];
};

/**
 * 選択可能な振動パターン一覧
 */
export const VIBRATION_PATTERNS: Record<VibrationPatternKey, PatternDef> = {
  standard: {
    label: "スタンダード",
    description: "通常のアラーム振動",
    webHaptics: [
      { duration: 500, intensity: 1 },
      { delay: 200, duration: 500, intensity: 1 },
      { delay: 200, duration: 500, intensity: 1 },
    ],
    vibrateApi: [500, 200, 500, 200, 500],
  },
  bee: {
    label: "Bee（ビー）",
    description: "短い連続振動で賑やかに通知",
    webHaptics: [
      { duration: 100, intensity: 1 },
      { delay: 50, duration: 100, intensity: 0.8 },
      { delay: 50, duration: 100, intensity: 1 },
      { delay: 50, duration: 100, intensity: 0.8 },
      { delay: 50, duration: 100, intensity: 1 },
      { delay: 50, duration: 100, intensity: 0.8 },
      { delay: 50, duration: 100, intensity: 1 },
      { delay: 100, duration: 200, intensity: 1 },
    ],
    vibrateApi: [100, 50, 100, 50, 100, 50, 100, 50, 100, 50, 100, 50, 100, 100, 200],
  },
  heartbeat: {
    label: "ハートビート",
    description: "心拍のようなリズミカルな振動",
    webHaptics: [
      { duration: 200, intensity: 1 },
      { delay: 100, duration: 200, intensity: 0.6 },
      { delay: 400, duration: 200, intensity: 1 },
      { delay: 100, duration: 200, intensity: 0.6 },
    ],
    vibrateApi: [200, 100, 200, 400, 200, 100, 200],
  },
  sos: {
    label: "SOS",
    description: "モールス信号のSOSパターン",
    webHaptics: [
      // S: ...
      { duration: 100, intensity: 1 },
      { delay: 100, duration: 100, intensity: 1 },
      { delay: 100, duration: 100, intensity: 1 },
      // O: ---
      { delay: 200, duration: 300, intensity: 1 },
      { delay: 100, duration: 300, intensity: 1 },
      { delay: 100, duration: 300, intensity: 1 },
      // S: ...
      { delay: 200, duration: 100, intensity: 1 },
      { delay: 100, duration: 100, intensity: 1 },
      { delay: 100, duration: 100, intensity: 1 },
    ],
    vibrateApi: [100, 100, 100, 100, 100, 200, 300, 100, 300, 100, 300, 200, 100, 100, 100, 100, 100],
  },
};

/**
 * iOS Safari対応のハプティックフィードバックhook
 *
 * web-hapticsライブラリを使用して、iOS SafariでもVibration APIなしで
 * ハプティックフィードバックを実現する。
 * Android等Vibration APIが使えるデバイスではネイティブAPIも併用する。
 */
export function useHapticFeedback() {
  const hapticsRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || initializedRef.current) return;
    initializedRef.current = true;

    import("web-haptics")
      .then(({ WebHaptics }) => {
        hapticsRef.current = new WebHaptics();
      })
      .catch((e) => {
        console.warn("web-haptics初期化エラー:", e);
      });

    return () => {
      if (hapticsRef.current) {
        hapticsRef.current.destroy();
        hapticsRef.current = null;
        initializedRef.current = false;
      }
    };
  }, []);

  /**
   * 指定パターンでアラーム振動を発火
   */
  const triggerAlarmVibration = useCallback(
    async (patternKey: VibrationPatternKey = "standard") => {
      const pattern = VIBRATION_PATTERNS[patternKey] ?? VIBRATION_PATTERNS.standard;

      // web-hapticsによるハプティックフィードバック（iOS Safari対応）
      if (hapticsRef.current) {
        try {
          await hapticsRef.current.trigger(pattern.webHaptics);
        } catch (e) {
          console.warn("ハプティックフィードバックエラー:", e);
        }
      }

      // Vibration API対応デバイスではネイティブAPIも併用（フォールバック）
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(pattern.vibrateApi);
        } catch {
          // 無視
        }
      }
    },
    []
  );

  /**
   * 振動を停止
   */
  const cancelVibration = useCallback(() => {
    if (hapticsRef.current) {
      hapticsRef.current.cancel();
    }
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // 無視
      }
    }
  }, []);

  return { triggerAlarmVibration, cancelVibration };
}
