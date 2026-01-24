# D11 - Confirmar identidad del firmante ✅ VALIDADO - ACUMULANDO

**Fecha de inicio:** 2026-01-23
**Fecha de validación:** 2026-01-23
**Fase:** 2 - Shadow validation (VALIDADO - Acumulando runs)
**Grupo:** 2 - Workflow (medio impacto, validación de identidad)

**Estado actual:** 1 run, 0 divergencias, 100% match rate

---

## 📋 Qué decide

**Decisión:** "¿Se debe confirmar/registrar la identidad de un firmante?"

**Contexto:**
Cuando un firmante ingresa su nombre completo y acepta los términos de logging antes de firmar, el sistema debe decidir si esa confirmación es válida y registrarla.

```
API/Edge: confirm-signer-identity
          ↓
     [D11: Confirm?] → workflow_signers UPDATE (name)
          ↓
     workflow_events INSERT (signer.identity_confirmed)
```

**Responsabilidad actual:** Edge Function `supabase/functions/confirm-signer-identity`.

**Propósito:** Capturar identidad real del firmante antes de firmar (compliance legal).

---

## 🔢 Inputs

### Datos requeridos (request):
- **signerId**: UUID del signer
- **firstName**: Nombre del firmante (no vacío)
- **lastName**: Apellido del firmante (no vacío)
- **email**: Email del firmante (validación)
- **confirmedRecipient**: Confirmación de ser destinatario (boolean, debe ser true)
- **acceptedLogging**: Aceptación de logging (boolean, debe ser true)

### Contexto adicional (queries):
- **Signer**: `workflow_signers.id`, `email`, `name`, `status`, `workflow_id`
- **Workflow**: `signature_workflows.status` (opcional)

---

## 🎯 Output

### Resultado (si decisión es TRUE):

1) **Actualizar signer**
```sql
UPDATE workflow_signers
SET name = :fullName,  -- 'firstName lastName'
    updated_at = NOW()
WHERE id = :signerId;
```

2) **Registrar evento canónico**
```sql
INSERT INTO workflow_events (
  workflow_id,
  signer_id,
  event_type, -- 'signer.identity_confirmed'
  payload
)
```

### Decisión = FALSE (no confirmar):
- Signer no existe
- firstName o lastName vacíos
- confirmedRecipient = false
- acceptedLogging = false
- Signer ya confirmó identidad (name ya existe, opcional)
- Signer en estado terminal (signed/rejected, opcional)

---

## 🔒 Invariantes

### 1. Condiciones para confirmar (AND lógico):
```typescript
signer.exists === true &&
firstName.trim() !== '' &&
lastName.trim() !== '' &&
confirmedRecipient === true &&
acceptedLogging === true
```

### 2. Validaciones adicionales (canónicas, no en legacy):
```typescript
signer.status NOT IN ('signed', 'rejected') &&
signer.name === null  // No confirmado previamente
```

### 3. Formato del nombre:
- `fullName = firstName.trim() + ' ' + lastName.trim()`
- Se elimina whitespace extra

### 4. Side effects obligatorios:
- `workflow_events.event_type = 'signer.identity_confirmed'`
- `payload.email` debe registrar el email del firmante
- `payload.signing_order` debe registrar el orden de firma

### 5. Idempotencia (opcional):
- Si signer ya tiene `name`, no debería re-confirmar
- Legacy permite re-confirmar (posible divergencia)

---

## ❌ Qué NO decide

Esta decisión **NO** es responsable de:

1. **Validar identidad real** → eso sería KYC/verificación externa
2. **Firmar el documento** → eso es otra decisión (apply-signature)
3. **Avanzar el workflow** → eso es decisión de orquestación
4. **Validar formato de email** → eso debería ser validación previa
5. **Notificar al owner** → eso sería otra decisión de notificación

---

## 🎨 Regla canónica (formal)

