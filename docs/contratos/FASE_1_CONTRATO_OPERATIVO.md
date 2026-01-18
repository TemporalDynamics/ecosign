# FASE_1_CONTRATO_OPERATIVO

Estado: CANONICO
Version: v1.0
Fecha: 2026-01-18

## 1. Proposito
Definir el happy path operativo minimo de Fase 1, con eventos canonicos
observables y una unica autoridad de ejecucion (Executor).

## 2. Principios duros
- No hay pasado: no se migra, no se repara, no se investiga.
- No hay legacy: todo empieza con el primer documento nuevo.
- Ninguna accion ocurre si no puede emitir evento canonico.

## 3. Autoridad
- La autoridad de ejecucion es el Executor.
- Triggers, crons y edge functions directas no tienen autoridad.
- Los contratos declaran reglas, el Executor decide timing y ejecucion.

## 4. Entidades canonicas (minimas)
- document_entity: fuente de verdad.
- user_document: estado operativo.
- events[]: ledger append-only.

## 5. Flujo canonic (happy path)
1) Usuario protege un documento.
2) Se crea document_entity.
3) Se crea user_document.
4) Executor decide acciones (una por vez).
5) TSA: request -> append -> confirmado o fallido.
6) Polygon: request -> confirmado/pending/fallido.
7) Bitcoin: request -> confirmado/pending/fallido.
8) Se emite evento final de workflow/documento.
9) UI refleja exactamente los eventos canonicos.

## 6. Eventos canonicos (Fase 1)
Convencion: `kind + at + payload` (ver DECISION_EVENT_CONVENTION_FASE1).

Eventos minimos:
- document.created
- tsa.appended
- anchor.confirmed
- anchor.failed
- workflow.artifact_finalized

Notas:
- `anchor.confirmed` incluye `payload.network`.
- `anchor.failed` incluye `payload.reason` y `payload.retryable`.

## 7. Estados operativos (derivados)
Los estados en UI son derivados de eventos canonicos:
- pending: hay intentos en curso y no hay confirmacion.
- failed: existe evento failed terminal con razon.
- ok: existe confirmacion canonica.

## 8. Fallos y trazabilidad
Si una accion falla:
- se emite evento `*.failed` con `reason` y `retryable`.
- el flujo no avanza si falta evidencia.
- no se investigan fallos con SQL; se leen eventos.

## 9. No decisiones (explicito)
- No se reescriben contratos legales.
- No se cambia semantica probatoria.
- No se implementa codigo en este contrato.
- No se activan migraciones ni backfills.

## 10. Criterio de cierre de Fase 1
La Fase 1 se considera cerrada cuando se cumple al menos una vez
el siguiente escenario completo, sin intervencion manual ni
analisis forense externo:

1. Se protege un documento nuevo (sin legacy).
2. Se crean document_entity y user_document.
3. El Executor decide y ejecuta las acciones correspondientes.
4. Cada accion (TSA / Polygon / Bitcoin) emite un evento canonico
   de exito o fallo.
5. Ante un fallo, el sistema emite explicitamente `*.failed`
   con `reason` y `retryable`.
6. El estado final del documento/workflow puede inferirse
   unicamente leyendo los eventos, sin usar SQL exploratorio.
7. La UI refleja exactamente esos eventos canonicos, sin suposiciones.

No es requisito para el cierre:
- que todos los anchors confirmen exitosamente,
- que no existan fallos externos,
- que el sistema sea resiliente o escalable.

El criterio de cierre es observabilidad y explicabilidad, no exito absoluto.
