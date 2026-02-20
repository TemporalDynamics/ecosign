# Modelo B: Política Evolutiva
## Contrato de Autoridad y Validez Intermedia

**Versión**: 1.0
**Estado**: Normativa vinculante
**Efectividad**: 2026-02-20
**Audiencia**: Engineering, Legal, Product

---

## Declaración Fundacional

```
EcoSign NO utiliza Modelo A (snapshot inmutable).
EcoSign utiliza Modelo B (política evolutiva).

Esta es una decisión arquitectónica, no un bug.
Es requisito para la soberanía del usuario (evidencia distribuida).
Modelo B es determinístico, no caótico.
Modelo B requiere reglas duras: B1, B2, B3.
```

---

## 1. Modelo A vs Modelo B: Definición Clara

## Relación con otros contratos

Este contrato formaliza Modelo B.
Ver también:
- [ECO/ECOX Separation](./CONTRATO_ECO_ECOX.md) - Define validez intermedia
- [Direct Inserts Compat Failover](./DIRECT_INSERTS_COMPAT_FALLBACK.md) - Explica autoridad única

### Modelo A (Snapshot Inmutable)
```
Característica: Policy se fija al inicio y NUNCA cambia
Implementación:
  - document.protected.requested existe UNA SOLA VEZ
  - required_evidence se captura en T_0
  - Si se necesita cambiar: reintentar desde cero

Ventaja: Simplicidad, rigidez
Desventaja: Inflexibilidad, frustra UX, impide evidencia distribuida

Ejemplo:
  T_0: Owner solicita protección con ["tsa", "polygon"]
  T_1: Dueño se arrepiente, quiere agregar Bitcoin
       → IMPOSIBLE. Tiene que iniciar otro flujo.
```

### Modelo B (Política Evolutiva) ← **ESTO SOMOS NOSOTROS**
```
Característica: Policy se fija al inicio pero PUEDE evolucionar conforme avanza
Implementación:
  - document.protected.requested PUEDE repetirse
  - Cada instancia fija required_evidence para esa etapa
  - Cambios se registran en ECOX (trazabilidad)
  - Cada firma intermedia recibe ECO VÁLIDO para su momento

Ventaja: Flexibilidad, UX óptima, soberanía usuario (no espera final)
Desventaja: Requiere EPI para determinismo, necesita validadores fuertes

Ejemplo:
  T_0: Owner solicita protección con required_evidence = ["tsa", "polygon"]
       → Firma 1 recibe ECO_T1 válido
  T_1: Owner agrega Bitcoin a policy
  T_2: Nueva protección solicitada con required_evidence = ["tsa", "polygon", "bitcoin"]
       → Firma 2 recibe ECO_T2 válido (con Bitcoin como futura prueba)
       → ECO_T1 sigue siendo VÁLIDO (histórico, nada se contradice)
  T_3: Firma final
       → ECO_Final con todas las anchuras
```

---

## 2. Las Tres Reglas (B1–B3): Cerrando la Ambigüedad

### Regla B1: No-Null
```
INVARIANTE:
  Todo evento document.protected.requested DEBE contener required_evidence
  como ARRAY no vacío.

  Nunca: required_evidence = null
  Nunca: required_evidence = undefined
  Nunca: required_evidence = []

  Siempre: required_evidence = ["tsa", "polygon"], o similar

JUSTIFICACIÓN:
  - La política es el CONTRATO del usuario con el sistema
  - Si la política es null, no hay contrato
  - Esto es deuda técnica que hay que limpiar en prod

IMPLEMENTACIÓN:
  - Validador: appendEvent rechaza si required_evidence is not Array or empty
  - Métrica: alertar si hay eventos con required_evidence null en últimas 24h
  - Plan de remediación: migración de datos históricos
```

