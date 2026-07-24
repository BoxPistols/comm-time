/**
 * localStorageから安全に値を取得するヘルパー関数
 */
export function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return saved as unknown as T;
      }
    }
  }
  return defaultValue;
}
