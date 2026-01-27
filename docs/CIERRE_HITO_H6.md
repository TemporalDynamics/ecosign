# Cierre del Hito H6: Apagado de Autoridad Paralela (Legacy)

## Resumen del Logro

El hito H6 "Apagado de Autoridad Paralela (Legacy)" ha sido completado exitosamente. Se ha logrado la transición controlada del sistema desde una arquitectura con doble autoridad (legacy + executor) hacia una arquitectura con autoridad canónica centralizada en **DecisionAuthority**.

## Estado Antes del Hito

- **Sistema Dual**: Existía una "doble autoridad" donde tanto el sistema legacy como el executor canónico podían tomar decisiones y ejecutar side-effects
- **Triggers Legacy Activos**: Funciones PL/pgSQL ejecutaban lógica de negocio directamente (anclajes, notificaciones)
- **Riesgo de Duplicación**: Alta probabilidad de side-effects duplicados y carreras de datos
- **Modo Shadow**: El executor validaba decisiones pero no tenía autoridad ejecutable
- **Complejidad Operativa**: Difícil razonar sobre el estado del sistema y diagnosticar problemas

## Cambios Implementados

### 1. Feature Flags por Decisión
Se implementaron flags granulares para controlar la transición:
- `D1_RUN_TSA_ENABLED`: Controla la ejecución de sellos de tiempo legales
- `D3_BUILD_ARTIFACT_ENABLED`: Controla la generación de certificados
- `D4_ANCHORS_ENABLED`: Controla los anclajes blockchain
- `D5_NOTIFICATIONS_ENABLED`: Controla las notificaciones

### 2. Modificación de Triggers Legacy
Todos los triggers críticos fueron actualizados para verificar los flags:
- Si el flag correspondiente está activo, el trigger hace "early return"
- **DecisionAuthority** se convierte en la única autoridad para esa decisión
- Se mantiene la reversibilidad completa

### 3. Actualización del DecisionAuthority
**DecisionAuthority** fue modificado para respetar los flags y asumir autoridad gradualmente:
- En modo legacy: Sigue la lógica original
- En modo canónico: Usa la lógica canónica pura de `packages/authority`
- Mantiene comparaciones shadow para monitoreo continuo

### 4. Implementación de ExecutionEngine
**ExecutionEngine** ahora consume jobs de la cola neutral:
- Lee jobs de `executor_jobs`
- Ejecuta trabajos pesados (TSA, anchors, artifacts)
- Reporta resultados como eventos canónicos
- **Nunca decide reglas de negocio**

## Resultado Actual

### Arquitectura
- **Autoridad Única**: **DecisionAuthority** es ahora la única fuente de verdad para la ejecución de side-effects
- **Triggers como Producers**: Los triggers legacy ahora solo emiten eventos, no ejecutan lógica
- **Flujo Determinista**: Todos los side-effects pasan por **DecisionAuthority** → **ExecutionEngine**, garantizando orden y consistencia
- **Separación Clara**: Decisión vs Ejecución completamente desacopladas

### Operaciones
- **Monitoreo Mejorado**: Se pueden identificar discrepancias entre lógica legacy y canónica
- **Rollback Inmediato**: Cualquier decisión puede volver al modo legacy cambiando un flag
- **Transición Gradual**: Se puede activar cada decisión individualmente según confianza
- **WakeExecutionEngine**: Sistema despierta periódicamente para procesar jobs pendientes

### Beneficios
- **Eliminación de Duplicación**: No hay más side-effects duplicados
- **Mejor Razonamiento**: Es claro qué componente toma cada decisión
- **Auditoría Clara**: Todos los side-effects están registrados como eventos inmutables
- **Escalabilidad**: Modelo stateless y desacoplado listo para millones de usuarios
- **Seguridad Legal**: Separación clara entre autoridad y ejecución

## Validación

- [x] Pruebas exitosas en staging con todos los flags activos
- [x] Validación de flujos críticos (protección, firma, anclajes, notificaciones)
- [x] Prueba de rollback exitosa
- [x] Monitoreo de métricas durante la transición
- [x] Confirmación de que no hay duplicación de side-effects
- [x] Confirmación de que **DecisionAuthority** decide y **ExecutionEngine** ejecuta

## Siguiente Paso

Con el H6 completado, el sistema opera ahora con una única autoridad canónica. El próximo paso es:
1. Refinar la lógica canónica según aprendizajes del mundo real
2. Expandir la cobertura a decisiones adicionales (D7-D22)
3. Optimizar el rendimiento de **ExecutionEngine**
4. Documentar completamente la nueva arquitectura con el modelo de naming canónico

## Lecciones Aprendidas

- La transición controlada con feature flags es clave para sistemas críticos
- La reversibilidad debe estar siempre disponible durante la migración
- El monitoreo continuo es esencial para detectar problemas tempranamente
- El naming correcto es un mecanismo de seguridad cognitiva
- La separación entre decisión y ejecución es fundamental para la escalabilidad

---

**Fecha de Cierre**: 26 de enero de 2026
**Equipo Responsable**: [Nombre del equipo]
**Firmado**: [Responsable técnico]

**Hito H6: COMPLETADO ✅**

**Modelo Canónico Implementado:**
- **Verdad**: `document_entities.events[]`
- **Autoridad**: `packages/authority`
- **DecisionAuthority**: Lee verdad → Usa autoridad → Escribe cola neutral
- **ExecutionEngine**: Lee cola → Ejecuta → Escribe eventos resultado
- **WakeExecutionEngine**: Solo despierta el sistema