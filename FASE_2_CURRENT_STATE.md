# Estado Actual de la Fase 2 - Migración Controlada

**Fecha:** 2026-01-21  
**Versión:** v1.0  
**Estado:** Inicio de migración controlada (Paso 1 TSA-only)

---

## 🎯 Objetivo Inmediato

Migrar la primera decisión del sistema: **"cuándo se encola run_tsa"**  
Desde: executor actual (Supabase Edge Function)  
Hacia: runtime canónico (contracts-runtime.decideNextJobs)

---

## ✅ Estado Actual

### Contratos Organizados (Fase 1 - Completada)
- Directorios por nivel de autoridad creados
- Clasificación formal de eventos implementada
- Documentos organizados en A/B/C (evidence/tracking/historical)

### Runtime Canónico (Fase 2 - Embrionaria)
- Funciones puras implementadas:
  - `authorityRules.ts`
  - `evidenceState.ts` 
  - `orchestrationRules.ts`
  - `types.ts`
- Validaciones de causalidad temporal
- Sistema de clasificación de eventos

### Protocolo de Migración (Fase 2 - Implementado)
- Regla fundamental: validar UI después de cada decisión migrada
- Orden recomendado: TSA-only → Finalización → Artifact → Polygon/Bitcoin
- Checklist de validación por decisión
- Resultado binario: ACEPTADO/RECHAZADO

---

## 🔄 Próximo Paso Inmediato

### Paso 1: Migración TSA-only
**Objetivo:** Mover la lógica de "cuándo encolar run_tsa" al runtime canónico

**Implementación:**
1. Añadir regla en `orchestrationRules.decideNextJobs()`
2. Implementar en modo shadow (comparar con comportamiento actual)
3. Validar que decisiones coincidan
4. Activar modo controlado
5. Validar UI completamente

**Validación requerida:**
- Documento subido → estado inicial correcto
- Iniciar protección → "pendiente TSA" en UI
- Evento `tsa.confirmed` → cambio de estado en UI
- UI deriva solo de `events[]`, no de campos sueltos

---

## 📋 Checklist de Validación para Paso 1

### Pre-migración
- [ ] Equipo alineado con protocolo de migración
- [ ] Entorno de pruebas preparado
- [ ] Backup del sistema actual
- [ ] Documentación de comportamiento actual revisada

### Implementación
- [ ] Regla implementada en `contracts-runtime`
- [ ] Modo shadow activo y comparando con actual
- [ ] No hay discrepancias en decisiones
- [ ] Sistema sigue funcionando con comportamiento actual

### Validación UI
- [ ] Flujo completo funciona correctamente
- [ ] Estados cambian solo con eventos
- [ ] No hay flickers ni anticipaciones
- [ ] UI deriva de `deriveUiState(events)`
- [ ] No hay estados imposibles

### Post-validación
- [ ] Responsable de validación confirma explícitamente estado **ACEPTADO**
- [ ] No hay regresiones
- [ ] Ready para siguiente paso

---

## ⚠️ Regla Crítica

**Después de completar este paso, NO avanzar a siguiente decisión hasta que la validación UI esté completa.**

**La UI es nuestro osciloscopio. Si la UI no refleja correctamente el nuevo modelo, la migración no está completa.**

---

## 🎯 Próximo Objetivo Intermedio

Completar migración TSA-only con UI validada → Habilitar migración de siguiente decisión (finalización/simple).

---

**Importante:** No estamos optimizando velocidad. Estamos validando que el sistema sea legible y determinista.