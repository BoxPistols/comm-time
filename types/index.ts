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

// カンバンカラム定義
export const KANBAN_COLUMNS: { id: KanbanStatus; label: string; color: string }[] = [
  { id: "backlog", label: "Backlog", color: "gray" },
  { id: "todo", label: "Todo", color: "blue" },
  { id: "doing", label: "Doing", color: "yellow" },
  { id: "done", label: "Done", color: "green" },
];

// 優先度の表示設定
export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; color: string; icon: string }> = {
  high: { label: "高", color: "red", icon: "🔴" },
  medium: { label: "中", color: "yellow", icon: "🟡" },
  low: { label: "低", color: "blue", icon: "🔵" },
  none: { label: "-", color: "gray", icon: "" },
};

// 重要度の表示設定
export const IMPORTANCE_CONFIG: Record<ImportanceLevel, { label: string; color: string; icon: string }> = {
  high: { label: "高", color: "red", icon: "⭐" },
  medium: { label: "中", color: "yellow", icon: "☆" },
  low: { label: "低", color: "blue", icon: "○" },
  none: { label: "-", color: "gray", icon: "" },
};

// デフォルトのタグカラー
export const TAG_COLORS = [
  { name: "レッド", value: "bg-red-500", textColor: "text-white" },
  { name: "オレンジ", value: "bg-orange-500", textColor: "text-white" },
  { name: "イエロー", value: "bg-yellow-500", textColor: "text-black" },
  { name: "グリーン", value: "bg-green-500", textColor: "text-white" },
  { name: "ブルー", value: "bg-blue-500", textColor: "text-white" },
  { name: "インディゴ", value: "bg-indigo-500", textColor: "text-white" },
  { name: "パープル", value: "bg-purple-500", textColor: "text-white" },
  { name: "ピンク", value: "bg-pink-500", textColor: "text-white" },
  { name: "グレー", value: "bg-gray-500", textColor: "text-white" },
  { name: "ティール", value: "bg-teal-500", textColor: "text-white" },
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
