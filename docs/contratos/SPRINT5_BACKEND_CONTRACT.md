# SPRINT 5 — SIGNATURE → WITNESS BINDING

**Estado:** CANÓNICO
**Fecha:** 2026-01-10
**Versión:** 1.0
**Naturaleza:** Contrato TÉCNICO-LEGAL (backend)
**Scope:** Binding de firma/campos del preview a PDF Witness con eventos canónicos

---

## 0️⃣ CONTEXTO CRÍTICO

### Lo que YA está resuelto (frontend)

✅ **Centro Legal UI:**
- Preview estable con canvas virtual 1000×1414
- Drag & drop de campos y firma
- Resize, duplicación, batch
- Firma visible en preview (overlay)
- Paneles NDA/Flujo funcionales
- Toggle UI refinada

✅ **Output del frontend:**
El frontend entrega `overlay_spec[]` con coordenadas normalizadas (0-1) listas para stamping.

### Lo que DEBE hacer este sprint (backend)

❌ **NO está implementado:**
- Persistencia de `overlay_spec` en draft
- Stamping real en PDF Witness
- Transform log con evento `signature.applied`
- Hash chain que incluye firma estampada
- Flujo multi-firmante secuencial

---

## 1️⃣ CONTRATO DE INPUT (lo que recibe backend)

### Estructura: `overlay_spec[]`

Cuando el usuario toca CTA ("Proteger" / "Enviar"), el frontend envía:

```typescript
interface OverlaySpec {
  page: number;           // Número de página (1-indexed)
  x: number;              // Coordenada X normalizada (0-1)
  y: number;              // Coordenada Y normalizada (0-1)
  width: number;          // Ancho normalizado (0-1)
  height: number;         // Alto normalizado (0-1)
  type: 'signature' | 'text' | 'date';
  value: string;          // Contenido (texto, fecha, o base64 de firma)
  font?: string;          // Font family (opcional)
  actor: string;          // 'owner' | 'signer_1' | 'signer_2' ...
  required: boolean;      // Si es campo obligatorio
  metadata?: Record<string, unknown>;
}
```

**Ejemplo:**
```json
{
  "page": 1,
  "x": 0.42,
  "y": 0.73,
  "width": 0.18,
  "height": 0.04,
  "type": "signature",
  "value": "data:image/png;base64,iVBOR...",
  "actor": "owner",
  "required": true
}
```

### Invariantes de Input

**MUST:**
- Coordenadas normalizadas (0-1) por página
- NUNCA píxeles de viewport
- NUNCA dependientes de zoom o scroll
- Array puede estar vacío (protección sin firma)

**MUST NOT:**
- NO interpretar coordenadas del preview como finales
- NO recalcular posiciones
- NO inventar valores por defecto

---

## 2️⃣ FLUJO CANÓNICO (orden obligatorio)

### Paso 1: Recibir Intención (input)

**Cuando:** Usuario hace click en CTA "Proteger"

**Backend recibe:**
- `overlay_spec[]` (campos + firma)
- `workflow_type`: 'simple' | 'signature' | 'certified'
- `actor_id`: UUID del usuario actual
- `nda_text`: string (si aplica)

**Estado:** Draft en proceso

**MUST NOT:** NO hashear todavía, NO generar eventos canónicos

---

### Paso 2: Guardar Draft

**Persistir en:**
- `operation_documents.draft_metadata`:
  ```json
  {
    "overlay_spec": [...],
    "signature_preview": "base64...",
    "nda_applied": true/false,
    "custody_mode": "hash_only" | "encrypted_custody"
  }
  ```

**Estado:** Editable, recuperable

**MUST:** Permitir múltiples guardados antes de proteger

---

### Paso 3: Generar Witness Base

**Cuando:** Usuario confirma protección final

**Acción:**
1. Tomar documento original (source)
2. Convertir a PDF (si no es PDF)
3. Generar **PDF Witness Base** (sin overlays)

**Output:**
- `witness_base.pdf` (sin firma, sin campos)

