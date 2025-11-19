# 🚀 GUÍA DE IMPLEMENTACIÓN MVP - VerifySign

**Fecha:** 2025-11-18
**Versión:** 1.0
**Estado:** UI Completado ✅ | Backend Pendiente ⏳

---

## 📋 ÍNDICE

1. [Estado Actual](#estado-actual)
2. [Orden de Implementación](#orden-de-implementación)
3. [Punto 1: GuestSign](#punto-1-guestsign)
4. [Punto 2: EventLogger Integration](#punto-2-eventlogger-integration)
5. [Punto 3: Blindaje Polygon](#punto-3-blindaje-polygon)
6. [Punto 4: PDF Final + Audit Trail](#punto-4-pdf-final--audit-trail)
7. [Punto 5: Emails Básicos](#punto-5-emails-básicos)
8. [Testing Checklist](#testing-checklist)

---

## ✅ ESTADO ACTUAL

### **YA COMPLETADO:**

| Componente | Archivo | Estado |
|------------|---------|--------|
| UI Modal Certificación | `client/src/components/CertificationModal.jsx` | ✅ Completo |
| Hoja de Auditoría | `client/src/utils/pdfSignature.js` | ✅ Completo |
| Event Logger | `client/src/utils/eventLogger.js` | ✅ Completo |
| Migraciones DB | `supabase/migrations/20251118120000_012_signer_links_and_events.sql` | ✅ Creado |
| Tabla `signer_links` | Base de datos | ⏳ Pendiente aplicar |
| Tabla `events` | Base de datos | ⏳ Pendiente aplicar |

### **FALTA IMPLEMENTAR:**

- ❌ GuestSign (Edge Function + Frontend Page)
- ❌ Integración de EventLogger en flujos existentes
- ❌ Blindaje Polygon funcionando
- ❌ Templates de emails
- ❌ Aplicar migraciones a la DB

---

## 🎯 ORDEN DE IMPLEMENTACIÓN

**IMPORTANTE:** Seguir este orden EXACTO para no romperse.

### **Prioridad 1 (Crítico MVP):**
1. Aplicar migración de DB
2. Crear Edge Function `create-signer-link`
3. Crear página `/sign/:token`
4. Integrar EventLogger en flujos existentes

### **Prioridad 2 (Necesario MVP):**
5. Completar blindaje Polygon
6. Email templates (2 básicos)

---

## 🔧 PUNTO 1: GuestSign

**Objetivo:** Permitir que firmantes externos firmen documentos via link único.

### **1.1 Aplicar Migración de DB**

```bash
cd /home/manu/verifysign
supabase db push
```

Si da error por conflictos, aplicar manualmente via SQL Editor en Supabase Dashboard.

---

### **1.2 Edge Function: create-signer-link**

**Archivo a crear:** `supabase/functions/create-signer-link/index.ts`

**Responsabilidad:**
- Generar token UUID único
- Crear registro en `signer_links`
- Enviar email con link
- Registrar evento `sent`

**Código:**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener datos del request
    const { documentId, signerEmail, signerName, ownerEmail } = await req.json();

    // Validar datos
    if (!documentId || !signerEmail) {
      return new Response(
        JSON.stringify({ error: 'documentId y signerEmail son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener owner_id del documento
    const { data: document, error: docError } = await supabase
      .from('user_documents')
      .select('user_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Documento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generar token único
    const token = crypto.randomUUID();

    // Crear signer_link
    const { data: signerLink, error: linkError } = await supabase
      .from('signer_links')
      .insert({
        document_id: documentId,
        owner_id: document.user_id,
        signer_email: signerEmail,
        signer_name: signerName || null,
        token: token,
        status: 'pending'
      })
      .select()
      .single();

    if (linkError) {
      console.error('Error al crear signer_link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Error al crear link de firma' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar evento 'sent'
    await supabase.from('events').insert({
      document_id: documentId,
      event_type: 'sent',
      signer_link_id: signerLink.id,
      actor_email: signerEmail,
      metadata: {
        linkToken: token,
        expiresAt: signerLink.expires_at
      }
    });

    // TODO: Enviar email real (por ahora solo log)
    console.log(`📧 Email enviado a ${signerEmail}:`, {
      link: `${Deno.env.get('FRONTEND_URL')}/sign/${token}`,
      documentId,
      ownerEmail
    });

    return new Response(
      JSON.stringify({
        success: true,
        signerLink: {
          id: signerLink.id,
          token: token,
          link: `${Deno.env.get('FRONTEND_URL')}/sign/${token}`,
          expiresAt: signerLink.expires_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error inesperado:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Deployment:**
```bash
supabase functions deploy create-signer-link
```

**Variables de entorno:**
```bash
FRONTEND_URL=https://your-vercel-domain.com
```

---

### **1.3 Página Frontend: /sign/:token**

**Archivo a crear:** `client/src/pages/SignDocumentPage.jsx`

**Ruta:** `/sign/:token`

**Responsabilidades:**
1. Validar token (no expirado, status válido)
2. Pantalla de identificación
3. Abrir modal de firma
4. Guardar firma y actualizar status

**Código (Estructura Base):**

```jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { logEvent, EventHelpers, EVENT_TYPES } from '../utils/eventLogger';
import { Shield, CheckCircle2, Loader2 } from 'lucide-react';

function SignDocumentPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  // Estados
  const [loading, setLoading] = useState(true);
  const [signerLink, setSignerLink] = useState(null);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState(null);

  // Formulario de identificación
  const [step, setStep] = useState(1); // 1: Identificación, 2: Firma, 3: Completado
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    jobTitle: '',
    ndaAccepted: false
  });

  // Firma
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);

  // Validar token al cargar
  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setLoading(true);

      // Buscar signer_link
      const { data: link, error: linkError } = await supabase
        .from('signer_links')
        .select(`
          *,
          user_documents (
            id,
            document_name,
            file_size
          )
        `)
        .eq('token', token)
        .single();

      if (linkError || !link) {
        setError('Link de firma inválido o expirado');
        setLoading(false);
        return;
      }

      // Verificar estado
      if (link.status === 'signed') {
        setError('Este documento ya fue firmado');
        setLoading(false);
        return;
      }

      if (link.status === 'expired' || new Date(link.expires_at) < new Date()) {
        setError('Este link ha expirado');
        setLoading(false);
        return;
      }

      // Prellenar email
      setFormData(prev => ({
        ...prev,
        email: link.signer_email,
        name: link.signer_name || ''
      }));

      setSignerLink(link);
      setDocument(link.user_documents);

      // Registrar evento 'opened'
      await EventHelpers.logLinkOpened(
        link.document_id,
        link.id,
        link.signer_email,
        null // IP se captura en el helper
      );

      // Actualizar status a 'opened'
      await supabase
        .from('signer_links')
        .update({
          status: 'opened',
          opened_at: new Date().toISOString()
        })
        .eq('id', link.id);

      setLoading(false);

    } catch (err) {
      console.error('Error al validar token:', err);
      setError('Error al cargar el documento');
      setLoading(false);
    }
  };

  const handleIdentification = async (e) => {
    e.preventDefault();

    // Validar campos obligatorios
    if (!formData.name.trim()) {
      alert('Por favor, ingresá tu nombre completo');
      return;
    }

    if (!formData.ndaAccepted) {
      alert('Debés aceptar el acuerdo de confidencialidad');
      return;
    }

    try {
      // Actualizar signer_link con datos del firmante
      await supabase
        .from('signer_links')
        .update({
          signer_name: formData.name.trim(),
          signer_company: formData.company.trim() || null,
          signer_job_title: formData.jobTitle.trim() || null,
          nda_accepted: true,
          nda_accepted_at: new Date().toISOString(),
          status: 'identified'
        })
        .eq('id', signerLink.id);

      // Registrar evento 'identified'
      await EventHelpers.logSignerIdentified(
        signerLink.document_id,
        signerLink.id,
        formData
      );

      // Pasar a la pantalla de firma
      setStep(2);

    } catch (err) {
      console.error('Error al guardar identificación:', err);
      alert('Error al guardar tus datos. Por favor, intentá nuevamente.');
    }
  };

  const handleSign = async (signatureData) => {
    try {
      // Guardar firma en signer_link
      await supabase
        .from('signer_links')
        .update({
          signature_data_url: signatureData,
          signed_at: new Date().toISOString(),
          status: 'signed'
        })
        .eq('id', signerLink.id);

      // Registrar evento 'signed'
      await EventHelpers.logDocumentSigned(
        signerLink.document_id,
        signerLink.id,
        {
          email: formData.email,
          name: formData.name,
          company: formData.company,
          jobTitle: formData.jobTitle,
          signatureType: 'draw' // TODO: detectar tipo real
        },
        null // IP se captura en el helper
      );

      // Mostrar confirmación
      setStep(3);

    } catch (err) {
      console.error('Error al guardar firma:', err);
      alert('Error al guardar la firma. Por favor, intentá nuevamente.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Cargando documento...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Identificación
  if (step === 1) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-gray-900 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Firma de Documento
            </h1>
            <p className="text-gray-600">
              Documento: <strong>{document?.document_name}</strong>
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Identificación del Firmante
            </h2>

            <form onSubmit={handleIdentification} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  required
                />
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              {/* Empresa y Puesto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Ej: Acme Inc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puesto (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="Ej: Director"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* NDA */}
              <div className="flex items-start gap-3 pt-4">
                <input
                  type="checkbox"
                  checked={formData.ndaAccepted}
                  onChange={(e) => setFormData({ ...formData, ndaAccepted: e.target.checked })}
                  className="mt-1 w-4 h-4 text-gray-900 rounded focus:ring-gray-900"
                  required
                />
                <label className="text-sm text-gray-700">
                  Acepto el acuerdo de confidencialidad (NDA) y me comprometo a mantener la privacidad de este documento. <span className="text-red-500">*</span>
                </label>
              </div>

              {/* Botón */}
              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition"
              >
                Continuar para firmar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Firma
  if (step === 2) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Firmá el documento
          </h1>

          {/* TODO: Integrar modal de firma (draw/type/upload) */}
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-gray-600 mb-4">
              Aquí irá el modal de firma (dibujar/teclear/subir)
            </p>
            <button
              onClick={() => handleSign('data:image/png;base64,MOCK_SIGNATURE')}
              className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800"
            >
              Simular Firma (Dev)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Completado
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ¡Documento Firmado!
        </h1>
        <p className="text-gray-600 mb-8">
          Tu firma ha sido registrada exitosamente.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800"
        >
          Finalizar
        </button>
      </div>
    </div>
  );
}

export default SignDocumentPage;
```

**Integrar en router:**

`client/src/App.jsx`:
```jsx
import SignDocumentPage from './pages/SignDocumentPage';

// ...

<Route path="/sign/:token" element={<SignDocumentPage />} />
```

---

## 📝 PUNTO 2: EventLogger Integration

**Objetivo:** Registrar eventos automáticamente en todos los flujos.

### **2.1 Integrar en CertificationModal**

**Archivo:** `client/src/components/CertificationModal.jsx`

**Eventos a registrar:**

```javascript
import { EventHelpers } from '../utils/eventLogger';

// Al crear documento (después de certifyFile)
await EventHelpers.logDocumentCreated(
  certResult.ecoData.documentId,
  currentUser.id,
  {
    filename: file.name,
    fileSize: file.size,
    fileType: file.type,
    userEmail: currentUser.email,
    userName: currentUser.name
  }
);

// Al enviar links de firma múltiple
for (const signer of signers) {
  await EventHelpers.logLinkSent(
    documentId,
    signerLink.id,
    signer.email,
    {
      linkToken: signerLink.token,
      expiresAt: signerLink.expires_at
    }
  );
}

// Al descargar .ECO
await EventHelpers.logEcoDownloaded(
  documentId,
  currentUser.id,
  currentUser.email
);
```

---

## ⛓️ PUNTO 3: Blindaje Polygon

**Objetivo:** Anclar hash del documento en Polygon blockchain.

### **3.1 Completar basicCertificationWeb.js**

**Archivo:** `client/src/lib/basicCertificationWeb.js`

**Agregar función:**

```javascript
import { Alchemy, Network } from 'alchemy-sdk';
import { EventHelpers } from '../utils/eventLogger';

/**
 * Ancla el hash del documento en Polygon
 */
export async function anchorToPolygon(documentHash, documentId) {
  try {
    console.log('⛓️ Anclando en Polygon:', documentHash);

    // Configurar Alchemy
    const alchemy = new Alchemy({
      apiKey: import.meta.env.VITE_ALCHEMY_API_KEY,
      network: Network.MATIC_MAINNET
    });

    // TODO: Implementar lógica real de anclaje
    // Por ahora simulamos
    const mockTxHash = '0x' + documentHash.substring(0, 64);
    const mockBlockNumber = 12345678;

    // Registrar evento
    await EventHelpers.logPolygonAnchor(
      documentId,
      mockTxHash,
      mockBlockNumber,
      { documentHash }
    );

    console.log('✅ Anclado en Polygon:', mockTxHash);

    return {
      success: true,
      transactionHash: mockTxHash,
      blockNumber: mockBlockNumber
    };

  } catch (error) {
    console.error('❌ Error al anclar en Polygon:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## 📧 PUNTO 5: Emails Básicos

**Objetivo:** Enviar 2 emails esenciales.

### **5.1 Template: Invitación a Firmar**

**Archivo:** `supabase/functions/send-signature-invite/index.ts`

**Contenido del email:**

```
Asunto: Tenés un documento para firmar

Hola,

Se te ha enviado un documento para firmar:

📄 Documento: [nombre_documento.pdf]
👤 Enviado por: [owner_email]

Para revisar y firmar el documento, hacé clic aquí:
[Link: https://verifysign.com/sign/TOKEN]

Este link expira el [fecha_expiracion].

---
VerifySign - La Capa de Confianza Digital
```

### **5.2 Template: Documento Firmado**

**Contenido del email:**

```
Asunto: Tu documento ha sido firmado

Hola,

El documento "[nombre_documento.pdf]" ha sido firmado por todos los participantes.

✅ Estado: Completado
📅 Fecha: [fecha_completado]

Podés descargar el certificado .ECO desde tu panel:
[Link al dashboard]

---
VerifySign - La Capa de Confianza Digital
```

---

## ✅ TESTING CHECKLIST

### **Flujo Completo - Firma Individual (Caso A):**

- [ ] Usuario carga PDF
- [ ] Activa "Firmar documento"
- [ ] Selecciona "Firma EcoSign"
- [ ] Completa sus datos (nombre, email, empresa, puesto)
- [ ] Dibuja/Teclea/Sube firma
- [ ] Activa "Blindaje forense"
- [ ] Certifica documento
- [ ] **Eventos registrados:** `created`, `signed`, `anchored_polygon`
- [ ] **Hoja de Auditoría:** Generada con todos los datos
- [ ] **Download .ECO:** Funciona
- [ ] **Evento registrado:** `downloaded`

### **Flujo Completo - Firmas Múltiples (Caso B):**

- [ ] Usuario carga PDF
- [ ] Activa "Firmas múltiples"
- [ ] Agrega emails de firmantes
- [ ] Certifica documento
- [ ] **Eventos registrados:** `created`, `sent` (x cada firmante)
- [ ] **Links creados:** Registro en `signer_links`
- [ ] **Emails enviados:** A todos los firmantes

### **Flujo Firmante Externo:**

- [ ] Firmante recibe email
- [ ] Abre link `/sign/TOKEN`
- [ ] **Evento registrado:** `opened`
- [ ] **Status actualizado:** `opened` en `signer_links`
- [ ] Completa identificación (nombre, empresa, puesto, NDA)
- [ ] **Evento registrado:** `identified`
- [ ] **Status actualizado:** `identified`
- [ ] Dibuja/Teclea/Sube firma
- [ ] **Evento registrado:** `signed`
- [ ] **Status actualizado:** `signed`
- [ ] **Firma guardada:** `signature_data_url` en `signer_links`
- [ ] Ve pantalla de confirmación

### **Blindaje Polygon:**

- [ ] Calcular SHA-256 del PDF final
- [ ] Enviar hash a Alchemy/Polygon
- [ ] Recibir transaction hash
- [ ] **Evento registrado:** `anchored_polygon`
- [ ] **Hash guardado:** En `user_documents` o tabla relacionada

---

## 🚨 IMPORTANTE

**NO TOCAR:**
- ✅ UI del CertificationModal (ya está perfecto)
- ✅ Hoja de Auditoría (ya renderiza bien)
- ✅ Event Logger (ya está completo)

**SOLO IMPLEMENTAR:**
- ❌ Edge Functions (create-signer-link, send-email)
- ❌ Página /sign/:token
- ❌ Integración de eventLogger en flujos
- ❌ Blindaje Polygon real
- ❌ Templates de email

---

## 📞 SIGUIENTE PASO

**Prioridad MÁXIMA:**
1. Aplicar migración → `supabase db push`
2. Crear Edge Function `create-signer-link`
3. Crear página `/sign/:token`

**Tiempo estimado:** 4-6 horas

---

**Documento creado:** 2025-11-18
**Versión:** 1.0
**Autor:** Claude (AI Assistant)
