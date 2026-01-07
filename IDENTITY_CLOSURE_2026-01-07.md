# 🔐 Identity Assurance — Cierre 2026-01-07

**TL;DR:** Identidad cerrada como contrato L0-L5. Backend pendiente 1-2 días. NO bloquea sprints.

---

## ✅ CERRADO HOY

### Documentos Generados
1. **`docs/contratos/IDENTITY_ASSURANCE_RULES.md` v2.0** — Contrato canónico (INMUTABLE)
2. **`docs/contratos/IDENTITY_LEVELS_SUMMARY.md`** — Referencia rápida 1 min
3. **`docs/IDENTITY_LEVELS_IMPLEMENTATION.md`** — Plan técnico backend
4. **`decision_log2.0.md`** — Iteración documentada
5. **`docs/contratos/README.md`** — Índice actualizado

### Modelo L0-L5 (6 niveles)
- **L0:** Acknowledgement (click) — ✅ LIVE
- **L1:** Email Magic Link — ✅ LIVE
- **L2:** SMS OTP — 🔄 Q1 2026
- **L3:** Passkey (WebAuthn) — 🔄 Q1 2026
- **L4:** Biométrico + KYC — 🔮 Q3+ 2026
- **L5:** QES/PSC certificado — 🔮 Q4+ 2026

### 4 Reglas Canónicas (INMUTABLES)
1. **Identidad = continuo** (no binario)
2. **Nunca bloquea por default** (solo si se exige)
3. **Siempre append-only** (no se actualiza)
4. **Identidad ≠ Protección** (dimensiones separadas)

---

## 🔄 PENDIENTE (Próximo Sprint)

**Archivo:** `supabase/functions/process-signature/index.ts`

**Cambio mínimo:**
```typescript
// ANTES (hardcoded)
const identityAssurance = {
  level: 'IAL-1',
  provider: 'ecosign',
  method: null,
  timestamp: signedAt,
  signals: []
}

// DESPUÉS (dinámico)
const identityAssurance = {
  level: determineIdentityLevel(signer, verification),
  provider: 'ecosign',
  method: verification?.method || 'acknowledgement',
  timestamp: signedAt,
  signals: buildIdentitySignals(signer, verification)
}
```

**Esfuerzo:** 1-2 días  
**Bloqueantes:** Ninguno  
**Ver:** `docs/IDENTITY_LEVELS_IMPLEMENTATION.md`

---

## 🎯 Para Cada Rol

| Rol | Leer | Hacer |
|-----|------|-------|
| **Backend** | `IDENTITY_ASSURANCE_RULES.md` §8 | Implementar determinación dinámica |
| **Frontend** | `IDENTITY_LEVELS_SUMMARY.md` | Copy adaptativo por nivel |
| **Legal** | `IDENTITY_ASSURANCE_RULES.md` §10 | FAQs honestas |
| **PM/Sales** | `IDENTITY_LEVELS_SUMMARY.md` | Vender L1 honestamente |

---

## 🚨 Copy Prohibido

❌ "Firma certificada" (sin L5)  
❌ "Identidad verificada" (genérico)  
❌ "Documento seguro nivel L1" (mezcla conceptos)  

✅ "Identidad verificada mediante email" (L1)  
✅ "Protección de integridad: Máxima"  
✅ "Mejor trazabilidad que DocuSign SES"  

---

## 🔥 Quote Canon

> "La identidad no es un feature. Es una narrativa probatoria.  
> EcoSign no vende identidad mágica. Vende verdad verificable.  
> Y eso, en un juicio, vale más que una promesa de marketing."

---

## 📍 Próximas Acciones

**Sprint actual (Q1):**
- [ ] Implementar `determineIdentityLevel()` y `buildIdentitySignals()`
- [ ] Tests unitarios (3 casos mínimo)
- [ ] Deploy a staging → producción
- [ ] Validar certificados nuevos

**Sprint 2 (Q1):**
- [ ] L2: OTP SMS (Twilio/AWS SNS)
- [ ] L3: Passkeys (WebAuthn)
- [ ] UI de selección de nivel

**Futuro (Q2+):**
- [ ] L4: KYC (Onfido/Incode)
- [ ] L5: QES/PSC (Mifiel)
- [ ] DIDs y credenciales verificables

---

**Estado:** CERRADO ✅  
**Revisión:** Post-implementación Q1  
**Documentos:** `docs/contratos/` + `docs/IDENTITY_LEVELS_IMPLEMENTATION.md`
