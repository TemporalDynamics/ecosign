import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const JPG_FIXTURE = path.join(ROOT, 'client/public/assets/images/videos/firmas-thumb.jpg');
const TXT_FIXTURE = path.join(ROOT, 'docs/legal/nda/v1.txt');

async function openHarness(page) {
  await page.addInitScript(() => {
    localStorage.setItem('legal_center_guide', JSON.stringify({ disabled: true, never_show_welcome: true }));
  });
  await page.goto('/__e2e__/canvas-visual?action=certify');
  await expect(page.getByText('Centro Legal')).toBeVisible();
}

async function uploadCenterFile(page, filePath) {
  const input = page.locator('input[type="file"][accept="application/pdf,image/*,text/plain"]').first();
  await input.setInputFiles(filePath);
  await page.waitForTimeout(800);
}

async function rotateCenter(page, turns = 1) {
  const rotateBtn = page.getByRole('button', { name: 'Rotar documento' });
  for (let i = 0; i < turns; i += 1) {
    await rotateBtn.click();
    await page.waitForTimeout(260);
  }
}

async function openWizardViaFlow(page) {
  await page.getByRole('button', { name: 'Flujo de Firmas', exact: true }).click();
  const signerInput = page.getByPlaceholder('email@ejemplo.com').first();
  await signerInput.fill('visual.e2e@ecosign.app');
  await signerInput.press('Tab');
  await page.waitForTimeout(300);
  await page.locator('button[title="Abrir wizard de campos"]').click();
  await expect(page.getByRole('heading', { name: 'Configuración de campos' })).toBeVisible();
}

test('center legal jpg keeps visual stability on 90/180/270 and focus mode', async ({ page }) => {
  await openHarness(page);
  await uploadCenterFile(page, JPG_FIXTURE);

  await rotateCenter(page, 1);
  await expect(page.getByTestId('center-legal-canvas')).toHaveScreenshot('center-jpg-compact-90.png');

  await rotateCenter(page, 1);
  await expect(page.getByTestId('center-legal-canvas')).toHaveScreenshot('center-jpg-compact-180.png');

  await rotateCenter(page, 1);
  await expect(page.getByTestId('center-legal-canvas')).toHaveScreenshot('center-jpg-compact-270.png');

  await page.getByRole('button', { name: 'Ver en grande' }).first().click();
  await page.waitForTimeout(300);
  await expect(page.getByTestId('center-legal-canvas')).toHaveScreenshot('center-jpg-focus-270.png');
});

test('wizard visual baseline (mini + fullscreen) stays stable for jpg with forced oficio', async ({ page }) => {
  await openHarness(page);
  await uploadCenterFile(page, JPG_FIXTURE);
  await rotateCenter(page, 1);

  await openWizardViaFlow(page);

  await page.getByRole('button', { name: /2\. Tamaño de página/i }).click();
  await page.getByText('Forzar Oficio').click();
  await page.waitForTimeout(300);

  await expect(page.getByTestId('wizard-mini-preview')).toHaveScreenshot('wizard-jpg-mini-oficio-90.png');

  await page.getByRole('button', { name: 'Ver en pantalla completa' }).click();
  await expect(page.getByTestId('wizard-fullscreen-viewport')).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page.getByTestId('wizard-fullscreen-viewport')).toHaveScreenshot('wizard-jpg-fullscreen-oficio-90.png');
});

test('wizard visual baseline (mini + fullscreen) stays stable for txt rotation', async ({ page }) => {
  await openHarness(page);
  await uploadCenterFile(page, TXT_FIXTURE);
  await rotateCenter(page, 1);

  await openWizardViaFlow(page);

  await expect(page.getByTestId('wizard-mini-preview')).toHaveScreenshot('wizard-txt-mini-90.png');

  await page.getByRole('button', { name: 'Ver en pantalla completa' }).click();
  await expect(page.getByTestId('wizard-fullscreen-viewport')).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page.getByTestId('wizard-fullscreen-viewport')).toHaveScreenshot('wizard-txt-fullscreen-90.png');
});
