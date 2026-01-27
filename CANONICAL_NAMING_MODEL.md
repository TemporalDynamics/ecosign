# Sistema Canónico Ecosign - Modelo de Autoridad Unificada

## 🧠 DecisionAuthority (Entidad de Decisión)

**Responsabilidad Única**: Tomar decisiones basadas en la verdad canónica.

### Funciones Principales:
- Lee estado de `document_entities.events[]`
- Aplica reglas de `packages/authority`
- Decide qué jobs deben crearse
- Escribe jobs en cola neutral `executor_jobs`

### Principios:
- **No ejecuta side-effects** (no TSA, no anclajes, no emails)
- **No toma decisiones de ejecución** (no decide cómo, solo qué)
- **Es determinista** (mismo input → mismo output)
- **Es el único cerebro** (fuente canónica de "qué sigue")

### Ejemplo de uso:
```typescript
// DecisionAuthority decide basado en eventos
const shouldEnqueueTsa = shouldEnqueueRunTsa(events);
if (shouldEnqueueTsa) {
  await enqueueJob('run_tsa', entity.id, { witness_hash });
}
```

---

## ⚙️ ExecutionEngine (Motor de Ejecución)

**Responsabilidad Única**: Ejecutar jobs de forma agnóstica al dominio.

### Funciones Principales:
- Lee jobs de `executor_jobs`
- Ejecuta trabajos pesados (TSA, anclajes, artifacts)
- Maneja retries y concurrencia
- Reporta resultados como eventos

### Principios:
- **No decide reglas de negocio** (solo ejecuta lo que le dicen)
- **No interpreta eventos** (solo procesa jobs)
- **Es reemplazable** (puede ser cualquier worker pool)
- **No conoce el dominio** (solo ejecuta instrucciones)

### Ejemplo de uso:
```typescript
// ExecutionEngine ejecuta jobs sin decidir nada
if (job.type === 'run_tsa') {
  const result = await callTsaService(job.payload);
  await appendEvent(entityId, 'tsa.completed', result);
}
```

---

## ⏰ WakeExecutionEngine (Despertador del Sistema)

**Responsabilidad Única**: Despertar el sistema para que procese jobs pendientes.

### Funciones Principales:
- Ejecuta periódicamente `wake_execution_engine()`
- No contiene lógica de negocio
- No procesa jobs
- Solo activa el loop de ejecución

### Principios:
- **No decide nada** (solo despierta)
- **No ejecuta nada** (solo llama a otros)
- **No lee eventos** (solo activa workers)
- **No tiene estado** (es un trigger simple)

---

## 🔄 Flujo de Trabajo Canónico

```
Usuario → Evento canónico → document_entities.events[]
DecisionAuthority ← Lee verdad ← document_entities
DecisionAuthority → Usa autoridad → packages/authority  
DecisionAuthority → Escribe job → executor_jobs cola neutral
ExecutionEngine ← Lee cola ← executor_jobs
ExecutionEngine → Ejecuta trabajo → Resultado
ExecutionEngine → Evento resultado → document_entities.events[]
```

## 🛡️ Garantías del Sistema

1. **Un solo libro contable**: `document_entities.events[]`
2. **Un solo cerebro**: `DecisionAuthority` (packages/authority)
3. **Separación completa**: Decisión vs Ejecución
4. **Auditable**: Todo registrado como eventos inmutables
5. **Escalable**: Componentes stateless y desacoplados
6. **Legalmente protegido**: Autoridad clara y separada de ejecución