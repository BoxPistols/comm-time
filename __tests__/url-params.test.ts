/**
 * URLパラメータ処理テスト
 *
 * このテストは、URLパラメータによるログインボタン表示制御が
 * 正しく動作することを確認します。
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// URLパラメータチェックロジック（comm-time.tsxから抽出）
const checkShowLoginButton = (url: string): boolean => {
  const params = new URLSearchParams(new URL(url).search);
  return params.get('user') === 'login';
};

describe('URLパラメータ ?user=login のテスト', () => {
  test('?user=login が含まれる場合はtrueを返す', () => {
    expect(checkShowLoginButton('http://localhost:3000?user=login')).toBe(true);
    expect(checkShowLoginButton('http://localhost:3000/?user=login')).toBe(true);
    expect(checkShowLoginButton('https://example.com?user=login')).toBe(true);
  });

  test('?user=login が含まれない場合はfalseを返す', () => {
    expect(checkShowLoginButton('http://localhost:3000')).toBe(false);
    expect(checkShowLoginButton('http://localhost:3000/')).toBe(false);
    expect(checkShowLoginButton('http://localhost:3000?other=value')).toBe(false);
  });

  test('user パラメータが login 以外の値の場合はfalseを返す', () => {
    expect(checkShowLoginButton('http://localhost:3000?user=admin')).toBe(false);
    expect(checkShowLoginButton('http://localhost:3000?user=test')).toBe(false);
    expect(checkShowLoginButton('http://localhost:3000?user=Login')).toBe(false); // 大文字小文字を区別
    expect(checkShowLoginButton('http://localhost:3000?user=LOGIN')).toBe(false);
  });

  test('複数のパラメータがある場合も正しく判定する', () => {
    expect(checkShowLoginButton('http://localhost:3000?user=login&tab=meeting')).toBe(true);
    expect(checkShowLoginButton('http://localhost:3000?tab=pomodoro&user=login')).toBe(true);
    expect(checkShowLoginButton('http://localhost:3000?foo=bar&user=login&baz=qux')).toBe(true);
  });

  test('user パラメータが複数ある場合は最初の値を使用', () => {
    expect(checkShowLoginButton('http://localhost:3000?user=login&user=admin')).toBe(true);
    expect(checkShowLoginButton('http://localhost:3000?user=admin&user=login')).toBe(false);
  });

  test('空の値の場合はfalseを返す', () => {
    expect(checkShowLoginButton('http://localhost:3000?user=')).toBe(false);
    expect(checkShowLoginButton('http://localhost:3000?user')).toBe(false);
  });

  test('URLエンコードされたパラメータも正しく処理', () => {
    expect(checkShowLoginButton('http://localhost:3000?user=login&redirect=%2Fdashboard')).toBe(true);
  });

  test('ハッシュが含まれる場合も正しく処理', () => {
    expect(checkShowLoginButton('http://localhost:3000?user=login#section')).toBe(true);
    expect(checkShowLoginButton('http://localhost:3000#section?user=login')).toBe(false); // ハッシュの後のパラメータは無視される
  });
});

describe('URLSearchParams の動作確認', () => {
  test('has() メソッドでパラメータの存在確認', () => {
    const params = new URLSearchParams('?user=login&tab=meeting');
    expect(params.has('user')).toBe(true);
    expect(params.has('tab')).toBe(true);
    expect(params.has('missing')).toBe(false);
  });

  test('get() メソッドで値を取得', () => {
    const params = new URLSearchParams('?user=login&tab=meeting');
    expect(params.get('user')).toBe('login');
    expect(params.get('tab')).toBe('meeting');
    expect(params.get('missing')).toBe(null);
  });

  test('getAll() メソッドで同名パラメータの全値を取得', () => {
    const params = new URLSearchParams('?tag=red&tag=blue&tag=green');
    expect(params.getAll('tag')).toEqual(['red', 'blue', 'green']);
  });

  test('toString() メソッドでクエリ文字列を生成', () => {
    const params = new URLSearchParams();
    params.set('user', 'login');
    params.set('tab', 'meeting');
    expect(params.toString()).toBe('user=login&tab=meeting');
  });
});

describe('実際のユースケース', () => {
  test('通常ユーザーアクセス（ログインボタン非表示）', () => {
    const normalUrls = [
      'http://localhost:3000',
      'http://localhost:3000/',
      'http://localhost:3000?tab=meeting',
      'http://localhost:3000#main',
      'https://comm-time.example.com',
    ];

    normalUrls.forEach(url => {
      expect(checkShowLoginButton(url)).toBe(false);
    });
  });

  test('管理者アクセス（ログインボタン表示）', () => {
    const adminUrls = [
      'http://localhost:3000?user=login',
      'http://localhost:3000/?user=login',
      'http://localhost:3000?user=login&tab=meeting',
      'https://comm-time.example.com?user=login',
      'http://localhost:3000?user=login#dashboard',
    ];

    adminUrls.forEach(url => {
      expect(checkShowLoginButton(url)).toBe(true);
    });
  });

  test('不正なアクセス試行（ログインボタン非表示）', () => {
    const invalidUrls = [
      'http://localhost:3000?user=hacker',
      'http://localhost:3000?user=admin',
      'http://localhost:3000?user=root',
      'http://localhost:3000?USER=login', // 大文字のパラメータ名
      'http://localhost:3000?user=Login', // 大文字のlogin
    ];

    invalidUrls.forEach(url => {
      expect(checkShowLoginButton(url)).toBe(false);
    });
  });
});

describe('セキュリティ考慮事項', () => {
  test('SQLインジェクション的なパラメータも安全に処理', () => {
    const maliciousUrls = [
      'http://localhost:3000?user=login\' OR \'1\'=\'1',
      'http://localhost:3000?user=login; DROP TABLE users--',
      'http://localhost:3000?user=login<script>alert("xss")</script>',
    ];

    maliciousUrls.forEach(url => {
      // これらはloginと完全一致しないためfalseになる
      expect(checkShowLoginButton(url)).toBe(false);
    });
  });

  test('パラメータの順序に依存しない', () => {
    expect(checkShowLoginButton('http://localhost:3000?user=login&foo=bar')).toBe(true);
    expect(checkShowLoginButton('http://localhost:3000?foo=bar&user=login')).toBe(true);
  });

  test('大文字小文字を厳密に区別（セキュリティ向上）', () => {
    expect(checkShowLoginButton('http://localhost:3000?user=login')).toBe(true);
    expect(checkShowLoginButton('http://localhost:3000?user=Login')).toBe(false);
    expect(checkShowLoginButton('http://localhost:3000?user=LOGIN')).toBe(false);
    expect(checkShowLoginButton('http://localhost:3000?User=login')).toBe(false);
  });
});
