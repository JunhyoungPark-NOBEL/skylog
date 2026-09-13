import { expect, type Page } from '@playwright/test';

/** 하늘의 접이식 이동 메뉴를 실제 조작한 뒤 기존 탭 목적지로 이동한다. */
export async function selectTab(page: Page, tab: string) {
  const button = page.getByTestId(`tab-${tab}`);
  if (!(await button.isVisible())) await page.getByTestId('nav-toggle').click();
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('aria-selected', 'true');
}
