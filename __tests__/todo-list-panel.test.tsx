/**
 * @jest-environment jsdom
 */
// ST3-2: TodoListPanel characterization tests — lock render behavior before ST5-4 split
import React, { createRef } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoListPanel } from "../components/todo-list/TodoListPanel";
import type { TodoListPanelProps } from "../components/todo-list/TodoListPanel";
import type { TodoItem, TrashedTodoItem, FilterState } from "../types";
import { initialFilterState } from "../lib/constants";

// Heavy deps that need jsdom-safe mocks
jest.mock("../components/strict-mode-droppable", () => ({
  StrictModeDroppable: ({
    children,
  }: {
    children: (provided: {
      innerRef: () => void;
      droppableProps: Record<string, unknown>;
      placeholder: null;
    }) => React.ReactNode;
  }) =>
    children({
      innerRef: () => {},
      droppableProps: {},
      placeholder: null,
    }),
}));

jest.mock("react-beautiful-dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Draggable: ({
    children,
  }: {
    children: (
      provided: {
        innerRef: () => void;
        draggableProps: Record<string, unknown>;
        dragHandleProps: Record<string, unknown>;
      },
      snapshot: { isDragging: boolean }
    ) => React.ReactNode;
  }) =>
    children(
      { innerRef: () => {}, draggableProps: {}, dragHandleProps: {} },
      { isDragging: false }
    ),
}));

jest.mock("../components/tag-manager", () => ({
  TagManager: () => <div data-testid="tag-manager" />,
}));

jest.mock("../components/filter-panel", () => ({
  FilterPanel: () => <div data-testid="filter-panel" />,
}));

jest.mock("../components/rich-text-with-links", () => ({
  RichTextWithLinks: ({ text }: { text: string }) => <span>{text}</span>,
}));

// Minimal props factory
function makeProps(overrides: Partial<TodoListPanelProps> = {}): TodoListPanelProps {
  const todoInputRef = createRef<HTMLInputElement>();
  const editingInputRef = createRef<HTMLInputElement>();
  const isComposingRef = { current: false };

  return {
    sharedTodos: [],
    filteredTodos: [],
    trashedTodos: [],
    tags: [],
    tagsMap: new Map(),
    kanbanStatuses: [],
    editingTodoId: null,
    startEditingTodo: jest.fn(),
    cancelEditingTodo: jest.fn(),
    expandedDeadlineTodoId: null,
    setExpandedDeadlineTodoId: jest.fn(),
    expandedTodoContentId: null,
    setExpandedTodoContentId: jest.fn(),
    highlightedTodoId: null,
    sortByDeadline: false,
    setSortByDeadline: jest.fn(),
    sortTodosByDeadline: (todos) => todos,
    addTag: jest.fn().mockResolvedValue({ id: "t1", name: "Tag", color: "#fff" }),
    updateTag: jest.fn(),
    deleteTag: jest.fn(),
    showTagManager: false,
    setShowTagManager: jest.fn(),
    filterState: initialFilterState as FilterState,
    setFilterState: jest.fn(),
    hasActiveFilters: false,
    showFilterPanel: false,
    setShowFilterPanel: jest.fn(),
    showTrash: false,
    setShowTrash: jest.fn(),
    restoreTodo: jest.fn(),
    permanentlyDeleteTodo: jest.fn(),
    emptyTrash: jest.fn(),
    addTodo: jest.fn(),
    toggleTodo: jest.fn(),
    removeTodo: jest.fn(),
    updateTodo: jest.fn(),
    clearAllTodos: jest.fn().mockResolvedValue(undefined),
    clearCompletedTodos: jest.fn().mockResolvedValue(undefined),
    updateTodoDeadline: jest.fn(),
    extendDeadline: jest.fn(),
    getDeadlineStatus: jest.fn().mockReturnValue(null),
    setEditDialogTodoId: jest.fn(),
    onDragEnd: jest.fn(),
    darkMode: false,
    activeTab: "meeting",
    setActiveTab: jest.fn(),
    isAuthenticated: false,
    isSupabaseConfigured: false,
    showKanbanModal: false,
    setShowKanbanModal: jest.fn(),
    startWithTodo: jest.fn(),
    updateTodoKanbanStatus: jest.fn(),
    handleSaveTodoDetails: jest.fn(),
    editingInputRef: editingInputRef as React.RefObject<HTMLInputElement>,
    todoInputRef: todoInputRef as React.RefObject<HTMLInputElement>,
    isComposingRef,
    ...overrides,
  };
}

const TODO_A: TodoItem = {
  id: "todo-a",
  text: "買い物に行く",
  isCompleted: false,
};

const TODO_B: TodoItem = {
  id: "todo-b",
  text: "レポートを提出する",
  isCompleted: true,
};

