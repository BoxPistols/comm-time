/** @jest-environment node */
/**
 * Google カレンダー連携 API ルートハンドラのサーバーサイドテスト
 *
 * 守るもの（この 4 点が壊れたら本番で実害が出る）:
 * 1. 認証ゲート — 未認証リクエストが DB に一切触れないこと。
 *    ここが抜けると誰でも他人のカレンダーを読み書きできる。
 * 2. ユーザースコープ — 全クエリが認証済み user_id で絞られていること。
 *    `.eq("user_id", ...)` の書き忘れはテナント間データ漏洩そのものなので明示的に検証する。
 * 3. バリデーション / エラーマッピング — 不正入力が 400、一意制約違反(23505)が 409、
 *    その他 Supabase エラーが 500 になること。
 * 4. CORS — OPTIONS プリフライトが 204 と CORS ヘッダーを返すこと。
 *
 * 方針: 認証（authenticateRequest）と Google/service-role 依存だけをモックし、
 * apiResponse / apiError / handleCors は本物を動かして実際のステータスコードと
 * ボディを検証する。ビルドでは検出できない契約をここで固定する。
 */
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateRequest } from "@/lib/api-auth";
import {
  getServiceRoleClient,
  loadConnection,
  getAccessToken,
  syncCalendars,
} from "@/lib/calendar-server";
import { getGoogleOAuthConfig, fetchCalendarList, decryptToken, revokeToken } from "@/lib/google-calendar";

import {
  POST as todoLinksPost,
  DELETE as todoLinksDelete,
  OPTIONS as todoLinksOptions,
} from "@/app/api/v1/calendar/todo-links/route";
import {
  GET as eventsGet,
  OPTIONS as eventsOptions,
} from "@/app/api/v1/calendar/events/route";
import {
  PUT as annotationPut,
  DELETE as annotationDelete,
  OPTIONS as annotationOptions,
} from "@/app/api/v1/calendar/events/[eventKey]/annotation/route";
import {
  GET as connectionGet,
  PATCH as connectionPatch,
  DELETE as connectionDelete,
  OPTIONS as connectionOptions,
} from "@/app/api/v1/calendar/connection/route";
import {
  POST as syncPost,
  OPTIONS as syncOptions,
} from "@/app/api/v1/calendar/sync/route";

// authenticateRequest のみ差し替える。apiError / apiResponse / handleCors は本物を使い、
// 実際のステータスコードと CORS ヘッダーを検証できるようにする
jest.mock("@/lib/api-auth", () => ({
  ...jest.requireActual("@/lib/api-auth"),
  authenticateRequest: jest.fn(),
}));

jest.mock("@/lib/calendar-server", () => ({
  getServiceRoleClient: jest.fn(),
  loadConnection: jest.fn(),
  getAccessToken: jest.fn(),
  syncCalendars: jest.fn(),
}));

jest.mock("@/lib/google-calendar", () => ({
  getGoogleOAuthConfig: jest.fn(),
  fetchCalendarList: jest.fn(),
  decryptToken: jest.fn(),
  revokeToken: jest.fn(),
}));

// =============================
// テスト用ヘルパー
// =============================

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TODO_ID = "22222222-2222-4222-8222-222222222222";
const EVENT_KEY = "evt-1";

type SupabaseErrorLike = { message: string; code?: string };
/** チェーン終端で解決させたい結果 */
type TableResult = { data?: unknown; error?: SupabaseErrorLike | null };
type MethodCall = { method: string; args: unknown[] };

// ルートが使うクエリビルダーのメソッド
const BUILDER_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "in",
  "lt",
  "gt",
  "order",
  "single",
  "maybeSingle",
] as const;

/**
 * Supabase のクエリビルダー模造品。
 * 全メソッドが自分自身を返すのでチェーンでき、同時に thenable なので
 * `.single()` 終端でも `.eq()` 終端でも await でき、同じ結果を返す。
 */
function createQueryBuilder(result: TableResult, log: MethodCall[]): Record<string, unknown> {
  const resolved = { data: result.data ?? null, error: result.error ?? null };
  const builder: Record<string, unknown> = {
    then: (
      onfulfilled?: (value: typeof resolved) => unknown,
      onrejected?: (reason: unknown) => unknown
    ) => Promise.resolve(resolved).then(onfulfilled, onrejected),
  };
  for (const method of BUILDER_METHODS) {
    builder[method] = (...args: unknown[]) => {
      log.push({ method, args });
      return builder;
    };
  }
  return builder;
}

type SupabaseMock = {
  /** ルートに渡す auth.supabase */
  client: SupabaseClient;
  from: jest.Mock;
  /** 指定テーブルで method が呼ばれたときの引数一覧 */
  argsFor: (table: string, method: string) => unknown[][];
};

/** テーブル名 → 終端で返す { data, error } を指定してモッククライアントを作る */
function createSupabaseMock(tables: Record<string, TableResult> = {}): SupabaseMock {
  const logs: Record<string, MethodCall[]> = {};
  const from = jest.fn((table: string) => {
    const log = logs[table] ?? (logs[table] = []);
    return createQueryBuilder(tables[table] ?? {}, log);
  });
  return {
    client: { from } as unknown as SupabaseClient,
    from,
    argsFor: (table, method) =>
      (logs[table] ?? []).filter((call) => call.method === method).map((call) => call.args),
  };
}

const mockAuthenticate = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockGetServiceRoleClient = getServiceRoleClient as jest.MockedFunction<
  typeof getServiceRoleClient
>;
const mockLoadConnection = loadConnection as jest.MockedFunction<typeof loadConnection>;
const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockSyncCalendars = syncCalendars as jest.MockedFunction<typeof syncCalendars>;
const mockGetGoogleOAuthConfig = getGoogleOAuthConfig as jest.MockedFunction<
  typeof getGoogleOAuthConfig
>;
const mockFetchCalendarList = fetchCalendarList as jest.MockedFunction<typeof fetchCalendarList>;
const mockDecryptToken = decryptToken as jest.MockedFunction<typeof decryptToken>;
const mockRevokeToken = revokeToken as jest.MockedFunction<typeof revokeToken>;

/** 認証成功をセットし、ルートに渡る Supabase モックを返す */
function authenticateAs(tables: Record<string, TableResult> = {}): SupabaseMock {
  const mock = createSupabaseMock(tables);
  mockAuthenticate.mockResolvedValue({ success: true, userId: USER_ID, supabase: mock.client });
  return mock;
}

/**
 * 認証失敗をセットする。
 * 失敗結果にも敢えて supabase クライアントを持たせておくことで、
 * ハンドラが auth.success を無視して DB に触れた場合に from() の呼び出しとして検出できる
 * （AuthResult の失敗バリアントに supabase は無いため、型は Object.assign の交差型で通す）。
 */
