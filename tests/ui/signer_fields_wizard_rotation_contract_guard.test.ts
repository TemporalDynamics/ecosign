import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const WIZARD_FILE = path.join(ROOT, 'client/src/centro-legal/modules/flow/SignerFieldsWizard.tsx');
const LEGAL_CENTER_FILE = path.join(ROOT, 'client/src/components/LegalCenterModalV2.tsx');
const CONTRACT_FILE = path.join(ROOT, 'docs/ui/CANVAS_VIRTUAL_CONTRACT.md');

test('wizard displays rotation from parent but has no rotate button', async () => {
  const content = await fs.readFile(WIZARD_FILE, 'utf8');

  // Wizard reads rotation from parent prop and normalizes it for display.
  expect(content).toContain('normalizeRotation(initialPreviewRotation)');
  expect(content).toContain('rotate(${previewRotation}deg)');
  expect(content).not.toContain('onPreviewRotationChange');

  // Wizard has NO rotate button — rotation is controlled exclusively from Centro Legal.
  expect(content).not.toContain('onClick={rotatePreview}');
});

test('wizard fullscreen pointer mapping applies inverse rotation for coherent drag/resize', async () => {
  const content = await fs.readFile(WIZARD_FILE, 'utf8');

  expect(content).toContain('const getFullscreenPointerInContent = useCallback(');
  expect(content).toContain('const cos = Math.cos(-radians);');
  expect(content).toContain('const sin = Math.sin(-radians);');
  expect(content).toContain('const pointer = getFullscreenPointerInContent(clientX, clientY);');
  expect(content).toContain('anchorContentX: pointer.x');
  expect(content).toContain('anchorContentY: pointer.y');
});

test('final flow controls stay workflow-only and hidden in self-signature mode', async () => {
  const content = await fs.readFile(WIZARD_FILE, 'utf8');

  expect(content).toContain('const showSigningModeControl = Boolean(isWorkflowMode && onSigningModeChange && signers.length > 1);');
  expect(content).toContain('const showFinalVisibilityControl = Boolean(isWorkflowMode && onFinalDocumentVisibilityChange && !isSelfSignatureMode);');
});

test('legal center is the single source of rotation — monotonic, always clockwise', async () => {
  const content = await fs.readFile(LEGAL_CENTER_FILE, 'utf8');

  // Monotonic state: always +90, never backward.
  expect(content).toContain('setPreviewRotation(0);');
  expect(content).toContain('prev + 90');
  expect(content).toContain('{file && (');
  expect(content).toContain('initialPreviewRotation={previewRotation}');
  expect(content).not.toContain('onPreviewRotationChange={handlePreviewRotationChange}');
  expect(content).toContain('isWorkflowMode={workflowEnabled}');
  expect(content).toContain('isSelfSignatureMode={Boolean(mySignature && !workflowEnabled)}');
});

test('canvas contract documents wizard rotation invariants explicitly', async () => {
  const content = await fs.readFile(CONTRACT_FILE, 'utf8');

  expect(content).toContain('Invariantes de Rotación (Wizard de Campos)');
  expect(content).toContain('Fuente única de rotación');
  expect(content).toContain('Secuencia determinística');
  expect(content).toContain('Reset por documento');
  expect(content).toContain('Control siempre visible en edición');
  expect(content).toContain('Drag/resize coherente');
  expect(content).toContain('Sin controles de flujo en Mi Firma');
});
