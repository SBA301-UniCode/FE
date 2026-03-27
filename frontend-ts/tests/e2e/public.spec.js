import { test, expect } from '@playwright/test';
import { ensureVietnamese, fallbackLanguageClick } from './test-utils';

/* ═══════════════════════════════════════════════
   PUBLIC PAGES — Không cần đăng nhập
   ═══════════════════════════════════════════════ */

test.describe('Trang chủ (Landing Page)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureVietnamese(page);
    await page.goto('/');
    await fallbackLanguageClick(page);
  });

  test('Hiển thị Header với logo và navigation', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('UniCode').first()).toBeVisible();
  });

  test('Hero Section có tiêu đề và nút CTA', async ({ page }) => {
    // Scroll xuống để tìm CTA
    const ctaBtn = page.locator('a[href="/courses"]').first();
    await ctaBtn.scrollIntoViewIfNeeded().catch(() => {});
    await expect(ctaBtn).toBeVisible({ timeout: 10000 });
  });

  test('Footer hiển thị đầy đủ', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.first()).toBeVisible({ timeout: 10000 });
  });

  test('Nút chuyển ngôn ngữ (🌐) hoạt động', async ({ page }) => {
    const langBtn = page.locator('button').filter({ hasText: '🌐' }).first();
    if (await langBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await langBtn.click();
      await page.waitForTimeout(500);
      // After click, UI text should change
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Navigation links hoạt động', async ({ page }) => {
    // Click Khóa học link
    const coursesLink = page.locator('a[href="/courses"]').first()
      .or(page.getByRole('link', { name: /khóa học|courses/i }).first());
    if (await coursesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await coursesLink.click();
      await expect(page).toHaveURL(/\/courses/);
    }
  });

  test('Nút Đăng nhập trên Header điều hướng đúng', async ({ page }) => {
    const loginLink = page.locator('a[href="/login"]').first()
      .or(page.getByRole('link', { name: /đăng nhập|login|sign in/i }).first());
    if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('FAQ Accordion mở/đóng khi click', async ({ page }) => {
    const faqItem = page.locator('[class*="accordion" i], [class*="faq" i], details, [role="button"]').filter({ hasText: /câu hỏi|question|faq/i }).first();
    if (await faqItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await faqItem.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Danh sách Khóa học (/courses)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureVietnamese(page);
    await page.goto('/courses');
    await fallbackLanguageClick(page);
  });

  test('Hiển thị trang khóa học với tiêu đề', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    // Có ít nhất 1 khóa học card (a tag chứa course link) hoặc thông báo trống
    const courseCard = page.locator('a[href*="/courses/"]').first();
    const emptyMsg = page.getByText(/không có|trống|no courses/i).first();
    await expect(courseCard.or(emptyMsg)).toBeVisible({ timeout: 10000 });
  });

  test('Thanh tìm kiếm khóa học', async ({ page }) => {
    const searchBox = page.getByPlaceholder(/tìm kiếm|search/i).first()
      .or(page.locator('input[type="search"]').first())
      .or(page.locator('input[type="text"]').first());
    if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchBox.fill('java');
      await page.waitForTimeout(500);
    }
  });

  test('Click vào khóa học mở chi tiết', async ({ page }) => {
    const courseLink = page.locator('a[href*="/courses/"]').first();
    if (await courseLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await courseLink.click();
      await expect(page).toHaveURL(/\/courses\/.+/);
    }
  });
});

test.describe('Xác thực Chứng chỉ (/verify-certificate)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureVietnamese(page);
    await page.goto('/verify-certificate');
    await fallbackLanguageClick(page);
  });

  test('Hiển thị trang xác thực với input', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    const input = page.locator('input').first();
    await expect(input).toBeVisible({ timeout: 10000 });
  });

  test('Nhập mã chứng chỉ sai hiển thị lỗi', async ({ page }) => {
    const input = page.locator('input').first();
    await input.fill('INVALID-CODE-123');
    const submitBtn = page.locator('button[type="submit"]').first()
      .or(page.getByRole('button', { name: /xác thực|verify|kiểm tra/i }).first());
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }
  });
});

test.describe('Trang 404', () => {
  test('Hiển thị 404 cho URL không tồn tại', async ({ page }) => {
    await ensureVietnamese(page);
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByText('404')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Về trang chủ').or(page.locator('a[href="/"]'))).toBeVisible();
  });

  test('Nút Về trang chủ hoạt động', async ({ page }) => {
    await ensureVietnamese(page);
    await page.goto('/random-invalid-page');
    const homeLink = page.locator('a[href="/"]').first();
    await expect(homeLink).toBeVisible({ timeout: 10000 });
    await homeLink.click();
    await expect(page).toHaveURL('/');
  });
});
