"use client";

import { useRef, useEffect } from "react";
import { KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface ShortcutsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick: () => void;
  shortcuts: KeyboardShortcut[];
  darkMode: boolean;
}

const formatKeys = (keys: string[]): string => {
  return keys
    .map((k) => {
      if (k === "Meta") return "Cmd";
      if (k === "Control") return "Ctrl";
      if (k === "Shift") return "Shift";
      if (k === "Alt") return "Alt";
      if (k === "Escape") return "Esc";
      return k.length === 1 ? k.toUpperCase() : k;
    })
    .join(" + ");
};

export function ShortcutsDropdown({
  isOpen,
  onClose,
  onSettingsClick,
  shortcuts,
  darkMode,
}: ShortcutsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 外側をクリックで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg border min-w-max z-40 ${
        darkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }`}
    >
      {/* ショートカット一覧 */}
      <div className={`px-4 py-3 space-y-2 border-b ${
        darkMode ? "border-gray-700" : "border-gray-200"
      }`}>
        {shortcuts.map((shortcut) => (
          <div key={shortcut.id} className="flex items-center justify-between gap-4">
            <span
              className={`text-xs ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {shortcut.label}
            </span>
            <kbd
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-200"
                  : "bg-gray-100 border-gray-300 text-gray-800"
              }`}
            >
              {formatKeys(shortcut.keys)}
            </kbd>
          </div>
        ))}
      </div>

      {/* 設定ボタン */}
      <button
        onClick={() => {
          onSettingsClick();
          onClose();
        }}
        className={`w-full px-4 py-2 text-xs font-medium text-center transition-colors ${
          darkMode
            ? "text-blue-400 hover:bg-gray-700"
            : "text-blue-600 hover:bg-gray-50"
        }`}
      >
        詳細設定
      </button>
    </div>
  );
}
