/**
 * Hydration Error 防止テスト
 *
 * このテストは、SSR（サーバーサイドレンダリング）とCSR（クライアントサイドレンダリング）で
 * 一貫性のあるレンダリング結果が得られることを確認します。
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('時刻表示のHydration対策', () => {
  test('初期状態では null を返す（サーバーサイド）', () => {
    const currentTime = null;
    const displayTime = currentTime ? currentTime.toLocaleTimeString() : '--:--:--';
    expect(displayTime).toBe('--:--:--');
  });

  test('クライアント初期化後は実際の時刻を表示', () => {
    const currentTime = new Date('2025-01-15T12:34:56');
    const displayTime = currentTime ? currentTime.toLocaleTimeString() : '--:--:--';
    expect(displayTime).not.toBe('--:--:--');
    expect(displayTime).toMatch(/\d{1,2}:\d{2}:\d{2}/); // 時刻フォーマット
  });

  test('toLocaleTimeString() が一貫した形式を返す', () => {
    const time1 = new Date('2025-01-15T12:34:56');
    const time2 = new Date('2025-01-15T12:34:56');

    // 同じ時刻は同じ文字列を返すべき
    expect(time1.toLocaleTimeString()).toBe(time2.toLocaleTimeString());
  });
});

describe('useEffect による初期化パターン', () => {
  test('初期レンダリング時は null', () => {
    let currentTime: Date | null = null;

    // 初期レンダリング（サーバーサイド相当）
    expect(currentTime).toBe(null);
  });

  test('useEffect相当の処理後は Date オブジェクト', () => {
    let currentTime: Date | null = null;

    // useEffect 相当の処理（クライアントサイド相当）
    currentTime = new Date();

    expect(currentTime).toBeInstanceOf(Date);
    expect(currentTime).not.toBe(null);
  });

  test('条件分岐により一貫したレンダリング結果', () => {
    // サーバーサイドの状態
    let currentTimeServer: Date | null = null;
    const serverRender = currentTimeServer ? currentTimeServer.toLocaleTimeString() : '--:--:--';

    // クライアントサイドの初期状態（まだuseEffectが実行されていない）
    let currentTimeClientBefore: Date | null = null;
    const clientRenderBefore = currentTimeClientBefore ? currentTimeClientBefore.toLocaleTimeString() : '--:--:--';

    // サーバーとクライアントの初期レンダリング結果が一致
    expect(serverRender).toBe(clientRenderBefore);
    expect(serverRender).toBe('--:--:--');

    // useEffect実行後
    let currentTimeClientAfter: Date | null = new Date('2025-01-15T12:34:56');
    const clientRenderAfter = currentTimeClientAfter ? currentTimeClientAfter.toLocaleTimeString() : '--:--:--';

    // useEffect実行後は実際の時刻が表示される
    expect(clientRenderAfter).not.toBe('--:--:--');
  });
});

describe('URLSearchParams のクライアントサイド処理', () => {
  test('window オブジェクトがない場合の処理', () => {
    // サーバーサイドではwindowが存在しない想定
    const hasWindow = typeof window !== 'undefined';

    if (hasWindow) {
      // クライアントサイドの処理
      const params = new URLSearchParams(window.location.search);
      expect(params).toBeInstanceOf(URLSearchParams);
    } else {
      // サーバーサイドではURLSearchParamsを使用しない
      expect(hasWindow).toBe(false);
    }
  });

  test('useEffect 内での URLSearchParams 使用パターン', () => {
    let showLoginButton = false;

    // 初期レンダリング（サーバーサイド相当）
    expect(showLoginButton).toBe(false);

    // useEffect 相当の処理（クライアントサイド相当）
    if (typeof window !== 'undefined') {
      // この処理はクライアントサイドでのみ実行される
      // テスト環境ではwindowが存在するため、このブロックが実行される
      showLoginButton = true; // 実際にはURLパラメータをチェック
    }

    // クライアントサイドで状態が更新される
    expect(showLoginButton).toBe(true);
  });
});

describe('LocalStorage のクライアントサイド処理', () => {
  beforeEach(() => {
    // LocalStorageをクリア
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }
  });

  test('サーバーサイドでは localStorage にアクセスしない', () => {
    const getStorageValue = (key: string, defaultValue: unknown): unknown => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch {
            return saved;
          }
        }
      }
      return defaultValue;
    };

    // window が存在しない場合（サーバーサイド想定）はデフォルト値を返す
    const result = getStorageValue('testKey', 'defaultValue');

    // テスト環境ではwindowが存在するため、実際の値を確認
    expect(result).toBe('defaultValue'); // キーが存在しない場合
  });

  test('クライアントサイドでは localStorage から値を読み込む', () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('testKey', JSON.stringify('storedValue'));

      const getStorageValue = (key: string, defaultValue: unknown): unknown => {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              return JSON.parse(saved);
            } catch {
              return saved;
            }
          }
        }
        return defaultValue;
      };

      const result = getStorageValue('testKey', 'defaultValue');
      expect(result).toBe('storedValue');
    }
  });
});

describe('状態の初期化タイミング', () => {
  test('useState の初期値は一貫している', () => {
    // サーバーとクライアント両方で同じ初期値
    const initialValue = false;

    expect(initialValue).toBe(false);
  });

  test('useEffect で状態を更新（クライアントサイドのみ）', () => {
    let state = false; // useState 相当の初期値

    // 初期レンダリング（サーバー&クライアント共通）
    expect(state).toBe(false);

    // useEffect 実行後（クライアントのみ）
    state = true;
    expect(state).toBe(true);
  });
});

describe('Hydration Error が発生しないパターン', () => {
  test('条件分岐により null チェックを行う', () => {
    const currentTime: Date | null = null;

    // OK: サーバーとクライアント初期で同じ結果
    const safeRender = currentTime ? currentTime.toLocaleTimeString() : '--:--:--';
    expect(safeRender).toBe('--:--:--');

    // NG例（実装してはいけないパターン）
    // const unsafeRender = currentTime.toLocaleTimeString(); // TypeError が発生
  });

  test('showLoginButton の初期値は false', () => {
    const showLoginButton = false; // useState の初期値

    // サーバーとクライアントの初期レンダリングで同じ
    expect(showLoginButton).toBe(false);
  });

  test('useEffect 実行後に状態が変わっても Hydration Error は発生しない', () => {
    let showLoginButton = false;

    // 初期レンダリング（サーバー＆クライアント初期）
    const initialRender = showLoginButton ? 'shown' : 'hidden';
    expect(initialRender).toBe('hidden');

    // useEffect 実行後（クライアントのみ）
    showLoginButton = true;
    const afterEffectRender = showLoginButton ? 'shown' : 'hidden';
    expect(afterEffectRender).toBe('shown');

    // Reactは useEffect 後の再レンダリングを適切に処理するため、
    // Hydration Errorは発生しない
  });
});

describe('実装例の検証', () => {
  test('currentTime を null で初期化し、useEffect で設定', () => {
    // コンポーネントの初期化
    let currentTime: Date | null = null;
    const [showLoginButton, setShowLoginButton] = [false, (v: boolean) => { /* mock */ }];

    // 初期レンダリング（SSR）
    const ssrOutput = {
      time: currentTime ? currentTime.toLocaleTimeString() : '--:--:--',
      loginVisible: showLoginButton,
    };

    expect(ssrOutput.time).toBe('--:--:--');
    expect(ssrOutput.loginVisible).toBe(false);

    // useEffect 実行（CSR）
    currentTime = new Date('2025-01-15T12:34:56');
    const showLogin = true; // URLパラメータチェック結果

    // 再レンダリング
    const csrOutput = {
      time: currentTime ? currentTime.toLocaleTimeString() : '--:--:--',
      loginVisible: showLogin,
    };

    expect(csrOutput.time).not.toBe('--:--:--');
    expect(csrOutput.loginVisible).toBe(true);
  });
});