function authenticationFails(error: string, status: number): SupabaseMock {
  const mock = createSupabaseMock();
  mockAuthenticate.mockResolvedValue(
    Object.assign({ success: false as const, error, status }, { supabase: mock.client })
  );
  return mock;
}

async function jsonOf<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function expectCorsHeaders(res: Response): void {
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
}

function jsonRequest(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const OAUTH_CONFIG = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "http://localhost/api/v1/calendar/auth/callback",
  encryptionKey: Buffer.alloc(32),
};

const CONNECTION_ROW = {
  id: "conn-1",
  user_id: USER_ID,
  google_email: "user@example.com",
  refresh_token_encrypted: "iv:tag:cipher",
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  selected_calendar_ids: ["cal-1", "cal-2"],
  sync_token: null,
  last_synced_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================
// 認証ゲート（全ハンドラ横断）
// =============================

describe("認証ゲート（全エクスポートハンドラ）", () => {
  // 新しいハンドラを追加したらこの配列に追記する運用にして、ゲートの掛け忘れを防ぐ
  const HANDLERS: { name: string; run: () => Promise<Response> }[] = [
    {
      name: "POST /todo-links",
      run: () =>
        todoLinksPost(
          jsonRequest("http://localhost/api/v1/calendar/todo-links", "POST", {
            todoId: TODO_ID,
            eventKey: EVENT_KEY,
          })
        ),
    },
    {
      name: "DELETE /todo-links",
      run: () =>
        todoLinksDelete(
          new NextRequest(
            `http://localhost/api/v1/calendar/todo-links?todoId=${TODO_ID}&eventKey=${EVENT_KEY}`,
            { method: "DELETE" }
          )
        ),
    },
    {
      name: "GET /events",
      run: () =>
        eventsGet(
          new NextRequest(
            "http://localhost/api/v1/calendar/events?from=2026-07-01T00:00:00.000Z&to=2026-07-31T00:00:00.000Z"
          )
        ),
    },
    {
      name: "PUT /events/[eventKey]/annotation",
      run: () =>
        annotationPut(
          jsonRequest(
            `http://localhost/api/v1/calendar/events/${EVENT_KEY}/annotation`,
            "PUT",
            { memo: "メモ" }
          ),
          { params: { eventKey: EVENT_KEY } }
        ),
    },
    {
      name: "DELETE /events/[eventKey]/annotation",
      run: () =>
        annotationDelete(
          new NextRequest(
            `http://localhost/api/v1/calendar/events/${EVENT_KEY}/annotation?scope=instance`,
            { method: "DELETE" }
          ),
          { params: { eventKey: EVENT_KEY } }
        ),
    },
    {
      name: "GET /connection",
      run: () => connectionGet(new NextRequest("http://localhost/api/v1/calendar/connection")),
    },
    {
      name: "PATCH /connection",
      run: () =>
        connectionPatch(
          jsonRequest("http://localhost/api/v1/calendar/connection", "PATCH", {
            selectedCalendarIds: ["cal-1"],
          })
        ),
    },
    {
      name: "DELETE /connection",
      run: () =>
        connectionDelete(
          new NextRequest("http://localhost/api/v1/calendar/connection", { method: "DELETE" })
        ),
    },
    {
      name: "POST /sync",
      run: () =>
        syncPost(new NextRequest("http://localhost/api/v1/calendar/sync", { method: "POST" })),
    },
  ];

  it.each(HANDLERS)("$name は未認証なら 401 を返し DB に触れない", async ({ run }) => {
    const authMock = authenticationFails("Invalid or expired token", 401);
    const serviceRoleMock = createSupabaseMock();
    mockGetServiceRoleClient.mockReturnValue(serviceRoleMock.client);
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);

    const res = await run();

    expect(res.status).toBe(401);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "Invalid or expired token" });
    // 認証前に DB へ到達していないことが最重要。service role の取得すら起きてはいけない
    expect(authMock.from).not.toHaveBeenCalled();
    expect(serviceRoleMock.from).not.toHaveBeenCalled();
    expect(mockGetServiceRoleClient).not.toHaveBeenCalled();
    expect(mockLoadConnection).not.toHaveBeenCalled();
    expect(mockSyncCalendars).not.toHaveBeenCalled();
  });

  it.each(HANDLERS)("$name は authenticateRequest のステータスをそのまま返す", async ({ run }) => {
    authenticationFails("Supabase is not configured.", 503);
    const res = await run();
    expect(res.status).toBe(503);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "Supabase is not configured." });
  });

  it.each(HANDLERS)("$name のエラーレスポンスにも CORS ヘッダーが付く", async ({ run }) => {
    authenticationFails("Invalid or expired token", 401);
    expectCorsHeaders(await run());
  });
});

// =============================
// CORS プリフライト
// =============================

