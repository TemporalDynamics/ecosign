# 🔧 Identity Levels — Plan de Implementación Backend

**Estado:** READY TO IMPLEMENT  
**Sprint:** 2026 Q1 — Identity Levels Dynamic  
**Prioridad:** MEDIUM (no bloquea otros sprints)  
**Esfuerzo estimado:** 1-2 días  
**Contrato:** `IDENTITY_ASSURANCE_RULES.md` v2.0

---

## 1. Objetivo

Reemplazar nivel de identidad hardcoded (`'IAL-1'`) por determinación dinámica basada en método de verificación real usado en cada firma.

**NO hacer:**
- ❌ Cambios de schema DB
- ❌ Agregar columnas nuevas
- ❌ Migraciones de datos
- ❌ Refactors grandes

**SÍ hacer:**
- ✅ Modificar lógica en `process-signature`
- ✅ Poblar `signals` array
- ✅ Registrar `method` correctamente
- ✅ Usar datos existentes

---

## 2. Archivo a Modificar

**Ubicación:** `supabase/functions/process-signature/index.ts`

### 2.1 Código Actual (línea ~121-127)

```typescript
const identityAssurance = {
  level: 'IAL-1',           // ⚠️ HARDCODED
  provider: 'ecosign',
  method: null,             // ⚠️ NULL
  timestamp: signedAt,
  signals: []               // ⚠️ VACÍO
}
```

### 2.2 Código Nuevo (PROPUESTO)

```typescript
const identityAssurance = {
  level: determineIdentityLevel(signer, verificationData),
  provider: 'ecosign',
  method: verificationData?.method || 'acknowledgement',
  timestamp: signedAt,
  signals: buildIdentitySignals(signer, verificationData)
}

// Agregar estas funciones al archivo

function determineIdentityLevel(
  signer: any, 
  verification: any
): 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' {
  // L0: Sin verificación (acknowledgement)
  if (!verification || !verification.method) {
    return 'L0'
  }
  
  // L1: Email magic link
  if (verification.method === 'email_magic_link' || verification.method === 'email') {
    return 'L1'
  }
  
  // L2: OTP SMS/Voice (FUTURO — hoy no implementado)
  if (verification.method === 'sms_otp' || verification.method === 'voice_otp') {
    return 'L2'
  }
  
  // L3: Passkey/WebAuthn (FUTURO — hoy no implementado)
  if (verification.method === 'passkey' || verification.method === 'webauthn') {
    return 'L3'
  }
  
  // L4: Biométrico + KYC (FUTURO)
  if (verification.method === 'biometric_kyc') {
    return 'L4'
  }
  
  // L5: Certificado QES/PSC (FUTURO)
  if (verification.method === 'certificate' || verification.method === 'qes') {
    return 'L5'
  }
  
  // Default fallback
  return 'L1'
}

function buildIdentitySignals(signer: any, verification: any): string[] {
  const signals: string[] = []
  
  // Email proporcionado
  if (signer.email) {
    signals.push('email_provided')
  }
  
  // Email verificado (si usó magic link o require_login)
  if (verification?.email_verified || signer.require_login) {
    signals.push('email_verified')
  }
  
  // Link de firmante accedido
  if (verification?.link_accessed || signer.first_accessed_at) {
    signals.push('link_accessed')
  }
  
  // NDA aceptado
  if (signer.nda_accepted) {
    signals.push('nda_accepted')
  }
  
  // Device fingerprint disponible
  if (verification?.device_fingerprint) {
    signals.push('device_fingerprint_captured')
  }
  
  // IP address registrada
  if (verification?.ip_address) {
    signals.push('ip_address_captured')
  }
  
  // User agent disponible
  if (verification?.user_agent) {
    signals.push('user_agent_captured')
  }
  
  return signals
}
```

---

## 3. Datos Disponibles Hoy

### 3.1 Tabla `signer_links`

```sql
SELECT 
  signer_email,
  signer_name,
  nda_accepted,
  first_accessed_at,
  last_accessed_at
FROM signer_links
WHERE workflow_id = ...
```

### 3.2 Tabla `workflow_signers`

```sql
SELECT
  email,
  name,
  require_login,
  require_nda,
  quick_access
FROM workflow_signers
WHERE workflow_id = ...
```

### 3.3 Request Headers (disponibles en Edge Function)

```typescript
const headers = req.headers
const userAgent = headers.get('user-agent')
const ipAddress = headers.get('x-real-ip') || headers.get('x-forwarded-for')
const referer = headers.get('referer')
```

---

## 4. Mapeo Método → Nivel

| Situación Actual | `verification.method` | `level` | Lógica |
|------------------|-----------------------|---------|--------|
| Firmante con magic link | `'email_magic_link'` | `'L1'` | Email verificado |
| Firmante quick_access | `'acknowledgement'` | `'L0'` | Solo click |
| Usuario registrado | `'email_magic_link'` | `'L1'` | Email verificado en auth |
| Creador firmando | `'email'` | `'L1'` | Email en sesión |

**FUTURO (no implementar ahora):**
| Situación Futura | `method` | `level` |
|------------------|----------|---------|
| OTP SMS | `'sms_otp'` | `'L2'` |
| Passkey | `'passkey'` | `'L3'` |
| KYC provider | `'biometric_kyc'` | `'L4'` |
| PSC/QES | `'certificate'` | `'L5'` |

---

## 5. Cómo Obtener `verificationData`

