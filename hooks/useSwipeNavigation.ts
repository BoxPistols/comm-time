"use client";

import { useRef, useCallback } from "react";

// 横スワイプで前後へ移動するためのタッチハンドラ
// 縦スクロールを妨げないよう、横移動が縦移動を上回った場合のみ発火する
const SWIPE_THRESHOLD_PX = 50;
const VERTICAL_TOLERANCE_RATIO = 1.2;

type SwipeNavigationOptions = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
};

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, enabled = true }: SwipeNavigationOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
  }, [enabled]);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;
      startRef.current = null;

      // 縦方向の移動が大きいときはスクロール操作とみなす
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(dy) * VERTICAL_TOLERANCE_RATIO > Math.abs(dx)) return;

      if (dx < 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    },
    [enabled, onSwipeLeft, onSwipeRight]
  );

  return { onTouchStart, onTouchEnd };
}
