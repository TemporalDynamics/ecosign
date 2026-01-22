# Estado Completo del Sistema - Ecosign

**Fecha:** 2026-01-21  
**Versión:** v1.0  
**Estado:** Fase 2 - Migración Controlada Activa

---

## 🎯 Resumen Ejecutivo

El sistema Ecosign ha completado la **Fase 1 - Organización Canónica** y ha iniciado la **Fase 2 - Runtime Canónico** con un protocolo de migración controlada completamente implementado y documentado.

---

## 📋 Estado Actual Detallado

### Fase 1 - Organización Canónica ✅ COMPLETADA
- **Clasificación formal de eventos:** Implementada (Nivel A: evidence, B: tracking, C: historical)
- **Directorios estructurados:** `/packages/contracts-runtime/`, `/docs/constitution/`, `/docs/appendix/`
- **Validación de autoridad:** Implementada con allowlist por tipo de evento
- **Causalidad temporal:** Validada con `confirmed_at ≥ at`
- **Sistema de eventos:** Append-only con triggers de base de datos

### Fase 2 - Runtime Canónico 🔄 EN PROGRESO
- **Protocolo de migración:** ✅ Implementado y documentado
- **Regla de autoridad de validación:** ✅ Implementada (solo responsable puede aprobar)
- **Runtime canónico:** Parcialmente implementado
- **Próximo paso:** Migrar decisión `run_tsa` con validación UI completa

### Fase 3 - UI Determinista ❌ PENDIENTE
- **Depende de completar Fase 2 con éxito**

---

## 🔧 Componentes Implementados

### Runtime Canónico (`/packages/contracts-runtime/`)
- `authorityRules.ts` - Validación de autoridad de eventos
- `evidenceState.ts` - Derivación de estado de evidencia
- `orchestrationRules.ts` - Decisión de jobs basada en eventos
- `types.ts` - Tipos comunes para contratos
- `decisionLogger.ts` - Registro de decisiones del executor

### Validación de Eventos
- **Clasificación formal:** `EVENT_CLASS` con `'evidence' | 'tracking'`
- **Validación de `_source`:** Obligatorio para eventos de evidencia fuerte
- **Validación de causalidad temporal:** `confirmed_at ≥ at` para anclajes
- **Guardrails estrictos:** No permiten bypass de autoridad

### Protocolo de Migración Controlada
- **Validación UI obligatoria:** Después de cada decisión migrada
- **Autoridad de aprobación clara:** Solo responsable puede validar
- **Resultado binario:** ACEPTADO/RECHAZADO (no opinable)
- **Orden de migración definido:** TSA-only → Finalización → Artifact → Polygon/Bitcoin

### Sistema de Logs de Decisiones
- **Tabla:** `executor_decision_logs` con migración SQL
- **Función:** `logExecutorDecision()` para registrar decisiones
- **Hash de eventos:** Para verificación de consistencia
- **Auditoría completa:** Cada decisión queda registrada

---

## 🧠 Arquitectura Canónica

### Niveles de Autoridad
1. **Nivel A (Evidence):** Eventos que definen verdad canónica
2. **Nivel B (Tracking):** Eventos de seguimiento y fallo
3. **Nivel C (Historical):** Documentación de decisiones pasadas

### Flujo de Decisiones
1. **document_entities.events[]** → Fuente de verdad canónica
2. **contracts-runtime.decideNextJobs()** → Lógica pura de decisión
3. **executor** → Ejecución de jobs
4. **UI** → Derivación de estado desde eventos

### Validación de Causalidad
- **Temporal:** `confirmed_at ≥ at` para eventos de confirmación
- **De autoridad:** `_source` verificado contra allowlist
- **De estructura:** `kind` y `at` obligatorios
- **De integridad:** Append-only con triggers de base de datos

---

## 🚀 Próximo Paso Inmediato

### Paso 1: Migración TSA-only
**Objetivo:** Mover la lógica de "cuándo se encola run_tsa" del executor al runtime canónico

**Implementación requerida:**
1. Añadir regla en `orchestrationRules.decideNextJobs()`
2. Implementar en modo shadow (comparar con actual)
3. Validar que decisiones coincidan
4. Activar modo controlado
5. Validar UI completamente

**Validación requerida:**
- Documento subido → estado inicial correcto
- Iniciar protección → "pendiente TSA" en UI
- Evento `tsa.confirmed` → cambio de estado en UI
- UI deriva solo de `events[]`, no de campos sueltos
- **Confirmación explícita del responsable: ACEPTADO**

---

## ✅ Garantías del Sistema

### Autoridad Estricta
- Solo fuentes autorizadas pueden emitir eventos de evidencia
- Validación de `_source` en tiempo de escritura
- Allowlist por tipo de evento con wildcards controlados

### Causalidad Verificable
- Validación de fechas temporales
- No se permiten eventos con causalidad inválida
- Registro de orden de eventos garantizado

### Determinismo Garantizado
- Mismo input → mismo output
- Funciones puras sin IO
- Validación estructural completa

### Auditoría Completa
- Cada decisión queda registrada
- Trazabilidad completa de decisiones
- Sistema de logs estructurado

---

## 🎯 Conclusión

El sistema está en un estado de **migración controlada activa** donde:
- La base canónica está completamente implementada
- El protocolo de migración está activo y documentado
- Cada paso se valida rigurosamente antes de avanzar
- La calidad y consistencia son prioridad sobre velocidad
- La autoridad de validación está claramente definida

**El sistema está listo para la migración controlada de decisiones con garantía de calidad y trazabilidad completa.**