### Regla B2: Monotonicidad por Etapa
```
INVARIANTE:
  required_evidence solo puede CAMBIAR cuando cambia anchor_stage.
  Dentro de la misma etapa: required_evidence es CONSTANTE.
  Entre etapas: required_evidence puede CRECER (agregar elementos).
                required_evidence NUNCA disminuye (restar elementos).

  La propiedad se llama "monotonicidad": cada etapa fortalece o mantiene,
  nunca debilita.

DEFINICIÓN de anchor_stage:
  - initial: antes de cualquier anchor
  - intermediate: después de al menos TSA, quizá Polygon
  - final: después de artifact.finalized (todas las anchuras completadas)

EJEMPLOS VÁLIDOS (B2 respetado):

  Stage INITIAL:
    required_evidence = ["tsa", "polygon"]

  Stage INTERMEDIATE:
    required_evidence = ["tsa", "polygon", "bitcoin"]  ✓ (agregó bitcoin)

  Stage FINAL:
    required_evidence = ["tsa", "polygon", "bitcoin", "rekor"]  ✓ (agregó rekor)

EJEMPLOS INVÁLIDOS (B2 violado):

  Stage INITIAL:
    required_evidence = ["tsa", "polygon"]

  Stage INTERMEDIATE:
    required_evidence = ["tsa"]  ✗ (sacó polygon: disminuyó)

  Stage INTERMEDIATE:
    required_evidence = ["polygon", "bitcoin"]  ✗ (sacó tsa: disminuyó)

IMPLEMENTACIÓN:
  - Validador: comparar required_evidence entre evento anterior y nuevo
  - Si anchor_stage no cambió: required_evidence DEBE ser idéntico
  - Si anchor_stage cambió: required_evidence anterior DEBE ser subset
  - Si B2 violado: rechazar evento y loguear como "policy_violation"
```

### Regla B3: Mínimo Probatorio (TSA es base)
```
INVARIANTE:
  TSA (RFC 3161) es el PISO obligatorio de evidencia.
  Toda política válida DEBE incluir "tsa" en su array required_evidence.

  Nunca: required_evidence = ["polygon", "bitcoin"]  (sin tsa)
  Siempre: required_evidence contiene "tsa" al menos

JUSTIFICACIÓN:
  - TSA es proveedor neutral, independiente, auditable
  - TSA es el "reloj de pared" del sistema
  - EPI se construye asumiendo TSA como fundación
  - Si permitimos políticas sin TSA, perdemos determinismo

EXCEPCIONES:
  Solo con campo explícito policy_override = "special_case" en el evento.
  La excepción se registra como "POLICY_OVERRIDE" en ECOX (auditable).
  Las excepciones requieren approval (workflow separado).

IMPLEMENTACIÓN:
  - Validador: si "tsa" no está en required_evidence:
    * Si policy_override = "special_case": registrar en ECOX y permitir
    * Si no: rechazar evento
  - Métrica: alertar si hay eventos con required_evidence sin "tsa"
```

---

## 3. Cómo Esto NO Es Caótico: EPI Lo Hace Determinístico

```
PROBLEMA APARENTE:
  "¿Si required_evidence muta, cómo sé si el documento es válido?"

RESPUESTA (basada en EPI):

  H_c (Content Hash):
    - SHA-256 del contenido ORIGINAL
    - NUNCA cambia
    - Si H_c cambia → contenido fue adulterado (INVÁLIDO)

  H_s (State Hashes):
    - Firma de cada suscriptor como entrada separada a Merkle tree
    - Acumulan, no se reemplazan
    - Cada acción suscriptora añade su H_s

  H_r (Root Hash - Merkle Tree):
    - Combina H_c + todos los H_s en árbol determinístico
    - Evoluciona conforme se agregan firmas
    - ES REPRODUCIBLE: mismo input → mismo H_r

RESULTADO:
  H_c igual + H_r diferente = "válido intermedio" ✓

  Ejemplo:
    T_1: 2 de 5 firmantes
      H_c = abc123 (contenido original, inmutable)
      H_s = [sig_1, sig_2]
      H_r = merkle(H_c, sig_1, sig_2) = xyz789

      Verificador: "Válido intermedio" ✓
      Razón: contenido íntegro + firmas válidas
      Faltante: sig_3, sig_4, sig_5 (esperado en flujo)

    T_5: 5 de 5 firmantes
      H_c = abc123 (IGUAL, contenido no cambió)
      H_s = [sig_1, sig_2, sig_3, sig_4, sig_5]
      H_r = merkle(H_c, sig_1, sig_2, sig_3, sig_4, sig_5) = def456

      Verificador: "Válido final" ✓
      Razón: contenido íntegro + todas las firmas presentes

INVARIANTE DE EPI:
  H_c invariable → JAMÁS falso negativo (si H_c coincide, contenido es íntegro)
  H_s acumulan → cadena de custodia auditable
  H_r determinístico → verificable sin depender de "verdad central"

Esta es la RAZÓN por la que Modelo B no es caótico.
Sin EPI, Modelo B sería un desastre. Con EPI, es determinístico.
```

