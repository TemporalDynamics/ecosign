# 🚀 Deploy Rápido - EcoSign

## ❌ PROBLEMA ACTUAL

Las Edge Functions devuelven 500 porque:
1. No están desplegadas en Supabase
2. La tabla `anchors` tiene un schema antiguo/incompatible
3. Faltan tablas en la base de datos

## ✅ SOLUCIÓN RÁPIDA (15 minutos)

### Paso 1: Aplicar Migraciones en Supabase

Ve a: https://supabase.com/dashboard/project/tbxowirrvgtvfnxcdqks

1. **SQL Editor** → New Query
2. Copia y pega el contenido de: `supabase/migrations/20251115140000_006_fix_anchors_table.sql`
3. Click en **RUN**

Esto creará la tabla `anchors` correcta.

### Paso 2: Verificar tabla `integration_requests`

En el mismo SQL Editor, ejecuta:

```sql
-- Verificar si existe integration_requests
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'integration_requests';
```

**Si NO existe**, ejecutar:

```sql
CREATE TABLE IF NOT EXISTS integration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  document_id UUID,
  user_id UUID REFERENCES auth.users(id),
  document_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_intent_id TEXT,
  external_service_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_integration_requests_service ON integration_requests(service);
CREATE INDEX IF NOT EXISTS idx_integration_requests_status ON integration_requests(status);
CREATE INDEX IF NOT EXISTS idx_integration_requests_user ON integration_requests(user_id);

ALTER TABLE integration_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integration requests"
  ON integration_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integration requests"
  ON integration_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON integration_requests TO authenticated;
GRANT ALL ON integration_requests TO service_role;
```

### Paso 3: Desplegar Edge Functions

#### Opción A: Instalar Supabase CLI (recomendado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref tbxowirrvgtvfnxcdqks

# Deploy funciones
supabase functions deploy anchor-bitcoin
supabase functions deploy signnow
supabase functions deploy process-bitcoin-anchors
```

#### Opción B: Usar Supabase Dashboard (más lento)

1. Ve a **Edge Functions** en el dashboard
2. Click **Deploy new function**
3. Sube cada función manualmente:
   - `supabase/functions/anchor-bitcoin/`
   - `supabase/functions/signnow/`
   - `supabase/functions/process-bitcoin-anchors/`

### Paso 4: Configurar Variables de Entorno

En Supabase Dashboard → **Settings** → **Edge Functions** → **Environment Variables**

Agregar:

```bash
SUPABASE_URL=https://tbxowirrvgtvfnxcdqks.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
RESEND_API_KEY=<tu-resend-key>  # Opcional
SIGNNOW_API_KEY=<tu-signnow-key>  # Opcional
```

Para obtener el service role key:
- Dashboard → Settings → API → `service_role` secret

### Paso 5: Probar que Funcione

Desde tu app (http://localhost:5173):

1. **Probar Certificación sin Bitcoin**:
   - Desmarcar "Anclaje en Bitcoin"
   - Certificar → debería funcionar

2. **Probar Certificación con Bitcoin**:
   - Marcar "Anclaje en Bitcoin"
   - Certificar → debería ver mensaje "4-24 horas"

3. **Probar SignNow**:
   - Agregar firma
   - Click "Firmar con SignNow"
   - Debería crear el PDF firmado

---

## 🔧 TROUBLESHOOTING

### "Edge Function returned 500" persiste

Ver logs:
- Dashboard → Edge Functions → anchor-bitcoin → Logs
- Dashboard → Edge Functions → signnow → Logs

Errores comunes:
- `relation "anchors" does not exist` → Aplicar migración del Paso 1
- `Missing Supabase credentials` → Configurar variables del Paso 4

### "Cannot read property 'insert' of undefined"

La tabla no existe. Volver al Paso 1 y 2.

### SignNow devuelve "API key missing"

Normal si no tienes cuenta de SignNow. La función hará fallback a firma local embebida.

---

## 📋 CHECKLIST FINAL

- [ ] Migración `006_fix_anchors_table.sql` aplicada
- [ ] Tabla `integration_requests` existe
- [ ] Edge function `anchor-bitcoin` desplegada
- [ ] Edge function `signnow` desplegada
- [ ] Variables de entorno configuradas
- [ ] Certificación básica funciona
- [ ] Bitcoin anchoring NO da 500 (puede fallar en processing pero no 500)
- [ ] SignNow NO da 500 (puede fallar en API pero no 500)

---

## 🎯 SIGUIENTE: DEPLOY A PRODUCCIÓN

Una vez que todo funcione localmente apuntando a Supabase remoto:

1. Arreglar error de build de Vite (@noble/hashes)
2. Deploy frontend a Vercel
3. Configurar cron job para `process-bitcoin-anchors`
