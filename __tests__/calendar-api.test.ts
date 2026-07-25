/**
 * カレンダー API クライアント（lib/calendar-api.ts）のテスト
 *
 * 背景: TODO リンク機能が素の fetch を使い Authorization ヘッダーを送っておらず、
 * 全リクエストが 401 になっていた不具合があった。ビルドでは検出できないため、
 * 「認証ヘッダーが必ず付く」ことを契約としてここで固定する。
 */
import {
  CalendarApiError,
  createTodoEventLink,
  deleteTodoEventLink,
  fetchCalendarConnection,
  fetchCalendarEvents,
  syncCalendar,
  saveEventAnnotation,
  deleteEventAnnotation,
  updateSelectedCalendars,
  disconnectCalendar,
  startCalendarAuth,
} from "@/lib/calendar-api";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: jest.fn() } },
  isSupabaseConfigured: true,
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const ACCESS_TOKEN = "test-access-token";

/** fetch をモックし、呼び出し引数を検査できるようにする */
function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fn = jest.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

/** 直近の fetch 呼び出しのヘッダーを取り出す */
function headersOf(fn: jest.Mock, callIndex = 0): Record<string, string> {
  return fn.mock.calls[callIndex][1].headers as Record<string, string>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: { access_token: ACCESS_TOKEN } } });
});

describe("認証ヘッダーの契約", () => {
  // 各 API を「呼び出し方」だけ列挙し、全件に同じ検証を掛ける。
  // 新しい API を足したらこの配列に追記する運用にすることで、付け忘れを防ぐ。
  const CALLS: { name: string; run: () => Promise<unknown>; body: unknown }[] = [
    { name: "fetchCalendarConnection", run: () => fetchCalendarConnection(), body: {} },
    { name: "startCalendarAuth", run: () => startCalendarAuth(), body: { url: "https://x" } },
    {
      name: "updateSelectedCalendars",
      run: () => updateSelectedCalendars(["a"]),
      body: {},
    },
    { name: "disconnectCalendar", run: () => disconnectCalendar(), body: {} },
    { name: "syncCalendar", run: () => syncCalendar(false), body: {} },
    {
      name: "fetchCalendarEvents",
      run: () => fetchCalendarEvents("2026-07-01T00:00:00Z", "2026-07-31T00:00:00Z"),
      body: { events: [] },
    },
    {
      name: "saveEventAnnotation",
      run: () =>
        saveEventAnnotation("evt-1", {
          scope: "instance",
          priority: "none",
          importance: "none",
          tagIds: [],
        }),
      body: {},
    },
    {
      name: "deleteEventAnnotation",
      run: () => deleteEventAnnotation("evt-1", "instance"),
      body: {},
    },
    { name: "createTodoEventLink", run: () => createTodoEventLink("t-1", "evt-1"), body: {} },
    { name: "deleteTodoEventLink", run: () => deleteTodoEventLink("t-1", "evt-1"), body: {} },
  ];

  it.each(CALLS)("$name は Authorization ヘッダーを送る", async ({ run, body }) => {
    const fn = mockFetch(body);
    await run();
    expect(headersOf(fn).Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it.each(CALLS)("$name はセッションが無ければ 401 で失敗し fetch しない", async ({ run, body }) => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const fn = mockFetch(body);
    await expect(run()).rejects.toMatchObject({ status: 401 });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("createTodoEventLink", () => {
  it("POST /api/v1/calendar/todo-links に todoId と eventKey を送る", async () => {
    const fn = mockFetch({});
    await createTodoEventLink("todo-1", "event-1");

    const [url, init] = fn.mock.calls[0];
    expect(url).toBe("/api/v1/calendar/todo-links");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ todoId: "todo-1", eventKey: "event-1" });
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("サーバーのエラーメッセージをそのまま伝播する", async () => {
    mockFetch({ error: "Todo not found" }, { ok: false, status: 404 });
    await expect(createTodoEventLink("todo-1", "event-1")).rejects.toThrow("Todo not found");
  });

  it("401 応答は status 401 の CalendarApiError になる", async () => {
    mockFetch({ error: "Authentication required." }, { ok: false, status: 401 });
    await expect(createTodoEventLink("t", "e")).rejects.toMatchObject({
      status: 401,
      name: "Error",
    });
    await expect(createTodoEventLink("t", "e")).rejects.toBeInstanceOf(CalendarApiError);
  });
});

describe("deleteTodoEventLink", () => {
  it("DELETE でクエリ文字列に todoId と eventKey を載せる", async () => {
    const fn = mockFetch({});
    await deleteTodoEventLink("todo-1", "event-1");

    const [url, init] = fn.mock.calls[0];
    expect(init.method).toBe("DELETE");
    const params = new URL(url as string, "http://localhost").searchParams;
    expect(params.get("todoId")).toBe("todo-1");
    expect(params.get("eventKey")).toBe("event-1");
  });

  it("特殊文字を含む ID を URL エンコードする", async () => {
    const fn = mockFetch({});
    await deleteTodoEventLink("a b&c", "evt/1?x=2");

    const url = fn.mock.calls[0][0] as string;
    const params = new URL(url, "http://localhost").searchParams;
    expect(params.get("todoId")).toBe("a b&c");
    expect(params.get("eventKey")).toBe("evt/1?x=2");
  });
});

describe("fetchCalendarEvents", () => {
  it("from / to をクエリに載せ events 配列を取り出す", async () => {
    const fn = mockFetch({ events: [{ eventId: "e1" }] });
    const result = await fetchCalendarEvents("2026-07-01T00:00:00Z", "2026-07-31T00:00:00Z");

    const url = fn.mock.calls[0][0] as string;
    const params = new URL(url, "http://localhost").searchParams;
    expect(params.get("from")).toBe("2026-07-01T00:00:00Z");
    expect(params.get("to")).toBe("2026-07-31T00:00:00Z");
    expect(result).toEqual([{ eventId: "e1" }]);
  });
});

describe("syncCalendar", () => {
  it("force=true のときだけクエリを付ける", async () => {
    const fn = mockFetch({});
    await syncCalendar(true);
    expect(fn.mock.calls[0][0]).toContain("force=true");

    fn.mockClear();
    await syncCalendar(false);
    expect(fn.mock.calls[0][0]).not.toContain("force");
  });
});

describe("saveEventAnnotation / deleteEventAnnotation", () => {
  it("eventKey を URL エンコードする（スラッシュ入りの繰り返し ID 対策）", async () => {
    const fn = mockFetch({});
    await saveEventAnnotation("evt/with slash", {
      scope: "series",
      priority: "high",
      importance: "none",
      tagIds: [],
    });
    expect(fn.mock.calls[0][0]).toContain(encodeURIComponent("evt/with slash"));
  });

  it("削除は scope をクエリに載せる", async () => {
    const fn = mockFetch({});
    await deleteEventAnnotation("evt-1", "series");
    expect(fn.mock.calls[0][0]).toContain("scope=series");
    expect(fn.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("エラー本文が JSON でない場合", () => {
  it("ステータスを含む既定メッセージになる", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;

    await expect(fetchCalendarConnection()).rejects.toThrow("Request failed: 500");
  });
});
