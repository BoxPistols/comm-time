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

// カンバンステータス（動的に管理されるため、string型を許容）
export type KanbanStatus = string;

// カンバンステータスの型定義（DBから取得）
export type KanbanStatusColumn = {
  id: string;
  user_id: string;
  name: string;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  activeClass: string;
  sortOrder: number;
  isDefault: boolean;
  created_at?: string;
  updated_at?: string;
};

// カンバンカラム定義（デフォルト値 - DBから取得できない場合のフォールバック）
export const DEFAULT_KANBAN_COLUMNS: KanbanStatusColumn[] = [
  { id: "backlog", user_id: "", name: "backlog", label: "Backlog", color: "gray", bgClass: "bg-gray-500", textClass: "text-gray-600", borderClass: "border-gray-300", activeClass: "bg-gray-500 text-white", sortOrder: 0, isDefault: true },
  { id: "todo", user_id: "", name: "todo", label: "Todo", color: "blue", bgClass: "bg-blue-500", textClass: "text-blue-600", borderClass: "border-blue-300", activeClass: "bg-blue-500 text-white", sortOrder: 1, isDefault: false },
  { id: "doing", user_id: "", name: "doing", label: "Doing", color: "yellow", bgClass: "bg-yellow-500", textClass: "text-yellow-600", borderClass: "border-yellow-300", activeClass: "bg-yellow-500 text-black", sortOrder: 2, isDefault: false },
  { id: "done", user_id: "", name: "done", label: "Done", color: "green", bgClass: "bg-green-500", textClass: "text-green-600", borderClass: "border-green-300", activeClass: "bg-green-500 text-white", sortOrder: 3, isDefault: false },
];

// 後方互換性のためのエイリアス
export const KANBAN_COLUMNS = DEFAULT_KANBAN_COLUMNS;

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

// カンバンステータス用のカラー選択肢
export const KANBAN_STATUS_COLORS = [
  { name: "グレー", color: "gray", bgClass: "bg-gray-500", textClass: "text-gray-600", borderClass: "border-gray-300", activeClass: "bg-gray-500 text-white" },
  { name: "ブルー", color: "blue", bgClass: "bg-blue-500", textClass: "text-blue-600", borderClass: "border-blue-300", activeClass: "bg-blue-500 text-white" },
  { name: "イエロー", color: "yellow", bgClass: "bg-yellow-500", textClass: "text-yellow-600", borderClass: "border-yellow-300", activeClass: "bg-yellow-500 text-black" },
  { name: "グリーン", color: "green", bgClass: "bg-green-500", textClass: "text-green-600", borderClass: "border-green-300", activeClass: "bg-green-500 text-white" },
  { name: "レッド", color: "red", bgClass: "bg-red-500", textClass: "text-red-600", borderClass: "border-red-300", activeClass: "bg-red-500 text-white" },
  { name: "オレンジ", color: "orange", bgClass: "bg-orange-500", textClass: "text-orange-600", borderClass: "border-orange-300", activeClass: "bg-orange-500 text-white" },
  { name: "パープル", color: "purple", bgClass: "bg-purple-500", textClass: "text-purple-600", borderClass: "border-purple-300", activeClass: "bg-purple-500 text-white" },
  { name: "ピンク", color: "pink", bgClass: "bg-pink-500", textClass: "text-pink-600", borderClass: "border-pink-300", activeClass: "bg-pink-500 text-white" },
  { name: "インディゴ", color: "indigo", bgClass: "bg-indigo-500", textClass: "text-indigo-600", borderClass: "border-indigo-300", activeClass: "bg-indigo-500 text-white" },
  { name: "ティール", color: "teal", bgClass: "bg-teal-500", textClass: "text-teal-600", borderClass: "border-teal-300", activeClass: "bg-teal-500 text-white" },
];

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
