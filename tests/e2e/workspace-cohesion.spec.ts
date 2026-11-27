import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('distinct tab artwork and the profile hub retain task navigation', async ({
  page,
  context,
}, info) => {
  const session = await createLegacyAccount(context.request, {
    name: 'Tài khoản kiểm thử',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(session.ok()).toBe(true);
  const api = 'http://localhost:3000/api';
  const today = (await (await context.request.get(api + '/repayments')).json()).today;
  const saved = await context.request.post(api + '/simulations', {
    data: {
      requestId: randomUUID(),
      productId: 'personal-flex',
      input: {
        principal: 12_000_000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: today,
      },
    },
  });
  expect(saved.ok()).toBe(true);
  const tracked = await context.request.post(api + '/repayments', {
    data: { simulationId: (await saved.json()).id, title: 'Khoản vay minh họa', confirmed: true },
  });
  expect(tracked.ok()).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const snapshot = async (name: string) => {
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    await page.screenshot({ path: info.outputPath(name + '.png'), animations: 'disabled' });
  };

  await page.goto('/home');
  await expect(page.getByTestId('home-fixed-backdrop')).toBeVisible();
  await snapshot('home-390-reference');
  await page.getByRole('tab', { name: 'Khám phá', exact: true }).click();
  const scene = page.getByTestId('workspace-scene').filter({ visible: true });
  await expect(
    scene.getByRole('heading', { name: 'Thư viện khoản vay', exact: true }),
  ).toBeVisible();
  const sample = page.getByRole('radio', { name: 'Bản mô phỏng mẫu', exact: true });
  await expectedTarget(sample);
  await snapshot('explore-390-light');
  await sample.focus();
  await expect(sample).toBeFocused();
  await page.keyboard.press('Space');
  await expect(sample).toBeChecked();
  await page.getByRole('button', { name: 'Nhập điều khoản của tôi', exact: true }).click();
  await expect(page).toHaveURL(/\/simulate\/custom$/);
  const detail = page.getByTestId('workspace-detail-chrome').filter({ visible: true });
  const back = detail.getByRole('button', { name: 'Quay lại', exact: true });
  await expectedTarget(back);
  await snapshot('simulator-390-light');
  await back.click();
  await expect(sample).toBeChecked();

  await page.getByRole('tab', { name: 'Khoản vay', exact: true }).click();
  await expect(scene.getByRole('heading', { name: 'Khoản vay', exact: true })).toBeVisible();
  const repayments = page.getByRole('tab', { name: 'Lịch trả nợ', exact: true });
  const plans = page.getByRole('tab', { name: 'Bản mô phỏng', exact: true });
  await expect(repayments).toHaveAttribute('aria-selected', 'true');
  await snapshot('loans-390-light');
  await plans.click();
  await expect(plans).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/pane=simulations/);
  await repayments.click();
  await page.getByRole('button', { name: 'Bản đồ dòng tiền 90 ngày', exact: true }).click();
  await page.getByRole('radio', { name: 'Thử dữ liệu mẫu' }).click();
  await expect(page.getByRole('heading', { name: /1\.200\.000/ })).toBeVisible();
  await snapshot('cashflow-390-light');
  await back.click();
  await expect(repayments).toHaveAttribute('aria-selected', 'true');

  await page.goto('/assistant');
  await expect(page.getByTestId('fin-composer')).toBeVisible();
  await snapshot('fin-390-reference');
  await page.goto('/profile');
  const profile = page.getByTestId('profile-cover-card');
  await expect(profile.getByText('Tài khoản kiểm thử')).toBeVisible();
  const cover = (await profile.getByTestId('profile-photo-cover').boundingBox())!;
  const mark = (await profile.getByTestId('profile-monogram').boundingBox())!;
  expect(mark.y).toBeLessThan(cover.y + cover.height);
  expect(mark.y + mark.height).toBeGreaterThan(cover.y + cover.height);
  const section = page.getByTestId('profile-shortcuts');
  await expect(section.getByRole('button')).toHaveCount(4);
  await snapshot('profile-390-light');
  const preferences = section.getByRole('button', { name: 'Đến mục Tùy chọn' });
  await expectedTarget(preferences);
  await preferences.click();
  await expect(page.getByRole('heading', { name: 'Tùy chọn sử dụng' })).toBeInViewport();

  await page.getByRole('radio', { name: 'Tối', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Tối', exact: true })).toBeChecked();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.reload();
  await expect(profile.getByText('Tài khoản kiểm thử')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Tối', exact: true })).toBeChecked();
  await snapshot('profile-320-dark');
  await page.goto('/explore');
  await expect(
    scene.getByRole('heading', { name: 'Thư viện khoản vay', exact: true }),
  ).toBeVisible();
  await snapshot('explore-320-dark');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/documents');
  const chooseDocument = page.getByRole('button', { name: 'Chọn PDF hoặc ảnh' });
  await expect(chooseDocument).toBeVisible();
  await snapshot('documents-1280-dark');
  const chooser = page.waitForEvent('filechooser');
  await chooseDocument.click();
  await (await chooser).element().dispatchEvent('cancel');
  await expect(chooseDocument).toBeEnabled();
});

async function expectedTarget(locator: import('@playwright/test').Locator) {
  await expect(locator).toBeVisible();
  const rect = await locator.boundingBox();
  expect(rect?.width).toBeGreaterThanOrEqual(44);
  expect(rect?.height).toBeGreaterThanOrEqual(44);
}
