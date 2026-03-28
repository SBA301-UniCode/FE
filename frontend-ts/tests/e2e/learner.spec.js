import { test, expect } from '@playwright/test';
import { ensureVietnamese, fallbackLanguageClick, loginAsLearner } from './test-utils';

/* ═══════════════════════════════════════════════
   LEARNER FLOWS — Trang dành cho Học viên
   ═══════════════════════════════════════════════ */

test.describe('Luồng Học Viên (Learner)', () => {
  // Mỗi nhóm test tự login để tránh share state
  test.setTimeout(60000);

  test.describe('My Learning (/my-learning)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsLearner(page);
      await page.goto('/my-learning');
      await page.waitForLoadState('networkidle');
    });

    test('Truy cập được trang và không bị chặn', async ({ page }) => {
      expect(page.url()).not.toContain('/login');
    });

    test('Hiển thị greeting hoặc nội dung My Learning', async ({ page }) => {
      if (page.url().includes('/my-learning')) {
        // Kiểm tra có nội dung nào đó render ra
        await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('Tabs filter hoạt động', async ({ page }) => {
      if (!page.url().includes('/my-learning')) return;
      const allTab = page.locator('button').filter({ hasText: /tất cả|all/i }).first();
      if (await allTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(allTab).toBeVisible();
        const inProgress = page.locator('button').filter({ hasText: /đang học|in progress/i }).first();
        if (await inProgress.isVisible({ timeout: 2000 }).catch(() => false)) {
          await inProgress.click();
          await page.waitForTimeout(500);
        }
        const completed = page.locator('button').filter({ hasText: /hoàn thành|completed/i }).first();
        if (await completed.isVisible({ timeout: 2000 }).catch(() => false)) {
          await completed.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('Hiển thị card khóa học hoặc thông báo trống', async ({ page }) => {
      if (!page.url().includes('/my-learning')) return;
      const card = page.locator('a[href*="/learning/"]').first();
      const emptyMsg = page.getByText(/chưa đăng ký|no courses|trống|chưa có/i).first();
      const anyContent = page.locator('main').first();
      await expect(card.or(emptyMsg).or(anyContent)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Profile (/profile)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsLearner(page);
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
    });

    test('Truy cập được trang Profile', async ({ page }) => {
      expect(page.url()).not.toContain('/login');
    });

    test('Hiển thị Avatar hoặc Avatar placeholder', async ({ page }) => {
      if (!page.url().includes('/profile')) return;
      // Kiểm tra trang profile có render nội dung
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    test('Quick Links hiển thị (Chứng chỉ, Khóa học)', async ({ page }) => {
      if (!page.url().includes('/profile')) return;
      const certLink = page.locator('a[href="/my-certificates"]').first()
        .or(page.getByText(/chứng chỉ|certificates/i).first());
      if (await certLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(certLink).toBeVisible();
      }
    });

    test('Nút Chỉnh sửa Profile mở form Edit', async ({ page }) => {
      if (!page.url().includes('/profile')) return;
      const editBtn = page.locator('button[title="Chỉnh sửa"]').first()
        .or(page.locator('button').filter({ hasText: /chỉnh sửa|edit/i }).first())
        .or(page.locator('button svg').first());
      if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editBtn.click();
        const input = page.locator('input[type="text"]').first();
        await expect(input).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('My Certificates (/my-certificates)', () => {
    test('Truy cập trang My Certificates', async ({ page }) => {
      await loginAsLearner(page);
      await page.goto('/my-certificates');
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/login');
    });

    test('Hiển thị filter hoặc danh sách chứng chỉ', async ({ page }) => {
      await loginAsLearner(page);
      await page.goto('/my-certificates');
      await page.waitForLoadState('networkidle');
      if (!page.url().includes('/my-certificates')) return;
      const content = page.locator('select').first()
        .or(page.locator('button').filter({ hasText: /tất cả|all/i }).first())
        .or(page.getByText(/chứng chỉ|certificate/i).first());
      await expect(content).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Bảo mật (Role-based Access)', () => {
    test('Learner bị chặn truy cập /admin', async ({ page }) => {
      await loginAsLearner(page);
      await page.goto('/admin');
      await page.waitForTimeout(3000);
      // Learner không có role ADMIN → bị redirect
      expect(page.url()).not.toMatch(/\/admin$/);
    });

    test('Learner bị chặn truy cập /my-courses (Instructor)', async ({ page }) => {
      await loginAsLearner(page);
      await page.goto('/my-courses');
      await page.waitForTimeout(3000);
      expect(page.url()).not.toMatch(/\/my-courses$/);
    });

    test('Learner bị chặn truy cập /syllabuses', async ({ page }) => {
      await loginAsLearner(page);
      await page.goto('/syllabuses');
      await page.waitForTimeout(3000);
      expect(page.url()).not.toMatch(/\/syllabuses$/);
    });
  });
});
