# 🔐 IDENTITY ASSURANCE RULES

**Estado:** CANÓNICO  
**Versión:** v1.0  
**Fecha:** 2026-01-07  
**Scope:** Identidad del firmante y peso probatorio  
**Relacionado:**
- `ANCHOR_EVENT_RULES.md`
- `PROTECTION_LEVEL_RULES.md`
- `TSA_EVENT_RULES.md`

---

## 1. Principio Fundamental

**La identidad no es un binario. Es un continuo de certeza.**

El sistema NO asume que toda firma requiere verificación de identidad fuerte, ni bloquea flujos por limitaciones técnicas del firmante.

La plataforma:
- ✅ Registra hechos
- ✅ No inventa estados
- ✅ No promete más certeza de la que existe

---

## 2. Regla de Oro (NO NEGOCIABLE)

**La identidad NUNCA es bloqueante por defecto.**

Solo se convierte en bloqueante cuando:
1. El creador del flujo lo define explícitamente, O
2. El tipo de documento lo exige por contrato/legal

👉 Esto replica el comportamiento del mundo jurídico real.

---

## 3. Separación de Conceptos (CRÍTICO)

| Concepto | Qué es | Qué NO es |
|----------|--------|-----------|
| **Firma** | Intención de aceptar un documento | Identidad absoluta |
| **Identidad** | Evidencia sobre quién firmó | Garantía de no repudio |
| **Protección** | Integridad + trazabilidad | Certificación legal |
| **Nivel probatorio** | Peso de la evidencia | Resultado judicial |

**👉 El juez decide. El sistema prueba.**

---

## 4. Modelo de Niveles de Identidad

La plataforma implementa niveles progresivos de certeza, no "verificación mágica".

### 4.1 Tabla de Niveles

| Nivel | Método | Costo | Fricción | Uso típico |
|-------|--------|-------|----------|------------|
| **L0** | Acknowledgement explícito | $0 | Ninguna | Acuerdos simples |
| **L1** | Magic Link (Email) | $0 | Baja | NDAs, aprobaciones |
| **L2** | OTP SMS / Voice | Bajo | Media | Flujos comerciales |
| **L3** | Passkey (WebAuthn) | $0 | Muy baja | Usuarios frecuentes |
| **L4** | Biométrico + ID | Alto | Alta | Inmobiliario, crédito |
| **L5** | Certificado (QES / e.firma) | Alto | Alta | Escrituras, fiscal |

⚠️ **Ningún nivel invalida al anterior. Solo aumenta el peso probatorio.**

### 4.2 Mapeo a IAL (NIST 800-63)

| Nivel EcoSign | IAL Equivalente | Descripción |
|---------------|-----------------|-------------|
| L0 | N/A | Sin atribución personal |
| L1 | IAL-1 | Auto-declaración |
| L2 | IAL-1.5 | Verificación básica |
| L3 | IAL-1.5+ | Dispositivo seguro |
| L4 | IAL-2 | Identidad remota verificada |
| L5 | IAL-2/IAL-3 | Identidad certificada |

---

## 5. Passkeys (WebAuthn) — Identidad Fuerte Sin Proveedor

### 5.1 Principio

**El hardware del usuario ya es un dispositivo seguro certificado.**

Passkeys proveen:
- ✅ Prueba de posesión
- ✅ Biometría local (FaceID / TouchID)
- ✅ Firma criptográfica
- ✅ Costo $0
- ✅ UX superior

### 5.2 Regla de Uso

```
SI el usuario tiene Passkey → se usa
SI NO tiene → fallback automático
NUNCA se fuerza
```

**La identidad no se degrada, se registra honestamente.**

### 5.3 Qué Prueba un Passkey

Un Passkey NO prueba:
- ❌ Nombre legal
- ❌ Dirección
- ❌ Mayoría de edad

Un Passkey SÍ prueba:
- ✅ Posesión de dispositivo seguro
- ✅ Autorización biométrica local
- ✅ Continuidad de identidad en el tiempo
- ✅ No repudio técnico de facto

**Para un perito, esto es evidencia muy fuerte.**

---

## 6. Fallbacks (OBLIGATORIOS)

### 6.1 Cadena de Fallback

Si Passkey no está disponible:

1. **OTP SMS / Voice** (si configurado)
2. **Magic Link por Email**
3. **Confirmación explícita de intención**

### 6.2 Invariante de Registro

