# AUTORIDAD_DEL_SISTEMA

Version: v1.0
Estado: Canonico
Ambito: Autoridad, invariantes, write-path
Fecha: 2026-01-19

## 0. Proposito
Definir donde reside la autoridad del sistema y como se aplica, para evitar
deriva entre contratos y ejecucion.

## 1. Veredicto central
La autoridad del sistema no reside en ningun proceso en ejecucion.
Reside en las reglas que gobiernan el write-path.

## 2. Fuentes de autoridad
- Contratos canonicos (texto humano, normativo).
- Authority rules (compilado tecnico minimo).
- Validadores en el write-path (aplican reglas de autoridad).

## 3. Separacion de poderes (modelo operativo)
- Ley: contratos + authority rules + validadores.
- Poder judicial: executor (valida y aplica la ley).
- Poder ejecutivo: workers (ejecutan tareas autorizadas).
- Administracion: crons y triggers (mantenimiento, reintentos, observabilidad).
- Territorio: migraciones e infraestructura (preparan el suelo).

## 4. Regla del write-path
Ningun evento canonico puede escribirse sin pasar por los validadores
de autoridad.

## 5. Rol del executor
El executor no crea verdad. Interpreta reglas y decide si una accion es valida.
Si falla la validacion, debe:
- rechazar la accion,
- registrar el motivo,
- no escribir el evento.

## 6. Alcance
Este contrato aplica a:
- `document_entities.events[]`
- eventos canonicos que afectan evidencia o estado probatorio

No aplica a:
- eventos organizacionales de UI (mover, archivar, tags)
- metadata operativa que no define verdad

## 7. Referencias
- `docs/contratos/CONTRATO_ECO_ECOX.md`
- `docs/contratos/CONTRATO_LIFECYCLE_ECO_ECOX.md`