### Opción 1: Desde Headers (RECOMENDADO HOY)

```typescript
const verificationData = {
  method: determineMethodFromContext(signer, req),
  email_verified: !!signer.require_login || !!authUser,
  link_accessed: !!signer.first_accessed_at,
  device_fingerprint: null,  // TODO: implementar
  ip_address: req.headers.get('x-real-ip'),
  user_agent: req.headers.get('user-agent')
}

function determineMethodFromContext(signer: any, req: Request): string {
  // Si es usuario autenticado
  if (req.headers.get('authorization')) {
    return 'email_magic_link'
  }
  
  // Si require_login está activo
  if (signer.require_login) {
    return 'email_magic_link'
  }
  
  // Si es quick_access
  if (signer.quick_access) {
    return 'acknowledgement'
  }
  
  // Default
  return 'email_magic_link'
}
```

### Opción 2: Desde DB (FUTURO)

Cuando agreguemos tabla `identity_verifications`:

```sql
SELECT method, verified_at, signals
FROM identity_verifications
WHERE signer_id = ...
ORDER BY verified_at DESC
LIMIT 1
```

---

## 6. Testing

### 6.1 Test Cases Mínimos

```typescript
// test/identity-levels.test.ts

describe('Identity Level Determination', () => {
  test('L0: No verification', () => {
    const level = determineIdentityLevel(
      { email: 'test@example.com' },
      null
    )
    expect(level).toBe('L0')
  })
  
  test('L1: Email magic link', () => {
    const level = determineIdentityLevel(
      { email: 'test@example.com', require_login: true },
      { method: 'email_magic_link', email_verified: true }
    )
    expect(level).toBe('L1')
  })
  
  test('Signals: Email + NDA', () => {
    const signals = buildIdentitySignals(
      { email: 'test@example.com', nda_accepted: true },
      { email_verified: true }
    )
    expect(signals).toContain('email_provided')
    expect(signals).toContain('email_verified')
    expect(signals).toContain('nda_accepted')
  })
})
```

### 6.2 Test Manual

1. Crear flujo con `require_login: false`
2. Firmar como guest
3. Descargar .ECO
4. Verificar: `identity_assurance.level === 'L0'`

---

1. Crear flujo con `require_login: true`
2. Firmar con magic link
3. Descargar .ECO
4. Verificar: `identity_assurance.level === 'L1'`
5. Verificar: `signals` incluye `'email_verified'`

---

## 7. Rollout

### Fase 1: Desarrollo (1 día)
- ✅ Implementar funciones `determineIdentityLevel` y `buildIdentitySignals`
- ✅ Modificar bloque `identityAssurance` en `process-signature`
- ✅ Tests unitarios

### Fase 2: Testing (medio día)
- ✅ Test manual con flujo L0
- ✅ Test manual con flujo L1
- ✅ Verificar .ECO descargado tiene nivel correcto

### Fase 3: Deploy (medio día)
- ✅ Deploy a staging
- ✅ Smoke test
- ✅ Deploy a producción
- ✅ Monitor logs

### Fase 4: Validación (1-2 días post-deploy)
- ✅ Revisar certificados nuevos
- ✅ Confirmar `signals` se están poblando
- ✅ Confirmar `method` no es `null`

---

## 8. Rollback Plan

Si algo falla:

```typescript
// Revertir a hardcoded temporal
const identityAssurance = {
  level: 'L1',  // Safe default
  provider: 'ecosign',
  method: 'email_magic_link',
  timestamp: signedAt,
  signals: ['email_provided']  // Minimal
}
```

**NO afecta certificados existentes** (son append-only).

---

## 9. Siguientes Pasos (NO HOY)

### Sprint 2 (Q1): L2/L3 Implementation
- Implementar OTP SMS (Twilio/AWS SNS)
- Implementar Passkeys (WebAuthn)
- Agregar tabla `identity_verifications`

### Sprint 3 (Q2): UI de Selección
- Modal de nivel requerido en workflow creation
- Copy adaptativo por nivel en signing flow
- Badge de nivel en certificates viewer

### Sprint 4 (Q3+): L4/L5 Integraciones
- KYC provider (Onfido/Incode)
- PSC/QES (Mifiel)
- Upgrade de certificados legacy (opcional)

---

## 10. Checklist de Implementación

**Backend:**
- [ ] Funciones `determineIdentityLevel` y `buildIdentitySignals`
- [ ] Modificar `process-signature/index.ts`
- [ ] Tests unitarios (3 test cases mínimo)
- [ ] Test manual L0 y L1

**DevOps:**
- [ ] Deploy a staging
- [ ] Smoke test
- [ ] Deploy a producción
- [ ] Monitor Sentry 24h

**Validación:**
- [ ] Descargar 3 .ECO nuevos y verificar niveles
- [ ] Confirmar `signals` poblados
- [ ] Confirmar `method` != null
- [ ] Reportar en Slack #tech

**Documentación:**
- [ ] Actualizar `IDENTITY_ASSURANCE_RULES.md` con "Estado: IMPLEMENTED"
- [ ] Agregar nota en `decision_log2.0.md`
- [ ] Cerrar issue relacionado

---

**Responsable:** Backend Team  
**Bloqueantes:** Ninguno  
**Depende de:** IDENTITY_ASSURANCE_RULES.md v2.0  
**Siguiente fase:** L2/L3 implementation (Q1)
