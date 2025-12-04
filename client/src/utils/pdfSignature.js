/**
 * PDF Signature Utility
 * Aplica una firma dibujada (canvas) a un documento PDF
 * y agrega una Hoja de Firmas con datos forenses
 */

// Lazy load pdf-lib para mejorar performance del landing
const loadPdfLib = async () => {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  return { PDFDocument, rgb, StandardFonts };
};

/**
 * Aplica una imagen de firma a un PDF
 * @param {File} pdfFile - Archivo PDF original
 * @param {string} signatureDataUrl - Data URL de la firma (base64 PNG)
 * @param {Object} options - Opciones de posicionamiento
 * @returns {Promise<Blob>} - PDF firmado como Blob
 */
export async function applySignatureToPDF(pdfFile, signatureDataUrl, options = {}) {
  try {
    // Lazy load pdf-lib
    const { PDFDocument } = await loadPdfLib();

    // Leer el PDF original
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Convertir la firma de data URL a bytes
    const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

    // Obtener dimensiones de la firma
    const signatureDims = signatureImage.scale(0.5); // Escalar al 50% del tamaño original

    // Obtener la última página (donde se aplicará la firma)
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Posición por defecto: esquina inferior derecha con margen
    const x = options.x ?? (width - signatureDims.width - 50);
    const y = options.y ?? 50; // 50px desde abajo

    // Aplicar la firma en la página
    lastPage.drawImage(signatureImage, {
      x,
      y,
      width: signatureDims.width,
      height: signatureDims.height,
    });

    // Serializar el PDF modificado
    const modifiedPdfBytes = await pdfDoc.save();

    // Convertir a Blob para usarlo como File
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

    return blob;
  } catch (error) {
    console.error('Error al aplicar firma al PDF:', error);
    throw error;
  }
}

/**
 * Crea un nuevo File a partir de un Blob manteniendo el nombre original
 * @param {Blob} blob - Blob del PDF firmado
 * @param {string} originalName - Nombre del archivo original
 * @returns {File} - File con nombre apropiado
 */
export function blobToFile(blob, originalName) {
  const signedName = originalName.replace(/\.pdf$/i, '_signed.pdf');
  return new File([blob], signedName, { type: 'application/pdf' });
}

/**
 * Agrega una Hoja de Firmas al final del PDF con datos forenses
 * @param {File} pdfFile - Archivo PDF (puede estar ya firmado)
 * @param {string} signatureDataUrl - Data URL de la firma (base64 PNG) - opcional
 * @param {Object} forensicData - Datos del blindaje forense
 * @returns {Promise<Blob>} - PDF con Hoja de Firmas como Blob
 */
