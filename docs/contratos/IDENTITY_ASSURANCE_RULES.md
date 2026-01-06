# 🔐 IDENTITY ASSURANCE RULES (CONTRATO CERRADO)

**Estado:** CANÓNICO — CERRADO  
**Versión:** v2.0  
**Fecha:** 2026-01-07  
**Scope:** Identidad del firmante y peso probatorio  
**Relacionado:**
- `ANCHOR_EVENT_RULES.md`
- `PROTECTION_LEVEL_RULES.md`
- `TSA_EVENT_RULES.md`

---

## ⚠️ DECISIÓN CENTRAL (NO NEGOCIABLE)

**Cerramos identidad AHORA como contrato y como evento.**  
**Postergamos implementación profunda y firmas certificadas.**  
**NO mezclamos identidad fuerte con visibilidad del documento.**

Esta decisión define:
- El discurso legal está cerrado
- El modelo mental del producto queda fijo
- El backend puede avanzar sin refactors destructivos
- No necesitamos más para seguir

---

## 1. Principio Fundamental

**La identidad no es un binario. Es un continuo de certeza probatoria.**

El sistema NO asume que toda firma requiere verificación de identidad fuerte, ni bloquea flujos por limitaciones técnicas del firmante.

La plataforma:
- ✅ Registra hechos
- ✅ No inventa estados
- ✅ No promete más certeza de la que existe
- ✅ No mezcla identidad con protección de integridad

---

## 2. REGLAS CANÓNICAS CERRADAS HOY

Estas 4 reglas son INMUTABLES y definen el modelo de identidad de EcoSign:

### 2.1 Identidad es un Continuo (L0–L5)
- ❌ No es binaria "verificado / no verificado"
- ✅ Es un espectro de certeza probatoria
- ✅ Cada nivel tiene peso legal diferente
- ✅ NO hay escalón mágico que convierta "inválido" en "válido"

### 2.2 Nunca Bloquea por Default
**La identidad NUNCA es bloqueante por defecto.**

Solo se convierte en bloqueante cuando:
1. El creador del flujo lo define explícitamente, O
2. El tipo de documento lo exige por contrato/legal

👉 Esto replica el comportamiento del mundo jurídico real.

### 2.3 Siempre se Registra como Evento
- ✅ Los eventos de identidad son append-only
- ✅ NO se "actualiza" identidad pasada
- ✅ Se agrega evidencia nueva sin borrar la anterior
- ✅ La historia completa es auditable

### 2.4 Separación de Conceptos (CRÍTICO)

| Concepto | Qué es | Qué NO es |
|----------|--------|-----------|
| **Firma** | Intención de aceptar | Identidad absoluta |
| **Identidad** | Evidencia sobre quién firmó | Garantía de no repudio |
| **Protección** | Integridad + trazabilidad | Certificación legal |
| **Nivel probatorio** | Peso de la evidencia | Resultado judicial automático |

**Identidad ≠ Protección ≠ Firma certificada**

Pueden correlacionarse, pero **NO se fusionan**.

---

## 3. Modelo de Niveles de Identidad (CERRADO)

### 3.1 Niveles Definidos

| Nivel | Método | Costo | Fricción | Uso típico | Estado Implementación |
|-------|--------|-------|----------|------------|----------------------|
| **L0** | Acknowledgement explícito | $0 | Ninguna | Acuerdos simples | ✅ CERRADO |
| **L1** | Magic Link (Email) | $0 | Baja | NDAs, aprobaciones | ✅ CERRADO |
| **L2** | OTP SMS / Voice | Bajo | Media | Flujos comerciales | 🔄 PRÓXIMO |
| **L3** | Passkey (WebAuthn) | $0 | Muy baja | Usuarios frecuentes | 🔄 PRÓXIMO |
| **L4** | Biométrico + ID | Alto | Alta | Inmobiliario, crédito | 🔮 FUTURO |
| **L5** | Certificado (QES / e.firma) | Alto | Alta | Escrituras, fiscal | 🔮 FUTURO |

⚠️ **Ningún nivel invalida al anterior. Solo aumenta el peso probatorio.**

### 3.2 Mapeo a IAL (NIST 800-63) — REFERENCIA ÚNICAMENTE

| Nivel EcoSign | IAL Equivalente | Descripción |
|---------------|-----------------|-------------|
| L0 | N/A | Sin atribución personal |
| L1 | IAL-1 | Auto-declaración |
| L2 | IAL-1.5 | Verificación básica |
| L3 | IAL-1.5+ | Dispositivo seguro |
| L4 | IAL-2 | Identidad remota verificada |
| L5 | IAL-2/IAL-3 | Identidad certificada |

