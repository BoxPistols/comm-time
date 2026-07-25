import { renderHook, act, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { useTodoManager } from "@/hooks/useTodoManager";
import { useSupabaseTodos } from "@/hooks/useSupabaseTodos";

// Supabase クライアントは 1 リクエストずつ組み立てを検証したいので、
// テーブル単位で呼び出しを記録できる薄いモックに差し替える
const mockFrom = jest.fn();

// リアルタイム購読のコールバックを掴んでおき、他端末からの INSERT を再現する
type RealtimeHandler = (payload: {
  eventType: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}) => void;
let realtimeHandler: RealtimeHandler | null = null;

jest.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: () => {
      const ch = {
        on: (_event: string, _filter: unknown, handler: RealtimeHandler) => {
          realtimeHandler = handler;
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: jest.fn(),
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

const USER = { id: "user-1" } as User;

type DbTodo = {
  id: string;
  text: string;
  is_completed: boolean;
  order_index: number;
};

/**
 * todos テーブルのクエリビルダー模造品。
 * - select().eq().order().limit().maybeSingle() … 最小 order_index の取得
 * - select().eq().order()                        … 一覧取得
 * - insert().select().single()                   … 追加
 * 全メソッドが自分自身を返しつつ thenable なので、どの終端でも await できる。
 */
function createTodosMock(existing: DbTodo[]) {
  const inserted: Record<string, unknown>[] = [];
  let insertedRow: Record<string, unknown> | null = null;

  const ascending = [...existing].sort((a, b) => a.order_index - b.order_index);

  const builder: Record<string, unknown> = {};
  let limited = false;

  const resolve = () => {
    if (insertedRow) return { data: insertedRow, error: null };
    if (limited) return { data: ascending[0] ?? null, error: null };
    return { data: ascending, error: null };
  };

  for (const method of ["select", "eq", "order", "single", "maybeSingle"]) {
    builder[method] = () => builder;
  }
  builder.limit = () => {
    limited = true;
    return builder;
  };
  builder.insert = (row: Record<string, unknown>) => {
    inserted.push(row);
    insertedRow = { id: "new-todo-id", ...row };
    return builder;
  };
  builder.then = (
    onfulfilled?: (value: ReturnType<typeof resolve>) => unknown,
    onrejected?: (reason: unknown) => unknown
  ) => Promise.resolve(resolve()).then(onfulfilled, onrejected);

  return { builder, inserted };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  realtimeHandler = null;
});

describe("新規 TODO は先頭に追加される（ローカル保存時）", () => {
  const renderManager = () =>
    renderHook(() =>
      useTodoManager({ useDatabase: false, user: null, setAlarmPoints: jest.fn() })
    );

  it("2 件追加すると、後から追加した方が先頭に来る", async () => {
    const { result } = renderManager();

    await act(async () => {
      await result.current.addTodo("古いタスク");
    });
    await act(async () => {
      await result.current.addTodo("新しいタスク");
    });

    expect(result.current.sharedTodos.map((t) => t.text)).toEqual([
      "新しいタスク",
      "古いタスク",
    ]);
  });

  it("既存の並び順は崩さず、先頭にだけ差し込む", async () => {
    const { result } = renderManager();

    act(() => {
      result.current.setSharedTodos([
        { id: "a", text: "A", isCompleted: false },
        { id: "b", text: "B", isCompleted: false },
        { id: "c", text: "C", isCompleted: false },
      ]);
    });

    await act(async () => {
      await result.current.addTodo("新規");
    });

    expect(result.current.sharedTodos.map((t) => t.text)).toEqual(["新規", "A", "B", "C"]);
  });

  it("空文字・空白のみのテキストは追加されない", async () => {
    const { result } = renderManager();

    await act(async () => {
      await result.current.addTodo("   ");
    });

    expect(result.current.sharedTodos).toHaveLength(0);
  });

  // 復元は DB 同期の ON/OFF で経路が分かれる。OFF 側だけ末尾のままだと
  // 同じ操作なのに表示位置が変わってしまうため、両経路とも先頭に揃える
  it("ゴミ箱からの復元も先頭に戻る", async () => {
    const { result } = renderManager();

    act(() => {
      result.current.setSharedTodos([{ id: "a", text: "A", isCompleted: false }]);
    });

    act(() => {
      result.current.restoreTodo({
        id: "z",
        text: "復元されたタスク",
        isCompleted: false,
        deletedAt: new Date().toISOString(),
      });
    });

    expect(result.current.sharedTodos.map((t) => t.text)).toEqual(["復元されたタスク", "A"]);
  });
});

describe("新規 TODO は先頭に追加される（Supabase 同期時）", () => {
  it("既存の最小 order_index より小さい値を採り、全行の振り直しをしない", async () => {
    const { builder, inserted } = createTodosMock([
      { id: "a", text: "A", is_completed: false, order_index: 0 },
      { id: "b", text: "B", is_completed: false, order_index: 1 },
      { id: "c", text: "C", is_completed: false, order_index: 2 },
    ]);
    mockFrom.mockReturnValue(builder);

    const { result } = renderHook(() => useSupabaseTodos(USER));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTodo("新規");
    });

    expect(inserted).toHaveLength(1);
    // 昇順ソートで先頭に来るには最小値より小さい必要がある
    expect(inserted[0].order_index).toBe(-1);
    // 既存行を書き換えていないこと（update を一度も呼んでいない）
    expect(inserted[0].user_id).toBe(USER.id);
  });

  it("TODO が 1 件も無ければ order_index は 0 から始まる", async () => {
    const { builder, inserted } = createTodosMock([]);
    mockFrom.mockReturnValue(builder);

    const { result } = renderHook(() => useSupabaseTodos(USER));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTodo("最初のタスク");
    });

    expect(inserted[0].order_index).toBe(0);
  });

  it("負の order_index が既にあっても、さらに小さい値を採る", async () => {
    const { builder, inserted } = createTodosMock([
      { id: "a", text: "A", is_completed: false, order_index: -3 },
      { id: "b", text: "B", is_completed: false, order_index: 5 },
    ]);
    mockFrom.mockReturnValue(builder);

    const { result } = renderHook(() => useSupabaseTodos(USER));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTodo("新規");
    });

    expect(inserted[0].order_index).toBe(-4);
  });

  it("楽観更新でも先頭に差し込む（再取得を待たずに先頭表示される）", async () => {
    const { builder } = createTodosMock([
      { id: "a", text: "A", is_completed: false, order_index: 0 },
    ]);
    mockFrom.mockReturnValue(builder);

    const { result } = renderHook(() => useSupabaseTodos(USER));
    await waitFor(() => expect(result.current.todos.map((t) => t.text)).toEqual(["A"]));

    await act(async () => {
      await result.current.addTodo("新規");
    });

    expect(result.current.todos.map((t) => t.text)).toEqual(["新規", "A"]);
  });

  // 別端末・別タブで追加された TODO もリアルタイム購読経由で流れてくる。
  // ここが末尾追加のままだと、追加した端末と見ている端末で並びが食い違う
  it("他端末からのリアルタイム INSERT も先頭に入る", async () => {
    const { builder } = createTodosMock([
      { id: "a", text: "A", is_completed: false, order_index: 0 },
    ]);
    mockFrom.mockReturnValue(builder);

    const { result } = renderHook(() => useSupabaseTodos(USER));
    await waitFor(() => expect(result.current.todos.map((t) => t.text)).toEqual(["A"]));
    expect(realtimeHandler).not.toBeNull();

    act(() => {
      realtimeHandler?.({
        eventType: "INSERT",
        new: { id: "z", text: "他端末で追加", is_completed: false, order_index: -1 },
      });
    });

    expect(result.current.todos.map((t) => t.text)).toEqual(["他端末で追加", "A"]);
  });
});
