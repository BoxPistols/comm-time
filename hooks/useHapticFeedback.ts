"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * iOS Safari対応のハプティックフィードバックhook
 *
 * web-hapticsライブラリを使用して、iOS SafariでもVibration APIなしで
 * ハプティックフィードバックを実現する。
 * Android等Vibration APIが使えるデバイスではネイティブAPIも併用する。
 */
export function useHapticFeedback() {
  // WebHapticsインスタンスをrefで保持（SSR対応のため遅延初期化）
  const hapticsRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || initializedRef.current) return;
    initializedRef.current = true;

    // 動的importでSSRエラーを回避
    import("web-haptics").then(({ WebHaptics }) => {
      hapticsRef.current = new WebHaptics();
    }).catch((e) => {
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
   * アラーム用の強い振動パターンを発火
   * 元の navigator.vibrate([500, 200, 500, 200, 500]) を再現
   */
  const triggerAlarmVibration = useCallback(async () => {
    // web-hapticsによるハプティックフィードバック（iOS Safari対応）
    if (hapticsRef.current) {
      try {
        await hapticsRef.current.trigger([
          { duration: 500, intensity: 1 },
          { delay: 200, duration: 500, intensity: 1 },
          { delay: 200, duration: 500, intensity: 1 },
        ]);
      } catch (e) {
        console.warn("ハプティックフィードバックエラー:", e);
      }
    }

    // Vibration API対応デバイスではネイティブAPIも併用（フォールバック）
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([500, 200, 500, 200, 500]);
      } catch {
        // 無視
      }
    }
  }, []);

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
