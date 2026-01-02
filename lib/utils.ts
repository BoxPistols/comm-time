import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// カラー設定を取得するヘルパー関数
export function getColorConfig(color: string) {
  const colorConfigs: Record<string, { color: string; bgClass: string; textClass: string; borderClass: string; activeClass: string }> = {
    gray: { color: 'gray', bgClass: 'bg-gray-500', textClass: 'text-gray-600', borderClass: 'border-gray-300', activeClass: 'bg-gray-500 text-white' },
    blue: { color: 'blue', bgClass: 'bg-blue-500', textClass: 'text-blue-600', borderClass: 'border-blue-300', activeClass: 'bg-blue-500 text-white' },
    yellow: { color: 'yellow', bgClass: 'bg-yellow-500', textClass: 'text-yellow-600', borderClass: 'border-yellow-300', activeClass: 'bg-yellow-500 text-black' },
    green: { color: 'green', bgClass: 'bg-green-500', textClass: 'text-green-600', borderClass: 'border-green-300', activeClass: 'bg-green-500 text-white' },
    red: { color: 'red', bgClass: 'bg-red-500', textClass: 'text-red-600', borderClass: 'border-red-300', activeClass: 'bg-red-500 text-white' },
    orange: { color: 'orange', bgClass: 'bg-orange-500', textClass: 'text-orange-600', borderClass: 'border-orange-300', activeClass: 'bg-orange-500 text-white' },
    purple: { color: 'purple', bgClass: 'bg-purple-500', textClass: 'text-purple-600', borderClass: 'border-purple-300', activeClass: 'bg-purple-500 text-white' },
    pink: { color: 'pink', bgClass: 'bg-pink-500', textClass: 'text-pink-600', borderClass: 'border-pink-300', activeClass: 'bg-pink-500 text-white' },
    indigo: { color: 'indigo', bgClass: 'bg-indigo-500', textClass: 'text-indigo-600', borderClass: 'border-indigo-300', activeClass: 'bg-indigo-500 text-white' },
    teal: { color: 'teal', bgClass: 'bg-teal-500', textClass: 'text-teal-600', borderClass: 'border-teal-300', activeClass: 'bg-teal-500 text-white' },
  }

  return colorConfigs[color] || colorConfigs.gray
}