---

## 4. Estadíos de Validez: Required Evidence Actual vs Esperada

```
CONCEPTO: En cualquier punto de la línea de tiempo, la evidencia
           puede ser "insuficiente para el final" pero "suficiente para ahora".

DEFINICIÓN DE ESTADÍOS:

1. CERTIFICADO (Immediate Proof)
   - Lo que ya está confirmado en el sistema
   - Ejemplo: TSA confirmado
   - Usuario recibe ECO con esto
   - Verificador dice: "Válido, certificado con TSA"

2. STRENGTHENING_PENDING (Async Reinforcement)
   - Lo que se espera pero aún está en proceso (Polygon, Bitcoin)
   - Ejemplo: "Bitcoin en proceso, confirmación en 5 minutos"
   - Se indica explícitamente: "reforzando con Bitcoin..."
   - Verificador dice: "Válido intermedio, reforzando"

3. FINAL (Complete Proof)
   - Todo lo prometido en required_evidence está confirmado
   - Ejemplo: TSA + Polygon + Bitcoin todos confirmados
   - Usuario recibe ECO final institucional (Ed25519)
   - Verificador dice: "Válido final"

EJEMPLO TIMELINE:

T_0: document.protected.requested
  required_evidence = ["tsa", "polygon", "bitcoin"]
  User expectation = todo esto, pero no necesariamente ahora

T_1: TSA confirmed, Polygon pending
  Status = CERTIFICADO (immediate proof: TSA)
  ECO snapshot = {
    "status": "valid_intermediate",
    "certified": ["tsa"],
    "strengthening_pending": ["polygon", "bitcoin"],
    "estimated_completion": "2026-02-20T15:35:00Z"
  }
  User receives this ECO immediately (no espera)
  Firmante 1 tiene evidencia NOW

T_2: Polygon confirmed, Bitcoin pending
  Status = CERTIFICADO + mejora
  ECO snapshot = {
    "status": "valid_intermediate",
    "certified": ["tsa", "polygon"],
    "strengthening_pending": ["bitcoin"],
    "estimated_completion": "2026-02-21T15:30:00Z"
  }
  User receives updated ECO
  Firmante 2 tiene evidencia MEJORADA

T_3: Bitcoin confirmed, all done
  Status = FINAL
  ECO final = {
    "status": "valid_final",
    "certified": ["tsa", "polygon", "bitcoin"],
    "strengthening_pending": [],
    "ecosign_signature": "Ed25519 institutional signature"
  }
  ECO firmado institucionalmente por EcoSign
  Verificador dice "Válido final"
```

---

## 5. Cómo Se Registra la Evolución: ECOX Como Auditoría

```
PRINCIPIO:
  Cada cambio de required_evidence es un EVENTO
  Cada evento se registra en ECOX
  ECOX es la auditoría de por qué policy evolucionó

EVENTO: POLICY_EVOLVED (se captura en ECOX)

Estructura:
{
  "seq": 42,
  "timestamp": "2026-02-20T15:30:00Z",
  "event_type": "POLICY_EVOLVED",
  "source": "owner",  // quién solicitó el cambio
  "details": {
    "from_required_evidence": ["tsa", "polygon"],
    "to_required_evidence": ["tsa", "polygon", "bitcoin"],
    "reason": "owner_request",  // or "system_suggestion", etc.
    "anchor_stage_before": "initial",
    "anchor_stage_after": "intermediate",
    "triggered_by": "owner_email_request",  // o ID específico
    "policy_version": "v2"
  }
}

BENEFICIOS:
  - Juez entiende por qué policy cambió
  - No es sorpresa: está registrado
  - Es explicable (razón en "reason" field)
  - Es auditable (quién, cuándo, por qué)

IMPORTANTE:
  Este evento NO va en ECO (es técnico/administrativo).
  Sí va en ECOX (registro completo del sistema).
  El usuario NO necesita verlo, pero está disponible si hay controversia.
```