describe("OPTIONS（CORS プリフライト）", () => {
  const OPTIONS_HANDLERS: { name: string; handler: () => Promise<Response> | Response }[] = [
    { name: "/todo-links", handler: todoLinksOptions },
    { name: "/events", handler: eventsOptions },
    { name: "/events/[eventKey]/annotation", handler: annotationOptions },
    { name: "/connection", handler: connectionOptions },
    { name: "/sync", handler: syncOptions },
  ];

  it.each(OPTIONS_HANDLERS)("$name は 204 と CORS ヘッダーを返す", async ({ handler }) => {
    const res = await handler();
    expect(res.status).toBe(204);
    expectCorsHeaders(res);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("DELETE");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("OPTIONS は認証を要求しない（プリフライトはヘッダーを持てないため）", async () => {
    await todoLinksOptions();
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });
});

// =============================
// POST/DELETE /api/v1/calendar/todo-links
// =============================

describe("POST /api/v1/calendar/todo-links", () => {
  const URL = "http://localhost/api/v1/calendar/todo-links";

  it("todoId と eventKey が揃えば 201 で作成したリンクを返す", async () => {
    const link = { id: "link-1", user_id: USER_ID, todo_id: TODO_ID, event_key: EVENT_KEY };
    authenticateAs({ todo_event_links: { data: link } });

    const res = await todoLinksPost(jsonRequest(URL, "POST", { todoId: TODO_ID, eventKey: EVENT_KEY }));

    expect(res.status).toBe(201);
    expect(await jsonOf<{ link: unknown }>(res)).toEqual({ link });
    expectCorsHeaders(res);
  });

  it("insert には認証済み user_id が必ず含まれる（他人名義で作れない）", async () => {
    const mock = authenticateAs({ todo_event_links: { data: {} } });

    await todoLinksPost(
      jsonRequest(URL, "POST", { todoId: TODO_ID, eventKey: EVENT_KEY, user_id: "attacker" })
    );

    expect(mock.from).toHaveBeenCalledWith("todo_event_links");
    expect(mock.argsFor("todo_event_links", "insert")[0][0]).toEqual({
      user_id: USER_ID,
      todo_id: TODO_ID,
      event_key: EVENT_KEY,
    });
  });

  it("壊れた JSON ボディは 400 Invalid JSON body", async () => {
    const mock = authenticateAs();

    const res = await todoLinksPost(jsonRequest(URL, "POST", "{壊れたJSON"));

    expect(res.status).toBe(400);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "Invalid JSON body" });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it.each([
    ["todoId 欠落", { eventKey: EVENT_KEY }],
    ["eventKey 欠落", { todoId: TODO_ID }],
    ["両方欠落", {}],
    ["todoId が空文字", { todoId: "", eventKey: EVENT_KEY }],
    ["eventKey が空文字", { todoId: TODO_ID, eventKey: "" }],
  ])("%s は 400 を返し DB に触れない", async (_label, body) => {
    const mock = authenticateAs();

    const res = await todoLinksPost(jsonRequest(URL, "POST", body));

    expect(res.status).toBe(400);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "todoId and eventKey are required",
    });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("一意制約違反（23505）は 409 Link already exists", async () => {
    authenticateAs({
      todo_event_links: {
        error: { code: "23505", message: 'duplicate key value violates unique constraint' },
      },
    });

    const res = await todoLinksPost(jsonRequest(URL, "POST", { todoId: TODO_ID, eventKey: EVENT_KEY }));

    expect(res.status).toBe(409);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "Link already exists" });
  });

  it("その他の Supabase エラーは 500 でメッセージをそのまま返す", async () => {
    authenticateAs({
      todo_event_links: { error: { code: "23503", message: "foreign key violation" } },
    });

    const res = await todoLinksPost(jsonRequest(URL, "POST", { todoId: TODO_ID, eventKey: EVENT_KEY }));

    expect(res.status).toBe(500);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "foreign key violation" });
  });

  // todo_id カラムは uuid。非 UUID を素通しすると Postgres が 22P02 を投げ、
  // クライアントの入力ミスがサーバー障害（500）として報告されてしまう
  it.each([
    ["連番風の文字列", "todo-1"],
    ["タイムスタンプ由来のローカル ID", "1753412345678"],
    ["ハイフン区切りが不正", "22222222-2222-4222-8222"],
  ])("%s の todoId は 400 を返し DB に触れない", async (_label, todoId) => {
    const mock = authenticateAs();

    const res = await todoLinksPost(jsonRequest(URL, "POST", { todoId, eventKey: EVENT_KEY }));

    expect(res.status).toBe(400);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "todoId must be a valid UUID",
    });
    expect(mock.from).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/calendar/todo-links", () => {
  const url = (query: string) => `http://localhost/api/v1/calendar/todo-links${query}`;
  const del = (query: string) => new NextRequest(url(query), { method: "DELETE" });

  it("削除に成功したら 200 { success: true }", async () => {
    authenticateAs();

    const res = await todoLinksDelete(del(`?todoId=${TODO_ID}&eventKey=${EVENT_KEY}`));

    expect(res.status).toBe(200);
    expect(await jsonOf<{ success: boolean }>(res)).toEqual({ success: true });
    expectCorsHeaders(res);
  });

  it("削除は user_id / todo_id / event_key の 3 条件で絞り込む", async () => {
    const mock = authenticateAs();

    await todoLinksDelete(del(`?todoId=${TODO_ID}&eventKey=${EVENT_KEY}`));

    const eqCalls = mock.argsFor("todo_event_links", "eq");
    // user_id の絞り込みが無いと他人のリンクまで消せてしまう
    expect(eqCalls).toContainEqual(["user_id", USER_ID]);
    expect(eqCalls).toContainEqual(["todo_id", TODO_ID]);
    expect(eqCalls).toContainEqual(["event_key", EVENT_KEY]);
    expect(mock.argsFor("todo_event_links", "delete")).toHaveLength(1);
  });

  it.each([
    ["todoId 欠落", `?eventKey=${EVENT_KEY}`],
    ["eventKey 欠落", `?todoId=${TODO_ID}`],
    ["クエリ無し", ""],
    ["todoId が空文字", `?todoId=&eventKey=${EVENT_KEY}`],
  ])("%s は 400 を返し DB に触れない", async (_label, query) => {
    const mock = authenticateAs();

    const res = await todoLinksDelete(del(query));

    expect(res.status).toBe(400);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "todoId and eventKey are required",
    });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("Supabase エラーは 500 でメッセージを返す", async () => {
    authenticateAs({ todo_event_links: { error: { message: "delete failed" } } });

    const res = await todoLinksDelete(del(`?todoId=${TODO_ID}&eventKey=${EVENT_KEY}`));

    expect(res.status).toBe(500);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "delete failed" });
  });
});

// =============================
// GET /api/v1/calendar/events
// =============================

