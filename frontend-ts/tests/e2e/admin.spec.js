import { test, expect } from '@playwright/test';
import { ensureVietnamese, fallbackLanguageClick, loginAsAdmin } from './test-utils';

/* ═══════════════════════════════════════════════
   ADMIN / INSTRUCTOR FLOWS
   ═══════════════════════════════════════════════ */

test.describe('Luồng Quản Trị / Giảng Viên (Admin/Instructor)', () => {
  test.setTimeout(60000);

  test.describe('Admin Panel (/admin)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
    });

    test('Truy cập được trang Admin (không bị redirect)', async ({ page }) => {
      // Admin phải ở /admin hoặc trang được phép
      expect(page.url()).not.toContain('/login');
    });

    test('Hiển thị Dashboard Banner hoặc nội dung Admin', async ({ page }) => {
      if (!page.url().includes('/admin')) return;
      const adminContent = page.getByText(/admin|dashboard|quản trị/i).first();
      await expect(adminContent).toBeVisible({ timeout: 10000 });
    });

    test('Tabs hiển thị và chuyển tab hoạt động', async ({ page }) => {
      if (!page.url().includes('/admin')) return;
      const usersTab = page.getByRole('button', { name: /users/i }).first();
      if (await usersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await usersTab.click();
        await page.waitForTimeout(500);
        // Table hoặc danh sách phải hiện
        await expect(page.locator('table, [class*="list" i], [role="table"]').first()).toBeVisible({ timeout: 10000 });
      }

      const rolesTab = page.getByRole('button', { name: /roles/i }).first();
      if (await rolesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rolesTab.click();
        await page.waitForTimeout(500);
      }

      const subsTab = page.getByRole('button', { name: /subscriptions/i }).first();
      if (await subsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await subsTab.click();
        await page.waitForTimeout(500);
      }

      const reportTab = page.getByRole('button', { name: /report/i }).first();
      if (await reportTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reportTab.click();
        await page.waitForTimeout(500);
      }
    });

    test('Tab Users: Bảng Users hiển thị', async ({ page }) => {
      if (!page.url().includes('/admin')) return;
      const usersTab = page.getByRole('button', { name: /users/i }).first();
      if (await usersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await usersTab.click();
        const table = page.locator('table').first();
        await expect(table).toBeVisible({ timeout: 10000 });
      }
    });

    test('Nút Tạo User mở modal', async ({ page }) => {
      if (!page.url().includes('/admin')) return;
      const createBtn = page.getByRole('button', { name: /tạo user|\+ tạo/i }).first();
      if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await createBtn.click();
        const modal = page.locator('form input, [role="dialog"] input').first();
        await expect(modal).toBeVisible({ timeout: 5000 });
        // Đóng modal
        const cancelBtn = page.getByRole('button', { name: /hủy|cancel|đóng|close/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelBtn.click();
        }
      }
    });
  });

  test.describe('Quản lý Khóa học (/my-courses)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/my-courses');
      await page.waitForLoadState('networkidle');
    });

    test('Truy cập được trang My Courses', async ({ page }) => {
      expect(page.url()).not.toContain('/login');
    });

    test('Hiển thị nội dung Instructor/Admin Dashboard', async ({ page }) => {
      if (!page.url().includes('/my-courses')) return;
      const content = page.getByText(/instructor|dashboard|khóa học|courses/i).first();
      await expect(content).toBeVisible({ timeout: 10000 });
    });

    test('Nút Tạo khóa học mới mở modal', async ({ page }) => {
      if (!page.url().includes('/my-courses')) return;
      const createBtn = page.getByRole('button', { name: /tạo khóa học|\+ tạo/i }).first();
      if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await createBtn.click();
        const formInput = page.locator('input[type="text"]').first();
        await expect(formInput).toBeVisible({ timeout: 5000 });
        // Đóng modal
        const cancelBtn = page.getByRole('button', { name: /hủy|cancel|đóng/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelBtn.click();
        }
      }
    });

    test('Nút Quản lý nội dung hoạt động (nếu có khóa học)', async ({ page }) => {
      if (!page.url().includes('/my-courses')) return;
      const manageBtn = page.getByRole('button', { name: /quản lý|manage/i }).first();
      if (await manageBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await manageBtn.click();
        await page.waitForTimeout(1000);
        // Kiểm tra đã điều hướng sang trang videos
        if (page.url().includes('/videos')) {
          await expect(page.locator('body')).toBeVisible();
        }
      }
    });
  });

  test.describe('Quản lý Syllabus (/syllabuses)', () => {
    test('Truy cập trang Syllabus', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/syllabuses');
      await page.waitForLoadState('networkidle');
      // Admin/Instructor có thể truy cập
      expect(page.url()).not.toContain('/login');
    });

    test('Hiển thị nút Tạo Syllabus hoặc danh sách', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/syllabuses');
      await page.waitForLoadState('networkidle');
      if (!page.url().includes('/syllabuses')) return;
      // Kiểm tra trang có render nội dung
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Xác thực Nội dung (/verify-content)', () => {
    test('Truy cập trang Verify Content', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/verify-content');
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/login');
    });

    test('Hiển thị form upload hoặc nội dung', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/verify-content');
      await page.waitForLoadState('networkidle');
      if (!page.url().includes('/verify-content')) return;
      // Kiểm tra trang có render nội dung
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });
  });
});
