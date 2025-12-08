import { useState, useEffect } from "react";

export interface KeyboardShortcut {
  id: string;
  label: string;
  keys: string[];
  description: string;
  defaultKeys: string[];
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: "save",
    label: "保存",
    keys: ["Meta", "s"],
    description: "メモを保存します",
    defaultKeys: ["Meta", "s"],
  },
  {
    id: "edit",
    label: "編集切り替え",
    keys: ["Meta", "e"],
    description: "編集モードを切り替えます",
    defaultKeys: ["Meta", "e"],
  },
  {
    id: "fullscreen",
    label: "全画面表示",
    keys: ["Meta", "f"],
    description: "メモを全画面で表示します",
    defaultKeys: ["Meta", "f"],
  },
  {
    id: "cancel",
    label: "編集キャンセル",
    keys: ["Control", "Escape"],
    description: "編集を中止します",
    defaultKeys: ["Control", "Escape"],
  },
];

const STORAGE_KEY = "comm-time-shortcuts";

export function useKeyboardShortcuts() {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(
    DEFAULT_SHORTCUTS
  );

  // localStorage から設定を読み込む
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as KeyboardShortcut[];
        setShortcuts(parsed);
      } catch (e) {
        console.error("Failed to parse shortcuts from localStorage:", e);
      }
    }
  }, []);

  // ショートカットを保存
  const saveShortcuts = (newShortcuts: KeyboardShortcut[]) => {
    setShortcuts(newShortcuts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newShortcuts));
  };

  // ショートカットをリセット
  const resetShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SHORTCUTS));
  };

  // ID でショートカットを取得
  const getShortcut = (id: string): KeyboardShortcut | undefined => {
    return shortcuts.find((s) => s.id === id);
  };

  // キーの組み合わせからショートカット ID を取得
  const getShortcutByKeys = (
    ctrlKey: boolean,
    metaKey: boolean,
    key: string
  ): KeyboardShortcut | undefined => {
    return shortcuts.find((shortcut) => {
      const shortcutKeys = shortcut.keys;
      const hasCtrl =
        shortcutKeys.includes("Control") &&
        ctrlKey &&
        !shortcutKeys.includes("Meta");
      const hasMeta = shortcutKeys.includes("Meta") && metaKey;
      const hasKey = shortcutKeys.some((k) => k.toLowerCase() === key.toLowerCase());

      // Meta と Ctrl の区別を考慮
      const metaMatch =
        (shortcutKeys.includes("Meta") && metaKey) ||
        (shortcutKeys.includes("Control") && ctrlKey && !shortcutKeys.includes("Meta"));

      return metaMatch && hasKey;
    });
  };

  return {
    shortcuts,
    saveShortcuts,
    resetShortcuts,
    getShortcut,
    getShortcutByKeys,
  };
}
