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

test('wizard rotation uses parent as source-of-truth when callback exists', async () => {
  const content = await fs.readFile(WIZARD_FILE, 'utf8');

  expect(content).toContain('const [localPreviewRotation, setLocalPreviewRotation]');
  expect(content).toContain('if (onPreviewRotationChange) return;');
  expect(content).toContain('const previewRotation = onPreviewRotationChange');
  expect(content).toContain('? normalizeRotation(initialPreviewRotation)');
  expect(content).toContain(': localPreviewRotation;');
});

test('wizard keeps deterministic clockwise rotation sequence', async () => {
  const content = await fs.readFile(WIZARD_FILE, 'utf8');

  expect(content).toContain('const ROTATION_SEQUENCE = [0, 90, 180, 270] as const;');
  expect(content).toContain('return ROTATION_SEQUENCE[(idx + 1) % ROTATION_SEQUENCE.length];');
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

test('legal center passes rotation sync props and mode guards into wizard', async () => {
  const content = await fs.readFile(LEGAL_CENTER_FILE, 'utf8');

  expect(content).toContain('initialPreviewRotation={previewRotation}');
  expect(content).toContain('onPreviewRotationChange={setPreviewRotation}');
  expect(content).toContain('isWorkflowMode={workflowEnabled}');
  expect(content).toContain('isSelfSignatureMode={Boolean(mySignature && !workflowEnabled)}');
});

test('canvas contract documents wizard rotation invariants explicitly', async () => {
  const content = await fs.readFile(CONTRACT_FILE, 'utf8');

  expect(content).toContain('Invariantes de Rotación (Wizard de Campos)');
  expect(content).toContain('Fuente única de rotación');
  expect(content).toContain('Secuencia determinística');
  expect(content).toContain('Drag/resize coherente');
  expect(content).toContain('Sin controles de flujo en Mi Firma');
});
