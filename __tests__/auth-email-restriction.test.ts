/**
 * 認証メールアドレス制限のテスト
 *
 * このテストは、環境変数による認証メールアドレス制限が
 * 正しく動作することを確認します。
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// メールアドレス制限チェックロジック（auth-dialog.tsxから抽出）
const checkEmailRestriction = (email: string, allowedEmailsStr: string): boolean => {
  if (!allowedEmailsStr) {
    return true; // 制限なし
  }

  const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase());
  const userEmail = email.trim().toLowerCase();

  return allowedEmails.includes(userEmail);
};

describe('メールアドレス制限のテスト', () => {
  describe('制限が設定されていない場合', () => {
    test('すべてのメールアドレスが許可される', () => {
      expect(checkEmailRestriction('any@example.com', '')).toBe(true);
      expect(checkEmailRestriction('test@test.com', '')).toBe(true);
      expect(checkEmailRestriction('admin@domain.com', '')).toBe(true);
    });
  });

  describe('単一メールアドレス制限', () => {
    const allowedEmails = 'admin@example.com';

    test('許可されたメールアドレスはtrueを返す', () => {
      expect(checkEmailRestriction('admin@example.com', allowedEmails)).toBe(true);
    });

    test('許可されていないメールアドレスはfalseを返す', () => {
      expect(checkEmailRestriction('user@example.com', allowedEmails)).toBe(false);
      expect(checkEmailRestriction('other@test.com', allowedEmails)).toBe(false);
    });

    test('大文字小文字を区別せずに判定する', () => {
      expect(checkEmailRestriction('ADMIN@EXAMPLE.COM', allowedEmails)).toBe(true);
      expect(checkEmailRestriction('Admin@Example.Com', allowedEmails)).toBe(true);
    });

    test('前後の空白を無視して判定する', () => {
      expect(checkEmailRestriction('  admin@example.com  ', allowedEmails)).toBe(true);
      expect(checkEmailRestriction('admin@example.com ', allowedEmails)).toBe(true);
    });
  });

  describe('複数メールアドレス制限', () => {
    const allowedEmails = 'admin@example.com,user@test.com,dev@company.com';

    test('許可されたメールアドレスはすべてtrueを返す', () => {
      expect(checkEmailRestriction('admin@example.com', allowedEmails)).toBe(true);
      expect(checkEmailRestriction('user@test.com', allowedEmails)).toBe(true);
      expect(checkEmailRestriction('dev@company.com', allowedEmails)).toBe(true);
    });

    test('許可されていないメールアドレスはfalseを返す', () => {
      expect(checkEmailRestriction('other@example.com', allowedEmails)).toBe(false);
      expect(checkEmailRestriction('hacker@evil.com', allowedEmails)).toBe(false);
    });

    test('大文字小文字を区別せずに判定する', () => {
      expect(checkEmailRestriction('USER@TEST.COM', allowedEmails)).toBe(true);
      expect(checkEmailRestriction('Dev@Company.Com', allowedEmails)).toBe(true);
    });
  });

  describe('スペース付きカンマ区切り', () => {
    const allowedEmails = 'admin@example.com, user@test.com , dev@company.com';

    test('スペースを含むカンマ区切りでも正しく解析される', () => {
      expect(checkEmailRestriction('admin@example.com', allowedEmails)).toBe(true);
      expect(checkEmailRestriction('user@test.com', allowedEmails)).toBe(true);
      expect(checkEmailRestriction('dev@company.com', allowedEmails)).toBe(true);
    });
  });

  describe('エッジケース', () => {
    test('空のメールアドレスはfalseを返す', () => {
      expect(checkEmailRestriction('', 'admin@example.com')).toBe(false);
      expect(checkEmailRestriction('   ', 'admin@example.com')).toBe(false);
    });

    test('部分一致ではなく完全一致で判定する', () => {
      const allowedEmails = 'admin@example.com';
      expect(checkEmailRestriction('admin@example.co', allowedEmails)).toBe(false);
      expect(checkEmailRestriction('admin@example.com.jp', allowedEmails)).toBe(false);
      expect(checkEmailRestriction('x-admin@example.com', allowedEmails)).toBe(false);
    });

    test('特殊文字を含むメールアドレスも正しく処理される', () => {
      const allowedEmails = 'test+tag@example.com,user.name@sub.domain.com';
      expect(checkEmailRestriction('test+tag@example.com', allowedEmails)).toBe(true);
      expect(checkEmailRestriction('user.name@sub.domain.com', allowedEmails)).toBe(true);
    });
  });
});

describe('環境変数統合テスト', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 環境変数のバックアップ
    originalEnv = { ...process.env };
  });

  test('NEXT_PUBLIC_ALLOWED_EMAILS が未設定の場合、制限なし', () => {
    delete process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
    const allowedEmailsStr = process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '';
    expect(checkEmailRestriction('anyone@example.com', allowedEmailsStr)).toBe(true);
  });

  test('NEXT_PUBLIC_ALLOWED_EMAILS が設定されている場合、制限あり', () => {
    process.env.NEXT_PUBLIC_ALLOWED_EMAILS = 'admin@example.com';
    const allowedEmailsStr = process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '';
    expect(checkEmailRestriction('admin@example.com', allowedEmailsStr)).toBe(true);
    expect(checkEmailRestriction('user@example.com', allowedEmailsStr)).toBe(false);
  });
});
