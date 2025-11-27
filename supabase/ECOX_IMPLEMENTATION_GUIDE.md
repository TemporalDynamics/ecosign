# 🎯 Guía de Implementación ECOX - Frontend

## 📋 Resumen

El sistema ECOX (EcoSign Audit Trail) proporciona **evidencia forense completa** de cada paso del proceso de firma. Esta guía muestra cómo integrar el logging de eventos desde el frontend.

---

## 🏗️ Arquitectura

```
Frontend (React)
    ↓ (llama)
Edge Function: log-ecox-event
    ↓ (escribe)
Tabla: ecox_audit_trail
    ↓ (se usa en)
Función: generate_ecox_certificate
    ↓ (genera)
Certificado .ECOX final
```

---

## 🔧 Implementación en el Frontend

### 1. Crear el Hook de ECOX

Crea un hook reutilizable para registrar eventos:

```typescript
// src/hooks/useEcoxLogger.ts

import { supabase } from '@/lib/supabaseClient'

interface EcoxEventDetails {
  [key: string]: any
}

interface LogEcoxEventParams {
  workflowId: string
  signerId: string
  eventType:
    | 'access_link_opened'
    | 'nda_accepted'
    | 'mfa_challenged'
    | 'mfa_success'
    | 'mfa_failed'
    | 'document_decrypted'
    | 'document_viewed'
    | 'signature_started'
    | 'signature_applied'
    | 'signature_completed'
    | 'eco_downloaded'
  details?: EcoxEventDetails
  documentHash?: string
}

export function useEcoxLogger() {
  const logEvent = async (params: LogEcoxEventParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('log-ecox-event', {
        body: {
          workflow_id: params.workflowId,
          signer_id: params.signerId,
          event_type: params.eventType,
          details: params.details,
          document_hash_snapshot: params.documentHash
        }
      })

      if (error) {
        console.error('Error logging ECOX event:', error)
        return { success: false, error }
      }

      console.log(`✅ ECOX event logged: ${params.eventType}`, data)
      return { success: true, data }

    } catch (error) {
      console.error('Error calling log-ecox-event:', error)
      return { success: false, error }
    }
  }

  return { logEvent }
}
```

### 2. Integrar en el Flujo de Firma

#### Paso 1: Cuando el Firmante Abre el Link

```typescript
// src/pages/SignaturePage.tsx

import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useEcoxLogger } from '@/hooks/useEcoxLogger'

export function SignaturePage() {
  const { token } = useParams()
  const { logEvent } = useEcoxLogger()

  useEffect(() => {
    async function handleAccessLink() {
      // Obtener workflow y signer por token
      const { workflowId, signerId } = await getWorkflowByToken(token)

      // Registrar que el firmante abrió el link
      await logEvent({
        workflowId,
        signerId,
        eventType: 'access_link_opened',
        details: {
          access_token: token,
          timestamp: new Date().toISOString()
        }
      })
    }

    handleAccessLink()
  }, [token])

  // ... resto del componente
}
```

#### Paso 2: Cuando Acepta el NDA

```typescript
// src/components/NDAAcceptance.tsx

import { useEcoxLogger } from '@/hooks/useEcoxLogger'

export function NDAAcceptance({ workflowId, signerId, onAccept }) {
  const { logEvent } = useEcoxLogger()

  const handleAcceptNDA = async () => {
    // Registrar aceptación del NDA
    await logEvent({
      workflowId,
      signerId,
      eventType: 'nda_accepted',
      details: {
        nda_version: '1.0',
        accepted_at: new Date().toISOString(),
        user_confirmed: true
      }
    })

    onAccept()
  }

  return (
    <div>
      <h2>Acuerdo de Confidencialidad</h2>
      <p>Antes de ver el documento, debes aceptar...</p>
      <button onClick={handleAcceptNDA}>
        Acepto el NDA
      </button>
    </div>
  )
}
```

#### Paso 3: Proceso MFA