describe("GET /api/v1/calendar/events", () => {
  const FROM = "2026-07-01T00:00:00.000Z";
  const TO = "2026-08-01T00:00:00.000Z";
  const url = (query: string) => `http://localhost/api/v1/calendar/events${query}`;
  const get = (query = `?from=${FROM}&to=${TO}`) => new NextRequest(url(query));

  const baseRow = {
    calendar_id: "cal-1",
    recurring_event_id: null,
    description: null,
    location: null,
    hangout_link: null,
    start_at: "2026-07-10T01:00:00.000Z",
    end_at: "2026-07-10T02:00:00.000Z",
    is_all_day: false,
    status: "confirmed",
    attendees_count: null,
    color_id: null,
  };

  it.each([
    ["from 欠落", `?to=${TO}`],
    ["to 欠落", `?from=${FROM}`],
    ["両方欠落", ""],
    ["from が空文字", `?from=&to=${TO}`],
    ["from が ISO ではない", `?from=きのう&to=${TO}`],
    ["to が ISO ではない", `?from=${FROM}&to=not-a-date`],
  ])("%s は 400 を返し DB に触れない", async (_label, query) => {
    const mock = authenticateAs();

    const res = await eventsGet(get(query));

    expect(res.status).toBe(400);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "Query parameters 'from' and 'to' must be valid ISO datetimes",
    });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("キャッシュ検索は user_id で絞り込み、期間に重なる予定を対象にする", async () => {
    const mock = authenticateAs({ calendar_event_cache: { data: [] } });

    await eventsGet(get());

    // user_id の絞り込みが無いと全ユーザーの予定が返る
    expect(mock.argsFor("calendar_event_cache", "eq")).toContainEqual(["user_id", USER_ID]);
    // 期間に「重なる」条件: start_at < to かつ end_at > from
    expect(mock.argsFor("calendar_event_cache", "lt")).toContainEqual(["start_at", TO]);
    expect(mock.argsFor("calendar_event_cache", "gt")).toContainEqual(["end_at", FROM]);
    expect(mock.argsFor("calendar_event_cache", "order")).toContainEqual([
      "start_at",
      { ascending: true },
    ]);
  });

  it("予定が 0 件なら注釈・TODO リンクを引きに行かない", async () => {
    const mock = authenticateAs({ calendar_event_cache: { data: [] } });

    const res = await eventsGet(get());

    expect(res.status).toBe(200);
    expect(await jsonOf<{ events: unknown[]; count: number }>(res)).toEqual({
      events: [],
      count: 0,
    });
    expect(mock.from).toHaveBeenCalledTimes(1);
    expect(mock.from).toHaveBeenCalledWith("calendar_event_cache");
  });

  it("data が null でも空配列として扱う", async () => {
    authenticateAs({ calendar_event_cache: { data: null } });

    const res = await eventsGet(get());

    expect(res.status).toBe(200);
    expect(await jsonOf<{ count: number }>(res)).toEqual({ events: [], count: 0 });
  });

  it("キャッシュ検索の Supabase エラーは 500", async () => {
    authenticateAs({ calendar_event_cache: { error: { message: "cache read failed" } } });

    const res = await eventsGet(get());

    expect(res.status).toBe(500);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "cache read failed" });
  });

  // error を捨てて data だけ見ると「取得失敗」と「注釈もリンクも無い」が区別できず、
  // メモ・優先度・タグが 200 のまま黙って消える（サイレントなデータ欠落）
  it.each([
    ["注釈", "event_annotations", "annotation read failed"],
    ["TODO リンク", "todo_event_links", "link read failed"],
  ])("%s 検索の Supabase エラーは 200 で握り潰さず 500 を返す", async (_label, table, message) => {
    authenticateAs({
      calendar_event_cache: {
        data: [{ ...baseRow, event_id: "evt-1", summary: "定例ミーティング" }],
      },
      event_annotations: { data: [] },
      todo_event_links: { data: [] },
      [table]: { error: { message } },
    });

    const res = await eventsGet(get());

    expect(res.status).toBe(500);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: message });
  });

  it("キャッシュ行を CalendarEvent 形式へ変換して返す", async () => {
    authenticateAs({
      calendar_event_cache: {
        data: [
          {
            ...baseRow,
            event_id: "evt-1",
            summary: "定例ミーティング",
            description: "議事録リンクあり",
            location: "会議室A",
            hangout_link: "https://meet.example.com/abc",
            attendees_count: 3,
            color_id: "5",
          },
        ],
      },
    });

    const res = await eventsGet(get());
    const body = await jsonOf<{ events: Record<string, unknown>[]; count: number }>(res);

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.events[0]).toMatchObject({
      eventKey: "evt-1",
      eventId: "evt-1",
      calendarId: "cal-1",
      summary: "定例ミーティング",
      description: "議事録リンクあり",
      location: "会議室A",
      hangoutLink: "https://meet.example.com/abc",
      startAt: "2026-07-10T01:00:00.000Z",
      endAt: "2026-07-10T02:00:00.000Z",
      isAllDay: false,
      status: "confirmed",
      attendeesCount: 3,
      colorId: "5",
      linkedTodoIds: [],
    });
    expect(body.events[0].annotation).toBeUndefined();
  });

  it("summary が null なら空文字、未知の status は confirmed に丸める", async () => {
    authenticateAs({
      calendar_event_cache: {
        data: [{ ...baseRow, event_id: "evt-1", summary: null, status: "cancelled" }],
      },
    });

    const body = await jsonOf<{ events: Record<string, unknown>[] }>(await eventsGet(get()));

    expect(body.events[0].summary).toBe("");
    expect(body.events[0].status).toBe("confirmed");
  });

  it("status が tentative の場合はそのまま tentative", async () => {
    authenticateAs({
      calendar_event_cache: {
        data: [{ ...baseRow, event_id: "evt-1", summary: "仮予定", status: "tentative" }],
      },
    });

    const body = await jsonOf<{ events: Record<string, unknown>[] }>(await eventsGet(get()));

    expect(body.events[0].status).toBe("tentative");
  });

  it("注釈・TODO リンクの検索も user_id で絞り、instance と series の両キーを渡す", async () => {
    const mock = authenticateAs({
      calendar_event_cache: {
        data: [
          { ...baseRow, event_id: "evt-1", summary: "単発" },
          { ...baseRow, event_id: "evt-2", summary: "繰り返し", recurring_event_id: "series-1" },
        ],
      },
      event_annotations: { data: [] },
      todo_event_links: { data: [] },
    });

    await eventsGet(get());

    expect(mock.argsFor("event_annotations", "eq")).toContainEqual(["user_id", USER_ID]);
    expect(mock.argsFor("todo_event_links", "eq")).toContainEqual(["user_id", USER_ID]);

    // 重複を除いた instance キー + series キーが検索対象になる
    expect(mock.argsFor("event_annotations", "in")[0]).toEqual([
      "event_key",
      ["evt-1", "evt-2", "series-1"],
    ]);
    expect(mock.argsFor("todo_event_links", "in")[0]).toEqual([
      "event_key",
      ["evt-1", "evt-2", "series-1"],
    ]);
  });

  it("繰り返し予定には series 注釈が適用される", async () => {
    authenticateAs({
      calendar_event_cache: {
        data: [{ ...baseRow, event_id: "evt-2", summary: "週次", recurring_event_id: "series-1" }],
      },
      event_annotations: {
        data: [
          {
            event_key: "series-1",
            scope: "series",
            memo: "シリーズ共通メモ",
            priority: "high",
            importance: "low",
            tag_ids: ["tag-1"],
          },
        ],
      },
      todo_event_links: { data: [] },
    });

    const body = await jsonOf<{ events: { annotation?: Record<string, unknown> }[] }>(
      await eventsGet(get())
    );

    expect(body.events[0].annotation).toEqual({
      eventKey: "series-1",
      scope: "series",
      memo: "シリーズ共通メモ",
      priority: "high",
      importance: "low",
      tagIds: ["tag-1"],
    });
  });

  it("instance 注釈は series 注釈より優先される", async () => {
    authenticateAs({
      calendar_event_cache: {
        data: [{ ...baseRow, event_id: "evt-2", summary: "週次", recurring_event_id: "series-1" }],
      },
      event_annotations: {
        data: [
          {
            event_key: "series-1",
            scope: "series",
            memo: "シリーズ共通メモ",
            priority: "low",
            importance: "low",
            tag_ids: [],
          },
          {
            event_key: "evt-2",
            scope: "instance",
            memo: "この回だけのメモ",
            priority: "high",
            importance: "high",
            tag_ids: [],
          },
        ],
      },
      todo_event_links: { data: [] },
    });

    const body = await jsonOf<{ events: { annotation?: Record<string, unknown> }[] }>(
      await eventsGet(get())
    );

    expect(body.events[0].annotation).toMatchObject({
      eventKey: "evt-2",
      scope: "instance",
      memo: "この回だけのメモ",
    });
  });

  it("memo が null の注釈は memo を省略して返す", async () => {
    authenticateAs({
      calendar_event_cache: { data: [{ ...baseRow, event_id: "evt-1", summary: "予定" }] },
      event_annotations: {
        data: [
          {
            event_key: "evt-1",
            scope: "instance",
            memo: null,
            priority: "none",
            importance: "none",
            tag_ids: [],
          },
        ],
      },
      todo_event_links: { data: [] },
    });

    const body = await jsonOf<{ events: { annotation?: Record<string, unknown> }[] }>(
      await eventsGet(get())
    );

    expect(body.events[0].annotation).not.toHaveProperty("memo");
  });

  it("linkedTodoIds は instance キーと series キーの両方から集約される", async () => {
    authenticateAs({
      calendar_event_cache: {
        data: [
          { ...baseRow, event_id: "evt-1", summary: "単発" },
          { ...baseRow, event_id: "evt-2", summary: "週次", recurring_event_id: "series-1" },
        ],
      },
      event_annotations: { data: [] },
      todo_event_links: {
        data: [
          { todo_id: "todo-a", event_key: "evt-1" },
          { todo_id: "todo-b", event_key: "evt-2" },
          { todo_id: "todo-c", event_key: "series-1" },
        ],
      },
    });

    const body = await jsonOf<{ events: { linkedTodoIds: string[] }[] }>(await eventsGet(get()));

    expect(body.events[0].linkedTodoIds).toEqual(["todo-a"]);
    expect(body.events[1].linkedTodoIds).toEqual(["todo-b", "todo-c"]);
  });
});