---

## 6. Validez Intermedia: El Punto Neurálgico

```
DEFINICIÓN:
  Un ECO "válido intermedio" es aquél que:

  1. Tiene H_c (content hash) ÍNTEGRO
     → Contenido original no fue adulterado

  2. Tiene H_s (state hashes) válidos para acciones completadas
     → Cada firma que está, es auténtica

  3. Puede tener acciones pendientes
     → Pero eso es ESPERADO en el flujo, no un defecto

  4. Puede tener required_evidence parcialmente satisfecha
     → Certificado con lo que ya está (ej: TSA)
     → Reforzándose con lo que viene (ej: Bitcoin)

DISTINCIÓN CRÍTICA:

  "INVÁLIDO" (rechazable):
    - H_c no coincide → adulteración de contenido
    - H_s corrupto → firma falsa
    - Más firmas de las esperadas (overflow)
    - Menos firmas cuando se esperaba final (SALVO que sea intermedio)

  "VÁLIDO INTERMEDIO" (aceptable ahora):
    - H_c coincide → contenido íntegro
    - H_s válidas → firmas auténticas
    - Menos de todas las firmas esperadas → normal en flujo
    - required_evidence parcialmente satisfecha → normal en Modelo B

  "VÁLIDO FINAL" (máxima certeza):
    - H_c coincide
    - H_s completas (todas las esperadas)
    - required_evidence TOTALMENTE satisfecha
    - Firmado institucionalmente (Ed25519)

REGLA DE ORO:
  Verificador DEBE emitir "válido intermedio" cuando corresponda.
  NO puede rechazar un ECO en mitad del flujo.
  NO puede decir "inválido, incompleto" cuando debería decir "válido, pero incompleto".

  La diferencia entre "inválido" e "incompleto" es LEGAL y TÉCNICA.
  Este contrato define que la segunda es un estado legítimo.
```

---

## 7. Invariantes de Código (Lo Que El Dev Debe Implementar)

### Validador B1 (No-Null)
```typescript
// En appendEvent o EventValidator

function validateRequiredEvidenceNotNull(event: DocumentEvent): void {
  if (event.type === 'document.protected.requested') {
    const payload = event.payload;

    // Rechazar si falta, es null, es undefined, o es array vacío
    if (!payload.required_evidence ||
        !Array.isArray(payload.required_evidence) ||
        payload.required_evidence.length === 0) {
      throw new ValidationError(
        'document.protected.requested must have required_evidence as non-empty array',
        { event_id: event.id, policy_version: payload.policy_version }
      );
    }

    // Registrar para observabilidad
    observability.increment('event.required_evidence.validated', {
      policy_count: payload.required_evidence.length,
      has_tsa: payload.required_evidence.includes('tsa')
    });
  }
}
```

### Validador B2 (Monotonicidad por Etapa)
```typescript
// En appendEvent o EventValidator

function validateMonotonicityByStage(
  newEvent: DocumentEvent,
  previousEvents: DocumentEvent[]
): void {
  if (newEvent.type !== 'document.protected.requested') return;

  const previousProtectionEvent = previousEvents
    .filter(e => e.type === 'document.protected.requested')
    .pop(); // Última ocurrencia

  if (!previousProtectionEvent) return; // Primera ocurrencia, no hay anterior

  const previousStage = previousProtectionEvent.payload.anchor_stage;
  const newStage = newEvent.payload.anchor_stage;
  const previousRequired = previousProtectionEvent.payload.required_evidence;
  const newRequired = newEvent.payload.required_evidence;

  if (previousStage === newStage) {
    // Misma etapa: required_evidence DEBE ser idéntico
    if (!arrayEquals(previousRequired, newRequired)) {
      throw new ValidationError(
        'Within same anchor_stage, required_evidence must not change',
        {
          stage: newStage,
          previous: previousRequired,
          new: newRequired
        }
      );
    }
  } else if (previousStage < newStage) {
    // Etapa avanzó: required_evidence anterior DEBE ser subset
    if (!isSubset(previousRequired, newRequired)) {
      throw new ValidationError(
        'When advancing stage, required_evidence can only grow (monotonic)',
        {
          previous_stage: previousStage,
          new_stage: newStage,
          previous_required: previousRequired,
          new_required: newRequired
        }
      );
    }
  } else {
    // Etapa retrocedió: NO PERMITIDO
    throw new ValidationError(
      'anchor_stage cannot go backwards',
      { previous: previousStage, new: newStage }
    );
  }

  observability.increment('event.monotonicity.validated', {
    stage_transition: `${previousStage}_to_${newStage}`,
    required_evidence_growth: newRequired.length - previousRequired.length
  });
}
```

