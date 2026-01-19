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
10. **`CONTRATO_ECO_ECOX.md`** — Diferenciacion ECO vs ECOX
11. **`CONTRATO_LIFECYCLE_ECO_ECOX.md`** — Lifecycle ECO/ECOX (snapshots)
12. **`ECO_ECOX_MIN_SCHEMA.md`** — Esquema minimo ECO/ECOX
13. **`AUTORIDAD_DEL_SISTEMA.md`** — Autoridad canónica (write-path)

### Nivel 4: Flujos y Experiencia
14. **`FLOW_MODES_CONTRACT.md`** — Modos de firma
15. **`IDENTITY_OTP_DECRYPTION_CONTRACT.md`** — Pre-acceso + OTP + decrypt
16. **`IMPACTO_TECNICO_MAPA.md`** — Mapa de impacto técnico
17. **`CONTRATO_AUTORIDAD_EJECUTOR.md`** — Autoridad unica del executor
18. **`CONTRATO_MAPEO_EJECUTOR.md`** — Mapeo CTA -> Intent -> Job
19. **`LISTA_IMPLEMENTACION_AUTORIDAD_EJECUTOR.md`** — Checklist minima de autoridad

### Nivel 5: Organización y Contexto
20. **`OPERACIONES_CONTRACT.md`** ⭐ — Carpetas lógicas y operaciones
21. **`DRAFT_OPERATION_RULES.md`** ⭐ — Borradores operativos (sin validez legal)
22. **`LEGAL_CENTER_LAYOUT_CONTRACT.md`** — Layout del Centro Legal
23. **`LEGAL_CENTER_STAGE_CONTRACT.md`** — Etapas del Centro Legal
24. **`WORKFLOW_STATUS_SEMANTICS.md`** — Estados semánticos (esperando acción)
25. **`OPERATIONS_RESPONSIBILITY.md`** — Responsable por operación
26. **`EVIDENCE_MOMENT_CONTRACT.md`** — Evidencia del momento (UI humana)
27. **`POST_SIGNATURE_IMMUTABILITY.md`** — Inmutabilidad post-firma (UI)
28. **`WORKFLOW_CLOSURE_UX.md`** — Señal de cierre
29. **`NOTIFICATION_POLICY.md`** — Política anti-spam
30. **`CANONICAL_EVENTS_LIST.md`** — Lista mínima de eventos
31. **`EVENTS_VS_NOTIFICATIONS.md`** — Separación evento/notificación
32. **`DOCUMENTS_OPERATIONS_SCOPE.md`** — Frontera Documents vs Centro Legal

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
- `CONTRATO_ECO_ECOX.md` — Diferenciacion ECO vs ECOX
- `CONTRATO_LIFECYCLE_ECO_ECOX.md` — Lifecycle ECO/ECOX
- `ECO_ECOX_MIN_SCHEMA.md` — Schema minimo ECO/ECOX
- `CONTRATO_AUTORIDAD_EJECUTOR.md` — Autoridad de flujo
- `CONTRATO_MAPEO_EJECUTOR.md` — Mapeo de jobs
- `LISTA_IMPLEMENTACION_AUTORIDAD_EJECUTOR.md` — Checklist ejecutor

### Para Frontend/UX
- `PROTECTION_LEVEL_RULES.md` — Copy de protección
- `IDENTITY_LEVELS_SUMMARY.md` — Copy de identidad
- `FLOW_MODES_CONTRACT.md` — UX de firma
- `IDENTITY_OTP_DECRYPTION_CONTRACT.md` — Pre-acceso + OTP
- `WITNESS_PDF_CONTRACT.md` — Generación PDFs
- `OPERACIONES_CONTRACT.md` — UX de operaciones
- `DRAFT_OPERATION_RULES.md` — Borradores operativos
- `LEGAL_CENTER_LAYOUT_CONTRACT.md` — Layout Centro Legal
- `LEGAL_CENTER_STAGE_CONTRACT.md` — Stages Centro Legal
- `WORKFLOW_STATUS_SEMANTICS.md` — Estados semánticos
- `WORKFLOW_CLOSURE_UX.md` — Cierre de flujos
- `DOCUMENTS_OPERATIONS_SCOPE.md` — Frontera UX

### Para Legal/Compliance
- `verdad-canonica.md` — Posición legal base
- `IDENTITY_ASSURANCE_RULES.md` — Declaración de identidad
- `ECO_FORMAT_CONTRACT.md` — Estructura de certificados
- `EVIDENCE_MOMENT_CONTRACT.md` — Evidencia del momento
- `POST_SIGNATURE_IMMUTABILITY.md` — Inmutabilidad post-firma
- `CANONICAL_EVENTS_LIST.md` — Eventos mínimos
- `IDENTITY_OTP_DECRYPTION_CONTRACT.md` — OTP + acceso consciente

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

**Última actualización:** 2026-01-12
**Contratos cerrados:** 25 de 25
**Próxima revisión:** Post-implementación Centro Legal + Workflows P0 (Q1 2026)
