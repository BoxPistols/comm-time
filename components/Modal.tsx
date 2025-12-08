"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  darkMode: boolean;
  size?: "sm" | "md" | "lg";
  maxHeight?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  darkMode,
  size = "md",
  maxHeight = "90vh",
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-hidden">
      <div
        className={`rounded-lg shadow-xl w-full h-full flex flex-col overflow-hidden ${sizeClasses[size]} ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
        style={{ maxHeight, maxWidth: "100%" }}
      >
        {/* ヘッダー */}
        <div
          className={`flex-shrink-0 flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h2
            className={`text-xl font-semibold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              darkMode
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            }`}
            aria-label="閉じる"
          >
            <X size={24} />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* フッター */}
        {footer && (
          <div
            className={`flex-shrink-0 px-6 py-4 border-t ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
