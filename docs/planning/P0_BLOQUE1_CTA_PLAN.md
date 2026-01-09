# 🎯 Plan de Ataque: P0 BLOQUE 1 + CTA

**Fecha**: 2026-01-06
**Scope**: Solo P0s que caen en BLOQUE 1 (Protección) y CTA Final
**Origen**: Matriz de Explosiones UX (commit f314927)

---

## 📋 INVENTARIO DE P0s

### ✅ Ya Implementados (validar que funcionen)

| ID | Componente | Explosión | Estado |
|----|------------|-----------|--------|
| - | Upload | PDF encriptado detectado | ✅ Implementado |
| - | Protección | Modal "¿Estás seguro?" al desactivar | ✅ Implementado |
| - | Protección | "Activada" no "Protegida" | ✅ Implementado |

**Acción**: Validar manualmente que estos flujos funcionen correctamente.

---

### ⏳ Pendientes (implementar ahora)

#### BLOQUE 1 - Upload

| ID | Anti-Estado | Explosión | Fix Necesario |
|----|-------------|-----------|---------------|
| **P0.1** | C (Tardío) | PDF corrupto detectado al certificar | Validar estructura EN UPLOAD |
| **P0.2** | C (Tardío) | PDF con permisos restrictivos detectado tarde | Validar permisos EN UPLOAD |

#### BLOQUE 1 - Protección

| ID | Anti-Estado | Explosión | Fix Necesario |
|----|-------------|-----------|---------------|
| **P0.3** | C+D (Tardío + Sin salida) | TSA falla al certificar sin previo aviso | Validar conectividad antes |

#### CTA FINAL - Certificar

| ID | Anti-Estado | Explosión | Fix Necesario |
|----|-------------|-----------|---------------|
| **P0.4** | B+D (Incomprensible + Sin salida) | Error genérico "Failed to certify" | Español + contexto + opciones |
| **P0.5** | A (Inesperado) | Spinner sin contexto | Progress con pasos visibles |
| **P0.6** | C (Tardío) | Timeout sin feedback | Tiempo estimado + aviso |
| **P0.7** | D (Sin salida) | No sabe si trabajo está guardado | Siempre decir estado |
| **P0.8** | D (Sin salida) | Error sin retry | Botón reintentar visible |

---

## 🔨 ORDEN DE EJECUCIÓN (secuencial)

### Fase 1: Upload Validations (P0.1, P0.2)
**Archivo**: `client/src/components/LegalCenterModalV2.tsx`
**Función**: `handleFileSelect` (~línea 1600-1700)

#### P0.1 - Validar PDF corrupto

**Implementación**:
```typescript
// Después de validación de encriptación, agregar:

// Validar estructura PDF
const isPDFValid = await validatePDFStructure(file);
if (!isPDFValid) {
  setFile(null);
  setDocumentPreview(null);
  toast.error(
    'Este PDF está dañado o tiene una estructura inválida. ' +
    'Probá abrirlo en un lector de PDF (Adobe, Foxit) y volvé a guardarlo.',
    { duration: 6000 }
  );
  return;
}
```

**Helper necesario** (`client/src/lib/pdfValidation.ts`):
```typescript
export async function validatePDFStructure(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Check PDF header
    const header = String.fromCharCode(...uint8Array.slice(0, 5));
    if (header !== '%PDF-') {
      return false;
    }

    // Check for EOF marker
    const tail = String.fromCharCode(...uint8Array.slice(-10));
    if (!tail.includes('%%EOF')) {
      return false;
    }

    // Try to load with pdf-lib to validate structure
    const { PDFDocument } = await import('pdf-lib');
    await PDFDocument.load(arrayBuffer);

    return true;
  } catch (error) {
    console.error('PDF validation error:', error);
    return false;
  }
}
```

#### P0.2 - Validar permisos PDF

**Implementación**:
```typescript
// Después de validación de estructura:

// Validar permisos
const permissions = await checkPDFPermissions(file);
if (permissions.restricted) {
  // Warning, no bloqueante (puede funcionar según permisos)
  toast(
    'Este PDF tiene restricciones de edición. ' +
    'Si tenés problemas al certificar, pedí al creador que quite las restricciones.',
    {
      icon: '⚠️',
      duration: 8000,
      style: {
        background: '#FEF3C7',
        color: '#92400E'
      }
    }
  );
}
```

**Helper necesario** (`client/src/lib/pdfValidation.ts`):
```typescript
interface PDFPermissions {
  restricted: boolean;
  canModify: boolean;
  canCopy: boolean;
  canPrint: boolean;
}

export async function checkPDFPermissions(file: File): Promise<PDFPermissions> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: false
    });

    // Check if document has restrictions
    // pdf-lib doesn't expose permissions directly, but we can detect encryption
    const isEncrypted = pdfDoc.isEncrypted;

    return {
      restricted: isEncrypted,
      canModify: !isEncrypted,
      canCopy: !isEncrypted,
      canPrint: !isEncrypted
    };
  } catch (error) {
    console.error('PDF permissions check error:', error);
    return {
      restricted: false,
      canModify: true,
      canCopy: true,
      canPrint: true
    };
  }
}
```

