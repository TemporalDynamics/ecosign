# SignNow Integration - Legal-Grade E-Signatures

Esta función integra con SignNow para firmas electrónicas con validez legal internacional.

## Características de Validez Legal

### ✅ Elementos Forenses Incluidos:

1. **Audit Trail Completo**: Registro de cada acción con timestamps
2. **Metadata de Identidad**: IP, dispositivo, navegador del firmante
3. **Certificate of Completion**: Prueba criptográfica de la firma
4. **Embedded Signatures**: Firma visible incrustada en el PDF
5. **Non-Repudiation**: El firmante no puede negar haber firmado

### 🌍 Cumplimiento Legal:

- **ESIGN Act (USA)**: ✅ Completo
- **UETA (USA)**: ✅ Completo
- **eIDAS (EU)**: ✅ Advanced Electronic Signature (AES)
- **ZertES (Switzerland)**: ✅ Qualified
- **100+ países**: Válido en jurisdicciones que aceptan firmas electrónicas

## Flujo de Firma

### 1. Cliente sube PDF + firma autógrafa
```javascript
const result = await requestSignNowIntegration(
  documentId,
  'esignature',
  documentHash,
  userId,
  [{ email: 'firmante@example.com', name: 'Juan Pérez' }],
  {
    documentFile: { base64: pdfBase64, name: 'contrato.pdf' },
    signature: {
      image: signatureImageBase64,
      placement: { page: 1, xPercent: 0.1, yPercent: 0.8, widthPercent: 0.3, heightPercent: 0.1 }
    }
  }
);
```

### 2. Función procesa

1. **Embed local**: Incrusta la firma en el PDF usando pdf-lib
2. **Upload a SignNow**: Sube el PDF a SignNow
3. **Create Invite**: Crea invitación de firma para el firmante
4. **Download forensic PDF**: Intenta descargar el PDF con metadata forense de SignNow

### 3. Respuesta

```javascript
{
  "service": "signnow",
  "action": "esignature",
  "signed_pdf_base64": "base64_del_pdf_firmado...",
  "signnow_document_id": "abc123...",
  "metadata": {
    "hasForensicSignature": true,  // ✅ PDF tiene metadata de SignNow
    "signatureSource": "signnow-forensic"  // o "local-embedded"
  },
  "features": [
    "Legal-grade signature & audit trail (SignNow)",
    "✅ PDF con metadata forense de SignNow (válido internacionalmente)"
  ]
}
```

## Tipos de PDF Devueltos

### Opción A: PDF Forense de SignNow (Preferido)

- **Cuando está disponible**: Inmediatamente después de crear el invite
- **Contenido**:
  - Firma visible embebida
  - Certificate of Completion embebido
  - Audit trail metadata en PDF properties
  - Digital signature certificate
- **Validez legal**: ✅✅✅ Máxima (100+ países)

### ⚠️ Sin SignNow API Key

- **Qué pasa**: La función devuelve error 503
- **Por qué**: Firma local NO es segura ni legalmente válida
- **Mensaje**: "SignNow integration is required for legal-grade signatures"
- **Solución**: Configurar SIGNNOW_API_KEY

**NO hay fallback a firma local** por razones de seguridad:
- Ver: `/docs/SECURITY_SIGNATURES.md` para detalles completos

## Variables de Entorno Requeridas

```bash
SIGNNOW_API_KEY=tu_api_key_de_signnow
SIGNNOW_API_BASE_URL=https://api.signnow.com  # Opcional, default
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## Obtener API Key de SignNow

1. Crear cuenta en https://www.signnow.com/
2. Ir a Settings → API
3. Generar API token
4. Agregar en Supabase Dashboard → Edge Functions → Environment Variables

## Pricing de SignNow

- **Basic E-Signature**: $4.99 USD (configurado en esta función)
- **Full Workflow**: $9.99 USD (con múltiples firmantes)

## Testing

```bash
# Deploy
supabase functions deploy signnow --project-ref <ref>

# Test local
curl -X POST http://localhost:54321/functions/v1/signnow \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentFile": { "base64": "..." },
    "signers": [{ "email": "test@example.com", "name": "Test User" }],
    "signature": {
      "image": "data:image/png;base64,...",
      "placement": { "page": 1, "xPercent": 0.1, "yPercent": 0.8, "widthPercent": 0.3, "heightPercent": 0.1 }
    }
  }'
```

## Troubleshooting

### "SIGNNOW_API_KEY missing"
- Verificar que la variable esté configurada en Supabase Edge Functions

### "SignNow upload failed"
- Verificar que la API key sea válida
- Verificar que el PDF sea válido (no corrupto)

### "signed_pdf_base64" viene null
- Verificar que se envió signature.image y documentFile.base64

### PDF sin metadata forense (signatureSource: "local-embedded")
- **Normal** si la API key no está configurada o es inválida
- SignNow necesita tiempo para procesar - el download puede fallar inmediatamente
- Para obtener el PDF final con audit trail: implementar callback/webhook de SignNow

## ⚠️ IMPORTANTE: Seguridad

### ¿Por qué NO hay fallback a "firma local"?

**Firma local = INSEGURO**:
- ❌ Código JavaScript puede ser modificado por el usuario
- ❌ Sin audit trail verificable
- ❌ Sin validez legal (no cumple ESIGN, eIDAS)
- ❌ El firmante puede negar que firmó
- ❌ Vulnerable a manipulación

**SignNow = SEGURO**:
- ✅ Procesamiento server-side certificado
- ✅ Audit trail inmutable
- ✅ Válido legalmente en 100+ países
- ✅ No-repudiación completa
- ✅ Tercero independiente

Ver documentación completa: `/docs/SECURITY_SIGNATURES.md`

## Próximas Mejoras

1. **Webhook de SignNow**: Para obtener el PDF final cuando todos firmen
2. **Download async**: Job que descarga el PDF completo 5-10 min después
3. **Audit trail separado**: Guardar certificate of completion como archivo adicional
4. **Integración con Mifiel**: Para firmas con FIEL (México, NOM-151)
