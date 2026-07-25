/**
 * @jest-environment jsdom
 */
// useTodoManager characterization tests (ST3-1)
// 実装コードは変更しない。現行挙動を固定する安全ネット。
// ミューテーション実効性確認済み(各 revert 後 git diff clean):
//   M1: `!todo.isCompleted` → `todo.isCompleted` → toggle テスト FAIL
//   M2: `{ ...todo, text: newText.trim() }` → `{ ...todo }` → update テスト FAIL
//   M3: `sharedSupabaseTodos.toggleTodo(id)` 削除 → DB toggle テスト FAIL
import { renderHook, act } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import type { TrashedTodoItem } from "@/types";
import { useTodoManager } from "@/hooks/useTodoManager";

// ---------- supabase モック ----------
jest.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// ---------- useSupabaseTodos モック ----------
const mockToggleTodo = jest.fn();
const mockUpdateTodo = jest.fn();
const mockAddTodo = jest.fn().mockResolvedValue("new-supabase-id");
const mockRemoveTodo = jest.fn();

// ミュータブルにして todos を beforeEach で切り替える
const mockSupabaseTodos = {
  todos: [] as Array<{ id: string; text: string; isCompleted: boolean }>,
  loading: false,
  error: null,
  addTodo: mockAddTodo,
  removeTodo: mockRemoveTodo,
  toggleTodo: mockToggleTodo,
  updateTodo: mockUpdateTodo,
  reorderTodos: jest.fn(),
  refreshTodos: jest.fn(),
};

jest.mock("@/hooks/useSupabaseTodos", () => ({
  useSupabaseTodos: () => mockSupabaseTodos,
}));

// ---------- storage モック ----------
jest.mock("@/lib/storage", () => ({
  getStorageValue: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
  setStorageValue: jest.fn(),
}));

// ---------- localStorage モック ----------
const lsMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: lsMock, writable: true });

const USER = { id: "user-1" } as User;
const setAlarmPoints = jest.fn();
const localOpts = { useDatabase: false, user: null as User | null, setAlarmPoints };
const dbOpts = { useDatabase: true, user: USER, setAlarmPoints };

beforeEach(() => {
  jest.clearAllMocks();
  lsMock.clear();
  mockSupabaseTodos.todos = [];
});

// ==========================================================================
// Facade shape
// ==========================================================================
describe("facade shape", () => {
  it("returns exactly the expected keys", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    const actual = Object.keys(result.current).sort();
    const expected = [
      "addTodo", "alertedTodoIdsRef", "cancelEditingTodo",
      "clearAllTodos", "clearCompletedTodos", "deadlineAlertEnabled",
      "deadlineAlertMinutes", "editDialogTodo", "editDialogTodoId",
      "editingTodoId", "emptyTrash", "expandedDeadlineTodoId",
      "expandedTodoContentId", "extendDeadline", "filterState",
      "filteredTodos", "getDeadlineStatus", "handleSaveTodoDetails",
      "hasActiveFilters", "linkTodoToAlarmPoint", "onDragEnd",
      "permanentlyDeleteTodo", "removeTodo", "restoreTodo",
      "setDeadlineAlertEnabled", "setDeadlineAlertMinutes",
      "setEditDialogTodoId", "setEditingTodoId",
      "setExpandedDeadlineTodoId", "setExpandedTodoContentId",
      "setFilterState", "setSharedMemo", "setSharedTodos",
      "setShowTrash", "setSortByDeadline", "setTrashedMemos",
      "sharedMemo", "sharedSupabaseTodos", "sharedTodos",
      "showTrash", "sortByDeadline", "sortTodosByDeadline",
      "startEditingTodo", "todoVersions", "toggleTodo",
      "trashedMemos", "trashedTodos", "updateTodo",
      "updateTodoDeadline", "updateTodoKanbanStatus", "viewMode",
    ].sort();
    expect(actual).toEqual(expected);
  });
});

// ==========================================================================
// toggleTodo
// ==========================================================================
describe("toggleTodo", () => {
  it("local: flips isCompleted from false to true", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([{ id: "t1", text: "todo", isCompleted: false }]);
    });
    act(() => { result.current.toggleTodo("t1"); });
    expect(result.current.sharedTodos[0].isCompleted).toBe(true);
  });

  it("local: flips isCompleted from true to false", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([{ id: "t1", text: "todo", isCompleted: true }]);
    });
    act(() => { result.current.toggleTodo("t1"); });
    expect(result.current.sharedTodos[0].isCompleted).toBe(false);
  });

  it("DB: delegates to sharedSupabaseTodos.toggleTodo", () => {
    const { result } = renderHook(() => useTodoManager(dbOpts));
    act(() => { result.current.toggleTodo("t1"); });
    expect(mockToggleTodo).toHaveBeenCalledWith("t1");
  });
});

