# Security Best Practices - EcoSign

## Gestión de Secretos en Supabase Edge Functions

### ✅ Estado Actual: SEGURO

Las claves privadas y secretos están gestionados de forma segura usando **Supabase Secrets Management**.

### Cómo Funciona

1. **Supabase Secrets** es un sistema de gestión de secretos integrado que:
   - Almacena secretos de forma **cifrada**
   - Solo son accesibles desde Edge Functions autorizadas
   - No se exponen en logs ni en el cliente
   - Se gestionan via CLI o Dashboard de Supabase

2. **Acceso Correcto a Secretos:**
   ```typescript
   // ✅ CORRECTO - Acceso a secretos gestionados por Supabase
   const privateKey = Deno.env.get('POLYGON_PRIVATE_KEY')
   const apiKey = Deno.env.get('RESEND_API_KEY')
   ```

3. **Lo que NO debes hacer:**
   ```typescript
   // ❌ INCORRECTO - Hardcodear secretos en código
   const privateKey = "0x1234567890abcdef..."

   // ❌ INCORRECTO - Exponer secretos en el frontend
   // client/src/lib/config.ts
   export const PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY
   ```

### Secretos Configurados

Los siguientes secretos están configurados en Supabase (verificado 2025-11-30):

#### Blockchain & Anchoring
- `POLYGON_PRIVATE_KEY` - Clave privada para transacciones en Polygon
- `POLYGON_RPC_URL` - Endpoint RPC de Polygon
- `POLYGON_CONTRACT_ADDRESS` - Dirección del contrato de anclaje
- `BITCOIN_OTS_CALENDAR` - URL del calendario OpenTimestamps

#### Account Abstraction (Biconomy)
- `BICONOMY_BUNDLER_API_KEY`
- `BICONOMY_BUNDLER_ID`
- `BICONOMY_BUNDLER_URL`
- `BICONOMY_PAYMASTER_API_KEY`
- `BICONOMY_PAYMASTER_ID`
- `BICONOMY_PAYMASTER_URL`

#### Email & Notifications
- `RESEND_API_KEY` - API key para envío de emails

#### SignNow Integration
- `SIGNNOW_API_KEY`
- `SIGNNOW_APP_ID`
- `SIGNNOW_BASIC_TOKEN`
- `SIGNNOW_CLIENT_ID`
- `SIGNNOW_CLIENT_SECRET`
- `SIGNNOW_WEBHOOK_SECRET`
- `SIGNNOW_API_BASE_URL`

#### Encryption & Security
- `MASTER_ENCRYPTION_KEY` - Clave maestra para cifrado de datos
- `NDA_ENCRYPTION_KEY` - Clave para cifrado de NDAs
- `ECO_SIGNING_PRIVATE_KEY` - Clave privada para firmas internas
- `ECO_SIGNING_PUBLIC_KEY` - Clave pública correspondiente
- `CSRF_SECRET` - Secreto para protección CSRF

#### Multi-Factor Authentication
- `MFA_SERVICE_API_KEY`
- `MFA_SERVICE_SID`

#### PKI & Certificates
- `TSA_URL` - URL del Time Stamping Authority
- `OCSP_RESPONDER_URL` - URL del servicio OCSP

#### Supabase Internal (auto-gestionados)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

### Comandos de Gestión

#### Ver lista de secretos (solo nombres y hashes)
```bash
supabase secrets list
```

#### Establecer un secreto
```bash
supabase secrets set SECRET_NAME=value
```

#### Establecer múltiples secretos desde archivo .env
```bash
# 1. Crear archivo temporal con secretos
cat > /tmp/secrets.env << EOF
NEW_SECRET_KEY=value
ANOTHER_SECRET=value2
EOF

# 2. Cargar secretos
supabase secrets set --env-file /tmp/secrets.env

# 3. IMPORTANTE: Eliminar archivo temporal
rm /tmp/secrets.env
```

#### Eliminar un secreto
```bash
supabase secrets unset SECRET_NAME
```

### Desarrollo Local

Para desarrollo local, crea el archivo `supabase/functions/.env`:

```bash
# supabase/functions/.env
POLYGON_PRIVATE_KEY=your_test_key_here
RESEND_API_KEY=your_test_key_here
# ... otros secretos para testing
```

**⚠️ CRÍTICO:**
1. Asegúrate de que `.env` esté en `.gitignore`
2. Usa claves de TESTNET para desarrollo
3. NUNCA comitees este archivo al repositorio

### Verificación de Seguridad

Para verificar que no hay secretos expuestos en el código:

```bash
# Buscar posibles secretos hardcodeados
grep -r "private.key\|api.key\|secret" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" client/src/

# Verificar que .env está ignorado
git check-ignore supabase/functions/.env
```

### Rotación de Claves

Si sospechas que una clave privada ha sido comprometida:

1. **Generar nueva clave:**
   ```bash
   # Para blockchain (Ethereum/Polygon)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Actualizar en Supabase:**
   ```bash
   supabase secrets set POLYGON_PRIVATE_KEY=NEW_KEY_HERE
   ```

3. **Redesplegar funciones afectadas:**
   ```bash
   supabase functions deploy anchor-polygon
   ```

4. **Actualizar wallet address en database si es necesario**

### Auditoría

Último review de seguridad: 2025-11-30
- ✅ Todas las claves privadas están en Supabase Secrets
- ✅ No hay secretos hardcodeados en el código
- ✅ Archivo .env está en .gitignore
- ✅ Edge Functions acceden correctamente a secretos vía Deno.env.get()

### Referencias

- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [Environment Variables Best Practices](https://supabase.com/docs/guides/functions/secrets)
- [Edge Functions Security](https://supabase.com/docs/guides/functions)

### Contacto para Incidentes de Seguridad

Si detectas una vulnerabilidad de seguridad, reporta inmediatamente a:
- Email: [security@ecosign.app] (configurar)
- Crear issue privado en GitHub con label "security"