**IMPORTANTE:** No usamos nomenclatura IAL en UI. Solo internamente para compliance.

### 3.3 Qué NO Hacemos Ahora (y Por Qué)

❌ **NO implementar todavía:**
- KYC real (Onfido / Veriff)
- IAL-2 / IAL-3 completos
- Upgrade automático de certificados viejos
- Integración con PSC / QES por default

**Por qué:**
- No hay jurisprudencia que lo exija hoy
- Introduce costo + fricción innecesaria
- NO suma valor a nuestro diferencial (ledger probatorio)

**Nuestro valor NO es** "identificar personas mejor que un banco"  
**Nuestro valor ES** "probar hechos mejor que nadie"

---

## 4. Registro Canónico (Events) — CERRADO

### 4.1 Estructura de Evento de Identidad

Toda acción de identidad genera un evento append-only en `document_entities.events[]`:

```json
{
  "kind": "identity",
  "at": "2026-01-07T10:00:00Z",
  "level": "L0 | L1 | L2 | L3 | L4 | L5",
  "method": "email_magic_link | sms_otp | passkey | biometric | certificate",
  "email": "user@example.com",
  "metadata": {
    "device_fingerprint": "sha256(...)",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "...",
    "passkey_credential_id": "...",
    "provider": "ecosign | mifiel | onfido"
  }
}
```

### 4.2 Invariantes INMUTABLES

Los eventos de identidad:
- ✅ Son append-only (NUNCA se borran)
- ✅ Forman parte del ledger probatorio
- ✅ Son reproducibles en el tiempo
- ✅ Se registran ANTES de la firma
- ❌ NUNCA se degradan
- ❌ NUNCA se reescriben

### 4.3 Relación con `witness_hash`

El evento de identidad se registra, luego se firma el `witness_hash`:

```typescript
// 1. Registrar identidad
identity_event = {
  kind: "identity",
  at: now(),
  level: "L1",
  method: "email_magic_link",
  email: signer.email
}

// 2. Calcular witness_hash (incluye el identity_event)
witness_hash = hash(document + all_events)

// 3. Firmar
signature_event = {
  kind: "signature",
  at: now(),
  witness_hash: witness_hash,
  identity_level: "L1"  // Copia del nivel para fácil query
}
```

**Esto vincula criptográficamente identidad + integridad + momento.**

---

## 5. Fallbacks (OBLIGATORIOS)

### 5.1 Cadena de Fallback Estándar

Si el método preferido no está disponible, el sistema cae automáticamente:

```
Passkey (L3) → OTP SMS (L2) → Magic Link (L1) → Acknowledgement (L0)
```

Cada fallback:
- ✅ Genera su propio `identity_event`
- ✅ Queda registrado con su nivel real
- ❌ NO se oculta
- ❌ NO se mejora artificialmente

### 5.2 Ejemplo Real

Usuario intenta firmar:
1. Sistema ofrece Passkey → No disponible
2. Sistema envía OTP → No lo recibe
3. Sistema envía Magic Link → ✅ Click
4. Se registra: `level: "L1", method: "email_magic_link"`

**NO se registra como L3. Se registra honestamente como L1.**

---

## 6. Relación con Protection Level (NO SE MEZCLAN)

**La identidad NO define el protection level. Lo contextualiza.**

| Concepto | Define | Deriva de | Se muestra |
|----------|--------|-----------|------------|
| **Protection Level** | Integridad del documento | TSA + Anchors | MAXIMUM / STANDARD / BASIC |
| **Identity Level** | Peso de atribución | Identity events | L0 / L1 / L2 / L3 / L4 / L5 |

### 6.1 Ejemplo de Presentación Correcta

```
📄 Documento: Contrato de Arrendamiento
🔒 Protection: MAXIMUM (TSA + Polygon + Bitcoin)
👤 Identity: L1 (Email verificado)
```

### 6.2 Ejemplos de Presentación INCORRECTA

❌ "Firma certificada"  
❌ "Identidad verificada"  
❌ "Documento con nivel de seguridad L1"  
❌ "Protection level L1"  

### 6.3 Copy Correcto

✅ "Protección de integridad: Máxima"  
✅ "Nivel de identidad: L1 (Email)"  
✅ "Este documento tiene protección máxima contra alteración. La identidad del firmante fue verificada mediante email."

---

## 7. Reglas de Bloqueo (EXPLÍCITAS)

### 7.1 Configuración del Flujo

El creador del flujo puede definir en `workflows`:

```typescript
identity_requirement: {
  mode: 'none' | 'recommended' | 'required',
  minimum_level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
}
```

### 7.2 Comportamiento por Modo

