# 🗑️ Dead Code Report — Día 3: Knip Audit

**Fecha:** 2025-12-13
**Herramienta:** knip@5.73.4
**Rama:** `quality-audit/gates-and-tooling`

---

## 📊 Resumen Ejecutivo

| Categoría | Cantidad | Impacto |
|-----------|----------|---------|
| **Archivos sin usar** | 32 | ⚠️ ALTO - Candidatos para eliminación |
| **Dependencias sin usar** | 4 | 🟡 MEDIO - Reducir bundle size |
| **DevDependencies sin usar** | 4 | 🟢 BAJO - Solo afecta desarrollo |
| **Exports sin usar** | 25 | 🟡 MEDIO - Código muerto en archivos activos |
| **Tipos sin usar** | 1 | 🟢 BAJO |
| **Exports duplicados** | 4 | ⚠️ ALTO - Potencial confusión |

**TOTAL DE DEAD CODE: 70 items**

---

## 🗂️ Archivos Sin Usar (32)

### Auth & Security (6 archivos)
```
client/src/components/auth/MFASetup.tsx
client/src/components/signature-flow/AuthGate.tsx
client/src/components/signature-flow/MFAChallenge.tsx
client/src/lib/security/csrf.ts
client/src/lib/security/encryption.ts
client/src/lib/security/rateLimit.ts
```
**Análisis:** Features de MFA y seguridad avanzada que aparentemente no se usan todavía

---

### Components Sin Usar (8 archivos)
```
client/src/components/Button.jsx
client/src/components/Card.jsx
client/src/components/CardWithImage.jsx
client/src/components/CertificationFlow.jsx  ← ⚠️ Tiene parsing error
client/src/components/MainLayout.jsx
client/src/components/NdaModal.jsx
client/src/components/ui/Modal.tsx
client/src/components/workflows/AuditTrailTimeline.tsx
client/src/components/workflows/SignersList.tsx
```
**Análisis:** Componentes legacy o features no implementadas

---

### Páginas Sin Usar (2 archivos)
```
client/src/pages/AccessPage.jsx
client/src/pages/SignDocumentPage.jsx
```
**Análisis:** Rutas no registradas en el router

---

### Utils & Lib Sin Usar (16 archivos)
```
client/src/lib/api.ts
client/src/lib/apiErrors.ts
client/src/lib/basicCertification.js
client/src/lib/basicCertificationBrowser.js
client/src/lib/fileValidation.ts
client/src/lib/polygonAnchorClient.js
client/src/lib/security/fileValidation.ts
client/src/lib/security/sanitization.ts
client/src/lib/security/storage.ts
client/src/utils/documentStorage.ts
client/src/utils/ecoxParser.js
client/src/utils/fileHashUtils.js
client/src/utils/verifyUtils.js
client/src/debug-env.js
client/src/test-eco-packer.js
```
**Análisis:** Utilities legacy, código de testing, o módulos reemplazados

---

## 📦 Dependencies Sin Usar (4)

### Production Dependencies (⚠️ Crítico - afecta bundle size)
```json
{
  "dompurify": "^3.3.0",    // ← Nunca usado, paquete de sanitización HTML
  "ethers": "^6.9.0",       // ← Nunca usado, librería Ethereum (pesada!)
  "stripe": "^19.3.0",      // ← Nunca usado, SDK de Stripe (pesado!)
  "update": "^0.4.2"        // ← Nunca usado, paquete de actualización
}
```

**Impacto:**
- `ethers@6.9.0`: ~1.5 MB comprimido
- `stripe@19.3.0`: ~500 KB comprimido
- `dompurify@3.3.0`: ~50 KB comprimido
- **Total estimado:** ~2 MB removibles del bundle

---

### Dev Dependencies (🟢 Bajo impacto - solo desarrollo)
```json
{
  "@types/dompurify": "^3.0.5",  // ← No se usa dompurify
  "glob": "^13.0.0",              // ← Posiblemente usado por scripts
  "solc": "^0.5.0",               // ← Compilador Solidity, no usado
  "supabase": "^2.58.5"           // ← CLI, posiblemente se usa manualmente
}
```

---

## 🔌 Exports Sin Usar (25)

### Workflows (1 export)
```typescript
// client/src/components/workflows/WorkflowStatus.tsx
export function WorkflowStatusCard() { }  // ← Exportado pero nunca usado
```

---

### Hooks (1 export)
```typescript
// client/src/hooks/useEcoxLogger.ts
export function useEcoxAutoLog() { }  // ← Exportado pero nunca usado
```

---