```typescript
export interface ConfirmIdentityInput {
  /**
   * ID del usuario autenticado (puede ser signer o service role)
   */
  actor_id: string | null;

  /**
   * Datos del signer
   */
  signer: {
    id: string;
    email: string;
    name: string | null;
    status: string;
    workflow_id: string;
  } | null;

  /**
   * Datos de identidad a confirmar
   */
  identity: {
    firstName: string;
    lastName: string;
    confirmedRecipient: boolean;
    acceptedLogging: boolean;
  };

  /**
   * Datos del workflow (opcional)
   */
  workflow?: {
    status: string;
  } | null;
}

export const shouldConfirmIdentity = (input: ConfirmIdentityInput): boolean => {
  // 1. Signer debe existir
  if (!input.signer) return false;

  // 2. firstName y lastName no pueden estar vacíos
  const firstName = input.identity.firstName?.trim();
  const lastName = input.identity.lastName?.trim();
  if (!firstName || !lastName) return false;

  // 3. confirmedRecipient debe ser true
  if (!input.identity.confirmedRecipient) return false;

  // 4. acceptedLogging debe ser true
  if (!input.identity.acceptedLogging) return false;

  // 5. Signer no debe estar en estado terminal (canonical, no legacy)
  const terminalStatuses = ['signed', 'rejected', 'cancelled'];
  if (terminalStatuses.includes(input.signer.status)) return false;

  // 6. Signer no debe tener nombre confirmado previamente (canonical, no legacy)
  if (input.signer.name !== null && input.signer.name.trim() !== '') {
    return false;
  }

  // Todas las condiciones cumplidas
  return true;
};
```

---

## 📊 Casos de prueba

### Test 1: Happy path - Primera confirmación
```typescript
Input: {
  signer: { id: 'uuid', email: 'test@example.com', name: null, status: 'invited' },
  identity: { firstName: 'Juan', lastName: 'Pérez', confirmedRecipient: true, acceptedLogging: true }
}
Output: true
```

### Test 2: firstName vacío
```typescript
Input: {
  signer: { name: null, status: 'invited' },
  identity: { firstName: '', lastName: 'Pérez', confirmedRecipient: true, acceptedLogging: true }
}
Output: false
```

### Test 3: lastName vacío
```typescript
Input: {
  signer: { name: null, status: 'invited' },
  identity: { firstName: 'Juan', lastName: '', confirmedRecipient: true, acceptedLogging: true }
}
Output: false
```

### Test 4: confirmedRecipient = false
```typescript
Input: {
  signer: { name: null, status: 'invited' },
  identity: { firstName: 'Juan', lastName: 'Pérez', confirmedRecipient: false, acceptedLogging: true }
}
Output: false
```

### Test 5: acceptedLogging = false
```typescript
Input: {
  signer: { name: null, status: 'invited' },
  identity: { firstName: 'Juan', lastName: 'Pérez', confirmedRecipient: true, acceptedLogging: false }
}
Output: false
```

### Test 6: Signer ya firmó (terminal)
```typescript
Input: {
  signer: { name: null, status: 'signed' },
  identity: { firstName: 'Juan', lastName: 'Pérez', confirmedRecipient: true, acceptedLogging: true }
}
Output: false  // Canonical rechaza, legacy acepta
```

### Test 7: Ya confirmado previamente
```typescript
Input: {
  signer: { name: 'Juan Pérez', status: 'ready_to_sign' },
  identity: { firstName: 'Juan', lastName: 'Pérez', confirmedRecipient: true, acceptedLogging: true }
}
Output: false  // Canonical rechaza, legacy acepta
```

### Test 8: Signer inexistente
```typescript
Input: {
  signer: null,
  identity: { firstName: 'Juan', lastName: 'Pérez', confirmedRecipient: true, acceptedLogging: true }
}
Output: false
```

### Test 9: Whitespace en nombres
```typescript
Input: {
  signer: { name: null, status: 'invited' },
  identity: { firstName: '  Juan  ', lastName: '  Pérez  ', confirmedRecipient: true, acceptedLogging: true }
}
Output: true  // Acepta, pero trim() limpia espacios
```

---

## 🔍 Autoridad actual (legacy)

**Ubicación:** `supabase/functions/confirm-signer-identity/index.ts`

**Lógica actual (resumen):**
- Valida signerId existe
- Valida firstName y lastName no vacíos
- Valida confirmedRecipient = true
- Valida acceptedLogging = true
- Actualiza `name` con fullName
- Emite `signer.identity_confirmed`

**NO valida:**
- Estado del signer
- Si ya fue confirmado
- Autorización del actor

---

## 🚀 Plan de implementación

### Fase 1 — Contrato (COMPLETADA ✅)
- ✅ Documento creado
- ✅ Regla canónica definida
- ✅ Validado con implementación actual

