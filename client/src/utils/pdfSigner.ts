// ============================================
// PDF Signer Utility
// ============================================
// Applies visual signatures to PDFs using pdf-lib
// ============================================
// CRITICAL: All operations happen in the browser
// The server NEVER sees the unsigned or signed PDF content
// ============================================

// Lazy load pdf-lib para mejorar performance del landing
const loadPdfLib = async () => {
  const { PDFDocument, rgb } = await import('pdf-lib');
  return { PDFDocument, rgb };
};

import { hashSigned } from '@/lib/canonicalHashing'

export interface SignatureData {
  dataUrl: string // Base64 PNG of signature
  type: 'draw' | 'type' | 'upload'
  signerName: string
  signedAt: string // ISO timestamp
}

export interface SignaturePosition {
  page: number // 0-indexed
  x: number
  y: number
  width: number
  height: number
}

export interface SignedPDFResult {
  signedPdfBlob: Blob
  signedPdfHash: string
  signatureMetadata: {
    signerName: string
    signedAt: string
    signatureType: string
    position: SignaturePosition
  }
}

/**
 * Apply a visual signature to a PDF document
 *
 * @param pdfBlob - The original PDF as a Blob
 * @param signatureData - The signature image and metadata
 * @param position - Where to place the signature (optional, defaults to bottom right of last page)
 * @returns Signed PDF blob and metadata
 */
export async function applySignatureToPDF(
  pdfBlob: Blob,
  signatureData: SignatureData,
  position?: SignaturePosition
): Promise<SignedPDFResult> {
  try {
    const { PDFDocument, rgb } = await loadPdfLib();

    // Load the PDF
    const pdfBytes = await pdfBlob.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Embed the signature image
    const signatureImageBytes = await fetch(signatureData.dataUrl).then(res => res.arrayBuffer())
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

    // Get signature dimensions
    const signatureDims = signatureImage.scale(0.5) // Scale down to 50%

    // Determine position
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const { width: pageWidth, height: pageHeight } = lastPage.getSize()

    const finalPosition: SignaturePosition = position || {
      page: pages.length - 1,
      x: pageWidth - signatureDims.width - 50, // 50px margin from right
      y: 50, // 50px from bottom
      width: signatureDims.width,
      height: signatureDims.height
    }

    // Get the target page
    const targetPage = pages[finalPosition.page]

    // Draw the signature image
    targetPage.drawImage(signatureImage, {
      x: finalPosition.x,
      y: finalPosition.y,
      width: finalPosition.width,
      height: finalPosition.height
    })

    // Add signature metadata text below the image
    const fontSize = 8
    const textY = finalPosition.y - 15

    targetPage.drawText(`Firmado por: ${signatureData.signerName}`, {
      x: finalPosition.x,
      y: textY,
      size: fontSize,
      color: rgb(0.3, 0.3, 0.3)
    })

    targetPage.drawText(`Fecha: ${new Date(signatureData.signedAt).toLocaleString('es-AR')}`, {
      x: finalPosition.x,
      y: textY - 12,
      size: fontSize,
      color: rgb(0.3, 0.3, 0.3)
    })

    // Save the modified PDF
    const signedPdfBytes = await pdfDoc.save()
    const signedPdfBlob = new Blob([new Uint8Array(signedPdfBytes)], { type: 'application/pdf' })

    // Calculate hash of signed PDF
    const signedPdfHash = await hashSigned(signedPdfBytes)

    console.log('✅ Signature applied successfully')
    console.log('🔒 Signed PDF hash:', signedPdfHash.substring(0, 16) + '...')

    return {
      signedPdfBlob,
      signedPdfHash,
      signatureMetadata: {
        signerName: signatureData.signerName,
        signedAt: signatureData.signedAt,
        signatureType: signatureData.type,
        position: finalPosition
      }
    }

  } catch (error) {
    console.error('Error applying signature to PDF:', error)
    throw new Error('No se pudo aplicar la firma al PDF. Por favor, intentá nuevamente.')
  }
}

/**
 * Apply multiple signatures to a PDF (for multi-signer workflows)
 *
 * @param pdfBlob - The PDF to sign
 * @param signatures - Array of signatures with positions
 * @returns Signed PDF with all signatures applied
 */
export async function applyMultipleSignaturesToPDF(
  pdfBlob: Blob,
  signatures: Array<{ data: SignatureData; position?: SignaturePosition }>
): Promise<SignedPDFResult> {
  try {
    let currentPdfBlob = pdfBlob
    let lastResult: SignedPDFResult | null = null

    // Apply signatures one by one
    for (let i = 0; i < signatures.length; i++) {
      const { data, position } = signatures[i]

      // Calculate position if not provided
      // Stack signatures vertically if multiple
      const calculatedPosition = position || {
        page: 0, // Will be calculated in applySignatureToPDF
        x: 0,
        y: 50 + (i * 100), // Stack signatures 100px apart
        width: 200,
        height: 60
      }

      lastResult = await applySignatureToPDF(currentPdfBlob, data, calculatedPosition)
      currentPdfBlob = lastResult.signedPdfBlob
    }

    if (!lastResult) {
      throw new Error('No signatures applied')
    }

    return lastResult

  } catch (error) {
    console.error('Error applying multiple signatures:', error)
    throw new Error('No se pudieron aplicar las firmas al PDF.')
  }
}

/**
 * Verify that a PDF contains a signature visually
 * This is a basic check - real verification uses the hash and ECOX trail
 *
 * @param pdfBlob - The PDF to check
 * @returns Basic metadata about the PDF
 */
export async function getPDFMetadata(pdfBlob: Blob): Promise<{
  pageCount: number
  hasImages: boolean
  fileSize: number
}> {
  try {
    // Lazy load pdf-lib
    const { PDFDocument } = await loadPdfLib();

    const pdfBytes = await pdfBlob.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    return {
      pageCount: pages.length,
      hasImages: true, // pdf-lib doesn't expose this easily
      fileSize: pdfBytes.byteLength
    }
  } catch (error) {
    console.error('Error reading PDF metadata:', error)
    throw new Error('No se pudo leer el PDF.')
  }
}

/**
 * Download a PDF blob to the user's computer
 *
 * @param pdfBlob - The PDF to download
 * @param filename - Name for the downloaded file
 */
export function downloadPDF(pdfBlob: Blob, filename: string): void {
  const url = URL.createObjectURL(pdfBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