// =============================
// PUT/DELETE /api/v1/calendar/events/[eventKey]/annotation
// =============================

describe("PUT /api/v1/calendar/events/[eventKey]/annotation", () => {
  const TAG_UUID = "33333333-3333-4333-8333-333333333333";
  const url = (key: string) => `http://localhost/api/v1/calendar/events/${key}/annotation`;

  const savedRow = {
    event_key: EVENT_KEY,
    scope: "instance",
    memo: "メモ本文",
    priority: "high",
    importance: "medium",
    tag_ids: [TAG_UUID],
  };

  it("注釈を upsert して 200 でキャメルケースの注釈を返す", async () => {
    authenticateAs({ event_annotations: { data: savedRow } });

    const res = await annotationPut(
      jsonRequest(url(EVENT_KEY), "PUT", {
        scope: "instance",
        memo: "メモ本文",
        priority: "high",
        importance: "medium",
        tagIds: [TAG_UUID],
      }),
      { params: { eventKey: EVENT_KEY } }
    );

    expect(res.status).toBe(200);
    expect(await jsonOf<Record<string, unknown>>(res)).toEqual({
      eventKey: EVENT_KEY,
      scope: "instance",
      memo: "メモ本文",
      priority: "high",
      importance: "medium",
      tagIds: [TAG_UUID],
    });
    expectCorsHeaders(res);
  });

  it("upsert には認証済み user_id と onConflict キーが含まれる", async () => {
    const mock = authenticateAs({ event_annotations: { data: savedRow } });

    await annotationPut(
      jsonRequest(url(EVENT_KEY), "PUT", { memo: "メモ本文", user_id: "attacker" }),
      { params: { eventKey: EVENT_KEY } }
    );

    const [payload, options] = mock.argsFor("event_annotations", "upsert")[0];
    expect(payload).toMatchObject({ user_id: USER_ID, event_key: EVENT_KEY });
    expect(options).toEqual({ onConflict: "user_id,event_key,scope" });
  });

  it("URL エンコードされた eventKey はデコードして保存される", async () => {
    const rawKey = "abc_20260710T010000Z@google.com";
    const mock = authenticateAs({ event_annotations: { data: { ...savedRow, event_key: rawKey } } });

    await annotationPut(jsonRequest(url(encodeURIComponent(rawKey)), "PUT", { memo: "x" }), {
      params: { eventKey: encodeURIComponent(rawKey) },
    });

    const [payload] = mock.argsFor("event_annotations", "upsert")[0];
    expect(payload).toMatchObject({ event_key: rawKey });
  });

  it.each([
    ["壊れた JSON", "{壊れたJSON"],
    ["JSON の null", "null"],
    ["文字列ボディ", '"just a string"'],
    ["数値ボディ", "42"],
  ])("%s は 400 Request body must be a JSON object", async (_label, body) => {
    const mock = authenticateAs();

    const res = await annotationPut(jsonRequest(url(EVENT_KEY), "PUT", body), {
      params: { eventKey: EVENT_KEY },
    });

    expect(res.status).toBe(400);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "Request body must be a JSON object",
    });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("scope 未指定・不正値は instance に丸める", async () => {
    const mock = authenticateAs({ event_annotations: { data: savedRow } });

    await annotationPut(jsonRequest(url(EVENT_KEY), "PUT", { scope: "everything" }), {
      params: { eventKey: EVENT_KEY },
    });
    await annotationPut(jsonRequest(url(EVENT_KEY), "PUT", {}), {
      params: { eventKey: EVENT_KEY },
    });

    const upserts = mock.argsFor("event_annotations", "upsert");
    expect(upserts[0][0]).toMatchObject({ scope: "instance" });
    expect(upserts[1][0]).toMatchObject({ scope: "instance" });
  });

  it("scope に series を指定すればそのまま保存される", async () => {
    const mock = authenticateAs({ event_annotations: { data: { ...savedRow, scope: "series" } } });

    await annotationPut(jsonRequest(url(EVENT_KEY), "PUT", { scope: "series" }), {
      params: { eventKey: EVENT_KEY },
    });

    expect(mock.argsFor("event_annotations", "upsert")[0][0]).toMatchObject({ scope: "series" });
  });

  it("priority / importance の不正値は none に丸める", async () => {
    const mock = authenticateAs({ event_annotations: { data: savedRow } });

    await annotationPut(
      jsonRequest(url(EVENT_KEY), "PUT", { priority: "urgent", importance: 999 }),
      { params: { eventKey: EVENT_KEY } }
    );

    expect(mock.argsFor("event_annotations", "upsert")[0][0]).toMatchObject({
      priority: "none",
      importance: "none",
    });
  });

  it("memo が文字列以外なら null として保存する", async () => {
    const mock = authenticateAs({ event_annotations: { data: savedRow } });

    await annotationPut(jsonRequest(url(EVENT_KEY), "PUT", { memo: { markdown: "x" } }), {
      params: { eventKey: EVENT_KEY },
    });

    expect(mock.argsFor("event_annotations", "upsert")[0][0]).toMatchObject({ memo: null });
  });

  it("tagIds は UUID 形式のみ残す（uuid[] カラムへの不正値混入を防ぐ）", async () => {
    const mock = authenticateAs({ event_annotations: { data: savedRow } });

    await annotationPut(
      jsonRequest(url(EVENT_KEY), "PUT", {
        tagIds: [TAG_UUID, "not-a-uuid", 123, null, "'; DROP TABLE todos; --"],
      }),
      { params: { eventKey: EVENT_KEY } }
    );

    expect(mock.argsFor("event_annotations", "upsert")[0][0]).toMatchObject({
      tag_ids: [TAG_UUID],
    });
  });

  it("tagIds が配列でなければ空配列として保存する", async () => {
    const mock = authenticateAs({ event_annotations: { data: savedRow } });

    await annotationPut(jsonRequest(url(EVENT_KEY), "PUT", { tagIds: TAG_UUID }), {
      params: { eventKey: EVENT_KEY },
    });

    expect(mock.argsFor("event_annotations", "upsert")[0][0]).toMatchObject({ tag_ids: [] });
  });

  it("Supabase エラーは 500 でメッセージを返す", async () => {
    authenticateAs({ event_annotations: { error: { message: "upsert failed" } } });

    const res = await annotationPut(jsonRequest(url(EVENT_KEY), "PUT", { memo: "x" }), {
      params: { eventKey: EVENT_KEY },
    });

    expect(res.status).toBe(500);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "upsert failed" });
  });
});