### Fase 2 — Shadow mode (ACTIVO 🔄)
- ✅ Implementar `shouldConfirmIdentity()` en `packages/authority/src/decisions/confirmIdentity.ts`
- ✅ Crear tests: `packages/authority/tests/d11-confirm-identity.test.ts` (13 escenarios, 100% pass)
- ✅ Instrumentar shadow logging en edge function (`confirm-signer-identity/index.ts` líneas 60-121)
- ✅ Log markers implementados: `[SHADOW MATCH D11]` / `[SHADOW DIVERGENCE D11]`
- ⏳ **Validación en progreso**: Esperando primera ejecución para validar

**Nota importante:** Shadow mode detectará divergencias porque:
- Legacy NO valida estados del signer (signed/rejected)
- Legacy NO valida si ya fue confirmado (permite re-confirmar)
- **Esto es esperado y correcto** → evidencia de mejora de seguridad

### Fase 3 — Aceptación
- [ ] ≥ 50 comparaciones
- [ ] Analizar divergencias esperadas (re-confirmación, estados terminales)
- [ ] Decidir si mantener comportamiento permisivo o migrar a canonical estricto
- [ ] Marcar como ACEPTADA

### Fase 4 — Apagado quirúrgico
- [ ] Migrar autoridad al orquestador
- [ ] Convertir legacy en NOOP/early return
- [ ] Mantener fallback por seguridad

---

## 🔗 Relaciones con otras decisiones

**Depende de:**
- D5 (notify_signer_link): signer ya fue creado y notificado

**Alimenta a:**
- Decisión de firma (apply-signature): requiere identidad confirmada

**Similar a:**
- D10 (reject-signature): ambas modifican estado de signer
- Ambas son comandos sobre signer

---

## ⚠️ Notas de diseño

1. **Compliance legal**
   - Confirmar identidad es requisito para firma legal válida
   - `confirmedRecipient` = "soy el destinatario correcto"
   - `acceptedLogging` = "acepto que se registre mi identidad"

2. **Divergencias esperadas**
   - Legacy permite confirmar múltiples veces
   - Legacy permite confirmar después de firmar
   - Canonical es más estricto (mejora seguridad)

3. **Idempotencia**
   - Canonical: no permite re-confirmar si ya tiene name
   - Legacy: permite re-confirmar (sobrescribe name)
   - Divergencia esperada y correcta

4. **Estados terminales**
   - Canonical: no permite confirmar si ya firmó/rechazó
   - Legacy: permite confirmar en cualquier estado
   - Divergencia esperada y correcta

---

## 📊 Monitoreo de Shadow Mode

### Queries útiles para validación:

**Resumen D11:**
```sql
SELECT
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergences,
  COUNT(*) FILTER (WHERE has_divergence = false) as matches,
  ROUND(100.0 * COUNT(*) FILTER (WHERE has_divergence = false) / NULLIF(COUNT(*), 0), 2) as match_percentage
FROM shadow_decision_logs
WHERE decision_code = 'D11_CONFIRM_IDENTITY';
```

**Últimas ejecuciones:**
```sql
SELECT
  created_at,
  legacy_decision,
  canonical_decision,
  has_divergence,
  (context->>'signer_status') as signer_status,
  (context->>'signer_name_before') as name_before
FROM shadow_decision_logs
WHERE decision_code = 'D11_CONFIRM_IDENTITY'
ORDER BY created_at DESC
LIMIT 10;
```

**Divergencias por tipo:**
```sql
SELECT
  (context->>'signer_status') as signer_status,
  (context->>'signer_name_before') as had_name_before,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergencias
FROM shadow_decision_logs
WHERE decision_code = 'D11_CONFIRM_IDENTITY'
GROUP BY signer_status, had_name_before
ORDER BY divergencias DESC;
```

### Criterios de aceptación:
- ✅ **Shadow runs:** ≥ 50 comparaciones
- ⚠️ **Divergencias:** Se esperan divergencias por:
  - Re-confirmación (name ya existe)
  - Confirmación en estados terminales (signed/rejected)
- ✅ **Análisis de divergencias:** Documentar casos donde canonical rechaza pero legacy acepta
- ✅ **Decisión de producto:** ¿Permitir re-confirmación o mantener estricto?

---

**Estado:** 🔄 Fase 2 ACTIVA - Shadow mode implementado, esperando validación
**Próximo paso:** Ejecutar confirmación de identidad, analizar divergencias, decidir estrategia
