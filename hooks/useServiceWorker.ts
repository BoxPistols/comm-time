"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Service Worker の登録と通知送信を管理するhook
 * iOS PWA でのプッシュ通知に必要
 */
export function useServiceWorker() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registrationRef.current = reg;
      })
      .catch((e) => {
        console.warn("Service Worker登録エラー:", e);
      });
  }, []);

  /**
   * Service Worker 経由で通知を表示
   * iOS PWA では new Notification() が使えないため、
   * registration.showNotification() を使う必要がある
   */
  const showNotification = useCallback(
    async (title: string, body: string, tag?: string) => {
      const reg = registrationRef.current;

      // Service Worker 経由で通知（iOS PWA対応）
      if (reg?.active) {
        reg.active.postMessage({
          type: "SHOW_NOTIFICATION",
          payload: { title, body, tag },
        });
        return;
      }

      // フォールバック: 通常の Notification API
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, {
            body,
            icon: "/favicon.svg",
            badge: "/favicon.svg",
            tag: tag || "comm-time-alarm",
            requireInteraction: true,
          });
        } catch {
          // iOS Safari (非PWA) では失敗する - 無視
        }
      }
    },
    []
  );

  /**
   * バックグラウンド用のアラームをスケジュール
   * タブがサスペンドされても Service Worker が通知を表示できる
   */
  const scheduleAlarm = useCallback(
    (fireAt: number, title: string, body: string, tag?: string) => {
      const reg = registrationRef.current;
      if (reg?.active) {
        reg.active.postMessage({
          type: "SCHEDULE_ALARM",
          payload: { fireAt, title, body, tag },
        });
      }
    },
    []
  );

  /**
   * 表示中の通知をすべて閉じる
   */
  const cancelNotifications = useCallback(() => {
    const reg = registrationRef.current;
    if (reg?.active) {
      reg.active.postMessage({ type: "CANCEL_NOTIFICATIONS" });
    }
  }, []);

  /**
   * iOS PWA かどうかを判定
   */
  const isIOSPWA =
    typeof window !== "undefined" &&
    "standalone" in (window.navigator as any) &&
    (window.navigator as any).standalone === true;

  return {
    showNotification,
    scheduleAlarm,
    cancelNotifications,
    isIOSPWA,
    registration: registrationRef,
  };
}
