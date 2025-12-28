// タグの型定義
export type Tag = {
  id: string;
  name: string;
  color: string; // Tailwindのカラークラス or hex
};

// 優先度レベル
export type PriorityLevel = "high" | "medium" | "low" | "none";

// 重要度レベル
export type ImportanceLevel = "high" | "medium" | "low" | "none";

// カンバンステータス
export type KanbanStatus = "backlog" | "todo" | "doing" | "done";

// カンバンカラム定義（完全なTailwindクラス名を使用）
export const KANBAN_COLUMNS: {
  id: KanbanStatus;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  activeClass: string;
}[] = [
  { id: "backlog", label: "Backlog", color: "gray", bgClass: "bg-gray-500", textClass: "text-gray-600", borderClass: "border-gray-300", activeClass: "bg-gray-500 text-white" },
  { id: "todo", label: "Todo", color: "blue", bgClass: "bg-blue-500", textClass: "text-blue-600", borderClass: "border-blue-300", activeClass: "bg-blue-500 text-white" },
  { id: "doing", label: "Doing", color: "yellow", bgClass: "bg-yellow-500", textClass: "text-yellow-600", borderClass: "border-yellow-300", activeClass: "bg-yellow-500 text-black" },
  { id: "done", label: "Done", color: "green", bgClass: "bg-green-500", textClass: "text-green-600", borderClass: "border-green-300", activeClass: "bg-green-500 text-white" },
];

// 優先度設定の型
type PriorityConfig = {
  label: string;
  color: string;
  icon: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
  activeClass: string;
};

// 優先度の表示設定（完全なTailwindクラス名を使用）
export const PRIORITY_CONFIG: Record<PriorityLevel, PriorityConfig> = {
  high: { label: "高", color: "red", icon: "", bgClass: "bg-red-500", textClass: "text-red-600", badgeClass: "bg-red-100 text-red-700", activeClass: "bg-red-500 text-white" },
  medium: { label: "中", color: "yellow", icon: "", bgClass: "bg-yellow-500", textClass: "text-yellow-600", badgeClass: "bg-yellow-100 text-yellow-700", activeClass: "bg-yellow-500 text-black" },
  low: { label: "低", color: "blue", icon: "", bgClass: "bg-blue-500", textClass: "text-blue-600", badgeClass: "bg-blue-100 text-blue-700", activeClass: "bg-blue-500 text-white" },
  none: { label: "-", color: "gray", icon: "", bgClass: "bg-gray-500", textClass: "text-gray-600", badgeClass: "bg-gray-100 text-gray-700", activeClass: "bg-gray-500 text-white" },
};

// 重要度設定の型
type ImportanceConfig = {
  label: string;
  color: string;
  icon: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
  activeClass: string;
};

// 重要度の表示設定（完全なTailwindクラス名を使用）
export const IMPORTANCE_CONFIG: Record<ImportanceLevel, ImportanceConfig> = {
  high: { label: "高", color: "red", icon: "", bgClass: "bg-red-500", textClass: "text-red-600", badgeClass: "bg-red-100 text-red-700", activeClass: "bg-red-500 text-white" },
  medium: { label: "中", color: "yellow", icon: "", bgClass: "bg-yellow-500", textClass: "text-yellow-600", badgeClass: "bg-yellow-100 text-yellow-700", activeClass: "bg-yellow-500 text-black" },
  low: { label: "低", color: "blue", icon: "", bgClass: "bg-blue-500", textClass: "text-blue-600", badgeClass: "bg-blue-100 text-blue-700", activeClass: "bg-blue-500 text-white" },
  none: { label: "-", color: "gray", icon: "", bgClass: "bg-gray-500", textClass: "text-gray-600", badgeClass: "bg-gray-100 text-gray-700", activeClass: "bg-gray-500 text-white" },
};

// デフォルトのタグカラー
export const TAG_COLORS = [
  { name: "レッド", value: "bg-red-500", textColor: "text-white" },
  { name: "オレンジ", value: "bg-orange-500", textColor: "text-white" },
  { name: "イエロー", value: "bg-yellow-500", textColor: "text-black" },
  { name: "グリーン", value: "bg-green-500", textColor: "text-white" },
  { name: "ブルー", value: "bg-blue-500", textColor: "text-white" },
  { name: "パープル", value: "bg-purple-500", textColor: "text-white" },
  { name: "ピンク", value: "bg-pink-500", textColor: "text-white" },
  { name: "グレー", value: "bg-gray-500", textColor: "text-white" },
];

// フィルター状態の型
export type FilterState = {
  tags: string[]; // タグIDの配列
  priority: PriorityLevel | "all";
  importance: ImportanceLevel | "all";
  kanbanStatus: KanbanStatus | "all";
};

// 初期フィルター状態
export const initialFilterState: FilterState = {
  tags: [],
  priority: "all",
  importance: "all",
  kanbanStatus: "all",
};