**Transform log:**
```json
{
  "from_mime": "application/docx",
  "to_mime": "application/pdf",
  "from_hash": "sha256:abc...",
  "to_hash": "sha256:def...",
  "method": "server",
  "reason": "witness_generation",
  "executed_at": "2026-01-10T12:00:00Z"
}
```

**MUST:** Este paso separa "archivo del usuario" de "objeto jurídico"

---

### Paso 4: Stamping (Binding Real) ⭐ CRÍTICO

**Acción:**
1. Tomar `witness_base.pdf`
2. Iterar `overlay_spec[]`
3. Para cada overlay:
   - Convertir coords normalizadas → píxeles de página real
   - Estampar contenido (firma/texto/fecha) en PDF
4. Generar **PDF Witness Final**

**Cálculo de coordenadas:**
```typescript
// Pseudocódigo
const pdfPage = witness_base.getPage(overlay.page);
const pageWidth = pdfPage.width;
const pageHeight = pdfPage.height;

const absoluteX = overlay.x * pageWidth;
const absoluteY = overlay.y * pageHeight;
const absoluteWidth = overlay.width * pageWidth;
const absoluteHeight = overlay.height * pageHeight;

pdfPage.drawImage(overlay.value, {
  x: absoluteX,
  y: absoluteY,
  width: absoluteWidth,
  height: absoluteHeight
});
```

**Output:**
- `witness_final.pdf` (con firma/campos estampados)

**MUST:**
- Stamping debe ser irreversible (no overlay CSS)
- Coordenadas deben ser precisas al píxel
- Firma debe ser parte del PDF, no metadata

---

### Paso 5: Transform Log (Acto Jurídico)

**Registrar evento canónico:**

```json
{
  "from_mime": "application/pdf",
  "to_mime": "application/pdf",
  "from_hash": "sha256:witness_base_hash",
  "to_hash": "sha256:witness_final_hash",
  "method": "server",
  "reason": "signature_applied",
  "executed_at": "2026-01-10T12:00:05Z",
  "metadata": {
    "overlay_spec": [...],
    "actor": "owner",
    "signature_type": "legal"
  }
}
```

**MUST:** Este evento es MÁS importante que el PDF mismo

---

### Paso 6: Hash Chain

**Ahora sí, calcular hash final:**

```typescript
const witnessHash = sha256(witness_final.pdf);

document_entities.update({
  witness_hash: witnessHash,
  witness_current_hash: witnessHash,
  hash_chain: {
    source_hash: "sha256:abc...",
    witness_hash: witnessHash  // ← Incluye firma estampada
  }
});
```

**MUST:**
- Hash DEBE incluir la firma estampada
- NUNCA hashear antes del stamping
- `witness_hash` es INMUTABLE después de esto

---

### Paso 7: Anclajes (orden fijo)

**Secuencia obligatoria:**

```
TSA → Polygon → Bitcoin
```

**Para cada anclaje:**
1. Generar evento en `document_entities.events[]`
2. Usar `witness_hash` (el mismo para todos)
3. Esperar confirmación antes de siguiente

**Eventos generados:**
```json
// TSA
{
  "kind": "tsa",
  "at": "2026-01-10T12:00:10Z",
  "witness_hash": "sha256:...",
  "tsa": {
    "token_b64": "MIIRe...",
    "gen_time": "2026-01-10T12:00:10Z"
  }
}

// Polygon
{
  "kind": "anchor",
  "at": "2026-01-10T12:00:15Z",
  "anchor": {
    "network": "polygon",
    "witness_hash": "sha256:...",
    "txid": "0xabc...",
    "confirmed_at": "2026-01-10T12:01:00Z"
  }
}

// Bitcoin (opcional)
{
  "kind": "anchor",
  "at": "2026-01-10T12:05:00Z",
  "anchor": {
    "network": "bitcoin",
    "witness_hash": "sha256:...",
    "txid": "abc123...",
    "confirmed_at": "2026-01-10T13:00:00Z"
  }
}
```