// ==========================================================================
// updateTodo
// ==========================================================================
describe("updateTodo", () => {
  it("local: updates text in place", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([{ id: "t1", text: "old", isCompleted: false }]);
    });
    act(() => { result.current.updateTodo("t1", "new text"); });
    expect(result.current.sharedTodos[0].text).toBe("new text");
  });

  it("local: whitespace-only string is ignored", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([{ id: "t1", text: "keep me", isCompleted: false }]);
    });
    act(() => { result.current.updateTodo("t1", "   "); });
    expect(result.current.sharedTodos[0].text).toBe("keep me");
  });

  it("DB: delegates to sharedSupabaseTodos.updateTodo with trimmed text", () => {
    const { result } = renderHook(() => useTodoManager(dbOpts));
    act(() => { result.current.updateTodo("t1", "  trimmed  "); });
    expect(mockUpdateTodo).toHaveBeenCalledWith("t1", { text: "trimmed" });
  });
});

// ==========================================================================
// updateTodoKanbanStatus
// ==========================================================================
describe("updateTodoKanbanStatus", () => {
  it("local: updates kanbanStatus", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([
        { id: "t1", text: "t", isCompleted: false, kanbanStatus: "backlog" },
      ]);
    });
    act(() => { result.current.updateTodoKanbanStatus("t1", "done"); });
    expect(result.current.sharedTodos[0].kanbanStatus).toBe("done");
  });

  it("DB: delegates to sharedSupabaseTodos.updateTodo with kanbanStatus", () => {
    const { result } = renderHook(() => useTodoManager(dbOpts));
    act(() => { result.current.updateTodoKanbanStatus("t1", "doing"); });
    expect(mockUpdateTodo).toHaveBeenCalledWith("t1", { kanbanStatus: "doing" });
  });
});

// ==========================================================================
// handleSaveTodoDetails
// ==========================================================================
describe("handleSaveTodoDetails", () => {
  it("local: merges detail updates into the todo", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([
        { id: "t1", text: "t", isCompleted: false, priority: "none" },
      ]);
    });
    act(() => {
      result.current.handleSaveTodoDetails("t1", {
        priority: "high",
        tagIds: ["tag-a"],
      });
    });
    expect(result.current.sharedTodos[0].priority).toBe("high");
    expect(result.current.sharedTodos[0].tagIds).toEqual(["tag-a"]);
  });

  it("DB: delegates to sharedSupabaseTodos.updateTodo with the updates object", () => {
    const { result } = renderHook(() => useTodoManager(dbOpts));
    act(() => {
      result.current.handleSaveTodoDetails("t1", {
        priority: "medium",
        importance: "high",
      });
    });
    expect(mockUpdateTodo).toHaveBeenCalledWith("t1", {
      priority: "medium",
      importance: "high",
    });
  });
});

// ==========================================================================
// updateTodoDeadline
// ==========================================================================
describe("updateTodoDeadline", () => {
  it("local: sets dueDate and dueTime", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([{ id: "t1", text: "t", isCompleted: false }]);
    });
    act(() => { result.current.updateTodoDeadline("t1", "2026-08-01", "14:00"); });
    expect(result.current.sharedTodos[0].dueDate).toBe("2026-08-01");
    expect(result.current.sharedTodos[0].dueTime).toBe("14:00");
  });

  it("DB: delegates to sharedSupabaseTodos.updateTodo with dueDate and dueTime", () => {
    const { result } = renderHook(() => useTodoManager(dbOpts));
    act(() => { result.current.updateTodoDeadline("t1", "2026-08-01", undefined); });
    expect(mockUpdateTodo).toHaveBeenCalledWith("t1", {
      dueDate: "2026-08-01",
      dueTime: undefined,
    });
  });
});

// ==========================================================================
// extendDeadline
// ==========================================================================
describe("extendDeadline", () => {
  it("local: dueDate advances (changes from original)", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([
        { id: "t1", text: "t", isCompleted: false, dueDate: "2026-08-15" },
      ]);
    });
    act(() => { result.current.extendDeadline("t1", 7); });
    const newDate = result.current.sharedTodos[0].dueDate;
    expect(newDate).toBeDefined();
    expect(newDate).not.toBe("2026-08-15");
  });

  it("local: unknown id is a no-op", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([
        { id: "t1", text: "t", isCompleted: false, dueDate: "2026-08-15" },
      ]);
    });
    act(() => { result.current.extendDeadline("unknown", 7); });
    expect(result.current.sharedTodos[0].dueDate).toBe("2026-08-15");
  });

  it("DB: delegates to sharedSupabaseTodos.updateTodo with updated dueDate", () => {
    mockSupabaseTodos.todos = [
      { id: "t1", text: "t", isCompleted: false } as never,
    ];
    const { result } = renderHook(() => useTodoManager(dbOpts));
    act(() => { result.current.extendDeadline("t1", 3); });
    expect(mockUpdateTodo).toHaveBeenCalledWith("t1", expect.objectContaining({
      dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
  });
});

// ==========================================================================
// clearAllTodos
// ==========================================================================
describe("clearAllTodos", () => {
  it("local: empties sharedTodos", async () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([
        { id: "t1", text: "a", isCompleted: false },
        { id: "t2", text: "b", isCompleted: true },
      ]);
    });
    await act(async () => { await result.current.clearAllTodos(); });
    expect(result.current.sharedTodos).toHaveLength(0);
  });

  it("DB: calls removeTodo for every supabase todo", async () => {
    mockSupabaseTodos.todos = [
      { id: "t1", text: "a", isCompleted: false },
      { id: "t2", text: "b", isCompleted: true },
    ];
    const { result } = renderHook(() => useTodoManager(dbOpts));
    await act(async () => { await result.current.clearAllTodos(); });
    expect(mockRemoveTodo).toHaveBeenCalledWith("t1");
    expect(mockRemoveTodo).toHaveBeenCalledWith("t2");
    expect(mockRemoveTodo).toHaveBeenCalledTimes(2);
  });
});

