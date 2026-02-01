# DECISIONES DE PRODUCTO: Sistema de Firma Multi-Parte

**Versión**: 1.0
**Fecha**: 2025-11-18
**Estado**: ✅ Implementado en Backend
**Tipo**: Lineamientos de Producto (NO sugerencias)

---

## 🎯 RESUMEN EJECUTIVO

Este documento define las decisiones de producto para el sistema de firma multi-parte de VerifySign. **No son sugerencias técnicas**, sino lineamientos de producto que deben implementarse tal cual.

### Principios Core:
1. **Seguridad por defecto máxima** (Login + NDA siempre activos)
2. **Permisos universales** (todos firman y pueden solicitar cambios)
3. **NDA como checkbox legal**, no documento separado
4. **VerifyTracker siempre activo** (tracking completo de auditoría)
5. **Triple Anchoring por defecto** (RFC3161 + Polygon)

---

## 1. PERMISOS UNIVERSALES

### ❌ LO QUE NO EXISTE:
- **NO hay** campo "Permiso de Contrato" por firmante
- **NO hay** control de "puede firmar" vs "solo revisar"
- **NO hay** distinción de roles (todos son firmantes)

### ✅ LO QUE SÍ EXISTE:
- **Todos los firmantes pueden**:
  - ✅ Firmar el documento
  - ✅ Solicitar cambios/modificaciones
  - ✅ Ver el documento completo

### Implementación:
```typescript
// workflow_signers: NO tiene campos can_sign, can_request_changes
// Todos tienen ambos permisos por diseño
```

**Razón de producto**: Simplicidad. Si alguien está en el flujo de firma, es porque puede firmar. Si necesita hacer una observación, puede solicitarla. Sin distinciones complejas.

---

## 2. SEGURIDAD POR DEFECTO

### Configuración Estándar (Default):
```json
{
  "require_login": true,
  "require_nda": true,
  "quick_access": false
}
```

### Valores por Defecto en DB:
```sql
ALTER TABLE workflow_signers
  ALTER COLUMN require_login SET DEFAULT true,
  ALTER COLUMN require_nda SET DEFAULT true,
  ALTER COLUMN quick_access SET DEFAULT false;
```

### Modal de Usuario A (Propietario):
```
┌─────────────────────────────────────────┐
│ Firmante #1: carlos@empresa.com         │
│                                         │
│ [ ] Acceso Rápido (sin Login/NDA)      │  ← UN SOLO SWITCH
│                                         │
│ (Si desactiva, require_login=false      │
│  y require_nda=false automáticamente)   │
└─────────────────────────────────────────┘
```

**Razón de producto**: La seguridad es parte del ADN de VerifySign. Por defecto, todo está protegido. Solo se desactiva explícitamente con "Acceso Rápido".

---

## 3. NDA COMO CHECKBOX LEGAL

### ❌ LO QUE NO ES:
- **NO es** un documento PDF separado
- **NO es** un formulario con campos a completar
- **NO es** una aceptación de términos genéricos

### ✅ LO QUE SÍ ES:
- **Checkbox legal trackeado** con:
  - ✅ Timestamp de aceptación
  - ✅ IP address
  - ✅ Browser fingerprint (no-repudiación)
  - ✅ User agent
  - ✅ Hash inmutable en certificado .ECO

### Implementación en UI:
```tsx
{signer.require_nda && (
  <div className="nda-checkpoint">
    <input
      type="checkbox"
      id="nda-accept"
      onChange={(e) => {
        if (e.target.checked) {
          // Capturar fingerprint
          const fingerprint = await getBrowserFingerprint();
          setNdaData({
            accepted: true,
            timestamp: new Date().toISOString(),
            fingerprint
          });
        }
      }}
    />
    <label htmlFor="nda-accept">
      Acepto el acuerdo de confidencialidad para visualizar este documento
    </label>
  </div>
)}
```

### Almacenamiento:
```sql
-- En workflow_signatures (NO en tabla separada)
nda_accepted BOOLEAN,
nda_accepted_at TIMESTAMPTZ,
nda_ip_address TEXT,
nda_fingerprint JSONB  -- { canvas, webgl, fonts, timezone, ... }
```

**Razón de producto**: El NDA no es un contrato complejo, es una barrera legal de entrada. Lo importante es el tracking forense, no el documento en sí.

---

## 4. VERIFYTACKER SIEMPRE ACTIVO

### Eventos Trackeados:

