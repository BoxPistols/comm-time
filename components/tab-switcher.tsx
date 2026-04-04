"use client";

import { Clock, List } from "lucide-react";
import type { TabType } from "@/types";

type TabSwitcherProps = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
};

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <button
        type="button"
        onClick={() => onTabChange("meeting")}
        className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 ${
          activeTab === "meeting"
            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl"
            : "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-md hover:shadow-lg"
        }`}
      >
        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">ミーティングタイマー</span>
        <span className="sm:hidden">ミーティング</span>
      </button>
      <button
        type="button"
        onClick={() => onTabChange("pomodoro")}
        className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 ${
          activeTab === "pomodoro"
            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl"
            : "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-md hover:shadow-lg"
        }`}
      >
        <List className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">ポモドーロタイマー</span>
        <span className="sm:hidden">ポモドーロ</span>
      </button>
    </div>
  );
}
