# EVIDENCE MOMENT CONTRACT

Version: v1.0  
Estado: CANONICO  
Normas: MUST, SHOULD, MAY

## 0. Proposito
Definir el concepto de "evidencia del momento" y su manifestacion en UI
sin prometer validez legal absoluta.

## 1. Regla principal
- MUST: Al completar una firma o proteccion, el sistema registra el momento
  exacto (timestamp) asociado a la evidencia.

## 2. Manifestacion en UI
- MUST: En detalle de documento u operacion se muestra un mensaje humano:
  "Este documento refleja el estado exacto del acuerdo al momento de la firma."
- SHOULD: La UI evita terminos tecnicos (hash, blockchain) en este mensaje.

## 3. Limites
- MUST: No declarar validez legal universal; el mensaje es de integridad temporal.

## 4. No-responsabilidades
- No define calculo de hashes.
- No define eventos forenses ni anclajes.
