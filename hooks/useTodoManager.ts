"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type {
  TodoItem,
  TrashedTodoItem,
  TodoVersion,
  TrashedMemoItem,
  PriorityLevel,
  ImportanceLevel,
  KanbanStatus,
  FilterState,
} from "@/types";
import { initialFilterState } from "@/types";
import { useSupabaseTodos } from "@/hooks/useSupabaseTodos";
import type { DropResult } from "react-beautiful-dnd";

export type TodoManagerState = {
  // Core data
  sharedTodos: TodoItem[];
  setSharedTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;
  sharedMemo: string;
  setSharedMemo: (v: string) => void;
  filteredTodos: TodoItem[];
  // Editing
  editingTodoId: string | null;
  setEditingTodoId: (v: string | null) => void;
  editDialogTodoId: string | null;
  setEditDialogTodoId: (v: string | null) => void;
  editDialogTodo: TodoItem | null;
  expandedDeadlineTodoId: string | null;
  setExpandedDeadlineTodoId: (v: string | null) => void;
  expandedTodoContentId: string | null;
  setExpandedTodoContentId: (v: string | null) => void;
  // Filter & sort
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  hasActiveFilters: boolean;
  sortByDeadline: boolean;
  setSortByDeadline: (v: boolean) => void;
  viewMode: "list" | "kanban";
  // Trash
  trashedTodos: TrashedTodoItem[];
  trashedMemos: TrashedMemoItem[];
  setTrashedMemos: React.Dispatch<React.SetStateAction<TrashedMemoItem[]>>;
  todoVersions: TodoVersion[];
  showTrash: boolean;
  setShowTrash: (v: boolean) => void;
  // Deadline alerts
  deadlineAlertEnabled: boolean;
  setDeadlineAlertEnabled: (v: boolean) => void;
  deadlineAlertMinutes: number;
  setDeadlineAlertMinutes: (v: number) => void;
  alertedTodoIdsRef: React.MutableRefObject<Set<string>>;
  // CRUD
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  updateTodo: (id: string, newText: string) => void;
  startEditingTodo: (id: string) => void;
  cancelEditingTodo: () => void;
  clearAllTodos: () => Promise<void>;
  clearCompletedTodos: () => Promise<void>;
  restoreTodo: (trashedTodo: TrashedTodoItem) => void;
  permanentlyDeleteTodo: (id: string) => void;
  emptyTrash: () => void;
  // Kanban & details
  updateTodoKanbanStatus: (todoId: string, kanbanStatus: KanbanStatus) => void;
  handleSaveTodoDetails: (todoId: string, updates: {
    tagIds?: string[];
    priority?: PriorityLevel;
    importance?: ImportanceLevel;
    kanbanStatus?: KanbanStatus;
  }) => void;
  // Deadline
  updateTodoDeadline: (id: string, dueDate: string | undefined, dueTime: string | undefined) => void;
  extendDeadline: (id: string, days: number) => void;
  getDeadlineStatus: (todo: TodoItem) => {
    isOverdue: boolean;
    isSoon: boolean;
    diffDays: number;
    diffHours: number;
    diffMs: number;
  } | null;
  // Sort & DnD
  sortTodosByDeadline: (todos: TodoItem[]) => TodoItem[];
  onDragEnd: (result: DropResult) => void;
  linkTodoToAlarmPoint: (todoId: string, alarmPointId: string) => void;
  // Supabase hook (for sync in parent)
  sharedSupabaseTodos: ReturnType<typeof useSupabaseTodos>;
};

type TodoManagerOptions = {
  useDatabase: boolean;
  user: User | null;
  setAlarmPoints: React.Dispatch<React.SetStateAction<import("@/types").AlarmPoint[]>>;
};

