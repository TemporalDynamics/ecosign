# Checklist de Implementación: Cierre de Bucles Críticos

**Fecha:** 2026-01-14
**Estado:** Activo

Este documento sirve como puente entre los contratos arquitectónicos y la implementación de código. Su propósito es guiar el desarrollo y la verificación (QA) de las soluciones para los problemas de cierre de protección y de workflow.

---

### **1. Solución al Problema 1: Protección Derivada**

**Objetivo:** La UI debe derivar el nivel de protección en tiempo real desde el log de eventos canónico, sin depender de un campo de estado obsoleto.

| Hecho | Tarea                                                                                | Contrato Relacionado                      | Notas                                                                  |
| :---- | :----------------------------------------------------------------------------------- | :---------------------------------------- | :--------------------------------------------------------------------- |
|       | **Frontend:** Eliminar toda lectura del campo `user_documents.protection_level`.     | `DERIVED_PROTECTION_CONTRACT.md`          | Buscar y reemplazar en todo el codebase del cliente.                   |
|       | **Frontend:** Implementar suscripción a cambios en `document_entities.events`.       | `DERIVED_PROTECTION_CONTRACT.md`          | Usar Supabase Realtime para escuchar cambios en el documento relevante. |
|       | **Frontend:** Implementar la función pura `deriveProtectionLevel(events)`.           | `DERIVED_PROTECTION_CONTRACT.md`          | Ubicarla en un archivo de utilidades/helpers del cliente.              |
|       | **Frontend:** `ProtectionLayerBadge` debe recibir su nivel (`layer`) como una `prop` que es el resultado de `deriveProtectionLevel`. | `DERIVED_PROTECTION_CONTRACT.md`          | Asegurar que no haya lógica de derivación dentro del propio badge.     |
|       | **QA:** Verificar que el badge se actualiza de `ACTIVE` a `REINFORCED` cuando un evento de anclaje `polygon` aparece en el log de eventos. | `DERIVED_PROTECTION_CONTRACT.md`          | Simular la llegada de un nuevo evento en la suscripción.               |

---

### **2. Solución al Problema 2: Artefacto Final de Workflow**

**Objetivo:** Asegurar que la finalización de un workflow genere y entregue un artefacto PDF final, verificable y consolidado.

| Hecho | Tarea                                                                                    | Contrato Relacionado                      | Notas                                                                                                  |
| :---- | :--------------------------------------------------------------------------------------- | :---------------------------------------- | :----------------------------------------------------------------------------------------------------- |
|       | **Backend (DB):** Crear la nueva tabla `workflow_artifacts` según el esquema definido.     | `WORKFLOW_ARTIFACT_CONTRACT.md`           | Incluir la migración de base de datos en el sistema de control de versiones.                           |
|       | **Backend (Worker):** Crear el nuevo worker `build-final-artifact`.                      | `WORKFLOW_ARTIFACT_CONTRACT.md`           | Debe ser idempotente, usando el `LEFT JOIN` con `workflow_artifacts` para seleccionar tareas.          |
|       | **Backend (Worker):** `build-final-artifact` debe implementar la lógica de ensamblaje de PDF y la generación de la Hoja de Evidencia. | `WORKFLOW_ARTIFACT_CONTRACT.md`           | Usar una librería de PDF del lado del servidor.                                                        |
|       | **Backend (Worker):** Tras el éxito, `build-final-artifact` debe emitir el evento canónico `workflow.artifact_finalized`. | `WORKFLOW_ARTIFACT_CONTRACT.md`           | Asegurar que el payload del evento contenga `workflow_id`, `artifact_url` y `artifact_hash`.          |
|       | **Backend (Worker):** Crear el nuevo worker `notify-artifact-ready`.                       | `WORKFLOW_ARTIFACT_CONTRACT.md`           | Este worker se suscribe únicamente al evento `workflow.artifact_finalized`.                            |
|       | **Backend (Worker):** `notify-artifact-ready` debe poner en cola los emails para todas las partes, incluyendo el enlace al `artifact_url`. | `WORKFLOW_ARTIFACT_CONTRACT.md`           | El email debe ser claro sobre la disponibilidad del documento final.                                   |
|       | **Frontend:** La UI debe escuchar el evento `workflow.artifact_finalized`.               | `WORKFLOW_ARTIFACT_CONTRACT.md`           | La suscripción debe estar activa en las vistas donde se muestre el estado de un workflow completado.   |
|       | **Frontend:** La UI debe mostrar un estado de "Documento final listo" y un botón de descarga solo **después** de recibir este evento. | `WORKFLOW_ARTIFACT_CONTRACT.md`           | Esto define el "cierre mental" para el usuario.                                                        |
|       | **QA:** Completar un workflow de firma y verificar que: a) se crea el artefacto, b) se emite el evento, c) se reciben los emails con el enlace correcto. | `WORKFLOW_ARTIFACT_CONTRACT.md`           | Prueba end-to-end crítica.                                                                           |
