# Fase 2 - Paso 1: Migración TSA-only

**Objetivo:** Migrar la decisión de "cuándo se encola run_tsa" del executor al runtime canónico con validación UI completa.

---

## 🎯 Objetivo Específico

Mover la lógica de decisión:
- `if (!hasTsaConfirmed) → encolar run_tsa`
- Del executor actual → `contracts-runtime.decideNextJobs()`

## 📋 Checklist de Implementación

### 1️⃣ Implementar regla en contracts-runtime
- [ ] Añadir lógica para detectar falta de `tsa.confirmed`
- [ ] Añadir decisión de encolar `run_tsa` si falta
- [ ] Asegurar que no duplique decisiones existentes
- [ ] Validar que solo se ejecute si no hay `tsa.confirmed`

### 2️⃣ Integrar en modo shadow
- [ ] Modo "shadow": orquestador decide pero no ejecuta
- [ ] Comparar decisiones con executor actual
- [ ] Registrar discrepancias para análisis
- [ ] Asegurar que no interfiera con sistema actual

### 3️⃣ Validación UI completa
- [ ] Subir documento nuevo
- [ ] Ver estado inicial correcto
- [ ] Iniciar protección
- [ ] Ver "pendiente TSA" en UI
- [ ] Confirmar evento `tsa.confirmed` 
- [ ] Ver cambio de estado en UI
- [ ] Verificar que no hay flickers ni estados imposibles
- [ ] Validar que UI derive de `events[]` y no de campos sueltos

## 🧪 Validación Técnica

### Antes de activar
- [ ] Decisiones del orquestador coinciden con executor actual
- [ ] No hay duplicación de jobs
- [ ] Sistema sigue funcionando con comportamiento actual
- [ ] Logs muestran decisiones del orquestador

### Durante validación UI
- [ ] UI cambia estado solo cuando llega evento
- [ ] No hay anticipación de estados
- [ ] No hay estados intermedios inválidos
- [ ] Flujo completo funciona correctamente

## 🚦 Estado de Validación

| Componente | Estado | Comentarios |
|------------|--------|-------------|
| Regla en runtime | Pendiente | Implementar lógica de TSA |
| Modo shadow | Pendiente | Configurar comparación con actual |
| Validación UI | Pendiente | Ejecutar checklist completo |
| Aprobación | Pendiente | Esperando validación |

## 📝 Notas Técnicas

### Función objetivo
```typescript
// En contracts-runtime/orchestrationRules.ts
export function decideNextJobs(events: GenericEvent[], protection: string[]): OrchestrationDecision {
  // Lógica para decidir si se necesita run_tsa
  const hasTsa = events.some(e => e.kind === 'tsa.confirmed');
  
  if (!hasTsa) {
    return { jobs: ['run_tsa'], reason: 'needs_tsa' };
  }
  
  // ... resto de la lógica
}
```

### Validación de UI
La UI debe usar:
```typescript
// deriveUiState(events) en lugar de campos sueltos
const uiState = deriveUiState(documentEntity.events);
```

## ⚠️ Requisitos Previos

- [ ] Protocolo de migración aceptado por equipo
- [ ] Entorno de pruebas listo
- [ ] Backup del sistema actual
- [ ] Documentación de comportamiento actual

## ✅ Criterio de Aceptación

- [ ] Orquestador decide correctamente cuándo encolar `run_tsa`
- [ ] UI refleja cambios solo con eventos
- [ ] No hay regresiones en funcionalidad
- [ ] Validación manual completa exitosa
- [ ] Responsable de validación confirma explícitamente estado **ACEPTADO**
- [ ] Equipo aprueba comportamiento

---

**Importante:** No avanzar a siguiente paso hasta que este esté completamente validado.