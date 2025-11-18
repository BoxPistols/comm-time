import { test, expect } from '@playwright/test';

test.describe('Comm Time E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should display the main page', async ({ page }) => {
    await page.goto('/');

    // Check that the title is visible
    await expect(page.locator('text=Comm Time')).toBeVisible();

    // Check that both tabs are visible
    await expect(page.locator('text=Meeting Timer')).toBeVisible();
    await expect(page.locator('text=Pomodoro Timer')).toBeVisible();
  });

  test('should switch between meeting and pomodoro tabs', async ({ page }) => {
    await page.goto('/');

    // Default tab should be meeting
    const meetingTab = page.locator('text=Meeting Timer');
    await expect(meetingTab).toHaveClass(/bg-white/);

    // Click on pomodoro tab
    const pomodoroTab = page.locator('text=Pomodoro Timer');
    await pomodoroTab.click();

    // Pomodoro tab should be active
    await expect(pomodoroTab).toHaveClass(/bg-white/);

    // Check that pomodoro timer is displayed
    await expect(page.locator('text=🎯 Work Time')).toBeVisible();
  });

  test('should persist active tab after reload', async ({ page }) => {
    await page.goto('/');

    // Switch to pomodoro tab
    await page.locator('text=Pomodoro Timer').click();

    // Reload the page
    await page.reload();

    // Pomodoro tab should still be active
    const pomodoroTab = page.locator('text=Pomodoro Timer');
    await expect(pomodoroTab).toHaveClass(/bg-white/);
  });

  test('should add and display TODO', async ({ page }) => {
    await page.goto('/');

    // Find TODO input
    const todoInput = page.locator('input[placeholder*="新しいTODO"]');

    // Add a TODO
    await todoInput.fill('Test TODO Item');
    await todoInput.press('Enter');

    // Check that TODO is displayed
    await expect(page.locator('text=Test TODO Item')).toBeVisible();
  });

  test('should share TODOs between tabs', async ({ page }) => {
    await page.goto('/');

    // Add TODO in meeting tab
    const todoInput = page.locator('input[placeholder*="新しいTODO"]');
    await todoInput.fill('Shared TODO');
    await todoInput.press('Enter');

    // Switch to pomodoro tab
    await page.locator('text=Pomodoro Timer').click();

    // Check that the same TODO is visible
    await expect(page.locator('text=Shared TODO')).toBeVisible();
  });

  test('should add and display memo', async ({ page }) => {
    await page.goto('/');

    // Find memo textarea
    const memoTextarea = page.locator('textarea[placeholder*="メモを入力"]').first();

    // Add memo
    await memoTextarea.fill('Test memo content');

    // Wait for localStorage to be updated
    await page.waitForTimeout(500);

    // Check that memo persists
    await expect(memoTextarea).toHaveValue('Test memo content');
  });

  test('should share memos between tabs', async ({ page }) => {
    await page.goto('/');

    // Add memo in meeting tab
    const memoTextarea = page.locator('textarea[placeholder*="メモを入力"]').first();
    await memoTextarea.fill('Shared memo');

    // Wait for localStorage
    await page.waitForTimeout(500);

    // Switch to pomodoro tab
    await page.locator('text=Pomodoro Timer').click();

    // Check that the same memo is visible
    const pomodoroMemo = page.locator('textarea[placeholder*="メモを入力"]').first();
    await expect(pomodoroMemo).toHaveValue('Shared memo');
  });

  test('should complete TODO', async ({ page }) => {
    await page.goto('/');

    // Add TODO
    const todoInput = page.locator('input[placeholder*="新しいTODO"]');
    await todoInput.fill('TODO to complete');
    await todoInput.press('Enter');

    // Click on checkbox to complete TODO
    await page.locator('button[title="完了/未完了を切り替え"]').first().click();

    // TODO should have strikethrough style
    const todoText = page.locator('text=TODO to complete');
    await expect(todoText).toHaveClass(/line-through/);
  });

  test('should delete TODO', async ({ page }) => {
    await page.goto('/');

    // Add TODO
    const todoInput = page.locator('input[placeholder*="新しいTODO"]');
    await todoInput.fill('TODO to delete');
    await todoInput.press('Enter');

    // Click delete button
    await page.locator('button[title="削除"]').first().click();

    // TODO should be removed
    await expect(page.locator('text=TODO to delete')).not.toBeVisible();
  });

  test('should clear all TODOs with confirmation', async ({ page }) => {
    await page.goto('/');

    // Add multiple TODOs
    const todoInput = page.locator('input[placeholder*="新しいTODO"]');
    await todoInput.fill('TODO 1');
    await todoInput.press('Enter');
    await todoInput.fill('TODO 2');
    await todoInput.press('Enter');

    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());

    // Click clear all button
    await page.locator('button[title="すべて削除"]').click();

    // All TODOs should be removed
    await expect(page.locator('text=TODO 1')).not.toBeVisible();
    await expect(page.locator('text=TODO 2')).not.toBeVisible();
  });

  test('should clear completed TODOs only', async ({ page }) => {
    await page.goto('/');

    // Add multiple TODOs
    const todoInput = page.locator('input[placeholder*="新しいTODO"]');
    await todoInput.fill('Completed TODO');
    await todoInput.press('Enter');
    await todoInput.fill('Pending TODO');
    await todoInput.press('Enter');

    // Complete first TODO
    await page.locator('button[title="完了/未完了を切り替え"]').first().click();

    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());

    // Click clear completed button
    await page.locator('button[title="完了済みを削除"]').click();

    // Only completed TODO should be removed
    await expect(page.locator('text=Completed TODO')).not.toBeVisible();
    await expect(page.locator('text=Pending TODO')).toBeVisible();
  });

  test('should clear memo with confirmation', async ({ page }) => {
    await page.goto('/');

    // Add memo
    const memoTextarea = page.locator('textarea[placeholder*="メモを入力"]').first();
    await memoTextarea.fill('Memo to clear');

    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());

    // Click clear button
    await page.locator('button[title="メモをクリア"]').click();

    // Memo should be cleared
    await expect(memoTextarea).toHaveValue('');
  });

  test('should start and stop meeting timer', async ({ page }) => {
    await page.goto('/');

    // Click start button
    await page.locator('button:has-text("Start")').first().click();

    // Timer should be running (Pause button should be visible)
    await expect(page.locator('button:has-text("Pause")')).toBeVisible();

    // Wait a bit
    await page.waitForTimeout(1000);

    // Timer should show elapsed time (not 00:00:00)
    const timerDisplay = page.locator('text=/\\d{2}:\\d{2}:\\d{2}/').first();
    const timerText = await timerDisplay.textContent();
    expect(timerText).not.toBe('00:00:00');

    // Click pause button
    await page.locator('button:has-text("Pause")').click();

    // Start button should be visible again
    await expect(page.locator('button:has-text("Start")').first()).toBeVisible();
  });

  test('should start and stop pomodoro timer', async ({ page }) => {
    await page.goto('/');

    // Switch to pomodoro tab
    await page.locator('text=Pomodoro Timer').click();

    // Click start button
    await page.locator('button:has-text("Start")').first().click();

    // Timer should be running
    await expect(page.locator('button:has-text("Pause")')).toBeVisible();

    // Work time indicator should be visible
    await expect(page.locator('text=🎯 Work Time')).toBeVisible();

    // Click pause button
    await page.locator('button:has-text("Pause")').click();

    // Start button should be visible again
    await expect(page.locator('button:has-text("Start")').first()).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/');

    // Find dark mode toggle button
    const darkModeButton = page.locator('button[title*="ダークモード"]').or(
      page.locator('button').filter({ has: page.locator('[class*="moon"]').or(page.locator('[class*="sun"]')) })
    );

    // Click to toggle dark mode
    await darkModeButton.click();

    // Check that dark mode class is applied to body or html
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Click again to toggle back
    await darkModeButton.click();

    // Dark mode class should be removed
    await expect(html).not.toHaveClass(/dark/);
  });

  test('should persist data after reload', async ({ page }) => {
    await page.goto('/');

    // Add TODO
    const todoInput = page.locator('input[placeholder*="新しいTODO"]');
    await todoInput.fill('Persistent TODO');
    await todoInput.press('Enter');

    // Add memo
    const memoTextarea = page.locator('textarea[placeholder*="メモを入力"]').first();
    await memoTextarea.fill('Persistent memo');

    // Wait for localStorage
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();

    // Check that TODO and memo persist
    await expect(page.locator('text=Persistent TODO')).toBeVisible();
    await expect(memoTextarea).toHaveValue('Persistent memo');
  });
});
