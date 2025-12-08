"use client";

import { useState, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { Modal } from "./Modal";
import { KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
  onSave: (shortcuts: KeyboardShortcut[]) => void;
  onReset: () => void;
  darkMode: boolean;
}

export function ShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
  onSave,
  onReset,
  darkMode,
}: ShortcutsModalProps) {
  const [editingShortcuts, setEditingShortcuts] =
    useState<KeyboardShortcut[]>(shortcuts);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);

  // ショートカット記録開始
  const startRecording = useCallback((id: string) => {
    setRecordingId(id);
    setRecordedKeys([]);
  }, []);

  // キー入力を記録
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!recordingId) return;

      e.preventDefault();
      const keys: string[] = [];

      if (e.ctrlKey) keys.push("Control");
      if (e.metaKey) keys.push("Meta");
      if (e.shiftKey) keys.push("Shift");
      if (e.altKey) keys.push("Alt");

      // 修飾キー以外を追加
      const key = e.key;
      if (
        key !== "Control" &&
        key !== "Meta" &&
        key !== "Shift" &&
        key !== "Alt"
      ) {
        keys.push(key);
      }

      setRecordedKeys(keys);
    },
    [recordingId]
  );

  // ショートカット記録終了
  const finishRecording = useCallback(() => {
    if (!recordingId || recordedKeys.length === 0) {
      setRecordingId(null);
      return;
    }

    const updatedShortcuts = editingShortcuts.map((s) =>
      s.id === recordingId ? { ...s, keys: recordedKeys } : s
    );

    setEditingShortcuts(updatedShortcuts);
    setRecordingId(null);
    setRecordedKeys([]);
  }, [recordingId, recordedKeys, editingShortcuts]);

  // キー表記をフォーマット
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

  const footerContent = (
    <div className="flex items-center justify-between w-full gap-1 flex-wrap">
      <button
        onClick={() => {
          onReset();
          setEditingShortcuts(shortcuts);
        }}
        className={`flex items-center gap-1 px-2 py-1 rounded font-medium text-xs transition-colors whitespace-nowrap ${
          darkMode
            ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
            : "bg-gray-200 hover:bg-gray-300 text-gray-800"
        }`}
      >
        <RotateCcw size={12} />
        <span>リセット</span>
      </button>

      <div className="flex gap-1 ml-auto">
        <button
          onClick={onClose}
          className={`px-3 py-1 rounded font-medium text-xs transition-colors whitespace-nowrap ${
            darkMode
              ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
              : "bg-gray-200 hover:bg-gray-300 text-gray-800"
          }`}
        >
          キャンセル
        </button>
        <button
          onClick={() => {
            onSave(editingShortcuts);
            onClose();
          }}
          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors whitespace-nowrap"
        >
          保存
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="キーボードショートカット設定"
      darkMode={darkMode}
      size="md"
      maxHeight="90vh"
      footer={footerContent}
    >
      <div className="space-y-1.5">
        {editingShortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className={`px-3 py-2.5 rounded border transition-colors ${
              darkMode
                ? "bg-gray-700/30 border-gray-600/40 hover:bg-gray-700/50"
                : "bg-gray-50 border-gray-200/60 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3
                  className={`text-sm font-semibold leading-tight ${
                    darkMode ? "text-gray-100" : "text-gray-900"
                  }`}
                >
                  {shortcut.label}
                </h3>
                <p
                  className={`text-xs leading-relaxed mt-0.5 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {shortcut.description}
                </p>
              </div>

              {recordingId === shortcut.id ? (
                <div className="flex gap-1 flex-shrink-0">
                  <div
                    className={`px-2 py-1 rounded border border-blue-500 text-xs text-center font-mono font-medium ${
                      darkMode ? "bg-blue-900/40 text-blue-200" : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {recordedKeys.length > 0
                      ? formatKeys(recordedKeys)
                      : "..."}
                  </div>
                  <button
                    onClick={finishRecording}
                    className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors"
                  >
                    確定
                  </button>
                  <button
                    onClick={() => setRecordingId(null)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      darkMode
                        ? "bg-gray-600 hover:bg-gray-500 text-gray-200"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5 items-center flex-shrink-0">
                  <kbd
                    className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${
                      darkMode
                        ? "bg-gray-800 text-gray-200 border-gray-700"
                        : "bg-gray-200 text-gray-800 border-gray-300"
                    }`}
                  >
                    {formatKeys(shortcut.keys)}
                  </kbd>
                  <button
                    onKeyDown={handleKeyDown}
                    onClick={() => startRecording(shortcut.id)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      darkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    変更
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
