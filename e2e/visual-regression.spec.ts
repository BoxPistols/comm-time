import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should match screenshot of meeting timer tab', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Take screenshot of meeting timer
    await expect(page).toHaveScreenshot('meeting-timer.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match screenshot of pomodoro timer tab', async ({ page }) => {
    await page.goto('/');

    // Switch to pomodoro tab
    await page.locator('text=Pomodoro Timer').click();
    await page.waitForLoadState('networkidle');

    // Take screenshot of pomodoro timer
    await expect(page).toHaveScreenshot('pomodoro-timer.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match screenshot with TODOs', async ({ page }) => {
    await page.goto('/');

    // Add multiple TODOs
    const todoInput = page.locator('input[placeholder*="新しいTODO"]');
    await todoInput.fill('TODO 1: Design review');
    await todoInput.press('Enter');
    await todoInput.fill('TODO 2: Code implementation');
    await todoInput.press('Enter');
    await todoInput.fill('TODO 3: Testing');
    await todoInput.press('Enter');

    // Complete one TODO
    await page.locator('button[title="完了/未完了を切り替え"]').first().click();

    await page.waitForTimeout(500);

    // Take screenshot
    await expect(page).toHaveScreenshot('with-todos.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match screenshot with memo', async ({ page }) => {
    await page.goto('/');

    // Add memo
    const memoTextarea = page.locator('textarea[placeholder*="メモを入力"]').first();
    await memoTextarea.fill('Meeting Notes:\n\n- Discussed project timeline\n- Reviewed design mockups\n- Assigned action items');

    await page.waitForTimeout(500);

    // Take screenshot
    await expect(page).toHaveScreenshot('with-memo.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match screenshot in dark mode', async ({ page }) => {
    await page.goto('/');

    // Enable dark mode
    const darkModeButton = page.locator('button[title*="ダークモード"]').or(
      page.locator('button').filter({ has: page.locator('[class*="moon"]').or(page.locator('[class*="sun"]')) })
    );
    await darkModeButton.click();

    await page.waitForTimeout(500);

    // Take screenshot in dark mode
    await expect(page).toHaveScreenshot('dark-mode.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match screenshot of running meeting timer', async ({ page }) => {
    await page.goto('/');

    // Start meeting timer
    await page.locator('button:has-text("Start")').first().click();

    // Wait for timer to update
    await page.waitForTimeout(2000);

    // Take screenshot
    await expect(page).toHaveScreenshot('meeting-timer-running.png', {
      fullPage: true,
      animations: 'disabled',
      // Mask the timer digits to avoid flakiness
      mask: [page.locator('text=/\\d{2}:\\d{2}:\\d{2}/')],
    });
  });

  test('should match screenshot of running pomodoro timer', async ({ page }) => {
    await page.goto('/');

    // Switch to pomodoro tab
    await page.locator('text=Pomodoro Timer').click();

    // Start pomodoro timer
    await page.locator('button:has-text("Start")').first().click();

    // Wait for timer to update
    await page.waitForTimeout(2000);

    // Take screenshot
    await expect(page).toHaveScreenshot('pomodoro-timer-running.png', {
      fullPage: true,
      animations: 'disabled',
      // Mask the timer digits to avoid flakiness
      mask: [page.locator('text=/\\d{2}:\\d{2}/')],
    });
  });

  test('should match screenshot of bulk delete buttons', async ({ page }) => {
    await page.goto('/');

    // Add TODOs to show the delete buttons
    const todoInput = page.locator('input[placeholder*="新しいTODO"]');
    await todoInput.fill('TODO 1');
    await todoInput.press('Enter');
    await todoInput.fill('TODO 2');
    await todoInput.press('Enter');

    await page.waitForTimeout(500);

    // Focus on the TODO section to show the buttons clearly
    const todoSection = page.locator('text=✅ TODOリスト').locator('..');

    await expect(todoSection).toHaveScreenshot('bulk-delete-buttons.png', {
      animations: 'disabled',
    });
  });

  test('should match screenshot on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await expect(page).toHaveScreenshot('mobile-view.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match screenshot on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await expect(page).toHaveScreenshot('tablet-view.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match screenshot of alarm points section', async ({ page }) => {
    await page.goto('/');

    // Scroll to alarm points section
    const alarmPointsSection = page.locator('text=Alarm Points').or(page.locator('text=アラームポイント')).locator('..');

    await alarmPointsSection.scrollIntoViewIfNeeded();

    await expect(alarmPointsSection).toHaveScreenshot('alarm-points.png', {
      animations: 'disabled',
    });
  });

  test('should match screenshot with data migration notice', async ({ page }) => {
    // Set old data in localStorage to trigger migration
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('meetingMemo', 'Old meeting memo');
      localStorage.setItem('pomodoroMemo', 'Old pomodoro memo');
      localStorage.setItem('meetingTodos', JSON.stringify([
        { id: '1', text: 'Old meeting TODO', isCompleted: false }
      ]));
    });

    // Reload to trigger migration
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that memo was migrated
    const memoTextarea = page.locator('textarea[placeholder*="メモを入力"]').first();
    const memoValue = await memoTextarea.inputValue();

    // Verify migration happened (both memos should be present)
    expect(memoValue).toContain('Old meeting memo');
    expect(memoValue).toContain('Old pomodoro memo');
    expect(memoValue).toContain('---');

    // Take screenshot after migration
    await expect(page).toHaveScreenshot('after-migration.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
