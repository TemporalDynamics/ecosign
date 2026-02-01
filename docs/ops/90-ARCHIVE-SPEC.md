# 📁 Fase 2 — Snapshot Histórico: Especificación de Archivado

**Fecha:** 2026-01-31  
**Tipo:** Especificación de ejecución  
**Estado:** Listo para implementar  
**Basado en:** Axiomas de Autoridad (README.md)

---

## 🎯 Objetivo

Consolidar todo documento obsoleto, duplicado o huérfano en un único snapshot con trazabilidad completa, sin perder información histórica ni romper semántica canónica.

**Principio rector:** *Autoridad intacta, ruido encapsulado.*

---

## 📁 Estructura Final

```
docs/
├── README.md                          [CANONICAL - Ya existe]
├── INDEX.md                           [ACTIVE - Mantener]
├── contratos/                         [CANONICAL - NO TOCAR]
│   ├── README.md
│   ├── verdad-canonica.md
│   └── ... (N0-N5)
│
├── architecture/                      [ACTIVE - Mantener]
├── security/                          [ACTIVE - Mantener]
├── ops/                               [ACTIVE - Mantener]
├── planning/                          [ACTIVE - Mantener]
├── signatures/                        [ACTIVE - Mantener]
├── tsa/                               [ACTIVE - Mantener]
├── anchoring/                         [ACTIVE - Mantener]
├── developer/                         [ACTIVE - Mantener]
├── ux/                                [ACTIVE - Mantener]
├── design/                            [ACTIVE - Mantener]
├── technical/                         [ACTIVE - Revisar caso por caso]
├── audits/                            [ACTIVE - Mantener]
├── reports/                           [ACTIVE - Mantener]
├── e2e/                               [ACTIVE - Mantener]
├── communication/                     [ACTIVE - Mantener]
├── decisions/                         [ACTIVE - Mantener]
├── centro-legal/                      [ACTIVE - Mantener]
├── happy-paths/                       [ACTIVE - Mantener]
├── implementation/                    [ACTIVE - Revisar]
├── canonical/                         [ACTIVE - Revisar]
├── log/                               [INFORMAL - Mantener por ahora]
│
└── 90-archive/                        [SNAPSHOT - Nuevo]
    └── 2026-01-31-snapshot/
        ├── README.md                  [Este snapshot]
        ├── INDEX-LEGACY.md            [Índice de lo archivado]
        ├── snapshot-manifest.json     [Inventario machine-readable]
        │
        ├── 00-deprecated-pre-2026/    [Todo lo de docs/deprecate/]
        │   ├── bugfixes/
        │   ├── implementation-logs/
        │   ├── misc/
        │   ├── roadmaps/
        │   ├── status-reports/
        │   ├── tests/
        │   └── archive/               [El archive anidado que ya existía]
        │
        ├── 01-archived-standalone/    [Todo lo de docs/archive/]
        │   └── (45 archivos sueltos)
        │
        └── 02-orphaned-root/          [Archivos huérfanos de docs/ raíz]
            └── (30 archivos)
```

---

## 📏 Reglas de Movimiento (Derivadas de Axiomas)

### REGLA 1: Axioma 2 (N0–N5 son append-only)
**Aplicación:** Nada dentro de `contratos/` se mueve. Punto.

**Verificación:**
- [ ] No tocar `contratos/verdad-canonica.md`
- [ ] No tocar `contratos/*CONTRACT.md`
- [ ] No tocar `contratos/*RULES.md`
- [ ] No tocar `contratos/README.md`

### REGLA 2: Axioma 3 (Exceso sin fricción es daño)
**Aplicación:** Todo en `deprecate/` es ruido histórico sin autoridad actual.

**Acción:** Mover TODO `docs/deprecate/` → `90-archive/2026-01-31-snapshot/00-deprecated-pre-2026/`

**Excepción:** Si un documento en `deprecate/` es referenciado activamente por código en producción, evaluar caso por caso. (Probablemente ninguno, pero verificar).

### REGLA 3: Axioma 5 (Todo documento tiene un dueño)
**Aplicación:** Los 30 archivos sueltos en raíz de `docs/` son huérfanos.

**Categorización:**
- **Tipo A - Snapshot histórico:** Resúmenes de sesión, estados del sistema, hallazgos antiguos → `90-archive/2026-01-31-snapshot/02-orphaned-root/`
- **Tipo B - Posiblemente canónico:** `ANALISIS_INTEGRAL_ECOSIGN.md`, `CONTRACT_INVENTORY.md` → Revisar caso por caso
- **Tipo C - Bug conceptual:** `README.md` (el de Supabase) → Archivar sin ambigüedad

### REGLA 4: Duplicados implícitos
**Aplicación:** `docs/archive/` contiene 45 archivos que ya fueron explícitamente archivados.

**Acción:** Mover TODO `docs/archive/` → `90-archive/2026-01-31-snapshot/01-archived-standalone/`

