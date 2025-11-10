# VerifySign - Netlify Functions

Backend serverless para VerifySign implementado con Netlify Functions + TypeScript.

## 📁 Estructura

```
netlify/
├── functions/
│   ├── utils/
│   │   ├── supabase.ts      # Cliente Supabase (service role)
│   │   ├── response.ts      # Helpers de respuestas HTTP
│   │   ├── validation.ts    # Validación de inputs
│   │   ├── rateLimit.ts     # Rate limiting en memoria
│   │   ├── csrf.ts          # Generación/validación CSRF tokens
│   │   └── storage.ts       # Gestión de Supabase Storage
│   ├── generate-link.ts     # Crear enlace NDA
│   ├── verify-access.ts     # Validar token y desbloquear acceso
│   ├── log-event.ts         # Registrar evento de acceso
│   ├── get-csrf-token.ts    # Obtener token CSRF
│   └── anchor.ts            # (existente) Anclaje blockchain
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Functions Disponibles

### 1. `generate-link` - Crear Enlace Seguro

**Endpoint**: `POST /.netlify/functions/generate-link`

Genera un enlace único para compartir un documento con un receptor.

**Request**:
```json
{
  "document_id": "uuid-v4",
  "recipient_email": "recipient@example.com",
  "expires_in_hours": 24,
  "require_nda": true
}
```

**Headers**:
- `Authorization: Bearer <jwt>` (required)
- `X-CSRF-Token: <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "link_id": "uuid",
    "recipient_id": "uuid",
    "access_url": "https://verifysign.app/nda/{token}",
    "expires_at": "2025-11-10T15:30:00Z",
    "require_nda": true
  }
}
```

---

### 2. `verify-access` - Verificar Acceso

**Endpoint**: `POST /.netlify/functions/verify-access`

Valida un token de acceso y permite al receptor ver el documento.

**Request**:
```json
{
  "token": "64-char-hex-token",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "title": "Contrato Confidencial",
    "eco_hash": "sha256...",
    "download_url": "https://signed-url...",
    "recipient_id": "hex-id",
    "expires_in": 86400,
    "nda_accepted": true
  }
}
```

---

### 3. `log-event` - Registrar Evento

**Endpoint**: `POST /.netlify/functions/log-event`

Registra un evento de acceso al documento (auditoría).

**Request**:
```json
{
  "recipient_id": "uuid",
  "event_type": "view",
  "session_id": "optional-session-id"
}
```

**Event Types**:
- `view` - Receptor vio el documento
- `download` - Receptor descargó el .ECO
- `forward` - Receptor reenvió el enlace

**Response**:
```json
{
  "success": true,
  "data": {
    "event_id": "uuid",
    "timestamp": "2025-11-09T14:30:00Z",
    "message": "Event logged successfully"
  }
}
```

---

### 4. `get-csrf-token` - Obtener Token CSRF

**Endpoint**: `GET /.netlify/functions/get-csrf-token`

Genera un token CSRF para uso en formularios.

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "token:timestamp:signature",
    "expires_in": 3600
  }
}
```

---

## 🔒 Seguridad

### Rate Limiting

Implementado en memoria (temporal):

| Endpoint | Límite |
|----------|--------|
| `generate-link` | 10 req/min |
| `verify-access` | 30 req/min |
| `log-event` | 100 req/min |
| Default | 20 req/min |

### CSRF Protection

- `generate-link` requiere token CSRF válido
- Tokens expiran en 1 hora
- Comparación en tiempo constante para prevenir timing attacks

### Validación de Inputs

- UUIDs validados con regex
- Emails validados con regex estricto
- Strings sanitizados (max 255 chars)
- Event types validados contra whitelist

---

## 🗄️ Integración con Supabase

### Variables de Entorno Requeridas

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key

# CSRF Secret
HMAC_SIGN_SECRET=your-secret-key

# Site URL
NETLIFY_SITE_URL=https://verifysign.app
```

### Tablas Usadas

- `documents` - Documentos certificados
- `links` - Enlaces de acceso únicos
- `recipients` - Receptores de documentos
- `nda_acceptances` - Firmas de NDA
- `access_events` - Logs de acceso (auditoría)
- `anchors` - Pruebas de blockchain

### Storage Buckets

- `eco-files` - Archivos .ECO generados
- `ecox-files` - Archivos .ECOX (historial completo)
- `nda-signatures` - Firmas de NDA
- `proofs` - Pruebas de blockchain (OTS)
- `temp-uploads` - Uploads temporales (auto-delete 24h)

---

## 🧪 Testing Local

```bash
# Instalar dependencias
cd netlify
npm install

# Ejecutar localmente con Netlify CLI
npm run dev

# Type-check sin compilar
npm run type-check
```

---

## 📋 TODOs

### Semana 2 (Próximos Commits)
- [ ] Integrar eco-packer real (generación .ECO)
- [ ] Implementar validación de OTP (2FA)
- [ ] Agregar geolocalización de IP (GeoIP2)
- [ ] Persistir rate limiting en Supabase (no memoria)

### Semana 3 (Diferenciadores)
- [ ] Implementar watermark dinámico en .ECOX
- [ ] Integrar OpenTimestamps (anclaje Bitcoin)
- [ ] Webhook para notificaciones en tiempo real

---

## 🐛 Debugging

### Logs en Netlify

```bash
# Ver logs en tiempo real
netlify functions:log
```

### Errores Comunes

1. **"Missing Supabase credentials"**
   - Verificar que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén configuradas
   - No usar `ANON_KEY` en backend, solo `SERVICE_ROLE_KEY`

2. **"Invalid CSRF token"**
   - Token expiró (1 hora)
   - `HMAC_SIGN_SECRET` no configurado o cambió

3. **"Rate limit exceeded"**
   - Esperar tiempo indicado en `Retry-After` header
   - Implementar rate limiting persistente en Supabase

---

**Última actualización**: 2025-11-09