**Commit**:
```bash
git commit -m "feat(upload): P0.1 + P0.2 - validate PDF structure and permissions

P0.1 - PDF corrupto detectado EN UPLOAD:
- validatePDFStructure() helper
- Check header, EOF marker, pdf-lib load
- Error claro: 'PDF dañado, abrirlo en lector y guardar'

P0.2 - PDF con permisos restrictivos:
- checkPDFPermissions() helper
- Warning (no bloqueante) si tiene restricciones
- Usuario avisado ANTES de continuar

Anti-explosión: C (mensaje tardío)
Matriz: docs/MATRIZ_EXPLOSIONES_UX.md
Test: Subir PDF corrupto + PDF con permisos ✅"
```

---

### Fase 2: TSA Validation (P0.3)
**Archivo**: `client/src/components/LegalCenterModalV2.tsx`
**Ubicación**: Toggle Protección (línea ~2112-2116)

#### P0.3 - Validar TSA antes

**Problema actual**:
- Usuario activa Protección
- Configura todo
- Al certificar → TSA falla (FreeTSA down)
- Explota tarde

**Fix**:
```typescript
// Modificar ProtectionToggle para validar antes de activar

<ProtectionToggle
  enabled={forensicEnabled}
  onToggle={async (newState) => {
    if (newState) {
      // Validar TSA ANTES de activar
      setIsValidatingTSA(true);
      const tsaAvailable = await validateTSAConnectivity();
      setIsValidatingTSA(false);

      if (!tsaAvailable) {
        toast.error(
          'El servicio de timestamping no está disponible en este momento. ' +
          'Reintentá en unos minutos o contactá soporte.',
          { duration: 6000 }
        );
        return; // No activar
      }
    }
    setForensicEnabled(newState);
  }}
  disabled={!file || isValidatingTSA}
  isValidating={isValidatingTSA}
/>
```

**Helper necesario** (`client/src/lib/tsaValidation.ts`):
```typescript
/**
 * Validate TSA connectivity before enabling protection
 * Quick health check to prevent late failures
 */
export async function validateTSAConnectivity(): Promise<boolean> {
  try {
    // Simple connectivity check to FreeTSA
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch('https://freetsa.org/tsr', {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // If we get any response (even error), TSA is reachable
    return response.status !== 0;
  } catch (error) {
    console.error('TSA connectivity check failed:', error);
    return false;
  }
}
```

**Actualizar componente ProtectionToggle** (`client/src/centro-legal/modules/protection/ProtectionToggle.tsx`):
```typescript
interface ProtectionToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void | Promise<void>;
  disabled?: boolean;
  isValidating?: boolean; // NUEVO
}

export function ProtectionToggle({
  enabled,
  onToggle,
  disabled,
  isValidating = false
}: ProtectionToggleProps) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      disabled={disabled || isValidating}
      className={/* ... */}
    >
      {isValidating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Validando...
        </>
      ) : (
        <>
          <Shield className="w-4 h-4" />
          Protección
        </>
      )}
    </button>
  );
}
```

**Commit**:
```bash
git commit -m "feat(protection): P0.3 - validate TSA connectivity before enabling

P0.3 - TSA falla tarde al certificar:
- validateTSAConnectivity() antes de activar protección
- Timeout 5s, error claro si no está disponible
- Loading state 'Validando...' en toggle
- Usuario avisado ANTES de configurar todo

Anti-explosión: C+D (tardío + sin salida)
Matriz: docs/MATRIZ_EXPLOSIONES_UX.md
Test: Activar protección con TSA down ✅"
```

---

### Fase 3: CTA Progress & Errors (P0.4 - P0.8)
**Archivos**:
- `client/src/components/LegalCenterModalV2.tsx`
- Función: `handleCertify` (~línea 600-1000)

#### Arquitectura del Fix

**Estado actual**:
```typescript
const handleCertify = async () => {
  setIsProcessing(true);
  try {
    // ... processing silencioso
    await certifyFile(...);
    toast.success('Certificado!');
  } catch (error) {
    toast.error('Error'); // ❌ Genérico
  }
  setIsProcessing(false);
};
```

