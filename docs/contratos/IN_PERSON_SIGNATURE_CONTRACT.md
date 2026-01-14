# IN-PERSON SIGNATURE CONTRACT (EcoSign)

Version: v0.2
Normas: MUST, SHOULD, MAY

## 0. Proposito
Registrar una confirmacion presencial (refuerzo maximo de identidad y voluntad)
sobre un Documento o un Batch, sin reemplazar firmas previas ni alterar evidencia individual.

## 1. Definicion
La firma presencial es:
- Un evento posterior o paralelo.
- Disparado por QR.
- Ejecutado desde dispositivo propio del firmante.
- Declara presencia fisica y reconocimiento del acto.

## 2. Sujetos
- subject_type: 'document' | 'batch'
- subject_id: UUID

## 3. Sesion (anti-replay minimo)
MUST: la firma presencial se realiza dentro de una sesion creada por el iniciador.

```ts
InPersonSession {
  id: UUID
  subject_type: 'document' | 'batch'
  subject_id: UUID
  operation_id?: UUID
  created_by: UUID
  created_at: Timestamp (UTC)
  expires_at: Timestamp (UTC)
  status: 'active' | 'closed'
}
```

## 4. QR
El sistema genera un QR a:
`/in-person-signature?session=UUID`

- MUST: la session expira (ej: 15-60 min) y puede cerrarse manualmente.

## 5. Resolucion del firmante
Caso A: con cuenta
- Se autentica.
- Se verifica que subject_id coincide con la session.
- Se muestra: "Este es el mismo documento/operacion que estas confirmando".

Caso B: sin cuenta
- Se solicita ECO (minimo).
- MUST: se valida que el ECO corresponde al subject (document o batch) comparando hash(s) esperados.
- Se permite confirmar.

## 6. Evento registrado (confirmacion)
```
InPersonSignatureConfirmed {
  session_id: UUID
  subject_type: 'document' | 'batch'
  subject_id: UUID

  signer_user_id?: UUID
  signer_fingerprint: Hash   // estable, no PII
  method: 'qr'
  device: 'own_device'

  confirmed_at: Timestamp (UTC)
}
```

## 7. Reglas MUST
- La firma presencial NO reemplaza firmas previas.
- La firma presencial NO modifica DocumentEntity ni Batch.
- La confirmacion es idempotente por (session_id, signer_fingerprint).

## 8. Efecto probatorio
Refuerza intencion, presencia y contexto.
Eleva el nivel de assurance de identidad del acto, sin prometer equivalencia legal universal (depende de jurisdiccion).