describe("DELETE /api/v1/calendar/events/[eventKey]/annotation", () => {
  const url = (key: string, query = "") =>
    `http://localhost/api/v1/calendar/events/${key}/annotation${query}`;

  it("削除に成功したら 200 { deleted: true }", async () => {
    authenticateAs();

    const res = await annotationDelete(
      new NextRequest(url(EVENT_KEY, "?scope=instance"), { method: "DELETE" }),
      { params: { eventKey: EVENT_KEY } }
    );

    expect(res.status).toBe(200);
    expect(await jsonOf<{ deleted: boolean }>(res)).toEqual({ deleted: true });
    expectCorsHeaders(res);
  });

  it("削除は user_id / event_key / scope の 3 条件で絞り込む", async () => {
    const mock = authenticateAs();

    await annotationDelete(new NextRequest(url(EVENT_KEY, "?scope=series"), { method: "DELETE" }), {
      params: { eventKey: EVENT_KEY },
    });

    const eqCalls = mock.argsFor("event_annotations", "eq");
    // user_id の絞り込みが無いと他人の注釈まで消せてしまう
    expect(eqCalls).toContainEqual(["user_id", USER_ID]);
    expect(eqCalls).toContainEqual(["event_key", EVENT_KEY]);
    expect(eqCalls).toContainEqual(["scope", "series"]);
  });

  it.each([
    ["scope 未指定", ""],
    ["scope が不正値", "?scope=everything"],
  ])("%s は instance を対象にする", async (_label, query) => {
    const mock = authenticateAs();

    await annotationDelete(new NextRequest(url(EVENT_KEY, query), { method: "DELETE" }), {
      params: { eventKey: EVENT_KEY },
    });

    expect(mock.argsFor("event_annotations", "eq")).toContainEqual(["scope", "instance"]);
  });

  it("URL エンコードされた eventKey はデコードして削除条件にする", async () => {
    const rawKey = "abc_20260710T010000Z@google.com";
    const mock = authenticateAs();

    await annotationDelete(
      new NextRequest(url(encodeURIComponent(rawKey)), { method: "DELETE" }),
      { params: { eventKey: encodeURIComponent(rawKey) } }
    );

    expect(mock.argsFor("event_annotations", "eq")).toContainEqual(["event_key", rawKey]);
  });

  it("Supabase エラーは 500 でメッセージを返す", async () => {
    authenticateAs({ event_annotations: { error: { message: "delete annotation failed" } } });

    const res = await annotationDelete(new NextRequest(url(EVENT_KEY), { method: "DELETE" }), {
      params: { eventKey: EVENT_KEY },
    });

    expect(res.status).toBe(500);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "delete annotation failed" });
  });
});

// =============================
// /api/v1/calendar/connection
// =============================