export function useTodoManager(options: TodoManagerOptions): TodoManagerState {
  const { useDatabase, user, setAlarmPoints } = options;

  // Supabase hook
  const sharedSupabaseTodos = useSupabaseTodos(useDatabase ? user : null);

  // Core state
  const [sharedMemo, setSharedMemo] = useState("");
  const [sharedTodos, setSharedTodos] = useState<TodoItem[]>([]);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editDialogTodoId, setEditDialogTodoId] = useState<string | null>(null);
  const [expandedDeadlineTodoId, setExpandedDeadlineTodoId] = useState<string | null>(null);
  const [expandedTodoContentId, setExpandedTodoContentId] = useState<string | null>(null);
  const [sortByDeadline, setSortByDeadline] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  // Filter
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
  const hasActiveFilters = useMemo(() => {
    return filterState.tags.length > 0 ||
      filterState.priority !== "all" ||
      filterState.importance !== "all" ||
      filterState.kanbanStatus !== "all";
  }, [filterState]);

  const [viewMode] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("todoViewMode");
      if (saved === "kanban" || saved === "list") return saved;
    }
    return "list";
  });

  // Trash & versions
  const [trashedTodos, setTrashedTodos] = useState<TrashedTodoItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trashedTodos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return parsed.filter(
            (item: TrashedTodoItem) => new Date(item.deletedAt) > thirtyDaysAgo
          );
        } catch { return []; }
      }
    }
    return [];
  });

  const [trashedMemos, setTrashedMemos] = useState<TrashedMemoItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trashedMemos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return parsed.filter(
            (item: TrashedMemoItem) => new Date(item.deletedAt) > thirtyDaysAgo
          );
        } catch { return []; }
      }
    }
    return [];
  });

  const [todoVersions, setTodoVersions] = useState<TodoVersion[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("todoVersions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return parsed.filter(
            (item: TodoVersion) => new Date(item.timestamp) > thirtyDaysAgo
          );
        } catch { return []; }
      }
    }
    return [];
  });

  // Deadline alerts
  const [deadlineAlertEnabled, setDeadlineAlertEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("deadlineAlertEnabled") === "true";
    }
    return false;
  });
  const [deadlineAlertMinutes, setDeadlineAlertMinutes] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deadlineAlertMinutes");
      return saved ? parseInt(saved, 10) : 60;
    }
    return 60;
  });
  const alertedTodoIdsRef = useRef<Set<string>>(new Set());

  // Computed
  const editDialogTodo = useMemo(() =>
    editDialogTodoId ? sharedTodos.find((t) => t.id === editDialogTodoId) || null : null,
    [editDialogTodoId, sharedTodos]
  );

  const filteredTodos = useMemo(() => {
    return sharedTodos.filter((todo) => {
      if (filterState.tags.length > 0) {
        const todoTags = todo.tagIds || [];
        if (!filterState.tags.some((tagId) => todoTags.includes(tagId))) return false;
      }
      if (filterState.priority !== "all" && (todo.priority || "none") !== filterState.priority) return false;
      if (filterState.importance !== "all" && (todo.importance || "none") !== filterState.importance) return false;
      if (filterState.kanbanStatus !== "all" && (todo.kanbanStatus || "backlog") !== filterState.kanbanStatus) return false;
      return true;
    });
  }, [sharedTodos, filterState]);

  // localStorage保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sharedMemo", sharedMemo);
    localStorage.setItem("sharedTodos", JSON.stringify(sharedTodos));
    localStorage.setItem("trashedTodos", JSON.stringify(trashedTodos));
    localStorage.setItem("todoVersions", JSON.stringify(todoVersions));
    localStorage.setItem("trashedMemos", JSON.stringify(trashedMemos));
    localStorage.setItem("todoViewMode", viewMode);
  }, [sharedMemo, sharedTodos, trashedTodos, todoVersions, trashedMemos, viewMode]);

  // Supabase sync
  useEffect(() => {
    if (useDatabase && user) {
      if (sharedSupabaseTodos.todos.length > 0 || !sharedSupabaseTodos.loading) {
        setSharedTodos(sharedSupabaseTodos.todos);
      }
    }
  }, [useDatabase, user, sharedSupabaseTodos.todos, sharedSupabaseTodos.loading]);

  // --- CRUD ---

  const addTodoVersion = useCallback(
    (todoId: string, text: string, changeType: "create" | "update" | "delete") => {
      const newVersion: TodoVersion = {
        id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        todoId, text,
        timestamp: new Date().toISOString(),
        changeType,
      };
      setTodoVersions((prev) => [...prev, newVersion]);
    }, []
  );

  const addTodo = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (useDatabase && user) {
        sharedSupabaseTodos.addTodo(text.trim());
      } else {
        const newTodo = { id: Date.now().toString(), text: text.trim(), isCompleted: false };
        setSharedTodos((prev) => [...prev, newTodo]);
      }
    },
    [useDatabase, user, sharedSupabaseTodos]
  );

  const toggleTodo = useCallback(
    (id: string) => {
      if (useDatabase && user) {
        sharedSupabaseTodos.toggleTodo(id);
      } else {
        setSharedTodos((prev) =>
          prev.map((todo) => todo.id === id ? { ...todo, isCompleted: !todo.isCompleted } : todo)
        );
      }
    },
    [useDatabase, user, sharedSupabaseTodos]
  );

  const removeTodo = useCallback(
    (id: string) => {
      const todoToRemove = sharedTodos.find((todo) => todo.id === id);
      if (todoToRemove) {
        setTrashedTodos((prev) => [...prev, { ...todoToRemove, deletedAt: new Date().toISOString() }]);
        addTodoVersion(id, todoToRemove.text, "delete");
      }
      if (useDatabase && user) {
        sharedSupabaseTodos.removeTodo(id);
      } else {
        setSharedTodos((prev) => prev.filter((todo) => todo.id !== id));
      }
    },
    [useDatabase, user, sharedSupabaseTodos, sharedTodos, addTodoVersion]
  );

  const updateTodo = useCallback(
    (id: string, newText: string) => {
      if (!newText.trim()) return;
      const currentTodo = sharedTodos.find((todo) => todo.id === id);
      if (currentTodo) {
        const oldText = currentTodo.text;
        const trimmed = newText.trim();
        if (Math.abs(oldText.length - trimmed.length) >= 10 ||
            (oldText !== trimmed && trimmed.length >= 10)) {
          addTodoVersion(id, oldText, "update");
        }
      }
      if (useDatabase && user) {
        sharedSupabaseTodos.updateTodo(id, { text: newText.trim() });
      } else {
        setSharedTodos((prev) =>
          prev.map((todo) => todo.id === id ? { ...todo, text: newText.trim() } : todo)
        );
      }
      setEditingTodoId(null);
    },
    [useDatabase, user, sharedSupabaseTodos, sharedTodos, addTodoVersion]
  );

  const startEditingTodo = useCallback((id: string) => setEditingTodoId(id), []);
  const cancelEditingTodo = useCallback(() => setEditingTodoId(null), []);

  const clearAllTodos = useCallback(async () => {
    if (useDatabase && user) {
      await Promise.all(sharedSupabaseTodos.todos.map((t) => sharedSupabaseTodos.removeTodo(t.id)));
    } else {
      setSharedTodos([]);
    }
  }, [useDatabase, user, sharedSupabaseTodos]);

  const clearCompletedTodos = useCallback(async () => {
    if (useDatabase && user) {
      const completed = sharedSupabaseTodos.todos.filter((t) => t.isCompleted);
      await Promise.all(completed.map((t) => sharedSupabaseTodos.removeTodo(t.id)));
    } else {
      setSharedTodos((prev) => prev.filter((todo) => !todo.isCompleted));
    }
  }, [useDatabase, user, sharedSupabaseTodos]);

  const restoreTodo = useCallback(
    (trashedTodo: TrashedTodoItem) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { deletedAt, ...todoItem } = trashedTodo;
      if (useDatabase && user) {
        sharedSupabaseTodos.addTodo(todoItem.text);
      } else {
        setSharedTodos((prev) => [...prev, todoItem]);
      }
      setTrashedTodos((prev) => prev.filter((t) => t.id !== trashedTodo.id));
    },
    [useDatabase, user, sharedSupabaseTodos]
  );

  const permanentlyDeleteTodo = useCallback((id: string) => {
    setTrashedTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const emptyTrash = useCallback(() => setTrashedTodos([]), []);

  // --- Kanban & Details ---

  const updateTodoKanbanStatus = useCallback(
    (todoId: string, kanbanStatus: KanbanStatus) => {
      if (useDatabase && user) {
        sharedSupabaseTodos.updateTodo(todoId, { kanbanStatus });
      } else {
        setSharedTodos((prev) =>
          prev.map((todo) => todo.id === todoId ? { ...todo, kanbanStatus } : todo)
        );
      }
    },
    [useDatabase, user, sharedSupabaseTodos]
  );

  const handleSaveTodoDetails = useCallback(
    (todoId: string, updates: {
      tagIds?: string[];
      priority?: PriorityLevel;
      importance?: ImportanceLevel;
      kanbanStatus?: KanbanStatus;
    }) => {
      if (useDatabase && user) {
        sharedSupabaseTodos.updateTodo(todoId, updates);
      } else {
        setSharedTodos((prev) =>
          prev.map((todo) => todo.id === todoId ? { ...todo, ...updates } : todo)
        );
      }
    },
    [useDatabase, user, sharedSupabaseTodos]
  );

  // --- Deadline ---

  const updateTodoDeadline = useCallback(
    (id: string, dueDate: string | undefined, dueTime: string | undefined) => {
      if (useDatabase && user) {
        sharedSupabaseTodos.updateTodo(id, { dueDate, dueTime });
      } else {
        setSharedTodos((prev) =>
          prev.map((todo) => todo.id === id ? { ...todo, dueDate, dueTime } : todo)
        );
      }
    },
    [useDatabase, user, sharedSupabaseTodos]
  );

  const extendDeadline = useCallback(
    (id: string, days: number) => {
      const todo = sharedTodos.find((t) => t.id === id);
      if (!todo) return;
      const currentDate = todo.dueDate ? new Date(todo.dueDate) : new Date();
      currentDate.setDate(currentDate.getDate() + days);
      const newDueDate = currentDate.toISOString().split("T")[0];
      if (useDatabase && user) {
        sharedSupabaseTodos.updateTodo(id, { dueDate: newDueDate, dueTime: todo.dueTime });
      } else {
        setSharedTodos((prev) =>
          prev.map((t) => t.id === id ? { ...t, dueDate: newDueDate } : t)
        );
      }
    },
    [useDatabase, user, sharedSupabaseTodos, sharedTodos]
  );

  const getDeadlineStatus = useCallback((todo: TodoItem) => {
    if (!todo.dueDate) return null;
    const now = new Date();
    const deadline = new Date(todo.dueDate);
    if (todo.dueTime) {
      const [hours, minutes] = todo.dueTime.split(":").map(Number);
      deadline.setHours(hours, minutes, 0, 0);
    } else {
      deadline.setHours(23, 59, 59, 999);
    }
    const diffMs = deadline.getTime() - now.getTime();
    return {
      isOverdue: diffMs < 0,
      isSoon: diffMs > 0 && Math.ceil(diffMs / (1000 * 60 * 60)) <= 24,
      diffDays: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
      diffHours: Math.ceil(diffMs / (1000 * 60 * 60)),
      diffMs,
    };
  }, []);

  // --- Sort & DnD ---

  const sortTodosByDeadline = useCallback((todos: TodoItem[]) => {
    return [...todos].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      if (a.dueTime) { const [h, m] = a.dueTime.split(":").map(Number); dateA.setHours(h, m); }
      if (b.dueTime) { const [h, m] = b.dueTime.split(":").map(Number); dateB.setHours(h, m); }
      return dateA.getTime() - dateB.getTime();
    });
  }, []);

  const linkTodoToAlarmPoint = useCallback(
    (todoId: string, alarmPointId: string) => {
      setAlarmPoints((prev) =>
        prev.map((point) => point.id === alarmPointId ? { ...point, linkedTodo: todoId } : point)
      );
    },
    [setAlarmPoints]
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const sourceId = result.source.droppableId;
      const destId = result.destination.droppableId;
      if (sourceId === destId) {
        const reorderedItems = Array.from(sharedTodos);
        const [removed] = reorderedItems.splice(result.source.index, 1);
        reorderedItems.splice(result.destination.index, 0, removed);
        setSharedTodos(reorderedItems);
        if (useDatabase && user) {
          sharedSupabaseTodos.reorderTodos(reorderedItems);
        }
      } else if (destId.startsWith("alarmPoint")) {
        const todoId = result.draggableId;
        const alarmPointId = destId.split("-")[1];
        linkTodoToAlarmPoint(todoId, alarmPointId);
      }
    },
    [sharedTodos, linkTodoToAlarmPoint, useDatabase, user, sharedSupabaseTodos]
  );

  return {
    sharedTodos, setSharedTodos,
    sharedMemo, setSharedMemo,
    filteredTodos,
    editingTodoId, setEditingTodoId,
    editDialogTodoId, setEditDialogTodoId,
    editDialogTodo,
    expandedDeadlineTodoId, setExpandedDeadlineTodoId,
    expandedTodoContentId, setExpandedTodoContentId,
    filterState, setFilterState,
    hasActiveFilters,
    sortByDeadline, setSortByDeadline,
    viewMode,
    trashedTodos, trashedMemos, setTrashedMemos,
    todoVersions,
    showTrash, setShowTrash,
    deadlineAlertEnabled, setDeadlineAlertEnabled,
    deadlineAlertMinutes, setDeadlineAlertMinutes,
    alertedTodoIdsRef,
    addTodo, toggleTodo, removeTodo, updateTodo,
    startEditingTodo, cancelEditingTodo,
    clearAllTodos, clearCompletedTodos,
    restoreTodo, permanentlyDeleteTodo, emptyTrash,
    updateTodoKanbanStatus, handleSaveTodoDetails,
    updateTodoDeadline, extendDeadline, getDeadlineStatus,
    sortTodosByDeadline, onDragEnd, linkTodoToAlarmPoint,
    sharedSupabaseTodos,
  };
}