**MUST:**
- NUNCA invertir el orden
- NUNCA saltarse TSA
- Bitcoin es opcional según config del usuario

---

### Paso 8: Firma EcoSign (Attestation)

**Evento final:**
```json
{
  "kind": "ecosign.attested",
  "at": "2026-01-10T12:05:10Z",
  "witness_hash": "sha256:...",
  "attestation": {
    "version": "1.0",
    "system": "EcoSign",
    "process_complete": true
  }
}
```

**Traducción:** "EcoSign da fe del proceso completo."

**Estado final:** `lifecycle_status = 'witness_ready'`

---

## 3️⃣ FLUJO MULTI-FIRMANTE

### Regla de Oro

**"Un firmante NUNCA ve el documento hasta que el anterior quedó sellado."**

### Secuencia

```
Firmante 1:
  ↓ Recibe Witness Base
  ↓ Aplica su overlay
  ↓ Genera Witness v1
  ↓ Hash → TSA → Polygon
  ↓ Sella y envía

Firmante 2:
  ↓ Recibe Witness v1 (sellado)
  ↓ Aplica su overlay
  ↓ Genera Witness v2
  ↓ Hash → TSA → Polygon
  ↓ Sella y envía

...
```

### Eventos por firmante

Cada firmante genera:
```json
{
  "kind": "workflow.signer_completed",
  "at": "2026-01-10T12:10:00Z",
  "signer": {
    "email": "firmante@example.com",
    "order": 1,
    "overlay_applied": true
  }
}
```

**MUST:**
- Cada Witness es incremental (no se sobrescribe)
- Cada firmante trabaja sobre el último Witness válido
- Re-hasheo y re-anclaje por firmante

**MUST NOT:**
- NO permitir firmas simultáneas
- NO pisar Witness anterior
- NO saltarse orden de firmantes

---

## 4️⃣ NDA POR OPERACIÓN

### Reutilización

**Si operación tiene NDA:**
1. Sugerir NDA de operación al crear documento
2. Si usuario acepta → copiar a documento
3. Si usuario rechaza → usar NDA propio o ninguno

### Persistencia

**Dos lugares:**
```typescript
// Operación (template reutilizable)
operations {
  nda_template: string
}

// Documento (copia materializada)
document_entities {
  nda_text: string  // ← Copia, no referencia
}
```

**MUST:**
- Cada documento tiene su propia copia de NDA
- NDA del documento es INMUTABLE
- NDA de operación es solo sugerencia

**MUST NOT:**
- NO referenciar NDA de operación
- NO modificar NDA después de proteger

---

## 5️⃣ EVENTOS CANÓNICOS MÍNIMOS

### En `document_entities.events[]`

**Obligatorios:**
```json
[
  { "kind": "document.created", "at": "..." },
  { "kind": "nda.applied", "at": "..." },          // Si aplica
  { "kind": "signature.applied", "at": "..." },    // Por firmante
  { "kind": "witness.generated", "at": "..." },
  { "kind": "tsa", "at": "...", "tsa": {...} },
  { "kind": "anchor", "at": "...", "anchor": {...} },  // Polygon
  { "kind": "anchor", "at": "...", "anchor": {...} },  // Bitcoin (opcional)
  { "kind": "ecosign.attested", "at": "..." }
]
```

**Workflow (si aplica):**
```json
[
  { "kind": "workflow.started", "at": "..." },
  { "kind": "workflow.signer_sent", "at": "...", "signer": {...} },
  { "kind": "workflow.signer_completed", "at": "...", "signer": {...} }
]
```

### En `operations_events` (espejo opcional)

```json
[
  { "kind": "operation.document_added", "document_entity_id": "..." },
  { "kind": "operation.document_removed", "document_entity_id": "..." }
]
```

---

## 6️⃣ OUTPUT FINAL

### Al completar flujo, generar:

1. **PDF Witness Final**
   - Con firma/campos estampados
   - Hashado, sellado, anclado

2. **Certificado .ECO**
   - Generado desde `document_entities`
   - Incluye todos los eventos
   - Verificable offline

