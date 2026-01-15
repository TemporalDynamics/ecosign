# ROADMAP DE IMPLEMENTACIÓN
## Problema 2 — Artefacto Final del Workflow

**Estado:** Canónico  
**Versión:** 1.0  
**Fecha:** 2026-01-15  
**Contrato base:** `docs/contracts/FINAL_ARTIFACT_CONTRACT.md`

---

## Objetivo

Que todo workflow completado produzca un **artefacto final verificable, inmutable y entregable**, conforme a `FINAL_ARTIFACT_CONTRACT.md`.

---

## Principios de este roadmap

📐 **100% alineado con el contrato**  
🧠 **Separa pensamiento de ejecución**  
🛑 **Evita refactors innecesarios**  
✅ **Permite cerrar sin deuda técnica**

---

## 🧱 FASE A — Auditoría de Cierre (NO código)

**🎯 Objetivo:** entender el estado real del sistema hoy

### A1. Identificar el punto de cierre actual

**Preguntas que el dev debe responder:**

- ¿Dónde se marca hoy `workflow.status = completed`?
- ¿En qué worker / función ocurre?
- ¿Qué evento se emite (si alguno)?

**Deliverable:**
- [ ] Ubicación exacta del cierre (archivo + función)
- [ ] Evento actual (`workflow.completed` confirmado o no)

---

### A2. Inventario de datos disponibles

**Verificar si ya existen:**

- [ ] Documento base (PDF original)
- [ ] Firmas recolectadas:
  - imagen / vector
  - página
  - coordenadas
- [ ] Timestamps por firmante
- [ ] Identificadores de firmantes
- [ ] Referencia al contenedor `.eco`
- [ ] Hashes previos / anchors

**Deliverable:**
- [ ] Lista de inputs disponibles
- [ ] Lista de inputs faltantes para cumplir el contrato

---

**🚫 No implementar nada todavía.**

---

## 📜 FASE B — Contratos y Modelo de Datos

**🎯 Objetivo:** preparar el terreno para una implementación idempotente

### B1. Crear tabla de control `workflow_artifacts`

**Debe incluir:**

```sql
CREATE TABLE workflow_artifacts (
  artifact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL UNIQUE REFERENCES signature_workflows(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'building', 'ready', 'failed')),
  artifact_hash TEXT,
  artifact_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ
);

CREATE INDEX idx_workflow_artifacts_status ON workflow_artifacts(status);
CREATE INDEX idx_workflow_artifacts_workflow ON workflow_artifacts(workflow_id);
```

**Regla clave:**
- Un workflow solo puede tener un artefacto final (UNIQUE constraint).

**Deliverable:**
- [ ] Migración creada
- [ ] Migración aplicada
- [ ] Tipos TypeScript actualizados

---

### B2. Confirmar evento canónico

**Verificar que exista (o crear si no):**
- `workflow.completed`

Este evento es el único trigger permitido.

**Deliverable:**
- [ ] Evento `workflow.completed` confirmado
- [ ] Tipo del evento documentado en `_shared/types.ts`

---

## ⚙️ FASE C — Worker de Construcción del Artefacto

**🎯 Objetivo:** generar el artefacto final conforme al contrato

### C1. Worker: `build-final-artifact`

**Ubicación sugerida:**  
`supabase/functions/build-final-artifact/index.ts`

**Responsabilidades (en orden):**

1. Seleccionar workflows `completed` sin artefacto
2. Lockear fila en `workflow_artifacts` (`status = building`)
3. Recopilar inputs:
   - documento base
   - firmas aplicadas
   - evidencia (timestamps, firmantes, eventos)
4. Construir artefacto final:
   - aplicar firmas visualmente al PDF
   - generar hoja de evidencia (última página o adjunta)
   - incluir referencias a `.eco` / anchors
5. Calcular hash criptográfico del artefacto
6. Almacenar artefacto en Storage
7. Actualizar `workflow_artifacts`:
   - `status = ready`
   - `artifact_hash`
   - `artifact_url`
   - `finalized_at`
8. Emitir evento `workflow.artifact_finalized`

---

**Reglas MUST:**

- ✅ **Idempotente:** si se ejecuta dos veces sobre el mismo workflow, no genera artefacto distinto
- ✅ **Reintentable:** si falla, puede reintentar limpiamente
- ✅ **No depende de UI**
- ✅ **No genera side effects parciales** (todo o nada)

---

### C2. Manejo de errores

**Si algo falla:**
- Marcar `status = failed`
- Guardar `error_message`
- Permitir retry seguro (no bloquear workflow)