**Nota:** Hay un `deprecate/archive/` anidado. Eso va dentro de `00-deprecated-pre-2026/archive/` (archivo dentro de archivo, preservar jerarquía exacta).

### REGLA 5: Sin destrucción
**Aplicación:** Nada se borra. Todo se mueve.

**Verificación:**
- [ ] Preservar timestamps de archivos
- [ ] Preservar contenido exacto (no editar)
- [ ] Preservar estructura de subdirectorios

---

## 📋 Inventario Pre-Movimiento

### A. docs/deprecate/ (124 archivos)
```
deprecate/
├── archive/                    → 00-deprecated-pre-2026/archive/
│   └── (archivos antiguos)
├── bugfixes/                   → 00-deprecated-pre-2026/bugfixes/
│   ├── FIX_CANVAS_ANCHORING.md
│   ├── FIX_CANVAS_ANCHORING_OLD.md
│   ├── FIX_MODAL_HEIGHT.md
│   ├── BLOCKCHAIN_ANCHORING_FIX.md
│   └── (10 más...)
├── implementation-logs/        → 00-deprecated-pre-2026/implementation-logs/
│   ├── RESUMEN_FINAL_CAMBIOS.md
│   ├── RESUMEN_IMPLEMENTACION_COMPLETA.md
│   ├── AUDITORIA_MANDAMIENTOS.md
│   └── (más...)
├── misc/                       → 00-deprecated-pre-2026/misc/
├── roadmaps/                   → 00-deprecated-pre-2026/roadmaps/
├── status-reports/             → 00-deprecated-pre-2026/status-reports/
└── tests/                      → 00-deprecated-pre-2026/tests/
```

### B. docs/archive/ (45 archivos)
```
archive/
├── AB_TESTING_IMPLEMENTATION.md          → 01-archived-standalone/
├── ANALISIS-VALOR-MERCADO-ECO.md         → 01-archived-standalone/
├── AUDIT-COMPLETO-INTEGRACIONES.md       → 01-archived-standalone/
├── CERTIFICACION-BASICA-FUNCIONANDO.md   → 01-archived-standalone/
├── CHANGELOG.md                          → 01-archived-standalone/
├── CONTRIBUTING.md                       → 01-archived-standalone/ (duplicado)
├── DEPLOY_AHORA.md                       → 01-archived-standalone/
├── ECOX_TSR_VERIFICATION.md              → 01-archived-standalone/
├── FIX-LOGIN-COMPLETO.md                 → 01-archived-standalone/
├── IMPLEMENTATION_GUIDE.md               → 01-archived-standalone/
├── LOCAL-DEV.md                          → 01-archived-standalone/
├── MVP-README.md                         → 01-archived-standalone/
├── QUICKSTART.md                         → 01-archived-standalone/
├── ROADMAP-IMPLEMENTACION-ECO-PACKER.md  → 01-archived-standalone/
├── SECURITY_AUDIT.md                     → 01-archived-standalone/
├── SYSTEM_STATE_2026-01-06.md            → 01-archived-standalone/
├── VERIFYSIGN_ARCHITECTURE.md            → 01-archived-standalone/
└── (28 más...)
```

### C. docs/ (raíz) - Archivos huérfanos (30 archivos)
**Mover a 90-archive/2026-01-31-snapshot/02-orphaned-root/:**
- `ALL_IN_ONE_APPENDIX.md`
- `ANALISIS_INTEGRAL_ECOSIGN.md` (¿canónico? revisar)
- `ANALISIS_PROYECTO_ECOSIGN.md`
- `authority-audit.md`
- `bitcoin_principles.md` (¿canónico? revisar)
- `CIERRE_HITO_H6.md`
- `como-lo-hacemos.md` (¿canónico? revisar)
- `CONTRACT_AUDIT_FOR_EXECUTOR.md` (¿canónico? revisar)
- `CONTRACT_INVENTORY.md` (¿canónico? revisar)
- `ESTADO_ACTUAL_SISTEMA_H6.md`
- `FIX_IMPLEMENTADO.md`
- `HALLAZGO_CLOUD_VS_LOCAL.md`
- `HALLAZGO_CORS_PRODUCCION.md`
- `inventario_canonico_2026-01-18.md`
- `MONITORING_DASHBOARD.md`
- `NOTA_ELIMINACION_CONFIG_INVALIDA.md`
- `NOTICE.md`
- `OPERATIONS_GUIDE.md`
- `PLAN_CUTOVER_PRODUCCION_H6.md`
- `PREGUNTAS_CRITICAS_VALIDACION.md`
- `README.md` (bug - Supabase CLI) → archivar claramente marcado
- `REPORTE_ANALISIS_FIRMA_GUESTS.md`
- `REPORT_SUPABASE_AUDIT_QUESTIONS.md`
- `RESOLUCION_FINAL.md`
- `ROADMAP_DEFINITIVO_INFALIBLE.md`
- `SOLUCION_BUG_FIRMA_GUESTS.md`
- `SYSTEM_SIGNALS_INVENTORY.md`
- `tablas.md`
- `TROUBLESHOOTING_FEATURE_FLAGS.md`
- `VALIDACION_STAGING_MIGRACION_AUTORIDAD.md`
- `VERIFICACION_FRONTEND_HEADERS.md`
- `WORKER_CLEANUP_PLAN.md`

