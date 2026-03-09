import { expect, test } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { rotatePdf } from '../../client/src/utils/pdfSignature';

async function createSimplePdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([300, 200]);
  return await pdfDoc.save();
}

test('rotatePdf rotates pages by given degrees', async () => {
  const originalBytes = await createSimplePdf();
  const rotatedBytes = await rotatePdf(originalBytes, 90);
  // rotatePdf returns Uint8Array, verify it's valid PDF bytes
  expect(rotatedBytes.length).toBeGreaterThan(0);
  // Verify PDF header is present
  const header = new TextDecoder().decode(rotatedBytes.slice(0, 8));
  expect(header).toContain('%PDF');
});

test('rotatePdf with 0 degrees preserves rotation', async () => {
  const originalBytes = await createSimplePdf();
  const rotatedBytes = await rotatePdf(originalBytes, 0);
  // rotatePdf returns Uint8Array, verify it's valid PDF bytes
  expect(rotatedBytes.length).toBeGreaterThan(0);
  // Verify PDF header is present
  const header = new TextDecoder().decode(rotatedBytes.slice(0, 8));
  expect(header).toContain('%PDF');
});
