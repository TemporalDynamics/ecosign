# Canvas Virtual Contract

## Objetivo
Definir un contrato único para todos los canvases virtuales de EcoSign, de modo que el documento mantenga el mismo comportamiento en todos los contextos (`compact`, `expanded`, `fullscreen`) y no reaparezcan regresiones de formato o scroll.

## Alcance
- Render de documentos en canvases virtuales de producto.
- Modos de visualización (`compact`, `expanded`, `fullscreen`).
- Tipos de archivo soportados (PDF, texto plano, imágenes y derivados convertidos a PDF).

## Excepción explícita
- `SignerFieldsWizard` puede usar una política propia de interacción por su naturaleza de editor de campos.
- Aun así, debe preservar la geometría canónica del documento base.

## Invariantes Canónicos
1. **Misma estructura visual**: el documento no cambia de orden/contenido entre `compact` y `fullscreen`; solo cambia la escala.
2. **Autofit horizontal**: el contenido siempre entra al ancho disponible del canvas.
3. **Sin scroll horizontal**: `overflow-x` bloqueado para usuario final.
4. **Scroll vertical permitido**: navegación natural del documento completo.
5. **Texto sin reflow destructivo**: para `.txt/.md` se preserva estructura original (saltos y orden de líneas).
6. **Fullscreen sin motor alterno**: fullscreen reutiliza el mismo renderer, no una implementación paralela.
7. **Métricas estables**: overlays/coords dependen de ancho virtual canónico, no del ancho visual escalado.

## Política de Render por Tipo
- `application/pdf`: `PdfEditViewer` con carga por `pdfData` preferente.
- `text/plain` y equivalentes: render monoespaciado con `whitespace-pre` + autofit por escala.
- `image/*`: render contenido preservando proporción (`object-contain`).
- `doc/docx` y otros no nativos: convertir a PDF antes del flujo que requiera canvas canónico.

## Reglas de Implementación
- Un canvas nuevo debe declararse en `docs/ui/CANVAS_VIRTUAL_SURFACES.md`.
- No se permite lógica ad hoc por pantalla que rompa invariantes globales.
- Cambios de renderer deben incluir validación en `test:fast`.

## Definition of Done
- Todas las superficies de canvas están inventariadas.
- No hay diferencias estructurales entre `compact` y `fullscreen`.
- No hay scroll horizontal en canvases estándar.
- Excepción del wizard permanece documentada y acotada.
