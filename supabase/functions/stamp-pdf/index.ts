/**
 * stamp-pdf Edge Function
 * 
 * Recibe campos de firma y devuelve PDF estampado
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

interface SignatureField {
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

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { pdfBase64, fields } = await req.json() as {
      pdfBase64: string;
      fields: SignatureField[];
    };

    // Decode PDF
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Agrupar campos por página
    const fieldsByPage: Record<number, SignatureField[]> = {};
    for (const field of fields) {
      if (!fieldsByPage[field.page]) fieldsByPage[field.page] = [];
      fieldsByPage[field.page].push(field);
    }

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
            stampSignature(page, field, pdfY, boldFont);
            break;
          case 'text':
            stampText(page, field, pdfY, font);
            break;
          case 'date':
            stampDate(page, field, pdfY, font);
            break;
        }
      }
    }

    // Watermark EcoSign
    addWatermark(pdfDoc);

    // Guardar PDF
    const stampedPdfBytes = await pdfDoc.save();
    const stampedPdfBase64 = btoa(String.fromCharCode(...stampedPdfBytes));

    return new Response(
      JSON.stringify({ pdfBase64: stampedPdfBase64 }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error stamping PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

function stampSignature(page: any, field: SignatureField, pdfY: number, font: any) {
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
  page.drawText(value, {
    x: field.x + 5,
    y: pdfY + field.height / 2 - 6,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });

  // Timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  page.drawText(timestamp, {
    x: field.x + 5,
    y: pdfY + 5,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

function stampText(page: any, field: SignatureField, pdfY: number, font: any) {
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
    });
  }
}

function stampDate(page: any, field: SignatureField, pdfY: number, font: any) {
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

function addWatermark(pdfDoc: any) {
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width } = page.getSize();
    
    page.drawText('EcoSign', {
      x: width - 60,
      y: 10,
      size: 8,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.5,
    });
  }
}
