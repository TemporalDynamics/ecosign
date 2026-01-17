# CONTRATO_LIFECYCLE_ECO_ECOX

Version: v1.0
Estado: Canonical
Ambito: Evidencia, forense, executor, storage
Fecha: 2026-01-16

## 1. Principio rector
- ECOX es un artefacto vivo y append-only.
- ECO es un snapshot derivado, firmado e inmutable.
- Cada ECO emitido es una version valida del estado observado por el sistema.
- El ECO final es un snapshot especial con cierre probatorio.

## 2. Lifecycle del ECOX
### 2.1 Creacion (t0)
- Se crea al nacer la entidad documental canonica.
- Estado inicial: open.
- Evento inicial: ECOX_CREATED.

### 2.2 Actualizacion continua
- Se actualiza de forma append-only con:
  - eventos probatorios,
  - eventos tecnicos internos,
  - eventos de orquestacion (executor),
  - eventos tardios (Polygon/Bitcoin),
  - exportaciones (ECOX_EXPORTED).

### 2.3 Persistencia post-cierre del ECO
- El ECOX permanece abierto aunque exista un ECO_FINAL.
- Puede seguir recibiendo eventos tecnicos y administrativos.

## 3. Lifecycle del ECO (snapshots)
### 3.1 Emision de snapshots
- El ECO se emite como snapshot derivado del ECOX.
- Cada snapshot es inmutable y firmado por EcoSign.
- Un documento puede tener multiples snapshots (v1, v2, v3...).

### 3.2 Semantica de un snapshot
- El snapshot certifica el estado observado por el sistema en ese momento.
- EcoSign firma el snapshot para asumir responsabilidad de lo observado.
- No implica cierre final salvo que sea ECO_FINAL.
 - La firma de EcoSign certifica el estado observado en ese instante y no implica ausencia de eventos futuros.

### 3.3 ECO final
- ECO_FINAL es el snapshot con cierre probatorio.
- Requiere:
  - firma de EcoSign,
  - cumplimiento de intents requeridos,
  - anchors requeridos segun plan (Bitcoin obligatorio si aplica).
- El ECO_FINAL es el artefacto de cierre del proceso.

## 4. Regla de versionado
- Cada snapshot incluye metadatos de version:
  - eco_snapshot_seq
  - issued_at
  - coverage
  - superseded_by (opcional)
- La existencia de multiples ECO no es contradiccion, es progresion certificada.

## 5. Eventos canonicos de emision (recomendados)
- eco.snapshot.issued (snapshot emitido, firmado por EcoSign)
- eco.finalized (snapshot final con cierre probatorio)

## 6. Rol del executor
### 6.1 Que NO hace
- No arma ECOX desde cero.
- No interpreta evidencia.
- No decide contenido probatorio.

### 6.2 Que SI hace
- Orquesta y ejecuta jobs.
- Escribe eventos en ECOX (append-only).
- Emite snapshots ECO cuando hay hitos.
- Firma cada snapshot ECO con la clave de EcoSign.

## 7. Regla de escritura
- Si el evento afecta la prueba del hecho -> va a ECO (snapshot) y ECOX.
- Si el evento es operativo/tecnico -> va solo a ECOX.
- Si ocurre post ECO_FINAL -> solo ECOX.

## 8. Cierre probatorio
- No existe cancelacion explicita del proceso.
- El cierre probatorio es exclusivamente el ECO_FINAL.
- Antes del ECO_FINAL solo existen snapshots intermedios validos.

## 9. Estado del contrato
Este contrato es canonico y condiciona executor, workers, UI y verificador.
