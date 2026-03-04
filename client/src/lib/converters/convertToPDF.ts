import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type ConvertToPdfMode = 'protection_only' | 'signature_workflow'

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const PAGE_MARGIN = 48
const FONT_SIZE = 12
const LINE_HEIGHT = 16

const toPdfFilename = (name: string) => {
  const base = name.replace(/\.[^.]+$/, '')
  return `${base}.pdf`
}

const wrapTextToLines = (text: string, font: any, fontSize: number, maxWidth: number) => {
  const lines: string[] = []
  const paragraphs = text.split(/\r?\n/)

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    const words = paragraph.split(/\s+/)
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      const width = font.widthOfTextAtSize(next, fontSize)
      if (width <= maxWidth) {
        line = next
        continue
      }
      if (line) lines.push(line)
      line = word
    }
    if (line) lines.push(line)
  }

  return lines
}

const imageToPdf = async (imageFile: File): Promise<File> => {
  const pdf = await PDFDocument.create()
  const imageBytes = new Uint8Array(await imageFile.arrayBuffer())
  const isPng = imageFile.type === 'image/png'
  const isJpg = imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg'

  if (!isPng && !isJpg) {
    throw new Error('Formato de imagen no soportado. Usa PNG o JPG.')
  }

  const embedded = isPng ? await pdf.embedPng(imageBytes) : await pdf.embedJpg(imageBytes)
  const { width, height } = embedded
  const page = pdf.addPage([width, height])
  page.drawImage(embedded, { x: 0, y: 0, width, height })

  const pdfBytes = await pdf.save()
  return new File([pdfBytes], toPdfFilename(imageFile.name), { type: 'application/pdf' })
}

const textToPdf = async (textFile: File): Promise<File> => {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const text = await textFile.text()
  const maxWidth = A4_WIDTH - PAGE_MARGIN * 2
  const lines = wrapTextToLines(text, font, FONT_SIZE, maxWidth)
  const linesPerPage = Math.max(1, Math.floor((A4_HEIGHT - PAGE_MARGIN * 2) / LINE_HEIGHT))

  for (let i = 0; i < lines.length; i += linesPerPage) {
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT])
    let y = A4_HEIGHT - PAGE_MARGIN - FONT_SIZE
    const chunk = lines.slice(i, i + linesPerPage)
    for (const line of chunk) {
      if (line) {
        page.drawText(line, {
          x: PAGE_MARGIN,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0, 0, 0)
        })
      }
      y -= LINE_HEIGHT
    }
  }

  if (lines.length === 0) {
    pdf.addPage([A4_WIDTH, A4_HEIGHT])
  }

  const pdfBytes = await pdf.save()
  return new File([pdfBytes], toPdfFilename(textFile.name), { type: 'application/pdf' })
}

export const convertToPDF = async (
  file: File,
  mode: ConvertToPdfMode = 'signature_workflow'
): Promise<File> => {
  if (file.type === 'application/pdf') return file

  if (file.type.startsWith('image/')) {
    if (mode === 'protection_only') return file
    return await imageToPdf(file)
  }

  if (file.type === 'text/plain') {
    if (mode === 'protection_only') return file
    return await textToPdf(file)
  }

  throw new Error('Por ahora solo se aceptan PDF, imágenes y texto. Conversión automática próximamente.')
}
