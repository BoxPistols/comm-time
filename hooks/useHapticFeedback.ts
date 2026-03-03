"use client";

import { useCallback, useEffect, useRef } from "react";
import type { WebHaptics } from "web-haptics";

/** 振動パターンのプリセット定義 */
export type VibrationPatternKey = "standard" | "bee" | "heartbeat" | "sos";

type HapticStep = { duration: number; intensity: number; delay?: number };

type PatternDef = {
  label: string;
  description: string;
  haptics: HapticStep[];
};

/** webHapticsのステップ配列からVibration API用の数値配列を導出 */
function toVibratePattern(steps: HapticStep[]): number[] {
  const result: number[] = [];
  for (const step of steps) {
    if (step.delay) result.push(step.delay);
    result.push(step.duration);
  }
  return result;
}

/**
 * 選択可能な振動パターン一覧
 */
export const VIBRATION_PATTERNS: Record<VibrationPatternKey, PatternDef> = {
  standard: {
    label: "スタンダード",
    description: "通常のアラーム振動",
    haptics: [
      { duration: 500, intensity: 1 },
      { delay: 200, duration: 500, intensity: 1 },
      { delay: 200, duration: 500, intensity: 1 },
    ],
  },
  bee: {
    label: "Bee（ビー）",
    description: "短い連続振動で賑やかに通知",
    haptics: [
      { duration: 100, intensity: 1 },
      { delay: 50, duration: 100, intensity: 0.8 },
      { delay: 50, duration: 100, intensity: 1 },
      { delay: 50, duration: 100, intensity: 0.8 },
      { delay: 50, duration: 100, intensity: 1 },
      { delay: 50, duration: 100, intensity: 0.8 },
      { delay: 50, duration: 100, intensity: 1 },
      { delay: 100, duration: 200, intensity: 1 },
    ],
  },
  heartbeat: {
    label: "ハートビート",
    description: "心拍のようなリズミカルな振動",
    haptics: [
      { duration: 200, intensity: 1 },
      { delay: 100, duration: 200, intensity: 0.6 },
      { delay: 400, duration: 200, intensity: 1 },
      { delay: 100, duration: 200, intensity: 0.6 },
    ],
  },
  sos: {
    label: "SOS",
    description: "モールス信号のSOSパターン",
    haptics: [
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
  },
};

export const VIBRATION_PATTERN_KEYS = Object.keys(
  VIBRATION_PATTERNS
) as VibrationPatternKey[];

/**
 * iOS Safari対応のハプティックフィードバックhook
 *
 * web-hapticsライブラリを使用して、iOS SafariでもVibration APIなしで
 * ハプティックフィードバックを実現する。
 * Android等Vibration APIが使えるデバイスではネイティブAPIをフォールバックとして使用。
 */
export function useHapticFeedback() {
  const hapticsRef = useRef<WebHaptics | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;

    import("web-haptics")
      .then(({ WebHaptics: WH }) => {
        if (active) {
          hapticsRef.current = new WH();
        }
      })
      .catch((e) => {
        console.warn("web-haptics初期化エラー:", e);
      });

    return () => {
      active = false;
      if (hapticsRef.current) {
        hapticsRef.current.destroy();
        hapticsRef.current = null;
      }
    };
  }, []);

  /**
   * 指定パターンでアラーム振動を発火
   * web-hapticsが利用可能ならそちらを使用し、失敗時のみVibration APIにフォールバック
   */
  const triggerAlarmVibration = useCallback(
    async (patternKey: VibrationPatternKey = "standard") => {
      const pattern =
        VIBRATION_PATTERNS[patternKey] ?? VIBRATION_PATTERNS.standard;

      // web-hapticsによるハプティックフィードバック（iOS Safari対応）
      if (hapticsRef.current) {
        try {
          await hapticsRef.current.trigger(pattern.haptics);
          return; // 成功したらフォールバック不要
        } catch (e) {
          console.warn("ハプティックフィードバックエラー:", e);
        }
      }

      // フォールバック: web-hapticsが未初期化or失敗時のみVibration APIを使用
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(toVibratePattern(pattern.haptics));
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
