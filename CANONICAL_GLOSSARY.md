# Glosario Canónico del Sistema Ecosign

## Términos Oficiales

### Componentes del Sistema

**DecisionAuthority** (antes "executor")
- El único componente que decide reglas de negocio
- Lee verdad de `document_entities.events[]`
- Aplica autoridad de `packages/authority`
- Escribe jobs en cola neutral
- **Nunca** ejecuta trabajos directamente
- **Solo** decide qué debe hacerse

**ExecutionEngine** (antes "orchestrator") 
- El componente que ejecuta trabajos
- Lee jobs de `executor_jobs`
- Ejecuta trabajos pesados (TSA, anclajes, artifacts)
- Reporta resultados como eventos
- **Nunca** decide reglas de negocio
- **Solo** ejecuta lo que se le indica

**WakeExecutionEngine** (antes "cron que llama orchestrator")
- Función que solo despierta el sistema
- No contiene lógica de negocio
- No procesa jobs
- Solo activa el loop de ejecución
- **Nunca** decide ni ejecuta
- **Solo** despierta

### Conceptos Fundamentales

**Verdad Canónica**
- `document_entities.events[]`
- Sistema de eventos inmutable
- Fuente única de verdad
- Append-only

**Autoridad Canónica** 
- `packages/authority`
- Reglas de negocio puras
- Código determinista
- Decisión basada en eventos

**Cola Neutral**
- `executor_jobs`
- Comunicación desacoplada
- No tiene lógica de negocio
- Solo transporte de decisiones a ejecución

### Patrones de Diseño

**Executor Tonto**
- Solo lee verdad, aplica autoridad, escribe cola
- No ejecuta side-effects
- No toma decisiones de ejecución

**Orchestrator Ciego**
- Solo lee cola, ejecuta, reporta eventos
- No conoce reglas de negocio
- No decide qué hacer

**Separación de Responsabilidades**
- Decisión vs Ejecución
- Autoridad vs Ejecución
- Verdad vs Lógica

### Flujo de Trabajo

**Ciclo Canónico**
1. Usuario genera evento canónico
2. DecisionAuthority lee verdad y aplica autoridad
3. DecisionAuthority escribe job en cola neutral
4. ExecutionEngine lee job y ejecuta
5. ExecutionEngine reporta resultado como evento
6. Ciclo se repite con nuevo estado

### Naming Patterns

**Funciones de Decisión**
- Prefijo: `should*`, `decide*`, `is*`
- Ejemplo: `shouldEnqueueRunTsa()`

**Funciones de Ejecución** 
- Prefijo: `execute*`, `run*`, `process*`
- Ejemplo: `executeTsaJob()`

**Funciones de Despertar**
- Prefijo: `wake*`, `poll*`, `trigger*`
- Ejemplo: `wakeExecutionEngine()`

### Errores Comunes de Interpretación

❌ "El orchestrator decide qué hacer"
✅ "El ExecutionEngine ejecuta lo que se le indica"

❌ "El executor ejecuta trabajos"
✅ "El DecisionAuthority decide y escribe en cola"

❌ "El cron procesa jobs"
✅ "El WakeExecutionEngine solo despierta el sistema"

❌ "Ambos componentes son igualmente importantes"
✅ "DecisionAuthority decide, ExecutionEngine ejecuta"

### Contratos Mentales

**¿Esto decide qué sigue?** → DecisionAuthority
**¿Esto ejecuta algo?** → ExecutionEngine  
**¿Esto solo despierta?** → WakeExecutionEngine

### Documentación y Código

Todos los comentarios, variables, funciones y documentos deben usar estos términos oficiales para mantener consistencia y evitar confusiones cognitivas.