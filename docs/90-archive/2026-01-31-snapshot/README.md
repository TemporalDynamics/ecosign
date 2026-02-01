# 📦 Snapshot Histórico — EcoSign Documentation

**Snapshot:** 2026-01-31  
**Contiene:** 169 documentos archivados  
**Tipo:** REFERENCE ONLY — No usar para implementaciones nuevas  
**Autoridad:** HISTORICAL — Source of truth está en `../README.md`

---

## ⚠️ ATENCIÓN: ¿Estás en el lugar correcto?

**Si estás leyendo esto, probablemente NO deberías estar acá.**

Este directorio contiene **ruido histórico**. Es valioso para:
- 🔍 Debugging de bugs antiguos
- 📚 Investigación de decisiones pasadas
- 📊 Análisis de evolución del sistema

**NO es valioso para:**
- ❌ Entender el sistema actual
- ❌ Implementar features nuevas
- ❌ Tomar decisiones de arquitectura

**¿Dónde sí deberías estar?**
- [../README.md](../README.md) — Entry point actual
- [../contratos/](../contratos/) — Verdad canónica
- [../INDEX.md](../INDEX.md) — Navegación completa

---

## 📁 Qué contiene este snapshot

Este snapshot encapsula **todo documento que no es source of truth actual**.

### Estructura interna

```
2026-01-31-snapshot/
├── 00-deprecated-pre-2026/        ← Todo de docs/deprecate/ (124 archivos)
│   ├── bugfixes/                   Fixes viejos de bugs resueltos
│   ├── implementation-logs/        Logs de implementaciones completadas
│   ├── misc/                       Documentos varios sin categoría
│   ├── roadmaps/                   Roadmaps históricos
│   ├── status-reports/             Reportes de estado antiguos
│   ├── tests/                      Documentación de tests deprecada
│   └── archive/                    Archivo anidado (meta-archivo)
│
├── 01-archived-standalone/        ← Todo de docs/archive/ (45 archivos)
│   └── (archivos sueltos de versiones anteriores)
│
├── 02-orphaned-root/              ← Archivos huérfanos de docs/ raíz (30 archivos)
│   ├── ANALISIS_INTEGRAL_ECOSIGN.md
│   ├── REPORTE_ANALISIS_FIRMA_GUESTS.md
│   ├── SOLUCION_BUG_FIRMA_GUESTS.md
│   └── (etc.)
│
├── INDEX-LEGACY.md                ← Índice de todo lo archivado
├── README.md                      ← Este archivo
└── snapshot-manifest.json         ← Inventario machine-readable
```

---

## 🏛️ Jerarquía de Autoridad (Snapshot vs. Actual)

```
Sistema Actual (Authoritative)
├── ../README.md                   ← Entry point
├── ../contratos/                  ← Verdad canónica N0-N5
├── ../INDEX.md                    ← Navegación
└── (carpetas activas)

Snapshot Histórico (Reference Only)
└── 2026-01-31-snapshot/
    ├── 00-deprecated-pre-2026/    ← Obsoleto por diseño
    ├── 01-archived-standalone/    ← Reemplazado por mejoras
    └── 02-orphaned-root/          ← Huérfanos organizados
```

**Regla:** Si un documento existe tanto en el snapshot como en el sistema actual, **el actual tiene razón**.

---

## 🔍 Casos de uso válidos para este snapshot

### 1. Debugging de bugs históricos
**Escenario:** "Este bug de firmas apareció en diciembre 2025, ¿cómo se resolvió?"  
**Buscar en:** `02-orphaned-root/SOLUCION_BUG_FIRMA_GUESTS.md`

### 2. Investigación de decisiones arquitectónicas
**Escenario:** "¿Por qué elegimos Polygon sobre Ethereum inicialmente?"  
**Buscar en:** `01-archived-standalone/ARCHITECTURA_ACTUAL_REPORTE.md`

### 3. Recuperación de información descartada
**Escenario:** "Necesito ver el roadmap original de Q4 2025"  
**Buscar en:** `00-deprecated-pre-2026/roadmaps/`

### 4. Auditoría de evolución
**Escenario:** "¿Cómo cambió el sistema de identidad de L0-L3 a L0-L5?"  
**Buscar en:** Múltiples documentos en `02-orphaned-root/` con fechas correlativas

---

## ❌ Casos de uso INVÁLIDOS

- ❌ "Voy a implementar TSA, leo `ANCHORING_AUDIT_SUMMARY.md`"  
  → NO. Ir a `../tsa/TSA_IMPLEMENTATION.md`