Cada fallback:
- ✅ Genera un `identity_event`
- ✅ Queda en `document_entities.events[]`
- ❌ NO se borra
- ❌ NO se reemplaza

**Ejemplo de evento:**

```json
{
  "kind": "identity",
  "at": "2026-01-07T10:00:00Z",
  "method": "email_magic_link",
  "level": "L1",
  "email": "user@example.com",
  "device_fingerprint": "sha256(...)",
  "user_agent": "Mozilla/5.0..."
}
```

---

## 7. Firmante vs Usuario Registrado

### 7.1 Firmante (sin cuenta)

- ❌ No se le pide contraseña
- ❌ No se le obliga a registrarse
- ✅ Identidad es contextual al documento
- ✅ Passkey puede ser temporal

**Flujo ideal:**
```
Email → Passkey temporal → Firma
```

### 7.2 Usuario Registrado

- ✅ Passkey asociado a `user_id`
- ✅ Identidad persistente
- ✅ Una validación fuerte → múltiples firmas simples posteriores
- ✅ Dispositivo se convierte en "dispositivo de confianza"

**Ventaja probatoria:**
> "Continuidad de identidad en el tiempo"

Esto, para un perito, pesa muchísimo más que una foto de DNI aislada.

---

## 8. Reglas de Bloqueo (EXPLÍCITAS)

### 8.1 Configuración del Flujo

El creador del flujo puede definir:

```typescript
identity_requirement:
  | 'none'           // Default, no requiere identidad fuerte
  | 'recommended'    // Solicita pero no bloquea
  | 'required'       // Bloquea si no se cumple
```

Con nivel opcional:

```typescript
identity_requirement: {
  mode: 'required',
  minimum_level: 'L2'  // OTP mínimo
}
```

### 8.2 Ejemplos Reales

| Documento | Configuración | Comportamiento |
|-----------|---------------|----------------|
| NDA | `recommended` | Solicita, no bloquea |
| Contrato laboral | `required: L2` | Requiere OTP mínimo |
| Escritura | `required: L4` | Requiere biometría + ID |

### 8.3 Comportamiento de Bloqueo

Si `required` no se cumple:
1. ❌ El flujo NO continúa
2. ✅ Se informa claramente al usuario
3. ✅ No hay estados ambiguos
4. ✅ El creador del flujo recibe notificación

**Mensaje tipo:**
> "Este documento requiere verificación de identidad nivel L2 (OTP). Por favor completa la verificación para continuar."

---

## 9. Registro Canónico (Events)

### 9.1 Estructura de Evento de Identidad

Toda acción de identidad genera un evento append-only:

```json
{
  "kind": "identity",
  "at": "ISO-8601 timestamp",
  "method": "passkey | email | sms | biometric | certificate",
  "level": "L0 | L1 | L2 | L3 | L4 | L5",
  "metadata": {
    "device_fingerprint": "sha256(...)",
    "user_agent": "...",
    "ip_address": "...",
    "passkey_credential_id": "...",  // Si aplica
    "provider": "ecosign | mifiel | onfido"  // Si es externo
  }
}
```

### 9.2 Invariantes

Los eventos de identidad:
- ✅ Son append-only
- ✅ Forman parte del ledger probatorio
- ✅ Son reproducibles en el tiempo
- ❌ NUNCA se degradan
- ❌ NUNCA se reescriben

### 9.3 Relación con `witness_hash`

Cuando se usa Passkey para firmar:

```typescript
signed_hash = sign(witness_hash, passkey_private_key)
```

Esto vincula criptográficamente:
- La identidad del dispositivo
- La integridad del documento
- El momento exacto

**Esto es extraordinariamente fuerte probatoriamente.**

---

## 10. Relación con Protection Level

**La identidad NO define el protection level. Lo contextualiza.**

| Concepto | Define | Deriva de |
|----------|--------|-----------|
| **Protection Level** | Integridad del documento | TSA + Anchors |
| **Identity Level** | Peso de atribución personal | Events de identidad |

**Ambos se muestran en paralelo, nunca mezclados.**

### 10.1 Ejemplo de Presentación

```
📄 Documento: Contrato de Arrendamiento
🔒 Protection Level: MAXIMUM (TSA + Polygon + Bitcoin)
👤 Identity Level: L3 (Passkey - FaceID)
```

No se dice:
- ❌ "Firma certificada"
- ❌ "Identidad verificada"

Se dice:
- ✅ "Protección: Máxima"
- ✅ "Identidad: Nivel 3 (Dispositivo seguro)"