### Validador B3 (Mínimo Probatorio - TSA Base)
```typescript
// En appendEvent o EventValidator

function validateMinimumEvidence(event: DocumentEvent): void {
  if (event.type !== 'document.protected.requested') return;

  const required = event.payload.required_evidence;
  const override = event.payload.policy_override;

  if (!required.includes('tsa')) {
    if (override === 'special_case') {
      // Permitir, pero registrar como excepción auditable
      observability.increment('policy.override.special_case', {
        required_evidence: required,
        override_type: override
      });

      // Emitir evento POLICY_OVERRIDE en ECOX
      appendECOXEvent({
        type: 'POLICY_OVERRIDE',
        details: {
          override_type: 'special_case',
          required_evidence: required,
          approved_by: event.payload.approval_ticket  // debe existir
        }
      });
    } else {
      // Rechazar sin override explícito
      throw new ValidationError(
        'required_evidence must include "tsa" as minimum (B3 rule)',
        {
          required_evidence: required,
          missing: 'tsa'
        }
      );
    }
  }
}
```

---

## 8. Cómo Se Emite el ECO: Determinístico Basado en Events[]

```
PRINCIPIO:
  ECO se genera LEYENDO events[] actuales
  No es un estado implícito, es DERIVADO
  Por eso es determinístico: mismo events[] → mismo ECO

ALGORITMO (pseudocódigo):

function generateECO(documentEntityId: UUID, asOf?: timestamp): ECO {

  // 1. Obtener todos los eventos hasta "asOf"
  const events = getEventsUntil(documentEntityId, asOf || now());

  // 2. Extrae required_evidence actual (última ocurrencia de document.protected.requested)
  const currentProtection = events
    .filter(e => e.type === 'document.protected.requested')
    .pop();
  const currentRequired = currentProtection?.payload.required_evidence || [];

  // 3. Determine cuál está certificado vs pending
  const certified = [];
  const pending = [];

  if (events.some(e => e.type === 'tsa.confirmed')) certified.push('tsa');
  else pending.push('tsa');  // si falta, es pending

  if (events.some(e => e.type === 'anchor.confirmed' && e.payload.chain === 'polygon'))
    certified.push('polygon');
  else if (currentRequired.includes('polygon'))
    pending.push('polygon');

  // ... etc para bitcoin, rekor, etc

  // 4. Construir ECO snapshot
  const eco = {
    version: "2.0",
    document_entity_id: documentEntityId,
    generated_at: now(),

    // Lo que está certificado AHORA
    status: pending.length === 0 ? 'valid_final' : 'valid_intermediate',
    certified: certified,
    strengthening_pending: pending,

    // Historia completa (condensada)
    hashes: {
      content_hash: getContentHash(documentEntityId),
      witness_hash: getLatestWitnessHash(documentEntityId),
      root_hash: computeMerkleRoot(events)
    },

    // Trazabilidad
    signatures_count: events.filter(e => e.type === 'signature.applied').length,
    policy_version: currentProtection?.payload.policy_version,
    transform_log: extractTransformLog(events),

    // Firma institucional (SOLO si status === 'valid_final')
    ...(pending.length === 0 && {
      ecosign_signature: {
        key_id: "ks_2026_001",
        signature: signInstutional(eco),
        signed_at: now()
      }
    })
  };

  return eco;
}

RESULTADO:
  - ECO se genera determinísticamente de events[]
  - Cambio en events[] → cambio en ECO
  - NO hay estado implícito
  - Es reproducible: anyone puede verificar
```

---

## 9. El Flujo Completo (Modelo B En Vivo)