// ==========================================================================
// clearCompletedTodos
// ==========================================================================
describe("clearCompletedTodos", () => {
  it("local: removes only completed todos", async () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([
        { id: "t1", text: "a", isCompleted: false },
        { id: "t2", text: "b", isCompleted: true },
      ]);
    });
    await act(async () => { await result.current.clearCompletedTodos(); });
    expect(result.current.sharedTodos).toHaveLength(1);
    expect(result.current.sharedTodos[0].id).toBe("t1");
  });

  it("DB: calls removeTodo only for completed supabase todos", async () => {
    mockSupabaseTodos.todos = [
      { id: "t1", text: "a", isCompleted: false },
      { id: "t2", text: "b", isCompleted: true },
    ];
    const { result } = renderHook(() => useTodoManager(dbOpts));
    await act(async () => { await result.current.clearCompletedTodos(); });
    expect(mockRemoveTodo).not.toHaveBeenCalledWith("t1");
    expect(mockRemoveTodo).toHaveBeenCalledWith("t2");
    expect(mockRemoveTodo).toHaveBeenCalledTimes(1);
  });
});

// ==========================================================================
// restoreTodo — intentional asymmetry between local and DB mode
// ==========================================================================
describe("restoreTodo", () => {
  const TRASHED: TrashedTodoItem = {
    id: "t-trash",
    text: "restored text",
    isCompleted: true,
    priority: "high",
    tagIds: ["tag-1"],
    deletedAt: new Date().toISOString(),
  };

  it("local: restores all fields and prepends to sharedTodos", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => { result.current.restoreTodo(TRASHED); });
    expect(result.current.sharedTodos[0]).toMatchObject({
      id: "t-trash",
      text: "restored text",
      isCompleted: true,
      priority: "high",
    });
  });

  it("DB: only calls addTodo(text) — other fields are NOT preserved (intentional asymmetry)", () => {
    const { result } = renderHook(() => useTodoManager(dbOpts));
    act(() => { result.current.restoreTodo(TRASHED); });
    expect(mockAddTodo).toHaveBeenCalledWith("restored text");
    expect(mockAddTodo).toHaveBeenCalledTimes(1);
  });

  it("removes the todo from trashedTodos in local mode", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    // seed trash via removeTodo
    act(() => {
      result.current.setSharedTodos([{ id: "t-trash", text: "restored text", isCompleted: true }]);
    });
    act(() => { result.current.removeTodo("t-trash"); });
    expect(result.current.trashedTodos).toHaveLength(1);
    act(() => { result.current.restoreTodo(result.current.trashedTodos[0]); });
    expect(result.current.trashedTodos).toHaveLength(0);
  });
});

// ==========================================================================
// Trash management
// ==========================================================================
describe("permanentlyDeleteTodo", () => {
  it("removes the item from trashedTodos", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([{ id: "t1", text: "bye", isCompleted: false }]);
    });
    act(() => { result.current.removeTodo("t1"); });
    expect(result.current.trashedTodos).toHaveLength(1);
    act(() => { result.current.permanentlyDeleteTodo("t1"); });
    expect(result.current.trashedTodos).toHaveLength(0);
  });
});

describe("emptyTrash", () => {
  it("clears all trashedTodos at once", () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([
        { id: "t1", text: "a", isCompleted: false },
        { id: "t2", text: "b", isCompleted: false },
      ]);
    });
    act(() => {
      result.current.removeTodo("t1");
      result.current.removeTodo("t2");
    });
    expect(result.current.trashedTodos).toHaveLength(2);
    act(() => { result.current.emptyTrash(); });
    expect(result.current.trashedTodos).toHaveLength(0);
  });
});

// ==========================================================================
// Prepend ordering (core contract — also covered in todo-order.test.tsx)
// ==========================================================================
describe("prepend ordering", () => {
  it("local: new todo appears before existing todos", async () => {
    const { result } = renderHook(() => useTodoManager(localOpts));
    act(() => {
      result.current.setSharedTodos([{ id: "old", text: "existing", isCompleted: false }]);
    });
    await act(async () => { await result.current.addTodo("newest"); });
    expect(result.current.sharedTodos[0].text).toBe("newest");
    expect(result.current.sharedTodos[1].id).toBe("old");
  });
});
