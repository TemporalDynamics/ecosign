# Arquitectura de Sistema Ecosign - Modelo Canónico

## Visión General

Este sistema implementa una arquitectura donde:

- **Verdad** vive en `document_entities.events[]` (append-only)
- **Autoridad** vive en `packages/authority` (reglas de negocio)
- **Executor** es tonto: solo lee verdad, usa autoridad, escribe en cola neutral
- **Orchestrator** solo ejecuta: consume cola, ejecuta, reporta eventos

## Componentes

### 1. Verdad Canónica: `document_entities.events[]`
- Tabla que contiene el estado inmutable de cada documento
- Events se agregan en orden cronológico
- Fuente única de verdad para el estado de cada documento

### 2. Autoridad: `packages/authority`
- Código puro que define reglas de negocio
- Funciones `should*()` que deciden "se hace / no se hace"
- Portable, testeable, versionado en el repo

### 3. Executor: `fase1-executor`
- Lee estado de `document_entities`
- Aplica reglas de `packages/authority`
- Escribe jobs en cola neutral `executor_jobs`
- **NUNCA** ejecuta trabajos directamente

### 4. Orchestrator: `orchestrator`
- Lee jobs de `executor_jobs`
- Ejecuta trabajos pesados (TSA, anchors, artifacts)
- Reporta resultados como eventos en `document_entities.events[]`
- **NUNCA** decide reglas de negocio

## Flujo de Trabajo

```
Usuario → Evento canónico → document_entities.events[]
Executor ← Lee verdad ← document_entities
Executor → Usa autoridad → packages/authority
Executor → Escribe job → executor_jobs tabla
Orchestrator ← Lee cola ← executor_jobs
Orchestrator → Ejecuta trabajo → Resultado
Orchestrator → Evento resultado → document_entities.events[]
```

## Scripts Importantes

### `scripts/migrate_legacy_events_to_canonical.ts`
- Conecta eventos legacy con sistema canónico
- Temporal, para activar sistema dormido
- Se puede borrar después de activación

### `supabase/functions/new-document-canonical-trigger/index.ts`
- Nuevo trigger que escribe eventos directamente en sistema canónico
- Reemplaza triggers legacy

### `supabase/functions/fase1-executor/index.ts`
- Executor actualizado para usar modelo canónico
- Lee verdad, usa autoridad, escribe en cola neutral

### `supabase/functions/orchestrator/index.ts`
- Orchestrator que consume cola y ejecuta trabajos
- No decide reglas de negocio

## Validación

Para validar que el sistema funciona correctamente:

```bash
deno run --allow-env --allow-net scripts/validate_system_architecture.ts
```

## Principios de Diseño

1. **Separación de Verdadero y Autoridad**: La verdad es inmutable, la autoridad decide
2. **Executor Tonto**: Solo lee, decide, escribe en cola - no ejecuta
3. **Orchestrator Ciego**: Solo ejecuta, no decide - no conoce reglas de negocio
4. **Cola Neutral**: Comunicación desacoplada entre executor y orchestrator
5. **Eventos Canónicos**: Todo resultado se registra como evento inmutable

## Escalabilidad

Esta arquitectura escala a millones de usuarios porque:
- La verdad está en DB (append-only, barata de leer)
- La autoridad es código puro (determinista)
- El executor es stateless
- El orchestrator maneja concurrencia y retries
- No hay cuello de botella en la lógica de negocio

## Seguridad Legal

El sistema está protegido legalmente porque:
- Solo la autoridad decide reglas de negocio
- El orchestrator no toma decisiones
- Todo está registrado como eventos inmutables
- Se puede auditar completamente el flujo de decisiones