```
Escenario: 5 firmantes, policy evoluciona

T_0: Owner solicita protección
  event: document.protected.requested
    required_evidence: ["tsa", "polygon"]
    anchor_stage: "initial"

  → Trigger canónico encolada protect_document_v2 job
  → Comienza flujo de TSA

T_1: TSA confirmado, Firmante 1 firma
  event: tsa.confirmed
  event: signature.applied (Firmante 1)

  → generateECO() calcula estado actual:
    certified: ["tsa"]
    pending: ["polygon"]
    status: "valid_intermediate"

  → ECO se envía a Firmante 1

  "Tienes evidencia válida NOW. Bitcoin se agregará luego."

T_2: Polygon confirmado
  event: anchor.confirmed (chain=polygon)

  → generateECO() actualiza:
    certified: ["tsa", "polygon"]
    pending: []
    status: "valid_final"

  Nota: aunque no hay todas las firmas, ECO es "final"
        porque required_evidence original está satisfecha.

T_3: Owner decide agregar Bitcoin (cambio de política)
  event: document.protected.requested (NEW INSTANCE)
    required_evidence: ["tsa", "polygon", "bitcoin"]
    anchor_stage: "intermediate"  // avanzó de initial
    policy_version: "v2"

  → Validador B2: "Anterior = [tsa, polygon], nuevo = [tsa, polygon, bitcoin]"
                   ✓ subset válido, monotonic OK

  → ECOX registra: POLICY_EVOLVED event
    from: ["tsa", "polygon"]
    to: ["tsa", "polygon", "bitcoin"]
    reason: "owner_request"

  → Trigger encolada nuevo protect_document_v2 job para Bitcoin

T_4: Bitcoin confirmado
  event: anchor.confirmed (chain=bitcoin)

  → generateECO() calcula:
    certified: ["tsa", "polygon", "bitcoin"]
    pending: []
    status: "valid_final"

  → ECO final firmado institucionalmente

T_5: Firmas finales
  event: signature.applied (Firmantes 2, 3, 4, 5)

  → Cada firma genera novo ECO snapshot
  → Pero el status ya era "valid_final" desde T_4
  → Lo que cambia es signature_count en la trazabilidad

  → Certificado final: todas las firmas + todas las anchuras

RESULTADO:
  - Cada firmante tiene su ECO válido cuando es su turno
  - No espera a Bitcoin
  - La política evolucionó, está auditada en ECOX
  - Determinístico: mismo events[] → mismo ECO
  - Verificable: cualquiera puede recalcular
```

---

## 10. Diferencia Legal: Esta Es La Razón Por Modelo B

```
En jurisdicciones modernas (EIDAS, ley de comercio electrónico):

MODELO A (Snapshot Inmutable):
  Ventaja legal: Simple, duro de cuestionar
  Desventaja legal:
    - Si policy era insuficiente → "nunca se podría cambiar" suena inflexible
    - Cliente queda frustrado
    - Litigios sobre "por qué no permitieron Bitcoin"

MODELO B (Política Evolutiva):
  Ventaja legal:
    - Se acomoda a cambios razonables durante el proceso
    - Policy está DOCUMENTADA y AUDITABLE (ECOX)
    - Cada decisión tiene razón (registrada)
    - Cliente no se siente presionado a "reintentar"
    - Es más defensible judicialmente: "Evolucionamos la política
      de forma ordenada y transparente"

  Desventaja legal (mitigada por Modelo B):
    - "¿Qué pasa si policy es inconsistente?"
      → Respuesta: Reglas B1–B3 lo evitan
    - "¿Quién decide cambios?"
      → Respuesta: Owner explícitamente, documentado en ECOX
    - "¿Puede falsificarse un cambio de policy?"
      → Respuesta: Eventos inmutables (append-only), EPI lo detecta

CONCLUSIÓN:
  Modelo B es MEJOR defendible en juicio porque es TRANSPARENTE.
  Modelo A es simple pero inflexible.

  EcoSign elige B porque el usuario es soberano:
  tu política, tu evidencia, tu decisión de cambiar.
```

---

## 11. Resumen Ejecutivo (Qué Debe Quedar Claro)

