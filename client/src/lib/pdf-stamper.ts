/**
 * PDF Stamper Engine
 * 
 * Estampa firmas y campos en PDFs de forma visual.
 * NO crea verdad probatoria, solo representación visual.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface SignatureField {
  id: string;
  type: 'signature' | 'text' | 'date';
  signerId: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
}

export interface StampOptions {
  includeWatermark?: boolean;
  watermarkText?: string;
}

/**
 * Estampa campos en un PDF
 */
export async function stampPDF(
  pdfBytes: ArrayBuffer,
  fields: SignatureField[],
  options: StampOptions = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Agrupar campos por página
  const fieldsByPage = fields.reduce((acc, field) => {
    if (!acc[field.page]) acc[field.page] = [];
    acc[field.page].push(field);
    return acc;
  }, {} as Record<number, SignatureField[]>);

  // Estampar en cada página
  for (const [pageNum, pageFields] of Object.entries(fieldsByPage)) {
    const page = pages[parseInt(pageNum)];
    if (!page) continue;

    const { height: pageHeight } = page.getSize();

    for (const field of pageFields) {
      // Convertir coordenadas (PDF usa origen bottom-left)
      const pdfY = pageHeight - field.y - field.height;

      switch (field.type) {
        case 'signature':
          await stampSignature(page, field, pdfY, boldFont);
          break;
        case 'text':
          await stampText(page, field, pdfY, font);
          break;
        case 'date':
          await stampDate(page, field, pdfY, font);
          break;
      }
    }
  }

  // Watermark opcional
  if (options.includeWatermark) {
    addWatermark(pdfDoc, options.watermarkText || 'EcoSign');
  }

  return pdfDoc.save();
}

/**
 * Estampa una firma visual
 */
async function stampSignature(
  page: any,
  field: SignatureField,
  pdfY: number,
  font: any
) {
  const value = field.value || 'Firmado digitalmente';

  // Borde del campo
  page.drawRectangle({
    x: field.x,
    y: pdfY,
    width: field.width,
    height: field.height,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 1,
  });

  // Texto de la firma
  const fontSize = 12;
  page.drawText(value, {
    x: field.x + 5,
    y: pdfY + field.height / 2 - fontSize / 2,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  // Timestamp micro
  const timestamp = new Date().toISOString().split('T')[0];
  page.drawText(timestamp, {
    x: field.x + 5,
    y: pdfY + 5,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

/**
 * Estampa un campo de texto
 */
async function stampText(
  page: any,
  field: SignatureField,
  pdfY: number,
  font: any
) {
  const value = field.value || '';

  page.drawRectangle({
    x: field.x,
    y: pdfY,
    width: field.width,
    height: field.height,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });

  if (value) {
    page.drawText(value, {
      x: field.x + 5,
      y: pdfY + field.height / 2 - 6,
      size: 10,
      font,
      color: rgb(0, 0, 0),
      maxWidth: field.width - 10,
    });
  }
}

/**
 * Estampa un campo de fecha
 */
async function stampDate(
  page: any,
  field: SignatureField,
  pdfY: number,
  font: any
) {
  const value = field.value || new Date().toLocaleDateString();

  page.drawRectangle({
    x: field.x,
    y: pdfY,
    width: field.width,
    height: field.height,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });

  page.drawText(value, {
    x: field.x + 5,
    y: pdfY + field.height / 2 - 6,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
}

/**
 * Añade watermark a todas las páginas
 */
function addWatermark(pdfDoc: any, text: string) {
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    
    page.drawText(text, {
      x: width - 60,
      y: 10,
      size: 8,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.5,
    });
  }
}

/**
 * Duplica campos de firma en todas las páginas
 */
export function duplicateSignatureFields(
  fields: SignatureField[],
  totalPages: number
): SignatureField[] {
  const signatureFields = fields.filter(f => f.type === 'signature');
  const otherFields = fields.filter(f => f.type !== 'signature');

  const duplicated: SignatureField[] = [];

  for (let page = 0; page < totalPages; page++) {
    for (const field of signatureFields) {
      duplicated.push({
        ...field,
        id: `${field.id}-page-${page}`,
        page,
      });
    }
  }

  return [...duplicated, ...otherFields];
}
