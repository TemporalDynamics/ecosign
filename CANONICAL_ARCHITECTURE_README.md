# Sistema Canónico Ecosign - Arquitectura de Autoridad Unificada

## 🎯 Visión General

Este proyecto implementa una arquitectura canónica donde:

- **Verdad** vive en `document_entities.events[]` (sistema de eventos inmutable)
- **Autoridad** vive en `packages/authority` (reglas de negocio puras)
- **Executor** es tonto: solo lee verdad, usa autoridad, escribe en cola neutral
- **Orchestrator** solo ejecuta: consume cola, ejecuta, reporta eventos

## 🏗️ Arquitectura

### Componentes Principales

1. **Verdad Canónica**: `document_entities.events[]`
   - Tabla que contiene el estado inmutable de cada documento
   - Events se agregan en orden cronológico
   - Fuente única de verdad para el estado de cada documento

2. **Autoridad**: `packages/authority`
   - Código puro que define reglas de negocio
   - Funciones `should*()` que deciden "se hace / no se hace"
   - Portable, testeable, versionado en el repo

3. **DecisionAuthority**: `fase1-executor`
   - Lee estado de `document_entities`
   - Aplica reglas de `packages/authority`
   - Escribe jobs en cola neutral `executor_jobs`
   - **NUNCA** ejecuta trabajos directamente
   - **SOLO** decide qué debe hacerse

4. **ExecutionEngine**: `orchestrator`
   - Lee jobs de `executor_jobs`
   - Ejecuta trabajos pesados (TSA, anchors, artifacts)
   - Reporta resultados como eventos en `document_entities.events[]`
   - **NUNCA** decide reglas de negocio
   - **SOLO** ejecuta lo que se le indica

## 🔄 Flujo de Trabajo

```
Usuario → Evento canónico → document_entities.events[]
DecisionAuthority ← Lee verdad ← document_entities
DecisionAuthority → Usa autoridad → packages/authority
DecisionAuthority → Escribe job → executor_jobs tabla
ExecutionEngine ← Lee cola neutral ← executor_jobs
ExecutionEngine → Ejecuta trabajo → Resultado
ExecutionEngine → Evento resultado → document_entities.events[]
```

## 📁 Estructura de Directorios

```
supabase/
├── functions/
│   ├── fase1-executor/           # Executor que decide
│   ├── orchestrator/             # Orchestrator que ejecuta
│   └── new-document-canonical-trigger/  # Nuevo trigger canónico
├── migrations/
│   ├── 20260127000000_orchestrator_cron_job.sql  # Cron para orchestrator
│   └── 20260127010000_orchestrator_processing_function.sql  # Función de procesamiento
scripts/
├── verify_canonical_system.ts    # Verificación del sistema
├── monitor_canonical_system.ts   # Monitor del sistema
└── migrate_legacy_events_to_canonical.ts  # Migración temporal
```

## 🚀 Inicialización

Para inicializar el sistema:

```bash
./init_canonical_system.sh
```

## 📊 Monitoreo

Para monitorear el sistema:

```bash
deno run --allow-env --allow-net scripts/monitor_canonical_system.ts
```

## 🧪 Validación

Para verificar el sistema:

```bash
deno run --allow-env --allow-net scripts/verify_canonical_system.ts
```

## 📄 Documentación Adicional

- `ARCHITECTURE_MODEL.md` - Modelo arquitectónico detallado
- `SYSTEM_STATUS_SUMMARY.md` - Resumen del estado actual
- `STATUS_ACTUAL_SISTEMA.md` - Estado actual del sistema
- `docs/` - Documentación adicional

## 🎯 Principios de Diseño

1. **Separación de Verdadero y Autoridad**: La verdad es inmutable, la autoridad decide
2. **Executor Tonto**: Solo lee, decide, escribe en cola - no ejecuta
3. **Orchestrator Ciego**: Solo ejecuta, no decide - no conoce reglas de negocio
4. **Cola Neutral**: Comunicación desacoplada entre executor y orchestrator
5. **Eventos Canónicos**: Todo resultado se registra como evento inmutable

## 🚀 Escalabilidad

Esta arquitectura escala a millones de usuarios porque:
- La verdad está en DB (append-only, barata de leer)
- La autoridad es código puro (determinista)
- El executor es stateless
- El orchestrator maneja concurrencia y retries
- No hay cuello de botella en la lógica de negocio

## 🔒 Seguridad Legal

El sistema está protegido legalmente porque:
- Solo la autoridad decide reglas de negocio
- El orchestrator no toma decisiones
- Todo está registrado como eventos inmutables
- Se puede auditar completamente el flujo de decisiones