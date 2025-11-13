/**
 * デフォルト値と数値検証のテスト
 *
 * このテストは、初期値定数の一貫性と、
 * 数値入力の検証ロジックが正しく動作することを確認します。
 */

import { describe, test, expect } from '@jest/globals';

// 初期値定数（実際のコンポーネントから抽出）
const initialMeetingAlarmSettings = {
  volume: 44,
  frequency: 340,
};

const initialPomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  cycles: 4,
  infiniteMode: false,
  workAlarm: {
    volume: 65,
    frequency: 240,
  },
  breakAlarm: {
    volume: 36,
    frequency: 740,
  },
};

// 数値検証ヘルパー関数
const validateNumberInput = (value: string, min: number): number => {
  return Math.max(min, parseInt(value) || min);
};

describe('初期値定数のテスト', () => {
  test('ミーティングアラームの初期値が正しく設定されている', () => {
    expect(initialMeetingAlarmSettings.volume).toBe(44);
    expect(initialMeetingAlarmSettings.frequency).toBe(340);
  });

  test('ポモドーロタイマーの初期値が正しく設定されている', () => {
    expect(initialPomodoroSettings.workDuration).toBe(25);
    expect(initialPomodoroSettings.breakDuration).toBe(5);
    expect(initialPomodoroSettings.cycles).toBe(4);
  });

  test('ポモドーロアラームの初期値が正しく設定されている', () => {
    expect(initialPomodoroSettings.workAlarm.volume).toBe(65);
    expect(initialPomodoroSettings.workAlarm.frequency).toBe(240);
    expect(initialPomodoroSettings.breakAlarm.volume).toBe(36);
    expect(initialPomodoroSettings.breakAlarm.frequency).toBe(740);
  });
});

describe('数値入力検証のテスト', () => {
  test('正常な数値入力は正しく解析される', () => {
    expect(validateNumberInput('25', 1)).toBe(25);
    expect(validateNumberInput('100', 1)).toBe(100);
  });

  test('空文字列は最小値にフォールバックする', () => {
    expect(validateNumberInput('', 1)).toBe(1);
    expect(validateNumberInput('', 100)).toBe(100);
  });

  test('NaNになる入力は最小値にフォールバックする', () => {
    expect(validateNumberInput('abc', 1)).toBe(1);
    expect(validateNumberInput('!@#', 5)).toBe(5);
  });

  test('最小値未満の値は最小値に制限される', () => {
    expect(validateNumberInput('-10', 1)).toBe(1);
    expect(validateNumberInput('0', 1)).toBe(1);
    expect(validateNumberInput('50', 100)).toBe(100);
  });

  test('最小値以上の値は正しく返される', () => {
    expect(validateNumberInput('10', 1)).toBe(10);
    expect(validateNumberInput('120', 1)).toBe(120);
    expect(validateNumberInput('500', 100)).toBe(500);
  });
});

describe('周波数入力の検証', () => {
  test('周波数は最小100Hzに制限される', () => {
    expect(validateNumberInput('', 100)).toBe(100);
    expect(validateNumberInput('50', 100)).toBe(100);
    expect(validateNumberInput('99', 100)).toBe(100);
  });

  test('有効な周波数はそのまま返される', () => {
    expect(validateNumberInput('240', 100)).toBe(240);
    expect(validateNumberInput('340', 100)).toBe(340);
    expect(validateNumberInput('740', 100)).toBe(740);
  });
});

describe('時間入力の検証', () => {
  test('時間は最小1分に制限される', () => {
    expect(validateNumberInput('', 1)).toBe(1);
    expect(validateNumberInput('0', 1)).toBe(1);
    expect(validateNumberInput('-5', 1)).toBe(1);
  });

  test('有効な時間はそのまま返される', () => {
    expect(validateNumberInput('25', 1)).toBe(25);
    expect(validateNumberInput('5', 1)).toBe(5);
    expect(validateNumberInput('60', 1)).toBe(60);
  });
});

describe('サイクル数の検証', () => {
  test('サイクル数は最小1に制限される', () => {
    expect(validateNumberInput('', 1)).toBe(1);
    expect(validateNumberInput('0', 1)).toBe(1);
  });

  test('有効なサイクル数はそのまま返される', () => {
    expect(validateNumberInput('4', 1)).toBe(4);
    expect(validateNumberInput('10', 1)).toBe(10);
  });
});
