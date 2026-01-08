# 📜 Contratos Canónicos — EcoSign

**Referencia canónica:** `verdad-canonica.md` (Constitución)  
**Versión:** v1.0  
**Normas:** MUST, SHOULD, MAY (RFC 2119)

---

## 🏛️ Jerarquía de Contratos

### Nivel 0: Constitución
1. **`verdad-canonica.md`** — Verdad matemática, no legal

### Nivel 1: Entidad y Ledger
2. **`DOCUMENT_ENTITY_CONTRACT.md`** — Entidad documental operativa
3. **`HASH_CHAIN_RULES.md`** — Cadena de hashes y witness_hash

### Nivel 2: Eventos Probatorios
4. **`TSA_EVENT_RULES.md`** — Timestamping (RFC 3161)
5. **`ANCHOR_EVENT_RULES.md`** — Blockchain anchoring
6. **`IDENTITY_ASSURANCE_RULES.md`** ⭐ — Niveles de identidad (L0-L5)

### Nivel 3: Protección y Certificación
7. **`PROTECTION_LEVEL_RULES.md`** — Derivación de niveles
8. **`ECO_FORMAT_CONTRACT.md`** — Formato de verificación
9. **`WITNESS_PDF_CONTRACT.md`** — Testigo visual PDF

### Nivel 4: Flujos y Experiencia
10. **`FLOW_MODES_CONTRACT.md`** — Modos de firma
11. **`IMPACTO_TECNICO_MAPA.md`** — Mapa de impacto técnico

### Nivel 5: Organización y Contexto
12. **`OPERACIONES_CONTRACT.md`** ⭐ — Carpetas lógicas y operaciones
13. **`DRAFT_OPERATION_RULES.md`** ⭐ — Borradores operativos (sin validez legal)
14. **`LEGAL_CENTER_LAYOUT_CONTRACT.md`** — Layout del Centro Legal
15. **`LEGAL_CENTER_STAGE_CONTRACT.md`** — Etapas del Centro Legal

---

## 📋 Resúmenes Ejecutivos

### 🔐 Identidad
- **`IDENTITY_LEVELS_SUMMARY.md`** ⚡ — Referencia rápida 1 minuto (L0-L5)

---

## 🎯 Documentos por Área

### Para Backend
- `DOCUMENT_ENTITY_CONTRACT.md` — Schema canónico
- `HASH_CHAIN_RULES.md` — Cálculo de hashes
- `TSA_EVENT_RULES.md` — Integración TSA
- `ANCHOR_EVENT_RULES.md` — Integración blockchain
- `IDENTITY_ASSURANCE_RULES.md` — Lógica de niveles

### Para Frontend/UX
- `PROTECTION_LEVEL_RULES.md` — Copy de protección
- `IDENTITY_LEVELS_SUMMARY.md` — Copy de identidad
- `FLOW_MODES_CONTRACT.md` — UX de firma
- `WITNESS_PDF_CONTRACT.md` — Generación PDFs
- `OPERACIONES_CONTRACT.md` — UX de operaciones
- `DRAFT_OPERATION_RULES.md` — Borradores operativos
- `LEGAL_CENTER_LAYOUT_CONTRACT.md` — Layout Centro Legal
- `LEGAL_CENTER_STAGE_CONTRACT.md` — Stages Centro Legal

### Para Legal/Compliance
- `verdad-canonica.md` — Posición legal base
- `IDENTITY_ASSURANCE_RULES.md` — Declaración de identidad
- `ECO_FORMAT_CONTRACT.md` — Estructura de certificados

### Para Producto/PM
- `IDENTITY_LEVELS_SUMMARY.md` — Casos de uso
- `PROTECTION_LEVEL_RULES.md` — Pricing/features
- `IMPACTO_TECNICO_MAPA.md` — Dependencias

---

## ⭐ Cambios Recientes (2026-01-09)

### NUEVO: Draft Operations (Borradores Operativos)
- **`DRAFT_OPERATION_RULES.md` v1.0** — CONTRATO CERRADO
- **Decisión:** Drafts son operativos, NO probatorios
- **Regla:** El draft no es evidencia débil, es intención no consumada
- **Separación:** Plano operativo vs plano probatorio
- **Estados:** Persistencia crash-safe sin validez legal

### NUEVO: Operaciones (Carpetas Lógicas)
- **`OPERACIONES_CONTRACT.md` v1.0** — CONTRATO CERRADO
- **Decisión:** Operaciones como carpetas, no workflows
- **Regla:** Nada se borra, solo se organiza
- **Separación:** Documents (qué existe) vs Operaciones (qué pasó)
- **Estados:** draft / active / closed / archived

### PREVIO: Identity Assurance L0-L5 (2026-01-07)
- **`IDENTITY_ASSURANCE_RULES.md` v2.0** — CONTRATO CERRADO
- **`IDENTITY_LEVELS_SUMMARY.md`** — Referencia rápida
- **Decisión:** Identidad como continuo (L0-L5), no binario
- **Regla:** Nunca bloquea por default, siempre append-only
- **Separación:** Identidad ≠ Protección (dimensiones independientes)

---

## 📖 Cómo Usar Este Directorio

1. **Lectura obligatoria:** `verdad-canonica.md` primero
2. **Por rol:** Ver sección "Documentos por Área"
3. **Referencia rápida:** `IDENTITY_LEVELS_SUMMARY.md`
4. **Implementación:** Ver `/docs/IDENTITY_LEVELS_IMPLEMENTATION.md`

---

## 🚨 Reglas de Modificación

- ✅ Estos documentos son **append-only** (no se borran secciones)
- ✅ Cambios requieren consenso de Tech Lead + Legal
- ✅ Versionado semántico (v1.0, v1.1, v2.0)
- ❌ NO cambiar contratos cerrados sin issue formal

---

**Última actualización:** 2026-01-09
**Contratos cerrados:** 15 de 15
**Próxima revisión:** Post-implementación Operaciones + Drafts P0 (Q1 2026)