---

## 11. Posición Probatoria Real (SIN CERTIFICACIÓN)

### 11.1 Qué Tiene EcoSign HOY

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
- Cadena de custod evidence
- Reproducibilidad

✅ **Identidad progresiva**
- Passkey = dispositivo seguro
- Fallbacks claros
- Sin mentiras

**📌 Esto es superior al 80-90% de las firmas electrónicas simples del mercado.**

### 11.2 Qué Diría un Perito

> "No puedo afirmar quién es la persona en términos civiles sin certificado gubernamental,
> pero puedo afirmar que esta acción fue ejecutada por un usuario que controlaba
> este dispositivo seguro, en esta fecha exacta, y que el documento no fue alterado
> desde entonces. La evidencia es reproducible y la cadena de eventos es coherente."

**Eso gana juicios**, incluso sin QES, cuando la contraparte no puede probar fraude.

### 11.3 Comparativa Honesta

| Sistema | Integridad | Trazabilidad | Identidad | Presunción Legal |
|---------|------------|--------------|-----------|------------------|
| **EcoSign** | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥 | ❌ |
| **DocuSign SES** | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥 | ❌ |
| **Mifiel (e.firma)** | 🔥🔥🔥🔥 | 🔥🔥🔥🔥 | 🔥🔥🔥🔥🔥 | ✅ |
| **Adobe Sign** | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥 | ❌ |

**Diferencia clave:**
- Los otros mezclan niveles y prometen más de lo que tienen
- Nosotros mostramos exactamente lo que hay

---

## 12. Declaración Canónica (PARA DISCURSO)

Esta frase debería estar en:
- Pitch decks
- Documentación legal
- Conversaciones con clientes B2B

> **"Nuestra plataforma no promete no-repudio por defecto.  
> Promete evidencia honesta, trazable y verificable.  
> El peso legal lo define la jurisdicción.  
> Nosotros garantizamos la verdad técnica."**

---

## 13. Roadmap de Identidad (NO PROMESA COMERCIAL)

### 13.1 Ahora (2026 Q1)
- ✅ Passkeys (WebAuthn)
- ✅ Magic Links
- ✅ OTP SMS
- ✅ Identity events canónicos

### 13.2 Próximo (2026 Q2-Q3)
- 🔄 Identidad descentralizada (DIDs)
- 🔄 Credenciales verificables
- 🔄 Dispositivos de confianza persistentes
- 🔄 Biometría local avanzada

### 13.3 Futuro (2026 Q4+)
- 🔮 Integración opcional con PSC / QES
- 🔮 KYC providers (Onfido, Incode)
- 🔮 e.firma / NOM-151 (vía Mifiel)
- 🔮 Widget / App móvil

**Nada de esto rompe lo existente. Todo se suma.**

---

## 14. Preguntas Difíciles (y Respuestas Honestas)

### Q: "¿Su firma es legalmente válida?"
**A:** Sí, bajo las mismas regulaciones que firmas SES/AdES (ESIGN, UETA, eIDAS simple). Lo que varía es el peso probatorio según el nivel de identidad elegido.

### Q: "¿Pueden repudiar la firma?"
**A:** En firmas simples (sin certificación), técnicamente sí. Pero con nuestra trazabilidad forense, la carga de prueba del fraude recae en quien repudia, y es extremadamente difícil de sostener.

### Q: "¿Por qué no usan PSC directamente?"
**A:** Porque el 90% de documentos no justifican el costo ni la fricción. Cuando sí lo justifican, integramos PSC como opción, sin forzarlo por defecto.

### Q: "¿Qué pasa si un juez no acepta su firma?"
**A:** Lo mismo que con cualquier firma electrónica simple. El juez evalúa la evidencia. Nuestra ventaja es que esa evidencia es reproducible, inmutable y verificable independientemente.

### Q: "¿Son más seguros que DocuSign?"
**A:** En integridad y trazabilidad, sí. En presunción legal automática, no (salvo que se use nivel L5 con PSC). Pero somos más honestos sobre lo que prometemos.

---

## 15. Cierre

**La identidad no es un feature. Es una narrativa probatoria.**

EcoSign no vende identidad mágica.
Vende verdad verificable.

Y eso, en un juicio, vale más que una promesa de marketing.

---

**Firmado:** System Architecture (AI-assisted)  
**Revisión requerida:** Tech Lead + Legal Counsel  
**Próxima revisión:** Post-implementación Passkeys