### Lib / Utils (23 exports)
```javascript
// basicCertificationWeb.js
export function certifyAndDownload() { }

// envValidation.ts
export function checkEnvironment() { }
export function renderEnvErrorUI() { }

// polygonAnchor.js
export function verifyPolygonAnchor() { }
export function getAnchorStatus() { }
export function listUserAnchors() { }

// signNowService.js
export function base64ToFile() { }

// supabaseClient.ts
export const getCurrentUser
export const isAuthenticated
export const signOut

// tsaService.js
export function getAvailableTSAs() { }

// documentStorage.js
export function updateDocumentStatus() { }
export function getDocumentDownloadUrl() { }
export function deleteUserDocument() { }

// eventLogger.js
export function logEventsBatch() { }
export function getDocumentEvents() { }

// hashDocument.ts
export function calculateBufferHash() { }
export function isValidSHA256() { }

// integrationUtils.js
export function initiatePayment() { }
export function getIntegrationPricing() { }

// pdfSigner.ts
export function applyMultipleSignaturesToPDF() { }
export function getPDFMetadata() { }
export function downloadPDF() { }
```

**Análisis:** Funciones implementadas pero nunca usadas. Candidatos para eliminación.

---

## 🔄 Exports Duplicados (4)

### ⚠️ Problemas de Naming
```typescript
// ProtectedRoute.tsx
export { ProtectedRoute }
export default ProtectedRoute  // ← Duplicado

// WorkflowStatus.tsx
export { WorkflowStatusBadge }
export default WorkflowStatusBadge  // ← Duplicado

// useEcoxLogger.ts
export { useEcoxLogger }
export default useEcoxLogger  // ← Duplicado

// verificationService.js
export { verifyEcoFileComplete }
export { verifyEcoxFile }  // ← Mismo código, distinto nombre
```

**Recomendación:** Elegir una sola forma de export por archivo (default o named).

---

## 📈 Priorización de Fixes

### P0 - Crítico (Impacto inmediato)
- [ ] Remover `ethers`, `stripe`, `dompurify` de dependencies
- [ ] Fix exports duplicados (confusión en imports)
- [ ] Fix `CertificationFlow.jsx` parsing error (está sin usar pero rompe lint)

### P1 - Alto (Limpieza importante)
- [ ] Eliminar 32 archivos sin usar
- [ ] Remover 25 exports sin usar de archivos activos

### P2 - Medio (Optimización)
- [ ] Remover devDependencies sin usar
- [ ] Remover tipo `Database` sin usar

---

## 💰 Beneficios Estimados

### Bundle Size Reduction
- Remover `ethers`: -1.5 MB
- Remover `stripe`: -500 KB
- Remover `dompurify`: -50 KB
- **Total:** ~2 MB menos en producción

### Código más limpio
- 32 archivos menos = -~3500 líneas
- 25 exports menos = navegación más clara
- Menos confusión con imports duplicados

### Mantenibilidad
- Menos código que revisar en auditorías
- Menos código que puede tener bugs
- Mejor performance de IDE/linters

---

## 🎯 Plan de Acción (Día 5)

### PR #1: Remove Unused Dependencies (P0)
```bash
npm uninstall dompurify ethers stripe update
npm uninstall --save-dev @types/dompurify solc
```

### PR #2: Fix Duplicate Exports (P0)
- Estandarizar exports (preferir named exports)
- Fix imports que usan default

### PR #3: Remove Dead Files (P1)
- Eliminar 32 archivos sin usar
- Verificar que no rompan nada (tests pasan)

### PR #4: Remove Dead Exports (P1)
- Eliminar 25 funciones exportadas sin usar
- Revisar si alguna es útil antes de borrar

---

## 🔧 Scripts Agregados

Agregar a `package.json`:
```json
{
  "scripts": {
    "deadcode": "knip --max-issues 100",
    "deadcode:fix": "knip --fix"
  }
}
```

---

## 📝 Notas

### Sobre Unlisted Dependencies (183)
Knip reporta 183 "unlisted dependencies" como `react`, `react-router-dom`, etc.
Esto es un **falso positivo** - estas deps están declaradas en `client/package.json`.
El issue es que knip está scaneando desde el root y no detecta correctamente las deps del subdirectorio.

**Fix:** Actualizar `knip.json` con mejor configuración de workspaces.

### Archivos de Seguridad
Los archivos en `client/src/lib/security/` están sin usar:
- `csrf.ts`
- `encryption.ts`
- `rateLimit.ts`
- `sanitization.ts`
- `storage.ts`

**Pregunta para el equipo:** ¿Son features planificadas o código legacy?

---

**Próximo paso:** Día 4 - React/Lifecycle Audit
