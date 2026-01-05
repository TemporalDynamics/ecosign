# VERIFIER V2 CONTRACT

Referencia canonica: VERDAD_CANONICA (docs/contratos/verdad-canonica.md)
Version: v0.1
Normas: MUST, SHOULD, MAY

Proposito: definir el verificador v2 como lectura pura del .ECO v2. No introduce conceptos nuevos.

---

## 1. Input unico

* MUST: el verificador v2 acepta como input un archivo `.eco` con `version: 'eco.v2'`.
* MAY: aceptar `eco.v1` en modo compatibilidad (lectura limitada).
* MUST: no inferir campos faltantes ni completar con datos externos.

---

## 2. Preguntas canonicas

El verificador debe poder responder:

* ¿Este PDF proviene de este SourceTruth?
* ¿Fue modificado?
* ¿Cuándo?
* ¿La firma deriva del testigo (no del source)?

---

## 3. Estados de verificacion

```ts
VerificationStatus =
  | 'valid'         // cadena consistente y hashes coinciden
  | 'tampered'      // hash no coincide con la cadena esperada
  | 'incomplete'    // faltan testigos, firmas o anchors
  | 'unknown'       // formato invalido o datos insuficientes
```

---

## 4. Modelo mental del verificador

* El verificador es lectura pura: no muta estado.
* El verificador compara hashes y cadenas, no interpreta legalidad.
* El verificador no decide identidad ni autorias fuera del .ECO.

---

## 5. Reglas de verificacion

* MUST: validar `hash_chain` y su coherencia interna.
* MUST: validar que `source.hash === hash_chain.source_hash`.
* MUST: si existe `witness`, validar `witness.hash === hash_chain.witness_hash`.
* MUST: si existe `signed`, validar `signed.hash === hash_chain.signed_hash`.
* MUST: verificar que `transform_log` respete la cadena.
* SHOULD: mostrar el estado de anchors como señal, no como fuente de verdad.
* MUST: respetar `omit vs null` (si `witness` no existe, no se asume).
* MUST: si `hash_chain` existe y no coincide con columnas, estado `tampered` o `unknown`.
* MUST: usar serializacion canonica para comparar payloads cuando aplique.

---

## 6. Salidas minimas

El verificador debe devolver:

* `status` (VerificationStatus)
* `source_hash`
* `witness_hash` (si existe)
* `signed_hash` (si existe)
* `timestamps` relevantes
* `anchors` (si existen)

---

## 7. Pseudocodigo (lectura pura)

```ts
function verifyEcoV2(eco): VerificationResult {
  if (eco.version !== 'eco.v2') return { status: 'unknown' }

  if (!eco.hash_chain || !eco.source?.hash) return { status: 'unknown' }

  if (eco.source.hash !== eco.hash_chain.source_hash) {
    return { status: 'tampered' }
  }

  if (eco.witness) {
    if (!eco.hash_chain.witness_hash) return { status: 'tampered' }
    if (eco.witness.hash !== eco.hash_chain.witness_hash) return { status: 'tampered' }
  }

  if (eco.signed) {
    if (!eco.hash_chain.signed_hash) return { status: 'tampered' }
    if (eco.signed.hash !== eco.hash_chain.signed_hash) return { status: 'tampered' }
  }

  if (!transformLogIsConsistent(eco.transform_log, eco.hash_chain)) {
    return { status: 'tampered' }
  }

  if (isIncomplete(eco)) {
    return { status: 'incomplete' }
  }

  return { status: 'valid' }
}
```

---

## 8. Tests contractuales (minimos)

* MUST: `source.hash` distinto de `hash_chain.source_hash` -> `tampered`.
* MUST: `witness` presente y `hash_chain.witness_hash` ausente -> `tampered`.
* MUST: `signed` presente y `hash_chain.signed_hash` ausente -> `tampered`.
* MUST: `transform_log` fuera de cadena -> `tampered`.
* MUST: faltan campos base -> `unknown`.
* MUST: chain consistente pero faltan testigos/anchors -> `incomplete`.
* SHOULD: `anchors` no cambian `status` por si solos.

---

## 9. Prohibiciones

* No inferir identidad del firmante fuera de la evidencia provista.
* No declarar validez legal automatica.
* No usar datos externos para completar la cadena.

---

## 10. Referencias cruzadas

* [VERDAD_CANONICA](contratos/verdad-canonica.md)
* [ECO_V2_CONTRACT](ECO_V2_CONTRACT.md)
* [HASH_CHAIN_RULES](contratos/HASH_CHAIN_RULES.md)