| Evento | Trigger | Datos Capturados |
|--------|---------|------------------|
| **Acceso** | Usuario abre `/sign/[token]` | IP, UA, timestamp, geolocation |
| **NDA** | Checkbox NDA aceptado | IP, UA, fingerprint, timestamp |
| **Firma** | Botón "Firmar" presionado | IP, UA, signature_hash, certificación forense |
| **Modificación** | Botón "Solicitar Cambios" | IP, UA, annotations, timestamp |

### Sin Configuración:
- **NO hay** switch para "activar tracking"
- **NO hay** opción de "modo privado"
- **Siempre está ON** (es parte del valor de VerifySign)

**Razón de producto**: VerifyTracker es una feature core, no opcional. Todo acceso, firma y modificación debe ser auditable.

---

## 5. TRIPLE ANCHORING POR DEFECTO

### Configuración Estándar:
```json
{
  "rfc3161": true,    // ✅ Timestamp legal (~1-3 seg, gratis)
  "polygon": true,    // ✅ Blockchain (~10-30 seg, $0.001)
  "bitcoin": false    // ⏸️ Opcional (4-24h, costo variable)
}
```

### Modal de Usuario A:
```
┌─────────────────────────────────────────┐
│ Blindaje Forense                        │
│                                         │
│ [✓] RFC 3161 - Timestamp Legal          │
│ [✓] Polygon - Blockchain               │
│ [ ] Bitcoin - OpenTimestamps (24h)      │
└─────────────────────────────────────────┘
```

**Razón de producto**:
- RFC3161 es gratis y rápido → siempre ON
- Polygon es barato ($0.001) y rápido → ON por defecto
- Bitcoin es lento (24h) → opcional para casos críticos

---

## 6. FLUJO DE FIRMA SECUENCIAL

### Orden Estricto:
1. Usuario A configura documento + firmantes (orden 1, 2, 3...)
2. Firmante 1 recibe email → firma o solicita cambios
3. Si firma → Firmante 2 es notificado
4. Si solicita cambios → Usuario A decide (aceptar/rechazar)
5. Si acepta cambios → Nuevo documento (V2) → Reinicia desde Firmante 1

### Estados de Firmante:
```sql
status IN (
  'pending',           -- Esperando su turno
  'ready',             -- Es su turno AHORA
  'signed',            -- Ya firmó
  'requested_changes', -- Solicitó modificaciones
  'skipped'            -- Saltado por cancelación
)
```

**Razón de producto**: Orden claro evita conflictos. Un firmante a la vez garantiza que cada uno ve exactamente qué versión está firmando.

---

## 7. VERSIONADO AUTOMÁTICO

### Cuándo se Crea Nueva Versión:
- ✅ Usuario A acepta solicitud de cambios
- ✅ Usuario A sube documento modificado

### Qué Pasa con Versiones Anteriores:
```sql
-- V1 (superseded)
status = 'superseded'
-- Firmas de V1 quedan archivadas como evidencia

-- V2 (active)
status = 'active'
-- Todos los firmantes vuelven a 'pending'
-- Primer firmante → 'ready'
```

### Inmutabilidad:
- **Las firmas en V1 NO se borran** (evidencia forense)
- **Las firmas en V1 NO se transfieren** a V2
- **Todos deben firmar V2 de nuevo**

**Razón de producto**: Integridad forense. Cada versión tiene su propio certificado. No se puede "migrar" una firma de V1 a V2 porque el documento cambió.

---

## 8. NOTIFICACIONES AUTOMÁTICAS

### Eventos que Disparan Email:

| Evento | Destinatarios | Asunto |
|--------|--------------|--------|
| Workflow iniciado | Todos los firmantes | "Documento listo para firma: [filename]" |
| Tu turno de firmar | Firmante actual | "Es tu turno de firmar: [filename]" |
| Firmante completó | Usuario A + firmantes previos | "[Name] firmó el documento" |
| Solicitud de cambios | Usuario A | "[Name] solicita modificaciones" |
| Cambios aceptados | Todos | "Nueva versión disponible (V2)" |
| Cambios rechazados | Solicitante | "Solicitud rechazada por propietario" |
| Workflow completado | Todos | "Documento firmado por todos" |

### Contenido del Email:
```
Asunto: Es tu turno de firmar: Contrato_Q1_2025.pdf

Hola Carlos,

El documento "Contrato_Q1_2025.pdf" está listo para tu firma.

[Ver y Firmar Documento]
https://app.verifysign.pro/sign/abc123...

Firmantes previos:
✓ Ana García (Firmado el 2025-11-17)

Configuración de seguridad:
✓ Login requerido
✓ NDA requerido
```

**Razón de producto**: Comunicación clara en cada paso. Todos saben qué está pasando y cuándo es su turno.