### Para Engineering
- `required_evidence` es un **estado** (mutable), no una **constante**
- Pero es mutable bajo reglas: B1 (no-null), B2 (monotonicidad), B3 (TSA base)
- Validadores deben rechazar violaciones
- ECO se calcula DETERMINÍSTICAMENTE de events[]
- Valid_intermediate es un estado **legítimo**, no error

### Para Legal
- Modelo B es intencional, no bug
- Cada cambio de policy está auditado (ECOX)
- Usuario tiene control explícito sobre su policy
- Evidencia es válida antes del final (no es falso negativo)
- Sistema es defendible en juicio porque es transparente

### Para Product
- Usuario NO espera al final para tener evidencia
- "Valid intermediate" es mensaje normal, no alarma
- Policy puede evolucionar conforme usuario decide
- Cada firmante recibe su ECO inmediatamente
- Flexibilidad = retención de clientes = diferencial contra competencia

### Para Verificadores/Auditores
- Emitir "valid_intermediate" cuando H_c coincide + H_s válidos
- NO rechazar un ECO en mitad del flujo como "inválido"
- El status "pending" en some anchors es ESPERADO
- Una auditoría de la cadena hashes es suficiente para confiar

---

## 12. Checklist: Qué Cambia en el Sistema

```
DOCUMENTOS:
  ✓ Este contrato: MODELO_B_POLICY_EVOLUTION.md (forma oficial, normativa)
  ✓ Actualizar CONTRATO_ECO_ECOX.md: aclarar ECO intermedio es válido
  ✓ Actualizar docs sobre verificación: "valid_intermediate" es estado normal

CÓDIGO (Validadores):
  ✓ validateRequiredEvidenceNotNull() en appendEvent
  ✓ validateMonotonicityByStage() en appendEvent
  ✓ validateMinimumEvidence() en appendEvent (B3)

  ✓ Registrar violaciones en métrica policy_violations por tipo
  ✓ Alertar si required_evidence null en últimas 24h

ECO GENERATION:
  ✓ Asegurar que generateECO() emite certified vs pending claramente
  ✓ Asegurar que "valid_intermediate" aparece en status (no "incomplete")

ECOX / OBSERVABILIDAD:
  ✓ POLICY_EVOLVED events registrados cuando required_evidence cambia
  ✓ Métrica: policy_changes_per_day, policy_overrides_count

UX / VERIFICADOR:
  ✓ Mostrar "Valid intermediate" como estado positivo
  ✓ Mostrar qué está certificado vs qué está pending
  ✓ NO mostrar "incomplete" como alarma

TESTS:
  ✓ E2E: policy evoluciona, cada etapa es válida
  ✓ Validador B1: rechaza required_evidence null
  ✓ Validador B2: permite crecer, rechaza disminuir
  ✓ Validador B3: rechaza sin TSA (salvo override)
  ✓ ECO generación: reproducible de events[]
```

---

## 13. Nada Cambió de Verdad (Ya Estabas En B)

```
Este contrato no ORDENA un cambio arquitectónico.
Este contrato FORMALIZA lo que ya estaba vivo.

Evidencia:
  - Tu prod muestra document.protected.requested repetidas
  - Tu prod muestra required_evidence ["tsa","polygon"] → ["tsa","polygon","bitcoin"]
  - Tu prod emite events y los procesa ordenadamente
  - Tu users reciben ECO intermedio (aunque sea llamado "draft")

Lo que cambia:
  - NOMBRAMIENTO: "Esto es Modelo B, intencional"
  - VALIDACIÓN: "B1–B3 son reglas duras, no sugerencias"
  - UX: "Valid intermediate es OK, no error"
  - DÉFENSA: "Cuando litigues, dices: EcoSign implementa Modelo B
             con transparencia total. ECOX prueba cada decisión."
```

---

## 14. Frase Rector Final

```
"EcoSign no certifica archivos.
EcoSign certifica VERDADES DOCUMENTALES.

Bajo Modelo B:
- La verdad evoluciona conforme el proceso avanza
- Cada momento tiene su verdad válida
- La verdad final es la más fuerte, pero no la única
- Toda verdad está auditada y es reproducible
- El usuario es soberano: su política, su evidencia, su confianza
```

---

**Aprobación**: Este contrato es normativa vinculante desde 2026-02-20.
**Responsable de implementación**: Engineering Team
**Responsable de validación**: Legal + QA
