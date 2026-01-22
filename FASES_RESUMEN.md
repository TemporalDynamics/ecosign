# Resumen de Fases - Ecosign

**Fecha:** 2026-01-21  
**Estado:** ACTUALIZADO

---

## 🎯 FASE 1 - Organización Canónica de Contratos (COMPLETADA)

### Objetivo
Ordenar la autoridad semántica del sistema. Separar contratos por nivel de autoridad sin cambiar comportamiento.

### Logros Alcanzados ✅
- **Directorios creados por nivel de autoridad:**
  - `/packages/contracts-runtime/` - Contratos ejecutables (LEY VIVA)
  - `/docs/constitution/` - Contratos documentales (CONSTITUCIÓN HUMANA)  
  - `/docs/appendix/` - Históricos y apéndices

- **Clasificación formal de contratos:**
  - **Nivel A (Ejecutables):** Reglas puras que se traducen a código
  - **Nivel B (Documentales):** Explican semántica para humanos
  - **Nivel C (Históricos):** Fueron verdad en un momento

- **Documentos organizados:**
  - Contratos ejecutables en `/packages/contracts-runtime/`
  - Contratos documentales en `/docs/constitution/`
  - Históricos en `/docs/appendix/`

- **Documento de clasificación:**
  - `/docs/contracts-classification.md` con tabla detallada

### Resultado
Sistema con autoridad estructurada, sin ambigüedad conceptual. Cada contrato en su nivel correcto.

---

## 🚀 FASE 2 - Runtime Canónico (INICIADA - Embrionaria)

### Objetivo
Implementar las reglas puras como funciones ejecutables que pueden ser usadas por el sistema.

### Logros Alcanzados ✅
- **Materialización parcial de contratos ejecutables:**
  - `authorityRules.ts` - Validación de autoridad de eventos
  - `evidenceState.ts` - Derivación de estado de evidencia
  - `orchestrationRules.ts` - Decisión de jobs basada en eventos
  - `types.ts` - Tipos comunes para contratos

- **Funciones puras implementadas:**
  - `validateAuthority()` - Verifica fuentes autorizadas
  - `deriveEvidenceState()` - Calcula nivel de evidencia
  - `decideNextJobs()` - Decide siguientes acciones
  - `hasRequiredEvidenceForLevel()` - Verifica evidencia requerida

- **Validaciones implementadas:**
  - Validación de causalidad temporal (confirmed_at ≥ at)
  - Validación de autoridad de emisor
  - Clasificación de eventos (evidence/tracking)

### Estado Actual
- Archivos en `/packages/contracts-runtime/` son **materialización parcial**
- No integrados al sistema productivo aún
- No tienen autoridad efectiva
- Sirven como referencia y alineación semántica

### Pendientes para completar Fase 2
- [ ] Integrar runtime con el executor existente
- [ ] Validar que decisiones coincidan con comportamiento actual
- [ ] Implementar sistema de logs de decisiones
- [ ] Asegurar consistencia con contratos canónicos
- [ ] Validar determinismo completo

---

## 🏗️ FASE 3 - UI Determinista y Orquestación Completa (PENDIENTE)

### Objetivo
Hacer que la UI derive estado solo de eventos canónicos y que el orquestador sea el único decisor.

### Planificado
- **UI solo deriva de eventos:**
  - `deriveUiState(events)` en lugar de campos sueltos
  - Estado completamente determinista
  - No más interpretación de DB suelta

- **Orquestador como único decisor:**
  - Modo "shadow" para validación
  - Decisiones basadas en reglas puras
  - Registro de todas las decisiones

- **Flujo TSA-only como prueba de concepto:**
  - Validar flujo completo
  - Asegurar consistencia
  - Documentar patrones

- **Migración gradual de módulos:**
  - Polygon anchoring
  - Bitcoin anchoring
  - Artifact final
  - Firma y workflows

### Requisitos Previos
- Completar Fase 2 con integración funcional
- Validar que runtime canónico funcione correctamente
- Asegurar consistencia con sistema actual

---

## 📊 Estado General del Sistema

| Componente | Estado | Fase |
|------------|--------|------|
| Autoridad de eventos | ✅ Implementada | F1+F2 |
| Clasificación de eventos | ✅ Implementada | F1 |
| Validación de causalidad | ✅ Implementada | F1+F2 |
| Runtime canónico | 🔄 Parcial | F2 |
| UI determinista | ❌ Pendiente | F3 |
| Orquestador único | ❌ Pendiente | F3 |
| Integración completa | ❌ Pendiente | F3 |

---

## 🎯 Próximos Pasos

### Inmediatos (Fase 2)
1. Completar integración del runtime canónico
2. Validar consistencia con comportamiento actual
3. Implementar sistema de logs de decisiones

### Mediano Plazo (Fase 3)
1. Implementar UI determinista
2. Activar orquestador como único decisor
3. Validar flujo completo TSA-only
4. Migrar módulos gradualmente

---

**Importante:** La transición entre fases es clara y cada nivel cumple su propósito sin solapamiento conceptual.