---

## 9. CANVAS DE FIRMA SIEMPRE VISIBLE

### UI de Firmante:
```
┌─────────────────────────────────────────┐
│ [PDF Viewer - Full Screen]              │
│                                         │
│ (Documento completo, scroll vertical)   │
│                                         │
└─────────────────────────────────────────┘
│ [Canvas de Firma]                       │ ← SIEMPRE VISIBLE
│ ┌─────────────────────────────────────┐ │
│ │ [Dibuja tu firma aquí]              │ │
│ └─────────────────────────────────────┘ │
│ [Firmar]  [Solicitar Modificación]     │ ← AMBOS BOTONES
└─────────────────────────────────────────┘
```

### Ambos Botones Activos:
- **"Firmar"**: Procesa firma → certifica → avanza workflow
- **"Solicitar Modificación"**: Abre modal de anotaciones → pausa workflow

**Razón de producto**: El firmante siempre tiene ambas opciones. Si está de acuerdo, firma. Si no, solicita cambios. Sin restricciones artificiales.

---

## 10. MODAL DE ANOTACIONES

### Cuándo Aparece:
- Usuario hace click en "Solicitar Modificación"

### Funcionalidad:
```tsx
<AnnotationModal>
  {/* PDF con herramientas de markup */}
  <PDFViewer>
    <HighlightTool />  {/* Resaltar texto */}
    <TextAnnotation /> {/* Agregar nota en long-press */}
  </PDFViewer>

  {/* Lista de anotaciones */}
  <AnnotationsList>
    <Annotation page={1}>
      Cambiar fecha a 2025-02-01
    </Annotation>
    <Annotation page={3}>
      Agregar cláusula de renovación
    </Annotation>
  </AnnotationsList>

  {/* Notas generales */}
  <textarea placeholder="Notas adicionales (opcional)" />

  {/* Botones */}
  <button>Enviar Solicitud</button>
  <button>Cancelar</button>
</AnnotationModal>
```

**Razón de producto**: Las modificaciones deben ser específicas. No basta con decir "no me gusta", hay que resaltar QUÉ cambiar.

---

## 📦 RESUMEN PARA EL EQUIPO DE DESARROLLO

### Backend (✅ Implementado):
1. ✅ Migración 011: Seguridad por defecto (Login + NDA)
2. ✅ Trigger automático: `quick_access=true` → desactiva seguridad
3. ✅ Columnas NDA en `workflow_signatures`
4. ✅ Función `start-signature-workflow` con defaults
5. ✅ Función `process-signature` con NDA tracking

### Frontend (⏳ Pendiente):
1. ⏳ Modal de Usuario A sin campo "Permisos"
2. ⏳ Un solo switch "Acceso Rápido"
3. ⏳ Checkbox NDA con fingerprint
4. ⏳ Canvas de firma siempre visible
5. ⏳ Ambos botones (Firmar + Solicitar Cambios)
6. ⏳ Modal de anotaciones con highlight tool

---

## 🎯 MÉTRICAS DE PRODUCTO

### Simplicidad:
- **Antes**: 4 switches por firmante (Login, NDA, Firmar, Modificar)
- **Después**: 1 switch por firmante (Acceso Rápido)
- **Reducción**: 75% menos complejidad

### Seguridad:
- **Antes**: Default sin protección
- **Después**: Default con Login + NDA
- **Mejora**: 100% más seguro por defecto

### Trazabilidad:
- **NDA tracking**: IP + UA + Fingerprint + Timestamp
- **Firma tracking**: Triple Anchoring (RFC3161 + Polygon)
- **Modificación tracking**: Annotations + IP + UA

---

## 🚀 DEPLOYMENT

### Aplicar Migración:
```bash
# 1. Aplicar migración 011
supabase db push --include-all

# 2. Desplegar funciones actualizadas
supabase functions deploy start-signature-workflow --no-verify-jwt
supabase functions deploy process-signature --no-verify-jwt
```

### Validar:
```sql
-- Verificar defaults
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'workflow_signers'
AND column_name IN ('require_login', 'require_nda', 'quick_access');

-- Resultado esperado:
-- require_login  | true
-- require_nda    | true
-- quick_access   | false
```

---

## 📞 CONTACTO

Para preguntas sobre estas decisiones de producto, contactar a:
- **Producto**: [Tu nombre]
- **Backend**: [Dev backend]
- **Frontend**: [Dev frontend]

---

**Última actualización**: 2025-11-18
**Versión**: 1.0
**Estado**: ✅ Listo para desarrollo frontend
