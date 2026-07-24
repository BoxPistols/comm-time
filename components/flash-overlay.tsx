"use client";

type FlashOverlayProps = {
  isFlashing: boolean;
  onStop: () => void;
};

export function FlashOverlay({ isFlashing, onStop }: FlashOverlayProps) {
  if (!isFlashing) return null;

  return (
    <div
      className="fixed inset-0 bg-white dark:bg-gray-900 z-50 animate-pulse cursor-pointer flex items-center justify-center"
      onClick={onStop}
    >
      <div className="text-center">
        <p className="text-4xl sm:text-5xl lg:text-6xl font-bold text-red-600 dark:text-red-400 mb-4 animate-bounce">
          ⏰ TIME UP! ⏰
        </p>
        <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 dark:text-gray-300 font-semibold">
          タップして停止
        </p>
      </div>
    </div>
  );
}