```typescript
// src/components/MFAChallenge.tsx

import { useEcoxLogger } from '@/hooks/useEcoxLogger'

export function MFAChallenge({ workflowId, signerId, onSuccess }) {
  const { logEvent } = useEcoxLogger()

  const handleMFAStart = async () => {
    await logEvent({
      workflowId,
      signerId,
      eventType: 'mfa_challenged',
      details: {
        mfa_method: 'TOTP', // o 'SMS', 'Email', etc.
        challenge_sent_at: new Date().toISOString()
      }
    })
  }

  const handleMFASuccess = async (code: string) => {
    const startTime = Date.now()

    // Verificar código...
    const isValid = await verifyMFACode(code)

    if (isValid) {
      await logEvent({
        workflowId,
        signerId,
        eventType: 'mfa_success',
        details: {
          mfa_method: 'TOTP',
          verification_time_ms: Date.now() - startTime,
          verified_at: new Date().toISOString()
        }
      })

      onSuccess()
    } else {
      await logEvent({
        workflowId,
        signerId,
        eventType: 'mfa_failed',
        details: {
          mfa_method: 'TOTP',
          failed_at: new Date().toISOString(),
          reason: 'Invalid code'
        }
      })
    }
  }

  // ... resto del componente
}
```

#### Paso 4: Descifrado y Visualización del Documento

```typescript
// src/components/DocumentViewer.tsx

import { useEffect } from 'react'
import { useEcoxLogger } from '@/hooks/useEcoxLogger'

export function DocumentViewer({ workflowId, signerId, encryptedDocUrl }) {
  const { logEvent } = useEcoxLogger()

  useEffect(() => {
    async function decryptAndShow() {
      const startTime = Date.now()

      // Descifrar documento
      const decryptedDoc = await decryptDocument(encryptedDocUrl)
      const decryptTime = Date.now() - startTime

      // Registrar descifrado
      await logEvent({
        workflowId,
        signerId,
        eventType: 'document_decrypted',
        details: {
          decryption_time_ms: decryptTime,
          document_size_bytes: decryptedDoc.size,
          decrypted_at: new Date().toISOString()
        }
      })

      // Registrar visualización
      await logEvent({
        workflowId,
        signerId,
        eventType: 'document_viewed',
        details: {
          viewed_at: new Date().toISOString(),
          viewport_size: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      })

      // Mostrar documento...
    }

    decryptAndShow()
  }, [workflowId, signerId])

  // ... resto del componente
}
```

#### Paso 5: Aplicación de la Firma

```typescript
// src/components/SignaturePad.tsx

import { useEcoxLogger } from '@/hooks/useEcoxLogger'

export function SignaturePad({ workflowId, signerId, documentHash }) {
  const { logEvent } = useEcoxLogger()
  const [isDrawing, setIsDrawing] = useState(false)

  const handleSignatureStart = async () => {
    setIsDrawing(true)

    await logEvent({
      workflowId,
      signerId,
      eventType: 'signature_started',
      details: {
        started_at: new Date().toISOString(),
        input_method: 'touch' // o 'mouse'
      }
    })
  }

  const handleSignatureComplete = async (signatureData) => {
    // Aplicar firma al documento
    const signedDoc = await applySignature(signatureData)

    await logEvent({
      workflowId,
      signerId,
      eventType: 'signature_applied',
      documentHash: documentHash, // Smart Hash del documento firmado
      details: {
        signature_coords: {
          x: signatureData.x,
          y: signatureData.y,
          page: signatureData.page
        },
        signature_dimensions: {
          width: signatureData.width,
          height: signatureData.height
        },
        applied_at: new Date().toISOString()
      }
    })

    // Marcar como completado
    await logEvent({
      workflowId,
      signerId,
      eventType: 'signature_completed',
      documentHash: documentHash,
      details: {
        completed_at: new Date().toISOString(),
        total_time_seconds: calculateTotalTime()
      }
    })

    // Actualizar estado en la base de datos
    await updateSignerStatus(signerId, 'signed')
  }

  // ... resto del componente
}
```

#### Paso 6: Descarga del Certificado .ECO

```typescript
// src/components/DownloadECO.tsx

import { useEcoxLogger } from '@/hooks/useEcoxLogger'

export function DownloadECO({ workflowId, signerId }) {
  const { logEvent } = useEcoxLogger()

  const handleDownload = async () => {
    // Generar certificado ECOX
    const { data: ecoxData } = await supabase.rpc('generate_ecox_certificate', {
      p_workflow_id: workflowId
    })

    // Descargar archivo
    downloadFile(ecoxData, `${workflowId}.ecox`)

    // Registrar descarga
    await logEvent({
      workflowId,
      signerId,
      eventType: 'eco_downloaded',
      details: {
        downloaded_at: new Date().toISOString(),
        file_size_bytes: JSON.stringify(ecoxData).length,
        certificate_version: ecoxData.ecox_version
      }
    })
  }

  return (
    <button onClick={handleDownload}>
      Descargar Certificado .ECOX
    </button>
  )
}
```