3. **Historial Completo**
   - Transform log
   - Events array
   - Hash chain

---

## 7️⃣ CHECKLIST DE VALIDACIÓN

**Antes de dar por terminado Sprint 5:**

### Persistencia
- [ ] `overlay_spec` guardado en `draft_metadata`
- [ ] `signaturePreview` guardado (si aplica)
- [ ] NDA persistido correctamente

### Stamping
- [ ] Witness Base generado sin overlays
- [ ] Overlays estampados en PDF (no CSS)
- [ ] Coordenadas normalizadas → píxeles correctos
- [ ] Firma visible en PDF final

### Hash Chain
- [ ] `witness_hash` calculado DESPUÉS de stamping
- [ ] Hash incluye firma estampada
- [ ] `hash_chain` completo (source → witness)

### Transform Log
- [ ] Evento `signature.applied` registrado
- [ ] Metadata incluye `overlay_spec`
- [ ] Timestamp UTC correcto

### Eventos Canónicos
- [ ] `document.created`
- [ ] `nda.applied` (si aplica)
- [ ] `signature.applied`
- [ ] `witness.generated`
- [ ] `tsa` (TSA)
- [ ] `anchor` (Polygon)
- [ ] `anchor` (Bitcoin, opcional)
- [ ] `ecosign.attested`

### Flujo Multi-firmante
- [ ] Firmante 1 → sella → envía
- [ ] Firmante 2 recibe Witness sellado
- [ ] Cada firmante genera Witness incremental
- [ ] Re-hasheo y re-anclaje por firmante

### NDA
- [ ] NDA de operación sugerido
- [ ] NDA copiado a documento (no referenciado)
- [ ] NDA inmutable después de proteger

### Output
- [ ] PDF Witness Final generado
- [ ] .ECO generado
- [ ] Verificable offline

---

## 8️⃣ PROHIBICIONES EXPLÍCITAS

### ❌ NUNCA hacer esto

1. ❌ Hashear antes del stamping
2. ❌ Interpretar coordenadas del preview
3. ❌ Recalcular posiciones por tu cuenta
4. ❌ Inventar eventos no documentados
5. ❌ Saltarse orden TSA → Polygon → BTC
6. ❌ Permitir firmas simultáneas
7. ❌ Pisar Witness anterior
8. ❌ Referenciar NDA de operación (copiar siempre)
9. ❌ Modificar `witness_hash` después de sellar
10. ❌ Usar overlay CSS en vez de stamping real

---

## 9️⃣ DECISIONES ARQUITECTÓNICAS

### Stamping Real vs Overlay CSS

**Decisión:** Stamping real en PDF

**Razón:**
- Overlay CSS no es evidencia (se puede manipular)
- Stamping es irreversible y auditable
- Hash incluye el contenido estampado

### Hash Chain Timing

**Decisión:** Hash DESPUÉS de stamping

**Razón:**
- `witness_hash` debe incluir firma estampada
- Hashear antes = evidencia incompleta

### Multi-firmante Incremental

**Decisión:** Cada firmante genera Witness nuevo

**Razón:**
- Evita estados parciales
- Cada paso es auditable
- Rollback imposible

### NDA Materializado

**Decisión:** Copiar NDA a documento, no referenciar

**Razón:**
- Inmutabilidad del documento
- Independencia de operación
- Auditoría completa

---

## 🔟 REFERENCIAS

**Contratos relacionados:**
- `DOCUMENT_ENTITY_CONTRACT.md` - Modelo canónico
- `WITNESS_PDF_CONTRACT.md` - Reglas del PDF Witness
- `HASH_CHAIN_RULES.md` - Hash chain rules
- `TSA_EVENT_RULES.md` - TSA events
- `ANCHOR_EVENT_RULES.md` - Anchor events
- `DRAFT_OPERATION_RULES.md` - Draft operations

---

**Última actualización:** 2026-01-10
**Owner:** Tech Lead
**Reviewers:** Backend Team, Legal Team

---

**FIN DEL CONTRATO**
