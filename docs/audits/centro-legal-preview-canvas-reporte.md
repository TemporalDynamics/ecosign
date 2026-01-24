Reporte: Canvas/Preview en Centro Legal (estado actual)

Resumen técnico (estado actual)
- Entrada de archivo: dropzone en `client/src/components/LegalCenterModalV2.tsx`.
- Tipos aceptados: `pdf, doc, docx, xls, xlsx, jpg, png, txt` (en el input principal del dropzone).
- Generación de preview:
  - Imagen (`image/*`): se genera `dataURL` y se renderiza con `<img>`.
  - PDF: se genera `blob:` con `URL.createObjectURL` y se renderiza con `PdfEditViewer`.
  - Otros (doc/docx/xls/xlsx/txt): `documentPreview = null` y se muestra fallback “Vista previa no disponible”.

Ubicaciones clave
- Preview orchestration: `client/src/components/LegalCenterModalV2.tsx`
  - `handleFileSelect`: define qué se previsualiza.
  - Render del preview: sección “Preview del contenido”.
  - Auto-fit: `ResizeObserver` sobre `previewContainerRef`.
- Viewer PDF: `client/src/components/pdf/PdfEditViewer.tsx`
  - PDFJS: descarga y render de páginas a canvas.
  - Escala por página: `pageScale = (virtualWidth * scale) / baseViewport.width`.

Auto-fit actual
- El auto-fit se calcula en `LegalCenterModalV2.tsx` con un `ResizeObserver`:
  - `availableWidth = containerWidth - 16`
  - `fitScale = availableWidth / VIRTUAL_PAGE_WIDTH`
  - `VIRTUAL_PAGE_WIDTH = 1000`
  - `virtualScale = max(0.5, min(1, fitScale) * 0.98)`
- Ese `virtualScale` se pasa a `PdfEditViewer` como `scale`.
- El contenedor del preview usa `overflow-x-hidden`, por lo tanto nunca hay scroll horizontal.

Estado del preview por tipo
- PDF: renderiza con `PdfEditViewer` (canvas por página).
- Imagen: renderiza `<img class="object-contain">`.
- Otros documentos (doc/xls/txt): no hay preview; aparece el fallback.

Síntoma reportado
- “Se ve solo 1/8 de la primera hoja”.
- A pesar del auto-fit, hay una discrepancia entre el ancho real del contenedor y el ancho efectivo del canvas PDF, lo que puede hacer que el contenido quede recortado por `overflow-x-hidden`.
- El auto-fit calcula el `scale` con `previewContainerRef`, pero el PDF se renderiza dentro de `PdfEditViewer` con su propio layout/scroll interno.

Notas adicionales
- El preview PDF depende de `documentPreview` y `isPdfPreview`.
- `isPdfPreview` se decide por `file.type`, extensión `.pdf` o `blob:`.
- Si `documentPreview` es null, no hay preview y se renderiza el fallback.

Conclusión
- Hoy el canvas previsualiza PDFs e imágenes únicamente.
- No hay preview para documentos de texto (doc/docx/xls/xlsx/txt).
- El auto-fit existe pero es frágil si el cálculo del contenedor y el layout real del viewer no coinciden.

