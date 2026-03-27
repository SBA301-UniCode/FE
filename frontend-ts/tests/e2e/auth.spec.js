import { test, expect } from '@playwright/test';
import { ensureVietnamese, fallbackLanguageClick } from './test-utils';

/* ═══════════════════════════════════════════════
   AUTH FLOWS — Đăng Nhập & Đăng Ký
   ═══════════════════════════════════════════════ */

test.describe('Luồng Đăng nhập (Login)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureVietnamese(page);
    await page.goto('/login');
    await fallbackLanguageClick(page);
  });

  test('Hiển thị đầy đủ form đăng nhập', async ({ page }) => {
    await expect(page.locator('#username')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Nút submit hiển thị text Đăng nhập', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toContainText(/đăng nhập|login|sign in/i);
  });

  test('Nút Google Login hiển thị', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: 'Google' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Checkbox Ghi nhớ đăng nhập', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test('Link Quên mật khẩu hiển thị', async ({ page }) => {
    await expect(page.getByText(/quên mật khẩu|forgot/i).first()).toBeVisible();
  });

  test('Hiện/Ẩn mật khẩu khi click toggle', async ({ page }) => {
    const passwordInput = page.locator('#password');
    const toggleBtn = page.locator('button[aria-label="Hiện/Ẩn mật khẩu"]');

    await passwordInput.fill('testpassword');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    if (await toggleBtn.isVisible().catch(() => false)) {
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('Đăng nhập sai hiển thị thông báo lỗi', async ({ page }) => {
    await page.fill('#username', 'wronguser@test.com');
    await page.fill('#password', 'wrongpassword');
    await page.locator('button[type="submit"]').click();
    // Error message
    await expect(
      page.locator('.bg-red-50').or(page.locator('.text-red-500')).or(page.locator('.text-red-600'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('Đăng nhập với trường trống không gửi form', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('Đăng nhập thành công với tài khoản Learner', async ({ page }) => {
    await page.fill('#username', 'student1@coursera.vn');
    await page.fill('#password', '123456');
    const rememberCheckbox = page.locator('input[type="checkbox"]').first();
    if (await rememberCheckbox.isVisible().catch(() => false)) {
      await rememberCheckbox.check();
    }
    await page.locator('button[type="submit"]').click();

    await page.waitForFunction(
      () => !window.location.pathname.includes('/login'),
      { timeout: 20000 }
    );
    // Xác nhận đã rời trang login
    expect(page.url()).not.toContain('/login');
  });

  test('Đăng nhập thành công với tài khoản Admin', async ({ page }) => {
    await page.fill('#username', 'admin@coursera.vn');
    await page.fill('#password', '123456');
    const rememberCheckbox = page.locator('input[type="checkbox"]').first();
    if (await rememberCheckbox.isVisible().catch(() => false)) {
      await rememberCheckbox.check();
    }
    await page.locator('button[type="submit"]').click();

    await page.waitForFunction(
      () => !window.location.pathname.includes('/login'),
      { timeout: 20000 }
    );
    await page.waitForLoadState('networkidle');
  });

  test('Link Đăng ký điều hướng sang /register', async ({ page }) => {
    const registerLink = page.locator('a[href="/register"]').first();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Luồng Đăng ký (Register)', () => {
  test.beforeEach(async ({ page }) => {
    await ensureVietnamese(page);
    await page.goto('/register');
    await fallbackLanguageClick(page);
  });

  test('Hiển thị đầy đủ form đăng ký', async ({ page }) => {
    await expect(page.locator('#reg-name')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#reg-email')).toBeVisible();
    await expect(page.locator('#reg-password')).toBeVisible();
    await expect(page.locator('#reg-confirm')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Nút submit hiển thị text Tạo tài khoản', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toContainText(/tạo tài khoản|register|sign up/i);
  });

  test('Validate độ dài mật khẩu ngắn', async ({ page }) => {
    await page.fill('#reg-name', 'Test User');
    await page.fill('#reg-email', 'test@example.com');
    await page.fill('#reg-password', '123');
    await page.fill('#reg-confirm', '123');
    await page.locator('button[type="submit"]').click();
    await expect(
      page.locator('.bg-red-50').or(page.getByText(/tối thiểu|minimum|short/i).first())
    ).toBeVisible({ timeout: 5000 });
  });

  test('Validate mật khẩu xác nhận không khớp', async ({ page }) => {
    await page.fill('#reg-password', '123456');
    await page.fill('#reg-confirm', '654321');
    await expect(
      page.locator('.text-red-500').or(page.getByText(/không khớp|not match/i).first())
    ).toBeVisible({ timeout: 5000 });
  });

  test('Thanh đo độ mạnh mật khẩu', async ({ page }) => {
    await page.fill('#reg-password', 'abc');
    await expect(page.getByText(/yếu|weak/i).first()).toBeVisible({ timeout: 3000 });

    await page.fill('#reg-password', 'abcdefghij1@');
    await expect(page.getByText(/mạnh|strong/i).first()).toBeVisible({ timeout: 3000 });
  });

  test('Nút Login chuyển hướng về /login', async ({ page }) => {
    await page.locator('a[href="/login"]').first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});