export async function addSignatureSheet(pdfFile, signatureDataUrl = null, forensicData = {}) {
  try {
    // Lazy load pdf-lib
    const { PDFDocument, rgb, StandardFonts } = await loadPdfLib();

    // Leer el PDF
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Crear nueva página para la Hoja de Firmas
    const signaturePage = pdfDoc.addPage([595, 842]); // Tamaño A4
    const { width, height } = signaturePage.getSize();

    // Cargar fuente
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Marco decorativo superior
    signaturePage.drawRectangle({
      x: 40,
      y: height - 140,
      width: width - 80,
      height: 120,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 2,
    });

    // Fondo gris claro para el encabezado
    signaturePage.drawRectangle({
      x: 40,
      y: height - 100,
      width: width - 80,
      height: 80,
      color: rgb(0.95, 0.95, 0.95),
    });

    // Logo/Título
    signaturePage.drawText('VERIFYSIGN', {
      x: 50,
      y: height - 50,
      size: 10,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Título principal
    signaturePage.drawText('CERTIFICADO DE AUTENTICIDAD Y AUDITORÍA', {
      x: 50,
      y: height - 70,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Subtítulo
    signaturePage.drawText('Este documento ha sido certificado digitalmente con trazabilidad forense', {
      x: 50,
      y: height - 90,
      size: 9,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });

    let currentY = height - 160;

    // Sección de Firma (si existe)
    if (signatureDataUrl) {
      signaturePage.drawText('FIRMA DEL TITULAR', {
        x: 50,
        y: currentY,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 25;

      // Embedir firma
      const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      const signatureDims = signatureImage.scale(0.3);

      signaturePage.drawImage(signatureImage, {
        x: 50,
        y: currentY - signatureDims.height,
        width: signatureDims.width,
        height: signatureDims.height,
      });

      currentY -= signatureDims.height + 20;

      // Marco alrededor de la firma
      signaturePage.drawRectangle({
        x: 45,
        y: currentY - signatureDims.height - 5,
        width: signatureDims.width + 10,
        height: signatureDims.height + 10,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
      });

      currentY -= signatureDims.height + 15;

      // Información del firmante
      const now = new Date();
      signaturePage.drawText('Firmante:', {
        x: 50,
        y: currentY,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      signaturePage.drawText(forensicData.signerName || 'Usuario', {
        x: 110,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= 15;

      // Email (si está disponible)
      if (forensicData.signerEmail) {
        signaturePage.drawText('Email:', {
          x: 50,
          y: currentY,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
        });
        signaturePage.drawText(forensicData.signerEmail, {
          x: 110,
          y: currentY,
          size: 9,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        currentY -= 15;
      }

      // Empresa y Puesto (si están disponibles)
      if (forensicData.signerCompany || forensicData.signerJobTitle) {
        const orgText = [
          forensicData.signerJobTitle,
          forensicData.signerCompany
        ].filter(Boolean).join(' en ');

        if (orgText) {
          signaturePage.drawText('Cargo:', {
            x: 50,
            y: currentY,
            size: 9,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          });
          signaturePage.drawText(orgText, {
            x: 110,
            y: currentY,
            size: 9,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
          });
          currentY -= 15;
        }
      }

      signaturePage.drawText('Fecha:', {
        x: 50,
        y: currentY,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      signaturePage.drawText(`${now.toLocaleDateString('es-AR')} ${now.toLocaleTimeString('es-AR')}`, {
        x: 110,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= 15;

      if (forensicData.signerIP) {
        signaturePage.drawText('IP:', {
          x: 50,
          y: currentY,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
        });
        signaturePage.drawText(forensicData.signerIP, {
          x: 110,
          y: currentY,
          size: 9,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        currentY -= 15;
      }

      currentY -= 10;
    }

    // Sección de Certificación
    signaturePage.drawText('CERTIFICACIÓN DE DOCUMENTO', {
      x: 50,
      y: currentY,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 20;

    // Referencia al documento
    if (forensicData.documentName) {
      signaturePage.drawText('Documento:', {
        x: 50,
        y: currentY,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 15;

      // Nombre del archivo (truncar si es muy largo)
      const docName = forensicData.documentName.length > 60
        ? forensicData.documentName.substring(0, 57) + '...'
        : forensicData.documentName;

      signaturePage.drawText(docName, {
        x: 50,
        y: currentY,
        size: 8,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 15;

      // Tamaño del archivo
      if (forensicData.documentSize) {
        const sizeKB = (forensicData.documentSize / 1024).toFixed(2);
        const sizeMB = (forensicData.documentSize / (1024 * 1024)).toFixed(2);
        const sizeText = forensicData.documentSize > 1024 * 1024
          ? `${sizeMB} MB`
          : `${sizeKB} KB`;

        signaturePage.drawText(`Tamaño: ${sizeText}`, {
          x: 50,
          y: currentY,
          size: 8,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });
        currentY -= 20;
      }
    }

    // Hash del documento
    if (forensicData.hash) {
      signaturePage.drawText('Hash SHA-256:', {
        x: 50,
        y: currentY,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 15;

      // Dividir hash en líneas para mejor legibilidad
      const hashStr = forensicData.hash.substring(0, 64);
      signaturePage.drawText(hashStr, {
        x: 50,
        y: currentY,
        size: 8,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 25;
    }

    // Timestamp
    if (forensicData.timestamp) {
      signaturePage.drawText(`Certificado el: ${new Date(forensicData.timestamp).toLocaleString('es-AR')}`, {
        x: 50,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 25;
    }

    // Blindaje Forense
    if (forensicData.forensicEnabled) {
      signaturePage.drawText('BLINDAJE FORENSE ACTIVO', {
        x: 50,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 20;

      if (forensicData.legalTimestamp) {
        signaturePage.drawText('[ X ] RFC 3161 Legal Timestamp', {
          x: 60,
          y: currentY,
          size: 9,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 15;
      }

      if (forensicData.polygonAnchor) {
        signaturePage.drawText('[ X ] Anclaje en Polygon Blockchain', {
          x: 60,
          y: currentY,
          size: 9,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 15;

        if (forensicData.polygonTxHash) {
          signaturePage.drawText(`   Tx: ${forensicData.polygonTxHash.substring(0, 40)}...`, {
            x: 60,
            y: currentY,
            size: 7,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
          });
          currentY -= 15;
        }
      }

      if (forensicData.bitcoinAnchor) {
        signaturePage.drawText('[ X ] Anclaje en Bitcoin Blockchain (pendiente)', {
          x: 60,
          y: currentY,
          size: 9,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 20;
      }
    }

    // Sección de QR y Verificación
    currentY -= 20;

    // Área para QR Code (placeholder - se puede implementar con librería qrcode más adelante)
    signaturePage.drawRectangle({
      x: width - 150,
      y: currentY - 100,
      width: 100,
      height: 100,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });

    signaturePage.drawText('[QR CODE]', {
      x: width - 125,
      y: currentY - 45,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    signaturePage.drawText('Escanéa para verificar', {
      x: width - 145,
      y: currentY - 110,
      size: 7,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Footer con diseño mejorado
    currentY = 80;

    // Línea decorativa
    signaturePage.drawLine({
      start: { x: 40, y: currentY },
      end: { x: width - 40, y: currentY },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    currentY -= 20;

    signaturePage.drawText('CERTIFICADO DIGITAL VERIFYSIGN', {
      x: 50,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    currentY -= 15;

    signaturePage.drawText('Este documento ha sido sellado digitalmente con tecnología blockchain', {
      x: 50,
      y: currentY,
      size: 7,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    currentY -= 12;

    const verifyUrl = forensicData.verifyUrl || 'https://verifysign.com/verify';
    signaturePage.drawText(`Verificá la autenticidad en: ${verifyUrl}`, {
      x: 50,
      y: currentY,
      size: 7,
      font: font,
      color: rgb(0.4, 0.4, 0.8), // Azul para link
    });

    // Serializar el PDF modificado
    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

    return blob;
  } catch (error) {
    console.error('Error al agregar Hoja de Firmas:', error);
    throw error;
  }
}