**Deliverable:**
- [ ] Worker implementado
- [ ] Lógica de lockeo implementada
- [ ] Generación de PDF con firmas
- [ ] Cálculo de hash
- [ ] Almacenamiento en Storage
- [ ] Emisión de evento `workflow.artifact_finalized`
- [ ] Tests unitarios del worker

---

## 📣 FASE D — Evento de Cierre y Notificación

**🎯 Objetivo:** cerrar el workflow para el usuario

### D1. Evento: `workflow.artifact_finalized`

**Emitir solo cuando:**
- artefacto existe
- está almacenado
- hash calculado

**Payload conforme al contrato:**

```typescript
{
  type: 'workflow.artifact_finalized',
  workflow_id: string,
  artifact_id: string,
  artifact_hash: string,
  artifact_url: string,
  finalized_at: string // ISO-8601
}
```

**Deliverable:**
- [ ] Evento emitido desde `build-final-artifact`
- [ ] Payload validado contra contrato

---

### D2. Worker: `notify-artifact-ready`

**Hace solo una cosa:**
- Escuchar `workflow.artifact_finalized`
- Notificar a:
  - owner
  - firmantes
- Incluir `artifact_url` en notificación

**🚫 No construye nada**  
**🚫 No valida nada**

**Deliverable:**
- [ ] Worker implementado
- [ ] Notificaciones enviadas a owner y firmantes
- [ ] Link de descarga incluido

---

## 🖥️ FASE E — Integración UI (mínima)

**🎯 Objetivo:** reflejar cierre real (no antes)

### E1. UI escucha `workflow.artifact_finalized`

**Hasta ese evento:**
- Estado: "Procesando documento final…"
- No mostrar descarga

**Después:**
- Botón de descarga del artefacto
- Estado: "Completado"

**📌 El "cierre mental" del usuario ocurre solo acá.**

**Deliverable:**
- [ ] UI actualizada en `WorkflowDetailPage`
- [ ] Botón de descarga visible post-evento
- [ ] Estado de carga mientras se genera

---

## 🧪 FASE F — QA y Verificación

### F1. Test de contrato

**Verificar que:**
- [ ] Mismo workflow → mismo hash (idempotencia)
- [ ] Reintento no genera duplicado
- [ ] Artefacto es verificable sin cuenta

**Test cases mínimos:**
- Workflow con 1 firmante
- Workflow con N firmantes
- Workflow con anchors activados
- Reintento de generación (debe retornar mismo artefacto)

---

### F2. Test de usuario

**Flujo end-to-end:**
1. Workflow termina
2. Llega notificación
3. Usuario descarga artefacto
4. Artefacto no cambia en descargas posteriores

**Deliverable:**
- [ ] Tests E2E escritos
- [ ] Tests pasando

---

## 🧹 FASE G — Limpieza (cuando todo esté estable)

**Solo cuando F esté 100% completo:**

- [ ] Eliminar flujos alternativos de "descarga" si existen
- [ ] Eliminar notificaciones antiguas de "workflow completed"
- [ ] Consolidar documentación
- [ ] Marcar Problema 2 como CERRADO

---

## 📌 Cómo usar este roadmap

### Recomendación explícita:

1. **Compartir este roadmap tal cual con el dev**
2. **Pedirle que complete FASE A primero** (solo auditoría, sin código)
3. **Revisar juntos el inventario de A2**
4. **Recién después aprobar FASE C**

**Si el dev empieza a escribir código antes de A y B → frenar.**

---

## 🧠 Criterios de éxito

### Fase A
✅ Conocemos exactamente dónde termina el workflow hoy  
✅ Sabemos qué datos existen y cuáles faltan

### Fase B
✅ Tenemos tabla de control  
✅ Tenemos evento canónico confirmado

### Fase C
✅ Worker genera artefacto idempotente  
✅ Hash es estable  
✅ Evento se emite correctamente

### Fase D
✅ Usuario recibe notificación con link  
✅ Notificación solo se envía cuando artefacto está listo

### Fase E
✅ UI refleja estado real  
✅ Descarga funciona sin errores

### Fase F
✅ Tests pasan  
✅ Idempotencia confirmada

### Fase G
✅ Problema 2 cerrado oficialmente

---

## Referencias

- **Contrato:** `docs/contracts/FINAL_ARTIFACT_CONTRACT.md`
- **Decisiones:** `docs/decisions/DECISION_LOG_3.0.md`
- **Notificaciones:** `docs/contracts/NOTIFICATION_POLICY.md`

---

## Changelog

**v1.0** (2026-01-15)
- Roadmap canónico creado
- Fases A-G definidas
- Checklist por fase agregado