describe("GET /api/v1/calendar/connection", () => {
  const req = () => new NextRequest("http://localhost/api/v1/calendar/connection");
  const NOT_CONFIGURED = "Google Calendar integration is not configured on the server.";

  it("service role クライアントが無ければ 503", async () => {
    authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(null);

    const res = await connectionGet(req());

    expect(res.status).toBe(503);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: NOT_CONFIGURED });
    expect(mockLoadConnection).not.toHaveBeenCalled();
  });

  it("未連携なら connected: false の空状態を返す", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(null);

    const res = await connectionGet(req());

    expect(res.status).toBe(200);
    expect(await jsonOf<Record<string, unknown>>(res)).toEqual({
      connected: false,
      selectedCalendarIds: [],
      availableCalendars: [],
    });
  });

  it("連携情報は認証済み user_id で読み込む", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(null);

    await connectionGet(req());

    // service role は RLS をバイパスするため、user_id の受け渡しが唯一の防壁
    expect(mockLoadConnection).toHaveBeenCalledWith(mock.client, USER_ID);
  });

  it("連携済みなら Google から取得したカレンダー一覧を返す", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue({
      ...CONNECTION_ROW,
      last_synced_at: "2026-07-24T00:00:00.000Z",
    });
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);
    mockGetAccessToken.mockResolvedValue("access-token");
    mockFetchCalendarList.mockResolvedValue([
      { id: "cal-1", summary: "メイン", backgroundColor: "#123456", primary: true },
      { id: "cal-2", summary: "サブ" },
    ]);

    const res = await connectionGet(req());

    expect(res.status).toBe(200);
    expect(await jsonOf<Record<string, unknown>>(res)).toEqual({
      connected: true,
      googleEmail: "user@example.com",
      selectedCalendarIds: ["cal-1", "cal-2"],
      availableCalendars: [
        { id: "cal-1", summary: "メイン", backgroundColor: "#123456", primary: true },
        { id: "cal-2", summary: "サブ" },
      ],
      lastSyncedAt: "2026-07-24T00:00:00.000Z",
    });
  });

  it("Google API が失敗しても選択済み ID だけで応答を組み立てる", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(CONNECTION_ROW);
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);
    mockGetAccessToken.mockRejectedValue(new Error("Token refresh failed"));

    const res = await connectionGet(req());
    const body = await jsonOf<Record<string, unknown>>(res);

    expect(res.status).toBe(200);
    expect(body.connected).toBe(true);
    expect(body.availableCalendars).toEqual([
      { id: "cal-1", summary: "cal-1" },
      { id: "cal-2", summary: "cal-2" },
    ]);
  });

  it("OAuth 設定が無ければ availableCalendars は空のまま連携済みを返す", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(CONNECTION_ROW);
    mockGetGoogleOAuthConfig.mockReturnValue(null);

    const body = await jsonOf<Record<string, unknown>>(await connectionGet(req()));

    expect(body.connected).toBe(true);
    expect(body.availableCalendars).toEqual([]);
    expect(mockFetchCalendarList).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/calendar/connection", () => {
  const url = "http://localhost/api/v1/calendar/connection";
  const patch = (body: unknown) => jsonRequest(url, "PATCH", body);

  it("選択カレンダーを更新して 200 で反映後の ID を返す", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);

    const res = await connectionPatch(patch({ selectedCalendarIds: ["cal-1", "cal-9"] }));

    expect(res.status).toBe(200);
    expect(await jsonOf<{ selectedCalendarIds: string[] }>(res)).toEqual({
      selectedCalendarIds: ["cal-1", "cal-9"],
    });
    expectCorsHeaders(res);
  });

  it("更新は user_id で絞り込み、sync_token を破棄して次回フル同期にする", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);

    await connectionPatch(patch({ selectedCalendarIds: ["cal-1"] }));

    // service role は RLS をバイパスするため user_id 条件が無いと全ユーザーを書き換える
    expect(mock.argsFor("calendar_connections", "eq")).toContainEqual(["user_id", USER_ID]);
    const [payload] = mock.argsFor("calendar_connections", "update")[0] as [
      Record<string, unknown>,
    ];
    expect(payload.selected_calendar_ids).toEqual(["cal-1"]);
    expect(payload.sync_token).toBeNull();
  });

  it("空配列は有効な入力として受け付ける（全カレンダー非表示）", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);

    const res = await connectionPatch(patch({ selectedCalendarIds: [] }));

    expect(res.status).toBe(200);
    expect(await jsonOf<{ selectedCalendarIds: string[] }>(res)).toEqual({
      selectedCalendarIds: [],
    });
  });

  it.each([
    ["キー欠落", {}],
    ["文字列", { selectedCalendarIds: "cal-1" }],
    ["null", { selectedCalendarIds: null }],
    ["文字列以外を含む配列", { selectedCalendarIds: ["cal-1", 42] }],
    ["壊れた JSON", "{壊れたJSON"],
    ["JSON の null", "null"],
  ])("%s は 400 を返し DB に触れない", async (_label, body) => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);

    const res = await connectionPatch(patch(body));

    expect(res.status).toBe(400);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "selectedCalendarIds must be an array of strings",
    });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("service role クライアントが無ければ 503", async () => {
    authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(null);

    const res = await connectionPatch(patch({ selectedCalendarIds: ["cal-1"] }));

    expect(res.status).toBe(503);
  });

  it("Supabase エラーは 500 でメッセージを返す", async () => {
    const mock = authenticateAs({ calendar_connections: { error: { message: "update failed" } } });
    mockGetServiceRoleClient.mockReturnValue(mock.client);

    const res = await connectionPatch(patch({ selectedCalendarIds: ["cal-1"] }));

    expect(res.status).toBe(500);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "update failed" });
  });
});

describe("DELETE /api/v1/calendar/connection", () => {
  const req = () =>
    new NextRequest("http://localhost/api/v1/calendar/connection", { method: "DELETE" });

  it("service role クライアントが無ければ 503", async () => {
    authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(null);

    const res = await connectionDelete(req());

    expect(res.status).toBe(503);
    expect(mockLoadConnection).not.toHaveBeenCalled();
  });

  it("未連携なら削除を実行せず 200 を返す（冪等）", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(null);

    const res = await connectionDelete(req());

    expect(res.status).toBe(200);
    expect(await jsonOf<{ connected: boolean }>(res)).toEqual({ connected: false });
    expect(mock.from).not.toHaveBeenCalled();
    expect(mockRevokeToken).not.toHaveBeenCalled();
  });

  it("連携済みなら Google トークンを失効させキャッシュと連携情報を削除する", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(CONNECTION_ROW);
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);
    mockDecryptToken.mockReturnValue("refresh-token");
    mockRevokeToken.mockResolvedValue(undefined);

    const res = await connectionDelete(req());

    expect(res.status).toBe(200);
    expect(await jsonOf<{ connected: boolean }>(res)).toEqual({ connected: false });
    expect(mockRevokeToken).toHaveBeenCalledWith("refresh-token");
    // 削除は必ず自分の user_id 限定であること
    expect(mock.argsFor("calendar_event_cache", "eq")).toEqual([["user_id", USER_ID]]);
    expect(mock.argsFor("calendar_connections", "eq")).toEqual([["user_id", USER_ID]]);
    expect(mock.argsFor("calendar_event_cache", "delete")).toHaveLength(1);
    expect(mock.argsFor("calendar_connections", "delete")).toHaveLength(1);
  });

  it("トークン失効に失敗してもレコード削除は続行する", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(CONNECTION_ROW);
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);
    mockDecryptToken.mockImplementation(() => {
      throw new Error("Invalid encrypted token format");
    });

    const res = await connectionDelete(req());

    expect(res.status).toBe(200);
    expect(mock.argsFor("calendar_connections", "delete")).toHaveLength(1);
  });

  it("OAuth 設定が無くてもレコード削除は行う", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(CONNECTION_ROW);
    mockGetGoogleOAuthConfig.mockReturnValue(null);

    const res = await connectionDelete(req());

    expect(res.status).toBe(200);
    expect(mockRevokeToken).not.toHaveBeenCalled();
    expect(mock.argsFor("calendar_event_cache", "delete")).toHaveLength(1);
    expect(mock.argsFor("calendar_connections", "delete")).toHaveLength(1);
  });

  // 削除失敗を握り潰して 200 を返すと、Google 側のトークンは失効済みなのに
  // 暗号化リフレッシュトークンを持つ行が残り、UI は「解除済み」を表示して再試行もできなくなる
  it("キャッシュ削除に失敗したら 500 を返し、連携情報の削除には進まない", async () => {
    const mock = authenticateAs({
      calendar_event_cache: { error: { message: "cache delete failed" } },
    });
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(CONNECTION_ROW);
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);
    mockDecryptToken.mockReturnValue("refresh-token");
    mockRevokeToken.mockResolvedValue(undefined);

    const res = await connectionDelete(req());

    expect(res.status).toBe(500);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "cache delete failed" });
    expect(mock.from).not.toHaveBeenCalledWith("calendar_connections");
  });

  it("連携情報の削除に失敗したら 500 を返す（解除済みと誤表示させない）", async () => {
    const mock = authenticateAs({
      calendar_connections: { error: { message: "connection delete failed" } },
    });
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockLoadConnection.mockResolvedValue(CONNECTION_ROW);
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);
    mockDecryptToken.mockReturnValue("refresh-token");
    mockRevokeToken.mockResolvedValue(undefined);

    const res = await connectionDelete(req());

    expect(res.status).toBe(500);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "connection delete failed" });
  });
});

