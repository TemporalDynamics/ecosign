# 📊 Análisis del Esquema de Base de Datos - EcoSign

**Fecha**: 2025-12-01
**Objetivo**: Identificar tablas redundantes y proponer consolidación

---

## 📋 Inventario Completo de Tablas

### **Grupo 1: Core Document Management** (Esquema Original VerifySign)

| Tabla | Propósito | Creada en | Estado |
|-------|-----------|-----------|--------|
| **documents** | Documentos certificados con hash .ECO | 001_core_schema.sql | ✅ Activa |
| **links** | Enlaces únicos para compartir documentos | 001_core_schema.sql | ✅ Activa |
| **recipients** | Receptores de documentos compartidos | 001_core_schema.sql | ✅ Activa |
| **nda_acceptances** | Registro de aceptación de NDAs | 001_core_schema.sql | ✅ Activa |
| **access_events** | Log de accesos (auditoría VerifyTracker) | 001_core_schema.sql | ✅ Activa |
| **anchors** | Anclajes en blockchain (OpenTimestamps, Polygon) | 001_core_schema.sql | ✅ Activa |

**Notas**:
- Este es el esquema **original** de VerifySign
- Diseñado para certificación simple + sharing con NDA
- **NO es redundante**, es un flujo completo independiente

---

### **Grupo 2: Signature Workflows** (Nueva funcionalidad EcoSign)

| Tabla | Propósito | Creada en | Estado |
|-------|-----------|-----------|--------|
| **signature_workflows** | Flujos de firma multi-parte | 009_signature_workflows.sql | ✅ Activa |
| **workflow_versions** | Versionado de documentos en el workflow | 009_signature_workflows.sql | ✅ Activa |
| **workflow_signers** | Firmantes en orden secuencial | 009_signature_workflows.sql | ✅ Activa |
| **workflow_signatures** | Firmas completadas con metadata | 009_signature_workflows.sql | ✅ Activa |
| **workflow_notifications** | Sistema de notificaciones por email | (varias migraciones) | ✅ Activa |
| **signer_links** | Enlaces de acceso para firmantes | 012_signer_links_and_events.sql | ✅ Activa |

**Notas**:
- Este es un **sistema completamente diferente** al Grupo 1
- Soporta firma secuencial, versionado, modificaciones
- Integrado con SignNow para firma electrónica
- **NO es redundante** con Grupo 1

---

### **Grupo 3: Tracking & Analytics**

| Tabla | Propósito | Creada en | Estado |
|-------|-----------|-----------|--------|
| **events** | Eventos genéricos del sistema | 012_signer_links_and_events.sql | ✅ Activa |
| **conversion_events** | Eventos de conversión (marketing) | 002_create_analytics_table.sql | ✅ Activa |
| **ecox_audit_trail** | Auditoría de generación .ECOX | 20251127000000_ecox_audit_trail.sql | ✅ Activa |
| **audit_logs** | Logs de auditoría generales | 20251202120000_add_audit_logs.sql | ⚠️ **POSIBLE REDUNDANCIA** |

**Notas**:
- `events`, `access_events`, `ecox_audit_trail` y `audit_logs` tienen **overlap**
- **Recomendación**: Consolidar en una sola tabla de auditoría unificada

---

### **Grupo 4: User Documents** (Sistema de almacenamiento)

| Tabla | Propósito | Creada en | Estado |
|-------|-----------|-----------|--------|
| **user_documents** | Metadatos de documentos subidos por usuarios | 007_user_documents.sql | ✅ Activa |

**Notas**:
- Esta tabla **complementa** tanto `documents` como `signature_workflows`
- **NO es redundante**, sirve como índice de archivos en Storage
- Relaciona archivos en Supabase Storage con workflows/documents

---

### **Grupo 5: Rate Limiting & Security**

| Tabla | Propósito | Creada en | Estado |
|-------|-----------|-----------|--------|
| **rate_limits** | Límites de rate limiting | 005_rate_limiting.sql | ⚠️ **DUPLICADA** |
| **rate_limits** | Límites de rate limiting | 20250117000000_create_rate_limits_table.sql | ⚠️ **DUPLICADA** |
| **rate_limit_blocks** | Bloqueos activos de IPs | 005_rate_limiting.sql | ✅ Activa |

**Notas**:
- **REDUNDANCIA CRÍTICA**: Tabla `rate_limits` creada **DOS VECES**
- **Acción requerida**: Eliminar una de las dos migraciones (probablemente la de 20250117)

---

### **Grupo 6: Legacy/Old Schema** (Esquema viejo de VerifySign)

| Tabla | Propósito | Creada en | Estado |
|-------|-----------|-----------|--------|
| **eco_records** | (Legacy) Registros .ECO antiguos | 001_create_verifysign_schema.sql | ⚠️ **LEGACY - REVISAR** |
| **access_logs** | (Legacy) Logs de acceso antiguos | 001_create_verifysign_schema.sql | ⚠️ **LEGACY - DUPLICADO** |
| **nda_signatures** | (Legacy) Firmas NDA antiguas | 001_create_verifysign_schema.sql | ⚠️ **LEGACY - DUPLICADO** |

**Notas**:
- Estas tablas son del **primer intento** de schema de VerifySign
- **Duplican funcionalidad** de `documents`, `access_events` y `nda_acceptances`
- **Acción requerida**: Migrar datos si existen, luego eliminar tablas legacy

---

### **Grupo 7: Invites & Onboarding**

