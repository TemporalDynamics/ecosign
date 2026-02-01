# Eventos Probatorios Pendientes - Guía de Implementación

**Fecha:** 2026-01-07
**Status:** 3/6 eventos P0 implementados ✅
**Commit:** ea57f2c - feat(probatory): implement P0 canonical events

---

## 📋 Estado Actual

### ✅ Implementados (commit ea57f2c)

1. **share_created** → `generate-link/index.ts`
2. **share_opened** → `verify-access/index.ts`
3. **signature** → `process-signature/index.ts`

### ⏳ Pendientes

#### P0 - Crítico
- **protection_enabled** (requiere client-side)

#### P1 - Alta prioridad
- **nda_accepted**
- **otp_verified**

---

## 🎯 Evento 1: `protection_enabled` (P0)

### Dónde implementar
**Frontend:** `client/src/pages/LegalCenter.tsx`

### Cuándo dispara
Cuando el usuario hace clic en "Descargar PDF protegido" después de completar el flujo del Centro Legal (firma + TSA + anclas).

### Estructura del evento
```typescript
{
  kind: 'protection_enabled',
  at: new Date().toISOString(),
  protection: {
    method: 'legal_signature',  // o 'simple_hash' dependiendo del flujo
    tsa: true,                   // si se generó timestamp RFC 3161
    blockchain: ['polygon', 'bitcoin'],  // anclas generadas
    contract_hash: '0xabc...'   // hash del contrato firmado
  },
  forensic: {
    tsa_timestamp: '2026-01-07T...',
    polygon_tx: '0xdef...',
    bitcoin_anchor_id: 'xyz...'
  }
}
```

### Pasos de implementación

1. **Ubicar el punto de éxito** en `LegalCenter.tsx`:
   - Buscar donde se muestra el modal final "Proceso completado"
   - Después de la firma exitosa y anclas generadas

2. **Hacer POST al edge function:**
   ```typescript
   // Opción A: Crear nueva edge function "record-protection-event"
   await supabase.functions.invoke('record-protection-event', {
     body: {
       document_entity_id: documentEntityId,
       protection_method: 'legal_signature',
       tsa: tsaData,
       blockchain: anchorData
     }
   });

   // Opción B: Agregar a existing edge function (process-signature)
   // Ya está ahí, solo falta dispararlo cuando termina el flujo completo
   ```

3. **Edge function debe:**
   - Recibir `document_entity_id` del cliente
   - Construir evento `protection_enabled` con datos forenses
   - Llamar `appendEvent(supabase, documentEntityId, event, 'record-protection')`

### Complejidad
- **Esfuerzo:** 2-3 horas
- **Archivos:** 1 frontend (LegalCenter.tsx) + 1 edge function (nuevo o modificar process-signature)
- **Riesgo:** Bajo (patrón ya establecido)

---

## 🎯 Evento 2: `nda_accepted` (P1)

### Dónde implementar
**Edge function existente:** `supabase/functions/accept-share-nda/index.ts`

### Cuándo dispara
Cuando el destinatario acepta el NDA antes de acceder al documento compartido.

### Estructura del evento
```typescript
{
  kind: 'nda_accepted',
  at: new Date().toISOString(),
  nda: {
    link_id: link.id,
    recipient_email: recipient.email,
    nda_hash: sha256(nda_text),  // hash del texto del NDA
    acceptance_method: 'checkbox'  // o 'digital_signature' en futuro
  },
  context: {
    ip_hash: await hashIP(metadata.ip_address),
    geo: metadata.country,
    browser: getBrowserFamily(metadata.user_agent),
    session_id: metadata.session_id
  }
}
```

### Pasos de implementación

1. **Leer el archivo:**
   ```bash
   cat supabase/functions/accept-share-nda/index.ts
   ```

2. **Ubicar inserción en `nda_acceptances` table** (línea ~80-100)

3. **Después del insert exitoso, agregar:**
   ```typescript
   // === PROBATORY EVENT: nda_accepted ===
   const documentEntityId = await getDocumentEntityId(supabase, recipientData.document_id);
   if (documentEntityId) {
     const ipHash = ip_address ? await hashIP(ip_address) : null;
     const browserFamily = getBrowserFamily(user_agent);

     // Hash del texto del NDA para verificación futura
     const ndaTextEncoder = new TextEncoder();
     const ndaData = ndaTextEncoder.encode(nda_text);
     const ndaHashBuffer = await crypto.subtle.digest('SHA-256', ndaData);
     const ndaHash = Array.from(new Uint8Array(ndaHashBuffer))
       .map(b => b.toString(16).padStart(2, '0'))
       .join('');

     await appendEvent(
       supabase,
       documentEntityId,
       {
         kind: 'nda_accepted',
         at: accepted_at,
         nda: {
           link_id: recipientData.link_id,
           recipient_email: recipient.email,
           nda_hash: ndaHash,
           acceptance_method: 'checkbox'
         },
         context: {
           ip_hash: ipHash,
           geo: country || null,
           browser: browserFamily,
           session_id: session_id
         }
       },
       'accept-share-nda'
     );
   }
   ```

4. **Agregar imports:**
   ```typescript
   import { appendEvent, getDocumentEntityId, hashIP, getBrowserFamily } from '../_shared/eventHelper.ts'
   ```

