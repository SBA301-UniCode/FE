import { Page } from '@playwright/test';

/**
 * Đảm bảo ứng dụng đang hiển thị tiếng Việt.
 * LƯU Ý: Hàm này PHẢI được gọi TRƯỚC khi gọi page.goto()
 */
export async function ensureVietnamese(page: Page) {
  // Inject script để chèn localStorage ngay khi browser được khởi tạo
  await page.addInitScript(() => {
    window.localStorage.setItem('i18nextLng', 'vi');
  });
}

/**
 * Click fallback nếu UI vẫn còn cứng đầu
 */
export async function fallbackLanguageClick(page: Page) {
  await page.waitForLoadState('networkidle');
  const langToggleEN = page.locator('button').filter({ hasText: '🌐 VN' });
  if (await langToggleEN.isVisible({ timeout: 1000 }).catch(() => false)) {
    await langToggleEN.click();
    await page.waitForTimeout(500); 
  }
}

/**
 * Chờ login redirect xong — kiểm tra URL đã rời khỏi /login VÀ token đã lưu
 */
async function waitForLoginRedirect(page: Page) {
  // Đợi URL không còn chứa /login
  await page.waitForFunction(
    () => !window.location.pathname.includes('/login'),
    { timeout: 20000 }
  );
  // Đợi token xuất hiện trong localStorage (cần cho navigation tiếp theo)
  await page.waitForFunction(
    () => !!localStorage.getItem('accessToken') || !!sessionStorage.getItem('accessToken'),
    { timeout: 10000 }
  );
  await page.waitForLoadState('networkidle');
  // Buffer nhỏ để React hoàn tất re-render
  await page.waitForTimeout(500);
}

/**
 * Helper đăng nhập Admin
 */
export async function loginAsAdmin(page: Page) {
  await ensureVietnamese(page);
  await page.goto('/login');
  await fallbackLanguageClick(page);
  
  await page.fill('#username', 'admin@coursera.vn');
  await page.fill('#password', '123456');
  // Tick "Ghi nhớ đăng nhập" để token lưu vào localStorage (persist qua navigations)
  const rememberCheckbox = page.locator('input[type="checkbox"]').first();
  if (await rememberCheckbox.isVisible().catch(() => false)) {
    await rememberCheckbox.check();
  }
  await page.locator('button[type="submit"]').click();
  await waitForLoginRedirect(page);
}

/**
 * Helper đăng nhập Learner
 */
export async function loginAsLearner(page: Page) {
  await ensureVietnamese(page);
  await page.goto('/login');
  await fallbackLanguageClick(page);

  await page.fill('#username', 'student1@coursera.vn');
  await page.fill('#password', '123456');
  // Tick "Ghi nhớ đăng nhập" để token lưu vào localStorage (persist qua navigations)
  const rememberCheckbox = page.locator('input[type="checkbox"]').first();
  if (await rememberCheckbox.isVisible().catch(() => false)) {
    await rememberCheckbox.check();
  }
  await page.locator('button[type="submit"]').click();
  await waitForLoginRedirect(page);
}