**NOTA:** Hay ~32 archivos, no 30. Algunos pueden ser canónicos o semi-canónicos.

---

## ⚠️ Casos Especiales (Revisar Manualmente)

### Caso 1: `docs/tablas.md` (56KB)
- Parece ser un índice grande
- ¿Es un índice alternativo a INDEX.md?
- Si es duplicado funcional → Archivar
- Si tiene información única → Mantener/Refactorizar

### Caso 2: Documentos "ANALISIS_" y "REPORTE_"
- Son snapshot de pensamiento en momentos específicos
- Valor histórico alto, autoridad baja actual
- **Decisión:** Archivar todos

### Caso 3: `como-lo-hacemos.md` (28KB)
- Este es un documento grande que parece activo
- Título sugiere guía de implementación
- **Decisión:** Mantener en raíz o mover a `implementation/`

### Caso 4: `CONTRACT_INVENTORY.md` y `CONTRACT_AUDIT_FOR_EXECUTOR.md`
- Nombres sugieren relación con contratos canónicos
- **Decisión:** Evaluar si deben estar en `contratos/` o son análisis temporales
- Si son análisis → Archivar
- Si son complemento canónico → Mover a `contratos/` o mantener

---

## ✅ Checklist de Ejecución

### Pre-Movimiento
- [ ] 1. Backup completo de `/docs` (git commit previo)
- [ ] 2. Crear directorio `docs/90-archive/2026-01-31-snapshot/`
- [ ] 3. Verificar que `contratos/` NO está en lista de movimiento
- [ ] 4. Revisar casos especiales (tablas.md, como-lo-hacemos.md, etc.)

### Movimiento
- [ ] 5. Mover `docs/deprecate/` → `90-archive/2026-01-31-snapshot/00-deprecated-pre-2026/`
- [ ] 6. Mover `docs/archive/` → `90-archive/2026-01-31-snapshot/01-archived-standalone/`
- [ ] 7. Mover archivos huérfanos de raíz → `90-archive/2026-01-31-snapshot/02-orphaned-root/`
- [ ] 8. Preservar estructura interna de subdirectorios exacta

### Post-Movimiento
- [ ] 9. Crear `90-archive/2026-01-31-snapshot/README.md` (snapshot)
- [ ] 10. Crear `90-archive/2026-01-31-snapshot/INDEX-LEGACY.md`
- [ ] 11. Generar `snapshot-manifest.json` (inventario machine-readable)
- [ ] 12. Verificar que `docs/` raíz está limpia (solo README.md, INDEX.md, carpetas activas)
- [ ] 13. Commit con mensaje descriptivo: "docs: archive historical documentation to 90-archive/2026-01-31-snapshot"

### Verificación Final
- [ ] 14. Confirmar que `contratos/` está intacto
- [ ] 15. Confirmar que README.md canónico sigue funcionando
- [ ] 16. Confirmar que links en README.md no rotos
- [ ] 17. Test: Nuevo dev puede encontrar documentación relevante sin entrar a 90-archive/

---

## 📊 Métricas Post-Archivado (Esperadas)

| Métrica | Antes | Después | Reducción |
|---------|-------|---------|-----------|
| Archivos MD en docs/ | 487 | ~320 | -35% |
| Archivos en raíz docs/ | 32 | 2 (README + INDEX) | -94% |
| Carpetas en docs/ | 53 | ~35 | -35% |
| Documentos obsoletos visibles | 169 | 0 | -100% |
| Tiempo de onboarding estimado | 4-6h | 30-60min | -80% |

---

## 🚫 Qué NO Hacer

- ❌ NO borrar archivos (solo mover)
- ❌ NO editar contenido de archivos archivados
- ❌ NO mover nada de `contratos/`
- ❌ NO crear scripts automáticos de archivado (todavía)
- ❌ NO reorganizar carpetas activas (architecture/, security/, etc.)
- ❌ NO archivar `INDEX.md` o `README.md` (el nuevo)

---

## 🎯 Definición de "Hecho"

La Fase 2 estará completa cuando:

1. **90-archive/2026-01-31-snapshot/ existe** con README propio
2. **docs/deprecate/ está vacío o eliminado**
3. **docs/archive/ está vacío o eliminado**
4. **docs/ (raíz) solo tiene:**
   - README.md (canónico)
   - INDEX.md (navegable)
   - contratos/ (CANONICAL)
   - carpetas activas (architecture/, security/, ops/, etc.)
   - 90-archive/ (SNAPSHOT)
5. **Ningún documento canónico fue movido**
6. **Nada se borró permanentemente**

---

**Preparado para ejecución.**  
**Autoridad documental blindada.**  
**Ruido histórico encapsulado.**