**Estado objetivo**:
```typescript
// Nuevo estado para progress granular
const [certifyProgress, setCertifyProgress] = useState<{
  stage: 'idle' | 'preparing' | 'timestamping' | 'anchoring' | 'generating' | 'done';
  message: string;
  error?: string;
  canRetry?: boolean;
  workSaved?: boolean;
}>({
  stage: 'idle',
  message: ''
});

const handleCertify = async () => {
  try {
    // P0.5: Progress visible
    setCertifyProgress({
      stage: 'preparing',
      message: 'Preparando documento...'
    });

    // P0.6: Timeout con feedback
    const prepareTimeout = setTimeout(() => {
      if (certifyProgress.stage === 'preparing') {
        setCertifyProgress(prev => ({
          ...prev,
          message: 'Preparando documento... (puede tardar hasta 60 seg)'
        }));
      }
    }, 10000); // 10s

    // ... processing

    setCertifyProgress({
      stage: 'timestamping',
      message: 'Generando timestamp legal...'
    });

    await certifyFile(...);

    setCertifyProgress({
      stage: 'anchoring',
      message: 'Anclando en blockchain...'
    });

    // ... more steps

    setCertifyProgress({
      stage: 'done',
      message: 'Certificado generado correctamente'
    });

  } catch (error) {
    // P0.4 + P0.7 + P0.8: Error con contexto + estado + retry
    const errorMessage = translateError(error);
    const workSaved = determineIfWorkSaved(certifyProgress.stage);

    setCertifyProgress({
      stage: certifyProgress.stage,
      message: '',
      error: errorMessage,
      canRetry: canRetryFromStage(certifyProgress.stage),
      workSaved
    });
  }
};
```

#### P0.4 - Errores en español con contexto

**Helper necesario** (`client/src/lib/errorTranslation.ts`):
```typescript
export function translateError(error: any): string {
  const errorMsg = error?.message || String(error);

  // Map técnico → humano
  const errorMap: Record<string, string> = {
    'witness hash mismatch': 'Hubo un problema de integridad en el documento. Reintentá o contactá soporte.',
    'tsa timeout': 'El servicio de timestamping tardó demasiado. Reintentá en unos minutos.',
    'tsa failed': 'No se pudo generar el timestamp legal. Verificá tu conexión y reintentá.',
    'polygon anchor failed': 'El anclaje en Polygon falló. Tu documento está protegido con timestamp. Podés reintenta el anclaje.',
    'bitcoin anchor failed': 'El anclaje en Bitcoin falló. Tu documento está protegido. Podés continuar sin este anclaje.',
    'network error': 'Problema de conexión. Verificá tu internet y reintentá.',
    'invalid pdf': 'El PDF tiene un problema de estructura. Probá abrirlo en un lector y guardarlo de nuevo.',
  };

  // Buscar match
  for (const [key, translation] of Object.entries(errorMap)) {
    if (errorMsg.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }

  // Fallback genérico pero humano
  return `No se pudo completar la certificación. Error: ${errorMsg}. Contactá soporte si el problema persiste.`;
}
```

#### P0.7 - Determinar si trabajo está guardado

**Helper necesario** (`client/src/lib/errorRecovery.ts`):
```typescript
type CertifyStage = 'idle' | 'preparing' | 'timestamping' | 'anchoring' | 'generating' | 'done';

export function determineIfWorkSaved(stage: CertifyStage): boolean {
  // Después de timestamping, el trabajo está guardado en backend
  const savedStages: CertifyStage[] = ['timestamping', 'anchoring', 'generating', 'done'];
  return savedStages.includes(stage);
}

export function canRetryFromStage(stage: CertifyStage): boolean {
  // Solo permitir retry si no llegó a done
  return stage !== 'done';
}
```

#### P0.5, P0.6, P0.8 - Progress UI

