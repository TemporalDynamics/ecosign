# CONTRATO_ECO_ECOX

Version: v1.0
Estado: Canonical
Ambito: Evidencia, forense, orquestacion y narrativa del sistema
Fecha: 2026-01-16

## 0. Proposito
Este contrato define la diferenciacion formal entre ECO y ECOX dentro del sistema, estableciendo:
- que constituye la evidencia primaria entregada al usuario,
- que constituye el registro tecnico interno del sistema,
- y como ambos se relacionan sin comprometer validez juridica, privacidad ni trazabilidad.

El objetivo es garantizar que la evidencia viva con el usuario, sea autosuficiente, y que el sistema sea explicable y defendible sin depender de accesos externos.

## 1. Definiciones

### 1.1 ECO — Evidencia canonica del usuario
ECO es el artefacto de evidencia primario, completo y autosuficiente, generado por el sistema y entregado al usuario como representacion verificable de un hecho digital.

El ECO:
- representa la verdad probatoria del documento o proceso,
- es el unico artefacto que el usuario necesita conservar,
- es el unico artefacto requerido para verificacion por terceros.

Para el usuario y para terceros:
ECO = el documento evidencial.

### 1.2 ECOX — Registro tecnico interno del sistema
ECOX es un registro tecnico interno, de mayor granularidad, que preserva el contexto completo del proceso de generacion de la evidencia.

El ECOX:
- no es el documento del usuario,
- no es requerido para la validez probatoria del ECO,
- existe para fines de explicabilidad del sistema, auditoria tecnica, defensa del metodo, observabilidad y evolucion interna.

El ECOX puede generarse sistematicamente como parte del proceso interno,
independientemente de si el usuario lo solicita o no.

### 1.3 Document Entity = ECOX vivo (implementacion)
`document_entities` junto con su campo `events[]` constituye la implementacion
canonica del ECOX vivo.

- `events[]` representa la linea de tiempo append-only y es la fuente unica de verdad.
- Campos derivados como `tsa_latest`, `anchor_latest` u otros son proyecciones,
  nunca fuentes de verdad.
- El executor y los workers escriben eventos canonicos; no escriben estados.

El archivo `.ECOX` es una exportacion (snapshot) tecnica del estado del ECOX vivo
en un instante dado y no constituye una fuente de verdad.

### 1.4 ECOX exportado (no canonico)
Si existe una tabla `ecox_*`, su funcion es exclusivamente registrar
exportaciones del ECOX.

Dicha tabla puede incluir:
- `document_entity_id`
- `snapshot_seq`
- `requested_by`
- `generated_at`
- `hash`
- `storage_path`

Esta tabla:
- NO es fuente de verdad
- NO define estado del documento
- NO reemplaza a `document_entities.events[]`

## 2. Propiedades del ECO (obligatorias)

### Autosuficiencia probatoria
El ECO debe contener toda la informacion necesaria para:
- verificacion criptografica,
- analisis pericial,
- evaluacion judicial del hecho.

### No reversibilidad
El ECO no debe permitir:
- reconstruir el documento original,
- acceder al contenido sensible subyacente.

### Independencia del sistema
El ECO no debe requerir:
- acceso a la plataforma,
- solicitudes al proveedor,
- informacion externa no incluida.

### Append-only / determinismo verificable
El ECO debe ser:
- append-only, o
- reconstruible de forma deterministica a partir de eventos verificables.

### Neutralidad narrativa
El ECO describe que ocurrio, no por que el sistema decidio algo.

### Alcance de la firma
La firma de EcoSign certifica la fidelidad del snapshot respecto al estado del sistema,
no la inexistencia de eventos futuros.

## 3. Contenido permitido en el ECO
El ECO puede incluir:
- hashes criptograficos,
- timestamps (TSA, blockchain u otros),
- anclajes (Polygon, Bitcoin, etc.),
- firmas digitales,
- secuencia temporal de eventos relevantes,
- metricas de interaccion (tiempo de visualizacion, scroll, foco, orden de acciones),
- identificadores de artefactos evidenciales (witness, copia fiel, etc.).

Todo contenido incluido en el ECO debe ser:
- relevante para la evaluacion del hecho,
- comprensible por un perito,
- defendible ante terceros.

## 4. Propiedades del ECOX (internas)
El ECOX puede incluir:
- eventos tecnicos internos,
- retries y reintentos,
- decisiones descartadas,
- resultados intermedios de workers,
- metadata de ejecucion (executor, jobs, timing),
- informacion de observabilidad.

El ECOX se entrega al usuario como archivo independiente con extension .ECOX,
tipicamente mediante exportacion o envio por correo electronico, y representa
la capa forense extendida del ECO.
El ECOX no debe:
- presentarse como evidencia primaria,
- ser requerido para verificar un ECO,
- exponerse por defecto al usuario final.

## 5. Relacion ECO ↔ ECOX
- Todo lo que esta en el ECO puede existir en el ECOX.
- No todo lo que esta en el ECOX debe existir en el ECO.
- El ECO es un subset curado.
- El ECOX es un superset tecnico.

Regla de oro:
- Si solo existe el ECO, la evidencia es valida.
- Si existe el ECOX, el sistema es explicable.

## 6. Visibilidad y control
- El usuario solo interactua con ECO.
- El sistema no requiere que el usuario solicite ECOX para defender su caso.
- El ECOX es interno por defecto.
- Cualquier acceso a ECOX, si existiera, es excepcional, tecnico y no probatorio.
- La recepcion de un archivo .ECOX indica un nivel de detalle tecnico superior al ECO,
  sin requerir interpretacion ni intervencion del proveedor.
- La generacion y entrega del ECOX es automatica; el proveedor no inspecciona,
  interpreta ni analiza su contenido.

## 7. Implicancias para la arquitectura

### UI
- Muestra ECO como formato base.
- Puede mostrar artefactos derivados (copia fiel, original si existe).
- No depende de ECOX.

### Executor
- Orquesta procesos basandose en eventos.
- Puede producir eventos que alimenten ECO (si son relevantes) o ECOX (si son tecnicos).
- No toma decisiones basadas en ECOX para afectar la evidencia del usuario.

### Storage
- No almacena contenido sensible sin consentimiento.
- Diferencia entre evidencia usable, evidencia cifrada y registros tecnicos.

## 8. Principio rector final
La evidencia pertenece al usuario.
El sistema no es custodio de la verdad, sino garante de su trazabilidad.

El ECO existe para probar un hecho.
El ECOX existe para explicar el sistema.

Confundir ambos debilita la evidencia.
Separarlos fortalece la arquitectura.

## 9. Clausula de independencia
La ausencia, perdida o no disponibilidad de un ECOX no invalida ni debilita
un ECO existente.

## 10. Estado del contrato
Este contrato es canonico.
Toda implementacion futura (executor, workers, UI, storage, verificacion) debe alinearse con estas definiciones.
Referencia operativa: `docs/ops/HITO_CORE_E2E_LOCAL.md`.