| Modo | Comportamiento | UI |
|------|----------------|-----|
| `none` | No solicita verificación | Botón "Firmar" directo |
| `recommended` | Ofrece verificación, no bloquea | "Recomendamos verificar..." + Skip |
| `required` | Bloquea si no cumple `minimum_level` | Modal obligatorio |

### 7.3 Ejemplos Reales

| Documento | Configuración | Comportamiento |
|-----------|---------------|----------------|
| NDA interno | `mode: 'none'` | Firma directa (L0) |
| NDA comercial | `mode: 'recommended', minimum_level: 'L1'` | Sugiere email, permite skip |
| Contrato laboral | `mode: 'required', minimum_level: 'L2'` | Fuerza OTP mínimo |
| Escritura | `mode: 'required', minimum_level: 'L4'` | Fuerza biometría + ID |

### 7.4 Mensaje de Bloqueo

Si `mode: 'required'` no se cumple:

```
🔒 Este documento requiere verificación de identidad nivel L2 (OTP)

Para continuar, completa la verificación mediante:
• SMS a tu teléfono
• Email con código

[Verificar ahora]
```

**NO se permite:**
- Firmar sin cumplir el nivel
- "Recordar después"
- Bypass de ningún tipo

---

## 8. Implementación Actual (2026-01-07)

### 8.1 Estado del Código

**Archivo:** `supabase/functions/process-signature/index.ts`

```typescript
// ACTUAL (línea 121-127) — HARDCODED
const identityAssurance = {
  level: 'IAL-1',           // ⚠️ Siempre el mismo
  provider: 'ecosign',
  method: null,
  timestamp: signedAt,
  signals: []
}
```

### 8.2 Cambios Requeridos (PRÓXIMO)

```typescript
// NUEVO — Determinar dinámicamente
const identityAssurance = {
  level: determineIdentityLevel(signer, verification),
  provider: 'ecosign',
  method: verification.method,  // 'email_magic_link' | 'sms_otp' | etc.
  timestamp: signedAt,
  signals: buildSignals(signer, verification)
}

function determineIdentityLevel(signer, verification) {
  // L0: Acknowledgement sin verificación
  if (!verification) return 'L0'
  
  // L1: Email magic link
  if (verification.method === 'email_magic_link') return 'L1'
  
  // L2: OTP SMS/Voice
  if (verification.method === 'sms_otp') return 'L2'
  
  // L3: Passkey
  if (verification.method === 'passkey') return 'L3'
  
  // Default
  return 'L1'
}

function buildSignals(signer, verification) {
  const signals = []
  
  if (signer.email) signals.push('email_provided')
  if (verification?.email_verified) signals.push('email_verified')
  if (verification?.sms_verified) signals.push('sms_verified')
  if (verification?.passkey_used) signals.push('passkey_authenticated')
  if (signer.nda_accepted) signals.push('nda_accepted')
  
  return signals
}
```

### 8.3 Esquema DB (NO requiere cambios inmediatos)

**Tabla `workflow_signers` (existente):**
```sql
email TEXT NOT NULL
name TEXT
require_login BOOLEAN DEFAULT false
require_nda BOOLEAN DEFAULT false
```

**Tabla `workflow_signatures` (existente):**
```sql
certification_data JSONB  -- Ya incluye identity_assurance
```

**NO agregar columnas nuevas todavía.** Usar JSONB existente.

---

## 9. Posición Probatoria Real (SIN CERTIFICACIÓN)

### 9.1 Qué Tenemos HOY

Incluso sin QES / NOM-151 / PSC:

✅ **Integridad criptográfica**
- Hash determinista
- Append-only ledger
- Blockchain anchoring

✅ **Fecha cierta**
- TSA (RFC 3161)
- Polygon timestamp
- Bitcoin OTS

✅ **Trazabilidad forense**
- Eventos inmutables
- Cadena de custodia
- Reproducibilidad completa

✅ **Identidad progresiva**
- Niveles explícitos (L0-L5)
- Fallbacks claros
- Sin mentiras técnicas

**📌 Esto es superior al 80-90% de las firmas electrónicas simples del mercado.**

### 9.2 Qué Diría un Perito

> "No puedo afirmar la identidad civil sin certificado gubernamental,  
> pero puedo afirmar que esta acción fue ejecutada en esta fecha exacta,  
> que el documento no fue alterado desde entonces,  
> y que la evidencia es reproducible e inmutable.  
> La cadena de eventos es coherente y auditable."

**Eso gana juicios**, incluso sin QES, cuando la contraparte no puede probar fraude.

### 9.3 Comparativa Honesta