### Complejidad
- **Esfuerzo:** 1 hora
- **Archivos:** 1 (accept-share-nda/index.ts)
- **Riesgo:** Muy bajo (patrón exactamente igual a share_opened)

---

## 🎯 Evento 3: `otp_verified` (P1)

### Dónde implementar
**Edge function existente:** `supabase/functions/verify-signer-otp/index.ts`

### Cuándo dispara
Cuando un firmante verifica su código OTP para acceder al documento de firma.

### Estructura del evento
```typescript
{
  kind: 'otp_verified',
  at: new Date().toISOString(),
  otp: {
    signer_email: signer.email,
    workflow_id: workflow.id,
    verification_method: 'email_otp',  // o 'sms_otp' en futuro
    attempts: otp_record.attempts || 1
  },
  context: {
    ip_hash: await hashIP(metadata.ip_address),
    geo: metadata.country,
    browser: getBrowserFamily(metadata.user_agent),
    session_id: metadata.session_id
  }
}
```

### Pasos de implementación

1. **Leer el archivo:**
   ```bash
   cat supabase/functions/verify-signer-otp/index.ts
   ```

2. **Ubicar verificación exitosa del OTP** (después de comparar códigos)

3. **Después de update de otp_verifications, agregar:**
   ```typescript
   // === PROBATORY EVENT: otp_verified ===
   if (workflow.document_entity_id) {
     const ipHash = metadata.ip_address ? await hashIP(metadata.ip_address) : null;
     const browserFamily = getBrowserFamily(metadata.user_agent);

     await appendEvent(
       supabase,
       workflow.document_entity_id,
       {
         kind: 'otp_verified',
         at: new Date().toISOString(),
         otp: {
           signer_email: signer.email,
           workflow_id: workflow.id,
           verification_method: 'email_otp',
           attempts: otpRecord.attempts || 1
         },
         context: {
           ip_hash: ipHash,
           geo: metadata.country || null,
           browser: browserFamily,
           session_id: metadata.session_id
         }
       },
       'verify-signer-otp'
     );
   }
   ```

4. **Agregar imports y metadata extraction:**
   ```typescript
   import { appendEvent, hashIP, getBrowserFamily } from '../_shared/eventHelper.ts'

   // Extract metadata al inicio del handler
   const metadata = {
     ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
     user_agent: req.headers.get('user-agent'),
     country: req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country'),
     session_id: crypto.randomUUID()
   };
   ```

### Complejidad
- **Esfuerzo:** 1 hora
- **Archivos:** 1 (verify-signer-otp/index.ts)
- **Riesgo:** Muy bajo

---

## 📊 Estimación Total

| Evento | Prioridad | Esfuerzo | Riesgo |
|--------|-----------|----------|--------|
| protection_enabled | P0 | 2-3h | Bajo |
| nda_accepted | P1 | 1h | Muy bajo |
| otp_verified | P1 | 1h | Muy bajo |
| **TOTAL** | - | **4-5h** | **Bajo** |

---

## ✅ Checklist de Implementación

### Por cada evento:
- [ ] Leer edge function existente
- [ ] Ubicar punto exacto de éxito (después de DB insert)
- [ ] Agregar imports de eventHelper
- [ ] Extraer metadata (IP, user agent, country, session)
- [ ] Llamar `appendEvent()` con estructura correcta
- [ ] Agregar manejo de errores (log pero no fail)
- [ ] Deployar edge function
- [ ] Probar en staging
- [ ] Verificar que evento aparece en document_entities.events[]
- [ ] Verificar que evento viaja en .eco file

### Testing:
- [ ] Test unitario: evento se apendea correctamente
- [ ] Test integración: flujo completo genera todos los eventos
- [ ] Test .eco: archivo contiene todos los eventos esperados
- [ ] Test validación: append-only trigger rechaza modificaciones

---

## 🚀 Orden Sugerido de Implementación

1. **nda_accepted** (más fácil, P1, 1h)
2. **otp_verified** (más fácil, P1, 1h)
3. **protection_enabled** (requiere frontend, P0, 2-3h)

**Razón:** Empezar con los más fáciles para validar el patrón, terminar con el que toca frontend.

---

## 🔗 Referencias

- **Audit completo:** `AUDITORIA_EVENTOS_PROBATORIOS.md`
- **Helper genérico:** `supabase/functions/_shared/eventHelper.ts`
- **Commit de referencia:** ea57f2c (share_created, share_opened, signature)
- **Patrón establecido:** Leer cualquiera de los 3 eventos ya implementados

---

## 📝 Notas

- **No fallar requests:** Si `appendEvent()` falla, loggear pero continuar
- **Privacy:** Siempre usar `hashIP()`, nunca guardar IPs completas
- **Timestamps:** Usar `new Date().toISOString()` para consistencia
- **Source field:** Siempre pasar nombre de edge function para forensics
- **Document entity ID:** Usar `getDocumentEntityId()` cuando trabajas con user_documents.id
- **Validación:** El helper ya valida estructura (kind, at), no validar semántica

---

**Status:** Documentación completa ✅
**Próximo paso:** Implementar eventos en orden sugerido (nda → otp → protection)
