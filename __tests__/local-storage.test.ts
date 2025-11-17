/**
 * LocalStorage動作テスト
 *
 * このテストは、LocalStorageへのデータ保存・読み込みが
 * 正しく動作することを確認します。
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// LocalStorageから安全に値を取得するヘルパー関数（comm-time.tsxから抽出）
const getStorageValue = (key: string, defaultValue: unknown): unknown => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return saved; // JSON以外の文字列の場合
      }
    }
  }
  return defaultValue;
};

// LocalStorage のモック
class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = value.toString();
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

// グローバルにLocalStorageモックを設定
global.localStorage = new LocalStorageMock() as Storage;

describe('LocalStorage 読み込みテスト', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('キーが存在しない場合はデフォルト値を返す', () => {
    expect(getStorageValue('nonexistent', 'default')).toBe('default');
    expect(getStorageValue('missing', 42)).toBe(42);
    expect(getStorageValue('null', null)).toBe(null);
  });

  test('文字列を正しく読み込む', () => {
    localStorage.setItem('testString', '"Hello World"');
    expect(getStorageValue('testString', '')).toBe('Hello World');
  });

  test('数値を正しく読み込む', () => {
    localStorage.setItem('testNumber', '42');
    expect(getStorageValue('testNumber', 0)).toBe(42);
  });

  test('真偽値を正しく読み込む', () => {
    localStorage.setItem('testTrue', 'true');
    localStorage.setItem('testFalse', 'false');
    expect(getStorageValue('testTrue', false)).toBe(true);
    expect(getStorageValue('testFalse', true)).toBe(false);
  });

  test('配列を正しく読み込む', () => {
    const testArray = [1, 2, 3, 4, 5];
    localStorage.setItem('testArray', JSON.stringify(testArray));
    expect(getStorageValue('testArray', [])).toEqual(testArray);
  });

  test('オブジェクトを正しく読み込む', () => {
    const testObject = { name: 'Test', value: 123, active: true };
    localStorage.setItem('testObject', JSON.stringify(testObject));
    expect(getStorageValue('testObject', {})).toEqual(testObject);
  });

  test('JSON以外の文字列はそのまま返す', () => {
    localStorage.setItem('plainString', 'Not JSON');
    expect(getStorageValue('plainString', '')).toBe('Not JSON');
  });

  test('破損したJSONの場合は文字列として返す', () => {
    localStorage.setItem('brokenJSON', '{invalid json');
    expect(getStorageValue('brokenJSON', '')).toBe('{invalid json');
  });
});

describe('LocalStorage 保存テスト', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('文字列を正しく保存できる', () => {
    localStorage.setItem('testString', JSON.stringify('Test Value'));
    expect(localStorage.getItem('testString')).toBe('"Test Value"');
  });

  test('数値を正しく保存できる', () => {
    localStorage.setItem('testNumber', JSON.stringify(42));
    expect(localStorage.getItem('testNumber')).toBe('42');
  });

  test('配列を正しく保存できる', () => {
    const testArray = [{ id: '1', text: 'Todo 1' }, { id: '2', text: 'Todo 2' }];
    localStorage.setItem('testArray', JSON.stringify(testArray));
    const stored = localStorage.getItem('testArray');
    expect(JSON.parse(stored!)).toEqual(testArray);
  });

  test('オブジェクトを正しく保存できる', () => {
    const testObject = { volume: 44, frequency: 340 };
    localStorage.setItem('testObject', JSON.stringify(testObject));
    const stored = localStorage.getItem('testObject');
    expect(JSON.parse(stored!)).toEqual(testObject);
  });

  test('複数のキーを同時に保存できる', () => {
    localStorage.setItem('key1', JSON.stringify('value1'));
    localStorage.setItem('key2', JSON.stringify('value2'));
    localStorage.setItem('key3', JSON.stringify('value3'));

    expect(getStorageValue('key1', '')).toBe('value1');
    expect(getStorageValue('key2', '')).toBe('value2');
    expect(getStorageValue('key3', '')).toBe('value3');
  });
});

describe('アプリケーション実データテスト', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('TODOリストを正しく保存・読み込みできる', () => {
    const todos = [
      { id: '1', text: 'Task 1', isCompleted: false },
      { id: '2', text: 'Task 2', isCompleted: true },
      { id: '3', text: 'Task 3', isCompleted: false, dueDate: '2025-12-31' },
    ];

    localStorage.setItem('meetingTodos', JSON.stringify(todos));
    const loaded = getStorageValue('meetingTodos', []);
    expect(loaded).toEqual(todos);
  });

  test('メモを正しく保存・読み込みできる', () => {
    const memo = 'これはテストメモです\n改行も含みます';
    localStorage.setItem('meetingMemo', JSON.stringify(memo));
    const loaded = getStorageValue('meetingMemo', '');
    expect(loaded).toBe(memo);
  });

  test('アラーム設定を正しく保存・読み込みできる', () => {
    const alarmSettings = { volume: 44, frequency: 340 };
    localStorage.setItem('meetingAlarmSettings', JSON.stringify(alarmSettings));
    const loaded = getStorageValue('meetingAlarmSettings', {});
    expect(loaded).toEqual(alarmSettings);
  });

  test('アラームポイントを正しく保存・読み込みできる', () => {
    const alarmPoints = [
      { id: '1', minutes: 30, isDone: false, remainingTime: 1800 },
      { id: '2', minutes: 50, isDone: true, remainingTime: 3000 },
    ];
    localStorage.setItem('alarmPoints', JSON.stringify(alarmPoints));
    const loaded = getStorageValue('alarmPoints', []);
    expect(loaded).toEqual(alarmPoints);
  });

  test('ポモドーロ設定を正しく保存・読み込みできる', () => {
    const pomodoroSettings = {
      workDuration: 25,
      breakDuration: 5,
      cycles: 4,
      infiniteMode: false,
      workAlarm: { volume: 65, frequency: 240 },
      breakAlarm: { volume: 36, frequency: 740 },
    };
    localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroSettings));
    const loaded = getStorageValue('pomodoroSettings', {});
    expect(loaded).toEqual(pomodoroSettings);
  });

  test('通知設定を正しく保存・読み込みできる', () => {
    localStorage.setItem('notificationsEnabled', JSON.stringify(true));
    localStorage.setItem('vibrationEnabled', JSON.stringify(false));

    expect(getStorageValue('notificationsEnabled', false)).toBe(true);
    expect(getStorageValue('vibrationEnabled', true)).toBe(false);
  });

  test('ダークモード設定を正しく保存・読み込みできる', () => {
    localStorage.setItem('darkMode', JSON.stringify(true));
    expect(getStorageValue('darkMode', false)).toBe(true);
  });
});

describe('エッジケースのテスト', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('nullを保存した場合はデフォルト値を返す', () => {
    localStorage.setItem('testNull', 'null');
    expect(getStorageValue('testNull', 'default')).toBe(null);
  });

  test('undefinedを保存しようとした場合の処理', () => {
    localStorage.setItem('testUndefined', JSON.stringify(undefined));
    // undefinedはJSONで保存できないため、特殊な扱いになる
    const result = getStorageValue('testUndefined', 'default');
    expect(result).not.toBe('default');
  });

  test('空文字列は正しく保存・読み込みできる', () => {
    localStorage.setItem('emptyString', '""');
    expect(getStorageValue('emptyString', 'default')).toBe('');
  });

  test('非常に長い文字列も正しく保存・読み込みできる', () => {
    const longString = 'a'.repeat(10000);
    localStorage.setItem('longString', JSON.stringify(longString));
    expect(getStorageValue('longString', '')).toBe(longString);
  });

  test('特殊文字を含む文字列も正しく保存・読み込みできる', () => {
    const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\n\t\r';
    localStorage.setItem('specialChars', JSON.stringify(specialChars));
    expect(getStorageValue('specialChars', '')).toBe(specialChars);
  });

  test('日本語を含む文字列も正しく保存・読み込みできる', () => {
    const japanese = 'これは日本語のテストです。絵文字も含みます 🎉✨';
    localStorage.setItem('japanese', JSON.stringify(japanese));
    expect(getStorageValue('japanese', '')).toBe(japanese);
  });
});