| Sistema | Integridad | Trazabilidad | Identidad | Presunción Legal |
|---------|------------|--------------|-----------|------------------|
| **EcoSign** | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥 | ❌ |
| **DocuSign SES** | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥 | ❌ |
| **Mifiel (e.firma)** | 🔥🔥🔥🔥 | 🔥🔥🔥🔥 | 🔥🔥🔥🔥🔥 | ✅ |
| **Adobe Sign** | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥 | ❌ |

**Diferencia clave:**
- Los otros mezclan niveles y prometen más de lo que tienen
- Nosotros mostramos exactamente lo que hay
- Nuestra trazabilidad es objetivamente superior

---

## 10. DECLARACIÓN CANÓNICA (PARA DISCURSO)

Esta frase debe estar en:
- Pitch decks
- Documentación legal
- Conversaciones B2B
- Web pública

> **"Nuestra plataforma no promete no-repudio por defecto.  
> Promete evidencia honesta, trazable y verificable.  
> El peso legal lo define la jurisdicción.  
> Nosotros garantizamos la verdad técnica."**

### 10.1 Preguntas Difíciles (y Respuestas Honestas)

**Q: "¿Su firma es legalmente válida?"**  
**A:** Sí, bajo las mismas regulaciones que firmas SES/AdES (ESIGN, UETA, eIDAS simple). Lo que varía es el peso probatorio según el nivel de identidad elegido.

**Q: "¿Pueden repudiar la firma?"**  
**A:** En firmas simples (sin certificación), técnicamente sí. Pero con nuestra trazabilidad forense, la carga de prueba del fraude recae en quien repudia, y es extremadamente difícil de sostener.

**Q: "¿Por qué no usan PSC directamente?"**  
**A:** Porque el 90% de documentos no justifican el costo ni la fricción. Cuando sí lo justifican, integramos PSC como opción, sin forzarlo por defecto.

**Q: "¿Qué pasa si un juez no acepta su firma?"**  
**A:** Lo mismo que con cualquier firma electrónica simple. El juez evalúa la evidencia. Nuestra ventaja es que esa evidencia es reproducible, inmutable y verificable independientemente.

**Q: "¿Son más seguros que DocuSign?"**  
**A:** En integridad y trazabilidad, sí. En presunción legal automática, no (salvo que se use nivel L5 con PSC). Pero somos más honestos sobre lo que prometemos.

---

## 11. Roadmap de Identidad (NO ES PROMESA COMERCIAL)

### 11.1 AHORA ✅ (2026 Q1)
- L0: Acknowledgement
- L1: Magic Links
- Eventos de identidad append-only
- Separación clara identidad/protección

### 11.2 PRÓXIMO 🔄 (2026 Q2)
- L2: OTP SMS
- L3: Passkeys (WebAuthn)
- Determinación dinámica de niveles
- Signals poblados correctamente

### 11.3 FUTURO 🔮 (2026 Q3+)
- L4: Biometría + ID (Onfido/Incode)
- L5: QES / PSC / e.firma (vía Mifiel)
- Identidad descentralizada (DIDs)
- Credenciales verificables

**Nada de esto rompe lo existente. Todo se suma al continuo.**

---

## 12. CIERRE DEL CONTRATO

### 12.1 Lo que ESTÁ CERRADO (no se cambia)

✅ Modelo de niveles L0-L5  
✅ Identidad como continuo, no binario  
✅ Eventos append-only  
✅ Separación identidad/protección  
✅ Fallbacks obligatorios  
✅ No bloqueo por default  
✅ Discurso legal honesto  

### 12.2 Lo que está ABIERTO (se implementa progresivamente)

🔄 Métodos de verificación (L2-L5)  
🔄 Integraciones KYC  
🔄 Upgrade de certificados legacy  
🔄 UI de selección de niveles  

### 12.3 Próxima Acción

**Archivo a modificar:** `supabase/functions/process-signature/index.ts`

**Cambio mínimo viable:**
```typescript
// Reemplazar hardcoded 'IAL-1' por determinación dinámica
const identityAssurance = {
  level: determineIdentityLevel(signer),
  provider: 'ecosign',
  method: signer.verification_method || 'email_magic_link',
  timestamp: signedAt,
  signals: buildSignals(signer)
}
```

**NO cambiar:**
- Schema de DB
- Estructura de eventos
- API externa

---

**La identidad no es un feature. Es una narrativa probatoria.**

EcoSign no vende identidad mágica.  
Vende verdad verificable.

Y eso, en un juicio, vale más que una promesa de marketing.

---

**Firmado:** System Architecture  
**Revisión:** Tech Lead + Legal Counsel  
**Estado:** CERRADO — v2.0 — 2026-01-07