---

## 📊 Verificar el Audit Trail

Para ver todos los eventos registrados de un workflow:

```typescript
// src/hooks/useEcoxAuditTrail.ts

export function useEcoxAuditTrail(workflowId: string) {
  const [auditTrail, setAuditTrail] = useState([])

  useEffect(() => {
    async function fetchAuditTrail() {
      const { data, error } = await supabase
        .from('ecox_audit_trail')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('event_timestamp', { ascending: true })

      if (!error) {
        setAuditTrail(data)
      }
    }

    fetchAuditTrail()
  }, [workflowId])

  return auditTrail
}
```

---

## 🎨 Componente de Dashboard para Visualizar Eventos

```typescript
// src/components/EcoxTimeline.tsx

export function EcoxTimeline({ workflowId }) {
  const auditTrail = useEcoxAuditTrail(workflowId)

  return (
    <div className="ecox-timeline">
      <h3>Audit Trail Forense</h3>
      {auditTrail.map((event) => (
        <div key={event.id} className="timeline-event">
          <div className="event-type">{event.event_type}</div>
          <div className="event-time">
            {new Date(event.event_timestamp).toLocaleString()}
          </div>
          <div className="event-details">
            IP: {event.source_ip}
            <br />
            Device: {event.user_agent}
          </div>
          {event.details && (
            <pre>{JSON.stringify(event.details, null, 2)}</pre>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## 🔒 Consideraciones de Seguridad

1. **No exponer información sensible** en los `details` del evento
2. **Validar en el backend** todos los datos antes de insertarlos
3. **Usar HTTPS** siempre para las llamadas a la Edge Function
4. **Implementar rate limiting** para evitar spam de eventos

---

## 🚀 Deployment

### Aplicar la Migración

```bash
cd supabase
supabase db push
```

### Deployar la Edge Function

```bash
supabase functions deploy log-ecox-event
```

### Verificar que funciona

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/log-ecox-event \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "test-workflow-id",
    "signer_id": "test-signer-id",
    "event_type": "access_link_opened",
    "details": { "test": true }
  }'
```

---

## 📝 Generar Certificado ECOX Completo

Cuando el workflow está completado, genera el certificado final:

```typescript
// src/lib/ecoxGenerator.ts

export async function generateEcoxCertificate(workflowId: string) {
  const { data, error } = await supabase.rpc('generate_ecox_certificate', {
    p_workflow_id: workflowId
  })

  if (error) {
    console.error('Error generando certificado ECOX:', error)
    return null
  }

  return data
}
```

El certificado incluye:
- ✅ Todos los firmantes con sus datos
- ✅ Todos los eventos del audit trail
- ✅ Smart Hash final del documento
- ✅ Timestamps de cada acción
- ✅ IPs, user agents, geolocalizaciones
- ✅ Detalles técnicos de MFA, descifrado, etc.

---

## 🎯 Flujo Completo de Ejemplo

```typescript
// Ejemplo de un flujo completo de firma

async function completeSignatureFlow(token: string) {
  const { workflowId, signerId } = await getWorkflowByToken(token)
  const { logEvent } = useEcoxLogger()

  // 1. Abrir link
  await logEvent({ workflowId, signerId, eventType: 'access_link_opened' })

  // 2. Aceptar NDA
  await logEvent({ workflowId, signerId, eventType: 'nda_accepted' })

  // 3. MFA
  await logEvent({ workflowId, signerId, eventType: 'mfa_challenged' })
  await logEvent({ workflowId, signerId, eventType: 'mfa_success' })

  // 4. Descifrar y ver documento
  await logEvent({ workflowId, signerId, eventType: 'document_decrypted' })
  await logEvent({ workflowId, signerId, eventType: 'document_viewed' })

  // 5. Firmar
  await logEvent({ workflowId, signerId, eventType: 'signature_started' })
  await logEvent({ workflowId, signerId, eventType: 'signature_applied' })
  await logEvent({ workflowId, signerId, eventType: 'signature_completed' })

  // 6. Descargar .ECO
  await logEvent({ workflowId, signerId, eventType: 'eco_downloaded' })
}
```

---

**🎉 ¡Listo!** Tu sistema ECOX está completo y listo para proporcionar evidencia forense de nivel profesional.
