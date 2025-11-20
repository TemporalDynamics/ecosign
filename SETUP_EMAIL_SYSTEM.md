# 📧 Sistema de Envío de Emails - EcoSign

## ✅ Estado Actual

El sistema de workflows de firma ya está implementado y funcional. Solo faltan **2 configuraciones finales** para activar el envío automático de emails.

---

## 🔧 1. Configurar Resend API Key

### Paso 1: Crear cuenta en Resend

1. Ir a [resend.com](https://resend.com)
2. Crear cuenta (gratis para primeros 3,000 emails/mes)
3. Verificar email

### Paso 2: Obtener API Key

1. En el dashboard de Resend, ir a **API Keys**
2. Click en **Create API Key**
3. Nombre: `EcoSign Production`
4. Permisos: **Sending access**
5. Copiar la API key (empieza con `re_...`)

### Paso 3: Configurar en Supabase

```bash
# Opción A: Via Supabase CLI (recomendado)
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui

# Opción B: Via Dashboard de Supabase
# 1. Ir a tu proyecto en dashboard.supabase.com
# 2. Settings → Edge Functions → Secrets
# 3. Agregar nuevo secret:
#    - Key: RESEND_API_KEY
#    - Value: re_tu_api_key_aqui
```

### Paso 4: Verificar dominio en Resend (Opcional pero recomendado)

Para emails profesionales desde `@ecosign.app`:

1. En Resend → **Domains** → **Add Domain**
2. Dominio: `ecosign.app`
3. Seguir instrucciones para agregar registros DNS:
   - SPF
   - DKIM
   - DMARC
4. Esperar verificación (5-15 minutos)

**Mientras tanto:** Los emails se enviarán desde `@resend.dev` (funciona pero menos profesional)

---

## 🚀 2. Integrar en el Frontend

### Opción A: Ejemplo completo (recomendado)

Crear un componente `SignatureRequestModal.jsx`:

```jsx
import React, { useState } from 'react';
import { startSignatureWorkflow } from '../lib/signatureWorkflowService';

function SignatureRequestModal({ documentUrl, documentHash, originalFilename, onClose, onSuccess }) {
  const [signers, setSigners] = useState([
    { email: '', name: '', signingOrder: 1, requireLogin: true, requireNda: true }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addSigner = () => {
    setSigners([
      ...signers,
      {
        email: '',
        name: '',
        signingOrder: signers.length + 1,
        requireLogin: true,
        requireNda: true
      }
    ]);
  };

  const removeSigner = (index) => {
    const newSigners = signers.filter((_, i) => i !== index);
    // Reordenar signing orders
    newSigners.forEach((signer, i) => {
      signer.signingOrder = i + 1;
    });
    setSigners(newSigners);
  };

  const updateSigner = (index, field, value) => {
    const newSigners = [...signers];
    newSigners[index][field] = value;
    setSigners(newSigners);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar emails
      const invalidSigners = signers.filter(s => !s.email || !s.email.includes('@'));
      if (invalidSigners.length > 0) {
        throw new Error('Todos los firmantes deben tener un email válido');
      }

      const result = await startSignatureWorkflow({
        documentUrl,
        documentHash,
        originalFilename,
        signers,
        forensicConfig: {
          rfc3161: true,
          polygon: true,
          bitcoin: false
        }
      });

      onSuccess(result);
      onClose();
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Solicitar Firmas</h2>
        <p className="text-gray-600 mb-6">
          Documento: <strong>{originalFilename}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            {signers.map((signer, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Firmante #{signer.signingOrder}</h3>
                  {signers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSigner(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={signer.email}
                      onChange={(e) => updateSigner(index, 'email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="email@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre (opcional)
                    </label>
                    <input
                      type="text"
                      value={signer.name}
                      onChange={(e) => updateSigner(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Nombre completo"
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={signer.requireLogin}
                      onChange={(e) => updateSigner(index, 'requireLogin', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Requerir login</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={signer.requireNda}
                      onChange={(e) => updateSigner(index, 'requireNda', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Requerir NDA</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSigner}
            className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
          >
            + Agregar firmante
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitud de Firmas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignatureRequestModal;
```

### Opción B: Uso simple desde DashboardPage

```jsx
import { startSignatureWorkflow } from '../lib/signatureWorkflowService';

// Dentro del componente:
const handleRequestSignature = async (documentId) => {
  try {
    const result = await startSignatureWorkflow({
      documentUrl: 'https://...', // URL del documento en Storage
      documentHash: 'abc123...', // Hash SHA-256
      originalFilename: 'contrato.pdf',
      signers: [
        {
          email: 'firmante@ejemplo.com',
          name: 'Juan Pérez',
          signingOrder: 1
        }
      ]
    });

    alert(`✅ Solicitud enviada! Workflow ID: ${result.workflowId}`);
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
};
```

---

## 📋 3. Arquitectura del Sistema

### Flujo Completo

```
1. Usuario crea workflow desde frontend
   ↓
2. Frontend llama a startSignatureWorkflow()
   ↓
3. Edge Function: start-signature-workflow
   - Crea workflow en DB
   - Crea version inicial
   - Crea registros de firmantes con tokens
   - Crea notificaciones en DB (status: pending)
   ↓
4. Edge Function: send-pending-emails
   - Lee notificaciones pending
   - Envía emails vía Resend API
   - Actualiza status a 'sent' o 'failed'
   ↓
5. Firmantes reciben email con link único
   ↓
6. Firmantes acceden via /sign/:token
   ↓
7. Al firmar, se notifica al siguiente firmante
```

### Tablas de Base de Datos

```sql
-- Workflows principales
signature_workflows
├── id
├── owner_id
├── original_filename
├── status (active, completed, cancelled)
└── forensic_config

-- Versiones del documento
workflow_versions
├── id
├── workflow_id
├── version_number
├── document_url
├── document_hash
└── status

-- Firmantes
workflow_signers
├── id
├── workflow_id
├── signing_order
├── email
├── name
├── status (pending, ready, signed, rejected)
├── access_token_hash
├── require_login
├── require_nda
└── quick_access

-- Notificaciones/Emails
workflow_notifications
├── id
├── workflow_id
├── recipient_email
├── notification_type
├── subject
├── body_html
├── delivery_status (pending, sent, failed)
└── resend_email_id
```

---

## 🧪 4. Testing

### Test Manual

```javascript
// Desde consola del navegador (en página autenticada):
const { startSignatureWorkflow } = await import('./lib/signatureWorkflowService.js');

const result = await startSignatureWorkflow({
  documentUrl: 'https://your-project.supabase.co/storage/v1/object/public/documents/test.pdf',
  documentHash: 'abc123def456...', 
  originalFilename: 'test-documento.pdf',
  signers: [
    {
      email: 'tu-email@ejemplo.com',
      name: 'Test User',
      signingOrder: 1
    }
  ]
});

console.log('Resultado:', result);
// Deberías recibir un email en unos segundos
```

### Verificar en Supabase

```sql
-- Ver workflows creados
SELECT * FROM signature_workflows ORDER BY created_at DESC LIMIT 5;

-- Ver notificaciones pendientes
SELECT * FROM workflow_notifications WHERE delivery_status = 'pending';

-- Ver notificaciones enviadas
SELECT * FROM workflow_notifications WHERE delivery_status = 'sent' ORDER BY sent_at DESC LIMIT 10;

-- Ver firmantes
SELECT * FROM workflow_signers WHERE workflow_id = 'tu-workflow-id';
```

---

## 🔄 5. Automatización (Opcional)

Para enviar emails automáticamente cada minuto:

### Via Supabase Cron Jobs (Beta)

```sql
-- En Supabase SQL Editor
SELECT cron.schedule(
  'send-pending-emails',
  '* * * * *', -- Cada minuto
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-pending-emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);
```

### Via External Cron (Alternativa)

Usar cron-job.org o GitHub Actions para hacer POST cada minuto:

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/send-pending-emails \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

## 📊 6. Monitoreo

### Dashboard de Resend

- Ver emails enviados
- Tasa de entrega
- Bounces y complaints
- Logs de envío

### Logs de Supabase

```bash
# Ver logs de Edge Functions
supabase functions logs send-pending-emails --limit 50
supabase functions logs start-signature-workflow --limit 50
```

---

## 🚨 7. Troubleshooting

### Problema: Emails no se envían

**Solución:**
```bash
# Verificar que la API key esté configurada
supabase secrets list

# Verificar logs
supabase functions logs send-pending-emails

# Probar manualmente
curl -X POST https://your-project.supabase.co/functions/v1/send-pending-emails
```

### Problema: Emails van a spam

**Solución:**
- Verificar dominio en Resend
- Configurar SPF, DKIM, DMARC
- No usar palabras como "gratis", "dinero", etc.
- Incluir link de unsubscribe

### Problema: Token inválido al firmar

**Solución:**
```sql
-- Verificar que el token existe
SELECT * FROM workflow_signers WHERE access_token_hash = 'hash_del_token';

-- Verificar status del signer
SELECT status FROM workflow_signers WHERE email = 'email@ejemplo.com';
```

---

## ✅ Checklist Final

- [ ] Cuenta de Resend creada
- [ ] API Key configurada en Supabase Secrets
- [ ] Dominio verificado en Resend (opcional)
- [ ] Componente de UI creado para solicitar firmas
- [ ] Integrado `startSignatureWorkflow()` en el frontend
- [ ] Test manual realizado y email recibido
- [ ] Cron job configurado (opcional)
- [ ] Monitoreo configurado

---

## 📚 Referencias

- [Documentación de Resend](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets](https://supabase.com/docs/guides/cli/managing-config#managing-secrets)

---

**¿Necesitas ayuda?** Revisa los logs o crea un issue con los detalles del error.