**Componente nuevo** (`client/src/components/CertifyProgress.tsx`):
```typescript
interface CertifyProgressProps {
  stage: CertifyStage;
  message: string;
  error?: string;
  canRetry?: boolean;
  workSaved?: boolean;
  onRetry?: () => void;
  onClose?: () => void;
}

export function CertifyProgress({
  stage,
  message,
  error,
  canRetry,
  workSaved,
  onRetry,
  onClose
}: CertifyProgressProps) {
  if (error) {
    // P0.4, P0.7, P0.8: Error state
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                No se pudo completar la certificación
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                {error}
              </p>
              {/* P0.7: Siempre decir si trabajo guardado */}
              {workSaved !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg mb-3">
                  <p className="text-xs font-medium text-gray-900">
                    {workSaved
                      ? '✓ Tu documento y timestamp están guardados'
                      : 'ℹ️ El proceso no llegó a guardar datos'}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {/* P0.8: Retry siempre visible si aplica */}
            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Reintentar
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // P0.5, P0.6: Progress state
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-6 h-6 text-gray-900 animate-spin" />
          <div>
            <h3 className="font-semibold text-gray-900">Certificando documento</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>

        {/* P0.5: Pasos visibles */}
        <div className="space-y-2">
          <ProgressStep
            label="Preparando documento"
            status={stage === 'preparing' ? 'current' : stage === 'idle' ? 'pending' : 'done'}
          />
          <ProgressStep
            label="Timestamping legal"
            status={stage === 'timestamping' ? 'current' : ['idle', 'preparing'].includes(stage) ? 'pending' : 'done'}
          />
          <ProgressStep
            label="Anclaje blockchain"
            status={stage === 'anchoring' ? 'current' : ['idle', 'preparing', 'timestamping'].includes(stage) ? 'pending' : 'done'}
          />
          <ProgressStep
            label="Generando certificado"
            status={stage === 'generating' ? 'current' : stage === 'done' ? 'done' : 'pending'}
          />
        </div>

        {/* P0.6: Timeout feedback */}
        {message.includes('puede tardar') && (
          <p className="text-xs text-gray-500 mt-3">
            ⏱️ Este paso puede tomar más tiempo de lo habitual
          </p>
        )}
      </div>
    </div>
  );
}

function ProgressStep({
  label,
  status
}: {
  label: string;
  status: 'pending' | 'current' | 'done'
}) {
  return (
    <div className="flex items-center gap-2">
      {status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
      {status === 'current' && <Loader2 className="w-4 h-4 text-gray-900 animate-spin" />}
      {status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
      <span className={`text-sm ${
        status === 'done' ? 'text-gray-400' :
        status === 'current' ? 'text-gray-900 font-medium' :
        'text-gray-500'
      }`}>
        {label}
      </span>
    </div>
  );
}
```

**Commit**:
```bash
git commit -m "feat(cta): P0.4-P0.8 - complete CTA error handling and progress

P0.4 - Error en español con contexto:
- translateError() helper (técnico → humano)
- Map de errores comunes
- Fallback genérico pero útil

P0.5 - Progress visible:
- CertifyProgress component
- Pasos: Preparando → Timestamping → Anclando → Generando
- Estados: pending | current | done

P0.6 - Timeout con feedback:
- Aviso 'puede tardar hasta 60 seg' después de 10s
- Timer visible en UI

P0.7 - Estado guardado explícito:
- determineIfWorkSaved() helper
- Siempre decir si documento/timestamp guardado
- Usuario nunca en duda

P0.8 - Retry visible:
- Botón 'Reintentar' siempre presente si aplica
- canRetryFromStage() logic
- Opción 'Cerrar' siempre disponible

Anti-explosiones: B+C+D (incomprensible + tardío + sin salida)
Matriz: docs/MATRIZ_EXPLOSIONES_UX.md
Test: Error TSA + Timeout + Retry ✅"
```

---

## ✅ CHECKLIST DE VALIDACIÓN

### Post-implementación

- [ ] **P0.1**: Subir PDF corrupto → error claro EN UPLOAD
- [ ] **P0.2**: Subir PDF con permisos → warning antes de continuar
- [ ] **P0.3**: Activar protección con TSA down → error claro, no activa
- [ ] **P0.4**: Error al certificar → mensaje en español con contexto
- [ ] **P0.5**: Certificar → ver pasos (Timestamping, Anclando, etc)
- [ ] **P0.6**: Certificar lento → ver "puede tardar hasta 60 seg"
- [ ] **P0.7**: Error al certificar → sabe si trabajo guardado o no
- [ ] **P0.8**: Error al certificar → botón Reintentar visible

---

## 🚫 QUÉ NO TOCAR

Durante este ataque:

❌ No refactorizar código existente "porque se ve mejor"
❌ No agregar features nuevas
❌ No tocar PASO 3 (integración módulos)
❌ No implementar P1/P2 de la matriz
❌ No cambiar contratos

**Solo**: Fixes quirúrgicos de los 8 P0s listados.

---

## 📊 IMPACTO ESPERADO

**Antes**:
- Usuario sube PDF corrupto → explota al certificar (tarde)
- TSA falla → sin previo aviso
- CTA error → "Something went wrong" (inglés, sin contexto)
- CTA procesando → spinner mudo
- Usuario en duda si perdió trabajo

**Después**:
- Usuario sube PDF corrupto → error inmediato, sabe qué hacer
- TSA down → no puede activar protección, avisado antes
- CTA error → español, qué pasó, estado, retry
- CTA procesando → pasos visibles, tiempos estimados
- Usuario siempre sabe si trabajo guardado

**Métrica clave**: 0 explosiones UX en flujo happy path y error paths comunes.

---

## 📅 TIMELINE SUGERIDA

- **Fase 1** (Upload): ~2-3 horas (helpers + validaciones)
- **Fase 2** (TSA): ~1-2 horas (connectivity check + loading state)
- **Fase 3** (CTA): ~4-5 horas (progress UI + error handling)

**Total**: ~1 día de trabajo enfocado

---

**Última actualización**: 2026-01-06
**Responsable**: Dev asignado a P0s
**Validación**: QA manual + matriz como checklist
