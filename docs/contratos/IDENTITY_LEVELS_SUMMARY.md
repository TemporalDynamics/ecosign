# 🔐 IDENTITY LEVELS — RESUMEN EJECUTIVO

**Estado:** REFERENCIA RÁPIDA  
**Fecha:** 2026-01-07  
**Contrato completo:** `IDENTITY_ASSURANCE_RULES.md`

---

## Niveles en 1 Minuto

| Nivel | Método | Qué prueba | Cuándo usarlo |
|-------|--------|------------|---------------|
| **L0** | Click | Intención consciente | Aceptar términos, confirmar lectura |
| **L1** | Email | Acceso a buzón | NDAs, aprobaciones internas, flujos básicos |
| **L2** | SMS OTP | Posesión de teléfono | Contratos comerciales, B2B estándar |
| **L3** | Passkey | Dispositivo seguro + biometría local | Usuarios frecuentes, alta UX |
| **L4** | KYC | Identidad civil verificada | Crédito, inmobiliario, legal alto valor |
| **L5** | QES/PSC | Certificado gubernamental | Escrituras, fiscal, gobierno |

---

## Reglas Oro (4)

1. **Identidad = Continuo** (no binario "verificado/no verificado")
2. **Nunca bloquea por default** (solo si el creador del flujo lo exige)
3. **Siempre evento append-only** (no se actualiza, se agrega)
4. **Identidad ≠ Protección** (son dimensiones separadas)

---

## Estado Implementación

| Nivel | Estado | Fecha estimada |
|-------|--------|----------------|
| L0 | ✅ LIVE | En producción |
| L1 | ✅ LIVE | En producción |
| L2 | 🔄 WIP | 2026 Q1 |
| L3 | 🔄 WIP | 2026 Q1 |
| L4 | 🔮 ROADMAP | 2026 Q3+ |
| L5 | 🔮 ROADMAP | 2026 Q4+ |

---

## Copy para UI/Marketing

### ❌ NO decir:
- "Firma certificada"
- "Identidad verificada"
- "Documento seguro nivel L1"
- "Protección L1"

### ✅ SÍ decir:
- "Identidad verificada mediante email" (L1)
- "Verificación por SMS" (L2)
- "Dispositivo seguro con biometría" (L3)
- "Identidad civil certificada" (L4/L5)

**Siempre separar:**
- 🔒 Protección de integridad: MAXIMUM / STANDARD / BASIC
- 👤 Nivel de identidad: L0 / L1 / L2 / L3 / L4 / L5

---

## Para el Equipo Legal

**Nuestra posición:**
> "No prometemos no-repudio por defecto.  
> Prometemos evidencia honesta, trazable y verificable.  
> El peso legal lo define la jurisdicción.  
> Nosotros garantizamos la verdad técnica."

**Comparativa con competencia:**
- Integridad: 🔥🔥🔥🔥🔥 (mejor que todos)
- Trazabilidad: 🔥🔥🔥🔥🔥 (mejor que todos)
- Identidad: 🔥🔥🔥🔥 (sin PSC: al nivel de DocuSign/Adobe)
- Presunción legal: ❌ (igual que SES estándar, salvo L5)

---

## Para el Equipo de Producto

**Prioridad 1 (2026 Q1):**
- Implementar determinación dinámica de niveles (L0/L1)
- Poblar `signals` array correctamente
- Registrar `method` en eventos

**Prioridad 2 (2026 Q2):**
- L2: OTP SMS
- L3: Passkeys (WebAuthn)
- UI de selección de nivel

**Prioridad 3 (2026 Q3+):**
- L4: Integración KYC (Onfido/Incode)
- L5: Integración PSC/QES (Mifiel)

---

## Para Ventas/BD

**Cuando pregunten por "firma certificada":**
1. Aclarar qué significa (PSC/QES = L5)
2. Explicar que el 90% de casos NO lo necesitan
3. Mostrar que L1-L3 + nuestra trazabilidad es superior a competencia SES
4. Ofrecer L5 como opción para casos especiales

**Casos de uso por nivel:**
- **L0/L1:** Startups, flujos internos, NDAs, aprobaciones
- **L2:** B2B estándar, contratos comerciales
- **L3:** SaaS recurrente, usuarios frecuentes
- **L4:** Legal, inmobiliario, crédito
- **L5:** Gobierno, fiscal, escrituras

---

**Ver contrato completo:** `IDENTITY_ASSURANCE_RULES.md`  
**Última actualización:** 2026-01-07