// =============================
// POST /api/v1/calendar/sync
// =============================

describe("POST /api/v1/calendar/sync", () => {
  const url = (query = "") => `http://localhost/api/v1/calendar/sync${query}`;
  const req = (query = "") => new NextRequest(url(query), { method: "POST" });

  /** 同期が成功する状態を組み立てる */
  function arrangeSyncable(lastSyncedAt: string | null): SupabaseMock {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);
    mockLoadConnection.mockResolvedValue({ ...CONNECTION_ROW, last_synced_at: lastSyncedAt });
    mockGetAccessToken.mockResolvedValue("access-token");
    mockSyncCalendars.mockResolvedValue({ eventCount: 12, fullSync: true });
    return mock;
  }

  it("service role クライアントが無ければ 503", async () => {
    authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(null);
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);

    const res = await syncPost(req());

    expect(res.status).toBe(503);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "Google Calendar integration is not configured on the server.",
    });
    expect(mockLoadConnection).not.toHaveBeenCalled();
  });

  it("OAuth 設定が無ければ 503", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockGetGoogleOAuthConfig.mockReturnValue(null);

    const res = await syncPost(req());

    expect(res.status).toBe(503);
    expect(mockLoadConnection).not.toHaveBeenCalled();
  });

  it("未連携なら 404", async () => {
    const mock = authenticateAs();
    mockGetServiceRoleClient.mockReturnValue(mock.client);
    mockGetGoogleOAuthConfig.mockReturnValue(OAUTH_CONFIG);
    mockLoadConnection.mockResolvedValue(null);

    const res = await syncPost(req());

    expect(res.status).toBe(404);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "Google Calendar is not connected.",
    });
    expect(mockSyncCalendars).not.toHaveBeenCalled();
  });

  it("連携情報は認証済み user_id で読み込む", async () => {
    const mock = arrangeSyncable(null);

    await syncPost(req());

    expect(mockLoadConnection).toHaveBeenCalledWith(mock.client, USER_ID);
  });

  it("同期に成功したら 200 で件数と fullSync を返す", async () => {
    arrangeSyncable(null);

    const res = await syncPost(req());
    const body = await jsonOf<Record<string, unknown>>(res);

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ synced: true, eventCount: 12, fullSync: true });
    expect(typeof body.lastSyncedAt).toBe("string");
    expectCorsHeaders(res);
  });

  it("直近 60 秒以内に同期済みなら API を叩かず synced: false を返す", async () => {
    const lastSyncedAt = new Date(Date.now() - 5_000).toISOString();
    arrangeSyncable(lastSyncedAt);

    const res = await syncPost(req());

    expect(res.status).toBe(200);
    expect(await jsonOf<Record<string, unknown>>(res)).toEqual({
      synced: false,
      eventCount: 0,
      fullSync: false,
      lastSyncedAt,
    });
    // クォータ節約のため Google API に到達しないこと
    expect(mockGetAccessToken).not.toHaveBeenCalled();
    expect(mockSyncCalendars).not.toHaveBeenCalled();
  });

  it("force=true なら最短間隔チェックを飛ばして同期する", async () => {
    arrangeSyncable(new Date(Date.now() - 5_000).toISOString());

    const res = await syncPost(req("?force=true"));

    expect(res.status).toBe(200);
    expect(await jsonOf<{ synced: boolean }>(res)).toMatchObject({ synced: true });
    expect(mockSyncCalendars).toHaveBeenCalledTimes(1);
  });

  it("force=1 のような別表記では最短間隔チェックを飛ばさない", async () => {
    arrangeSyncable(new Date(Date.now() - 5_000).toISOString());

    const res = await syncPost(req("?force=1"));

    expect(await jsonOf<{ synced: boolean }>(res)).toMatchObject({ synced: false });
    expect(mockSyncCalendars).not.toHaveBeenCalled();
  });

  it("最終同期から 60 秒以上経っていれば同期する", async () => {
    arrangeSyncable(new Date(Date.now() - 120_000).toISOString());

    const res = await syncPost(req());

    expect(await jsonOf<{ synced: boolean }>(res)).toMatchObject({ synced: true });
    expect(mockSyncCalendars).toHaveBeenCalledTimes(1);
  });

  it("リフレッシュトークン失効は再連携が必要なので 401 で区別する", async () => {
    arrangeSyncable(null);
    mockGetAccessToken.mockRejectedValue(new Error("Token refresh failed: invalid_grant"));

    const res = await syncPost(req());

    expect(res.status).toBe(401);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "Token refresh failed: invalid_grant",
    });
  });

  it("その他の同期失敗は上流エラーとして 502", async () => {
    arrangeSyncable(null);
    mockSyncCalendars.mockRejectedValue(new Error("Cache upsert failed: timeout"));

    const res = await syncPost(req());

    expect(res.status).toBe(502);
    expect(await jsonOf<{ error: string }>(res)).toEqual({
      error: "Cache upsert failed: timeout",
    });
  });

  it("Error 以外が throw された場合も 502 Sync failed に丸める", async () => {
    arrangeSyncable(null);
    mockSyncCalendars.mockRejectedValue("文字列で throw された何か");

    const res = await syncPost(req());

    expect(res.status).toBe(502);
    expect(await jsonOf<{ error: string }>(res)).toEqual({ error: "Sync failed" });
  });
});