| Tabla | Propósito | Creada en | Estado |
|-------|-----------|-----------|--------|
| **invites** | Sistema de invitaciones (beta/onboarding) | 015_bitcoin_pending_and_invites.sql | ✅ Activa |

**Notas**:
- Sistema de invitaciones para early access
- **NO es redundante**, propósito único

---

## 🔍 Redundancias Identificadas

### **🚨 CRÍTICO: Duplicación de Tablas**

#### 1. `rate_limits` (DUPLICADA)
**Problema**: Creada en DOS migraciones diferentes:
- `005_rate_limiting.sql`
- `20250117000000_create_rate_limits_table.sql`

**Solución**:
```sql
-- Verificar cuál tiene datos
SELECT COUNT(*) FROM rate_limits;

-- Si no tiene datos, eliminar la migración 20250117000000_create_rate_limits_table.sql
-- Si tiene datos, verificar que ambas sean idénticas y eliminar duplicado
```

---

### **⚠️ MODERADO: Tablas Legacy sin uso**

#### 2. `eco_records` vs `documents`
**Problema**: Ambas almacenan documentos certificados

| Característica | `eco_records` | `documents` |
|----------------|---------------|-------------|
| Creación | Legacy (001_create_verifysign) | Core schema (001_core) |
| Relaciones | Pocas/ninguna | Integrada con workflows |
| Uso actual | ❓ Desconocido | ✅ Activa |

**Solución**:
1. Verificar si `eco_records` tiene datos
2. Si tiene datos, migrarlos a `documents`
3. Eliminar `eco_records`

---

#### 3. `access_logs` vs `access_events`
**Problema**: Ambas registran accesos a documentos

| Característica | `access_logs` | `access_events` |
|----------------|---------------|-----------------|
| Creación | Legacy | Core schema |
| Uso actual | ❓ Desconocido | ✅ Activa |

**Solución**:
1. Migrar datos de `access_logs` a `access_events`
2. Eliminar `access_logs`

---

#### 4. `nda_signatures` vs `nda_acceptances`
**Problema**: Ambas registran aceptaciones de NDA

**Solución**:
1. Migrar datos de `nda_signatures` a `nda_acceptances`
2. Eliminar `nda_signatures`

---

### **💡 SUGERENCIA: Consolidación de Audit Logs**

#### 5. Múltiples tablas de auditoría
**Tablas actuales**:
- `events` - Eventos genéricos
- `access_events` - Accesos a documentos
- `ecox_audit_trail` - Generación .ECOX
- `audit_logs` - Logs generales

**Problema**: Fragmentación de auditoría

**Solución propuesta** (Largo plazo):
Crear una tabla unificada con particionamiento:
```sql
CREATE TABLE unified_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'access', 'ecox_generation', 'workflow_event', etc.
  entity_type TEXT, -- 'document', 'workflow', 'user', etc.
  entity_id UUID,
  user_id UUID,
  metadata JSONB, -- Flexible para diferentes tipos de eventos
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
) PARTITION BY RANGE (created_at);
```

**Ventajas**:
- Consultas unificadas
- Particionamiento por fecha (performance)
- Retención de datos más fácil

**Desventajas**:
- Requiere migración compleja
- Cambios en código existente

---

## 📊 Resumen de Acciones Recomendadas

### **Prioridad ALTA** (Hacer ahora)

| # | Acción | Motivo | Impacto |
|---|--------|--------|---------|
| 1 | Eliminar duplicado de `rate_limits` | Conflicto de migraciones | Alto - puede causar errores |
| 2 | Verificar uso de tablas legacy (`eco_records`, `access_logs`, `nda_signatures`) | Limpieza | Medio - confusión |

### **Prioridad MEDIA** (Próximos sprints)

| # | Acción | Motivo | Impacto |
|---|--------|--------|---------|
| 3 | Migrar datos de tablas legacy a core schema | Consolidación | Medio - simplificación |
| 4 | Eliminar tablas legacy vacías | Limpieza | Bajo - mantenibilidad |

### **Prioridad BAJA** (Largo plazo)

| # | Acción | Motivo | Impacto |
|---|--------|--------|---------|
| 5 | Consolidar tablas de auditoría en `unified_audit_trail` | Performance + DX | Alto - mejor auditoría, pero requiere trabajo |

---

## 🎯 Conclusión

**¿Hay "muchas tablas redundantes"?**

**Respuesta**: **NO realmente**, pero hay **3-4 tablas legacy que deben limpiarse**:

1. ✅ **NO son redundantes**:
   - Grupo 1 (documents, links, recipients) - VerifySign core
   - Grupo 2 (signature_workflows, workflow_*) - EcoSign workflows
   - Grupo 4 (user_documents) - Storage management

2. ⚠️ **SÍ son redundantes/legacy**:
   - `rate_limits` (duplicada)
   - `eco_records` (reemplazada por `documents`)
   - `access_logs` (reemplazada por `access_events`)
   - `nda_signatures` (reemplazada por `nda_acceptances`)

3. 💡 **Mejora futura**:
   - Consolidar tablas de auditoría en largo plazo

---

## ✅ Próximos Pasos

1. **Investigación**: Verificar si las tablas legacy tienen datos
2. **Planificación**: Si tienen datos, crear script de migración
3. **Ejecución**: Migrar datos + eliminar tablas legacy
4. **Validación**: Confirmar que no hay referencias en código

¿Quieres que proceda con la investigación de las tablas legacy?