- ❌ "Necesito entender el modelo de datos, leo `DOCUMENT_ENTITY_SPEC.md`"  
  → NO. Ir a `../contratos/DOCUMENT_ENTITY_CONTRACT.md`

- ❌ "Quiero saber cómo deployar, leo `DEPLOYMENT_GUIDE.md`"  
  → NO. Ir a `../ops/DEPLOYMENT_GUIDE.md`

---

## 📋 Índice selectivo por tema

### Temas de implementación (histórico)
- TSA v1 → `00-deprecated-pre-2026/implementation-logs/`
- Anchoring legacy → `00-deprecated-pre-2026/bugfixes/BLOCKCHAIN_ANCHORING_FIX.md`
- Canvas fixes → `00-deprecated-pre-2026/bugfixes/FIX_CANVAS_ANCHORING.md`

### Temas de análisis (histórico)
- Análisis integral → `02-orphaned-root/ANALISIS_INTEGRAL_ECOSIGN.md`
- Análisis de valor → `01-archived-standalone/ANALISIS-VALOR-MERCADO-ECO.md`
- Estado sistema → `02-orphaned-root/ESTADO_ACTUAL_SISTEMA_H6.md`

### Temas de bugs (resueltos)
- Firma guests → `02-orphaned-root/SOLUCION_BUG_FIRMA_GUESTS.md`
- Login → `01-archived-standalone/FIX-LOGIN-COMPLETO.md`
- Canvas → `00-deprecated-pre-2026/bugfixes/FIX_CANVAS_ANCHORING.md`

### Temas de planeamiento (obsoleto)
- Roadmap Q4 2025 → `00-deprecated-pre-2026/roadmaps/`
- Planes de día → `01-archived-standalone/PLAN-DIA-2025-11-10.md`

---

## 🧭 Navegación desde acá

**Si llegaste acá por error:**
```bash
# Volver al entry point
cd ..
cat README.md
```

**Si estás buscando algo específico:**
```bash
# Buscar en todo el snapshot
grep -r "término de búsqueda" .

# Buscar en archivos recientes (menos de 6 meses)
find . -name "*.md" -mtime -180
```

**Si necesitas trazabilidad completa:**
```bash
# Ver el manifest completo
cat snapshot-manifest.json | jq '.files[] | select(.category == "orphaned")'
```

---

## 📝 Notas sobre este snapshot

### Por qué existe
- Preservar trazabilidad histórica (principio EcoSign)
- Eliminar ruido de la documentación activa
- Mantener evidencia de decisiones pasadas
- Permitir debugging de sistemas legacy

### Por qué NO se borró
- **Axioma 3:** Exceso sin fricción es daño, pero destrucción sin trazabilidad es peor
- **Principio:** Nada se borra, solo se organiza
- **Valor:** El contexto histórico es irrecuperable una vez perdido

### Cuándo se actualiza
Este snapshot es **inmutable**. No se edita, no se actualiza.  
El próximo archivado masivo creará un nuevo snapshot (ej: `2026-06-30-snapshot/`).

### Política de retención
- **Snapshots:** 5 años mínimo
- **Evaluación:** Anual de relevancia
- **Eliminación:** Solo por motivos legales/compliance (nunca por limpieza)

---

## 🔗 Referencias externas

- [README Canónico](../README.md) — Entry point del sistema
- [Índice de Contratos](../contratos/README.md) — Verdad canónica N0-N5
- [INDEX General](../INDEX.md) — Navegación completa
- [Git History](https://github.com/ecosign/ecosign/commits/main/docs) — Para trazabilidad pre-2026-01-31

---

## 📊 Estadísticas del snapshot

| Categoría | Archivos | % del snapshot |
|-----------|----------|----------------|
| Deprecated (bugfixes, logs, etc.) | 124 | 73% |
| Archived standalone | 45 | 27% |
| Orphaned root | 30 | 18% |
| **Total** | **199** | **100%** |

*Nota: Hay superposición de conteo (algunos archivos podrían estar en múltiples categorías conceptualmente)*

---

**Snapshot creado:** 2026-01-31  
**Responsable:** Documentación EcoSign  
**Próximo snapshot estimado:** 2026-06-30  
**Contacto:** Ver `../README.md` → Sección de contribución

---

**TL;DR final:** Si no estás debuggeando algo específico de 2025, **salí de acá y andá al** `../README.md` **canónico.**