describe("TodoListPanel — characterization", () => {
  describe("static structure", () => {
    it("renders 'TODOリスト' heading", () => {
      render(<TodoListPanel {...makeProps()} />);
      expect(screen.getByText("TODOリスト")).toBeInTheDocument();
    });

    it("renders todo add input with placeholder", () => {
      render(<TodoListPanel {...makeProps()} />);
      expect(
        screen.getByPlaceholderText("新しいTODOを入力...")
      ).toBeInTheDocument();
    });

    it("renders toolbar action buttons", () => {
      render(<TodoListPanel {...makeProps()} />);
      expect(screen.getByTitle("期限順にソート")).toBeInTheDocument();
      expect(screen.getByTitle("完了済みを削除")).toBeInTheDocument();
      expect(screen.getByTitle("すべて削除")).toBeInTheDocument();
      expect(screen.getByTitle("タグ管理")).toBeInTheDocument();
      expect(screen.getByTitle("フィルター")).toBeInTheDocument();
      expect(screen.getByTitle("カンバン表示")).toBeInTheDocument();
    });
  });

  describe("todo list rendering", () => {
    it("renders each todo's text", () => {
      render(
        <TodoListPanel
          {...makeProps({ filteredTodos: [TODO_A, TODO_B] })}
        />
      );
      expect(screen.getByText("買い物に行く")).toBeInTheDocument();
      expect(screen.getByText("レポートを提出する")).toBeInTheDocument();
    });

    it("each todo row has a '完了/未完了' toggle button", () => {
      render(
        <TodoListPanel {...makeProps({ filteredTodos: [TODO_A] })} />
      );
      const todoLi = screen
        .getByText("買い物に行く")
        .closest("li") as HTMLElement;
      expect(
        within(todoLi).getByRole("button", { name: "完了/未完了" })
      ).toBeInTheDocument();
    });

    it("completed todo shows line-through style class", () => {
      render(
        <TodoListPanel {...makeProps({ filteredTodos: [TODO_B] })} />
      );
      const textEl = screen.getByText("レポートを提出する");
      expect(textEl.closest("[class*='line-through']")).toBeTruthy();
    });

    it("toggleTodo is called with todo id on toggle click", async () => {
      const toggleTodo = jest.fn();
      const user = userEvent.setup();
      render(
        <TodoListPanel
          {...makeProps({ filteredTodos: [TODO_A], toggleTodo })}
        />
      );
      const li = screen
        .getByText("買い物に行く")
        .closest("li") as HTMLElement;
      await user.click(within(li).getByRole("button", { name: "完了/未完了" }));
      expect(toggleTodo).toHaveBeenCalledWith("todo-a");
    });
  });

  describe("trash view", () => {
    const TRASHED: TrashedTodoItem = {
      id: "t1",
      text: "古いタスク",
      isCompleted: false,
      deletedAt: new Date().toISOString(),
    };

    it("shows 'ゴミ箱は空です' when trash is open and empty", () => {
      render(<TodoListPanel {...makeProps({ showTrash: true })} />);
      expect(screen.getByText("ゴミ箱は空です")).toBeInTheDocument();
    });

    it("shows trashed todo text when trash is open", () => {
      render(
        <TodoListPanel
          {...makeProps({ showTrash: true, trashedTodos: [TRASHED] })}
        />
      );
      expect(screen.getByText("古いタスク")).toBeInTheDocument();
    });

    it("does not show trash section when showTrash is false", () => {
      render(<TodoListPanel {...makeProps({ showTrash: false })} />);
      expect(screen.queryByText("ゴミ箱は空です")).not.toBeInTheDocument();
    });
  });

  describe("panels", () => {
    it("shows TagManager when showTagManager is true", () => {
      render(<TodoListPanel {...makeProps({ showTagManager: true })} />);
      expect(screen.getByTestId("tag-manager")).toBeInTheDocument();
    });

    it("does not show TagManager when showTagManager is false", () => {
      render(<TodoListPanel {...makeProps({ showTagManager: false })} />);
      expect(screen.queryByTestId("tag-manager")).not.toBeInTheDocument();
    });

    it("shows FilterPanel when showFilterPanel is true", () => {
      render(<TodoListPanel {...makeProps({ showFilterPanel: true })} />);
      expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
    });
  });

  describe("toolbar interactions", () => {
    it("setSortByDeadline is toggled on 期限順 click", async () => {
      const setSortByDeadline = jest.fn();
      const user = userEvent.setup();
      render(
        <TodoListPanel
          {...makeProps({ sortByDeadline: false, setSortByDeadline })}
        />
      );
      await user.click(screen.getByTitle("期限順にソート"));
      expect(setSortByDeadline).toHaveBeenCalledWith(true);
    });

    it("clearAllTodos is called on 全削除 click when confirmed", async () => {
      const clearAllTodos = jest.fn().mockResolvedValue(undefined);
      global.confirm = jest.fn().mockReturnValue(true);
      const user = userEvent.setup();
      render(<TodoListPanel {...makeProps({ clearAllTodos })} />);
      await user.click(screen.getByTitle("すべて削除"));
      expect(clearAllTodos).toHaveBeenCalled();
    });

    it("clearAllTodos is NOT called when confirm is cancelled", async () => {
      const clearAllTodos = jest.fn();
      global.confirm = jest.fn().mockReturnValue(false);
      const user = userEvent.setup();
      render(<TodoListPanel {...makeProps({ clearAllTodos })} />);
      await user.click(screen.getByTitle("すべて削除"));
      expect(clearAllTodos).not.toHaveBeenCalled();
    });
  });
});
