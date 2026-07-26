/** @jest-environment node */
/**
 * API 認証基盤（lib/api-auth.ts）のテスト
 *
 * 全 API ルートがこの authenticateRequest を通す設計のため、ここが唯一の認可の関門になる。
 * 破れると全エンドポイントが同時に破れるので、成功経路よりも「拒否されるべき経路」を厚く固定する。
 *
 * 特に守りたい契約:
 *  - 認証情報が無いリクエストは 401 で止まり、DB に到達しない
 *  - Bearer トークンは RLS 用クライアントにそのまま引き渡される（ユーザー間のデータ分離の実体）
 *  - API キー比較は長さ差でも値差でもタイミング差を漏らさない
 */
import type { NextRequest } from "next/server";

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();
// getter にしておくと、import 時点で値が固定されず各テストから切り替えられる
let mockSupabaseConfigured = true;

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
  get isSupabaseConfigured() {
    return mockSupabaseConfigured;
  },
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { authenticateRequest, parsePagination, parseSort } from "@/lib/api-auth";

const VALID_API_KEY = "test-private-api-key";
const USER_ID = "user-uuid-1234";

/** headers だけを持つ最小の NextRequest 代替（authenticateRequest は headers しか読まない） */
function requestWith(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

/** URL を持つ最小の NextRequest 代替（parsePagination / parseSort 用） */
function requestUrl(url: string): NextRequest {
  return { url } as unknown as NextRequest;
}

/** profiles テーブル参照のチェーンモック。終端の single() が返す値を差し込む */
function mockProfileLookup(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result);
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));
  mockFrom.mockReturnValue({ select });
  return { select, eq, single };
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  // reset（clear ではなく）にして、前のテストの mockResolvedValue を持ち越さない
  jest.resetAllMocks();
  mockSupabaseConfigured = true;
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    PRIVATE_API_KEY: VALID_API_KEY,
  };
  mockCreateClient.mockReturnValue({ __tag: "created-client" });
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("認証情報が無い場合", () => {
  it("401 を返し、両方の認証方式を案内する", async () => {
    const result = await authenticateRequest(requestWith({}));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(401);
    expect(result.error).toContain("Authorization: Bearer");
    expect(result.error).toContain("X-API-Key");
  });

  it("DB にも Supabase にも一切問い合わせない", async () => {
    await authenticateRequest(requestWith({}));

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("X-API-Key だけで X-User-Id が無ければ認証されない", async () => {
    const result = await authenticateRequest(requestWith({ "X-API-Key": VALID_API_KEY }));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("X-User-Id だけで X-API-Key が無ければ認証されない", async () => {
    const result = await authenticateRequest(requestWith({ "X-User-Id": USER_ID }));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("Bearer トークン認証", () => {
  it("有効なトークンなら userId を返す", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

    const result = await authenticateRequest(
      requestWith({ Authorization: "Bearer valid-token" })
    );

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.userId).toBe(USER_ID);
  });

  it("'Bearer ' を除いたトークン本体だけを検証に渡す", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

    await authenticateRequest(requestWith({ Authorization: "Bearer abc.def.ghi" }));

    expect(mockGetUser).toHaveBeenCalledWith("abc.def.ghi");
  });

  it("トークンを RLS 用クライアントの Authorization ヘッダーへ引き継ぐ", async () => {
    // ここが崩れると RLS が効かず、他ユーザーのデータが読めてしまう
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

    await authenticateRequest(requestWith({ Authorization: "Bearer scoped-token" }));

    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer scoped-token" } },
      })
    );
  });

  it("トークンが無効なら 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "bad jwt" } });

    const result = await authenticateRequest(requestWith({ Authorization: "Bearer nope" }));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(401);
    expect(result.error).toBe("Invalid or expired token");
  });

  it("エラーは無くても user が空なら 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await authenticateRequest(requestWith({ Authorization: "Bearer nope" }));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(401);
  });

  it("検証が例外を投げても 401 に落とす（500 で漏らさない）", async () => {
    mockGetUser.mockRejectedValue(new Error("network down"));

    const result = await authenticateRequest(requestWith({ Authorization: "Bearer boom" }));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(401);
    expect(result.error).toBe("Token verification failed");
  });

  it("スキーム名が違う Authorization は Bearer 経路に入らない", async () => {
    const result = await authenticateRequest(requestWith({ Authorization: "Basic abc" }));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(401);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("Bearer と API キーが両方あれば Bearer を優先する", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "bearer-user" } }, error: null });

    const result = await authenticateRequest(
      requestWith({
        Authorization: "Bearer valid-token",
        "X-API-Key": VALID_API_KEY,
        "X-User-Id": "apikey-user",
      })
    );

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.userId).toBe("bearer-user");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("API キー認証", () => {
  const apiKeyHeaders = (key: string, userId: string = USER_ID) => ({
    "X-API-Key": key,
    "X-User-Id": userId,
  });

  it("正しいキーと実在ユーザーなら成功する", async () => {
    mockProfileLookup({ data: { id: USER_ID }, error: null });

    const result = await authenticateRequest(requestWith(apiKeyHeaders(VALID_API_KEY)));

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.userId).toBe(USER_ID);
  });

  it("ヘッダーの user_id で profiles を検索する", async () => {
    const chain = mockProfileLookup({ data: { id: USER_ID }, error: null });

    await authenticateRequest(requestWith(apiKeyHeaders(VALID_API_KEY)));

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(chain.eq).toHaveBeenCalledWith("id", USER_ID);
  });

  it("キーの長さが違えば 401（timingSafeEqual を長さ違いで呼んで落とさない）", async () => {
    const result = await authenticateRequest(requestWith(apiKeyHeaders("short")));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(401);
    expect(result.error).toBe("Invalid API Key");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("同じ長さでも値が違えば 401", async () => {
    const sameLengthWrongKey = "x".repeat(VALID_API_KEY.length);
    expect(sameLengthWrongKey.length).toBe(VALID_API_KEY.length);

    const result = await authenticateRequest(requestWith(apiKeyHeaders(sameLengthWrongKey)));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(401);
    expect(result.error).toBe("Invalid API Key");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("PRIVATE_API_KEY 未設定なら 503（未設定を認証成功にしない）", async () => {
    delete process.env.PRIVATE_API_KEY;

    const result = await authenticateRequest(requestWith(apiKeyHeaders("anything")));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(503);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("キーが正しくてもユーザーが存在しなければ 404", async () => {
    mockProfileLookup({ data: null, error: { message: "no rows" } });

    const result = await authenticateRequest(requestWith(apiKeyHeaders(VALID_API_KEY)));

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(404);
    expect(result.error).toBe("User not found");
  });

  it("サービスロールキーがあれば RLS バイパス用クライアントを作る", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    mockProfileLookup({ data: { id: USER_ID }, error: null });

    await authenticateRequest(requestWith(apiKeyHeaders(VALID_API_KEY)));

    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key"
    );
  });

  it("サービスロールキーが無ければ新しいクライアントを作らない", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    mockProfileLookup({ data: { id: USER_ID }, error: null });

    const result = await authenticateRequest(requestWith(apiKeyHeaders(VALID_API_KEY)));

    expect(result.success).toBe(true);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe("Supabase 未設定の場合", () => {
  beforeEach(() => {
    mockSupabaseConfigured = false;
  });

  it("有効に見える Bearer トークンでも 503 で止める", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

    const result = await authenticateRequest(
      requestWith({ Authorization: "Bearer valid-token" })
    );

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(503);
    expect(result.error).toContain("Supabase is not configured");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("API キー経路でも 503 で止める", async () => {
    const result = await authenticateRequest(
      requestWith({ "X-API-Key": VALID_API_KEY, "X-User-Id": USER_ID })
    );

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.status).toBe(503);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("parsePagination", () => {
  it("指定が無ければ limit=50 / offset=0", () => {
    expect(parsePagination(requestUrl("http://localhost/api/v1/todos"))).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it("指定された値をそのまま使う", () => {
    expect(
      parsePagination(requestUrl("http://localhost/api/v1/todos?limit=20&offset=40"))
    ).toEqual({ limit: 20, offset: 40 });
  });

  it("limit の上限は 100 に丸める（DoS 的な巨大取得を防ぐ）", () => {
    expect(parsePagination(requestUrl("http://localhost/api/v1/todos?limit=99999")).limit).toBe(
      100
    );
  });

  it("limit の下限は 1 に丸める", () => {
    expect(parsePagination(requestUrl("http://localhost/api/v1/todos?limit=0")).limit).toBe(1);
    expect(parsePagination(requestUrl("http://localhost/api/v1/todos?limit=-5")).limit).toBe(1);
  });

  it("offset に負値は許さない", () => {
    expect(parsePagination(requestUrl("http://localhost/api/v1/todos?offset=-10")).offset).toBe(0);
  });
});

describe("parseSort", () => {
  const ALLOWED = ["created_at", "due_date", "priority"];

  it("指定が無ければ既定フィールドの降順", () => {
    expect(parseSort(requestUrl("http://localhost/api/v1/todos"), ALLOWED)).toEqual({
      field: "created_at",
      order: "desc",
    });
  });

  it("許可リストにあるフィールドは採用する", () => {
    expect(
      parseSort(requestUrl("http://localhost/api/v1/todos?sort=due_date"), ALLOWED).field
    ).toBe("due_date");
  });

  it("許可リストに無いフィールドは既定値へ落とす（SQL インジェクション面を塞ぐ）", () => {
    expect(
      parseSort(requestUrl("http://localhost/api/v1/todos?sort=password"), ALLOWED).field
    ).toBe("created_at");
    expect(
      parseSort(requestUrl("http://localhost/api/v1/todos?sort=id;DROP TABLE"), ALLOWED).field
    ).toBe("created_at");
  });

  it("order は asc のみ昇順、それ以外は降順に倒す", () => {
    const at = (q: string) => parseSort(requestUrl(`http://localhost/api/v1/todos?${q}`), ALLOWED);
    expect(at("order=asc").order).toBe("asc");
    expect(at("order=desc").order).toBe("desc");
    expect(at("order=garbage").order).toBe("desc");
  });

  it("既定フィールドは呼び出し側で差し替えられる", () => {
    expect(
      parseSort(requestUrl("http://localhost/api/v1/todos"), ALLOWED, "due_date").field
    ).toBe("due_date");
  });
});
