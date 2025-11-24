# ❌ → ✅ Arreglar Errores 500 en Edge Functions

## 🎯 PROBLEMA

```
POST https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/anchor-bitcoin 500
POST https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/signnow 500
```

**Causa**: Las funciones no están desplegadas y/o la base de datos no tiene las tablas correctas.

---

## 🚀 SOLUCIÓN RÁPIDA (10 minutos)

### ✅ Paso 1: Aplicar SQL en Supabase Dashboard

1. Abre: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/sql/new

2. Copia TODO el contenido de: `supabase/APPLY_THIS_IN_DASHBOARD.sql`

3. Pega en el SQL Editor y click **RUN**

4. Deberías ver al final:
   ```
   anchors              | 17
   integration_requests | 10
   ```

✅ **DONE**: Tablas creadas

---

### ✅ Paso 2: Desplegar Edge Functions

**Opción A - Automático (recomendado)**:

```bash
# En la terminal, desde la raíz del proyecto
./scripts/deploy-functions.sh
```

Si dice "supabase command not found", primero:
```bash
npm install -g supabase
supabase login
```

**Opción B - Manual**:

```bash
npm install -g supabase
supabase login
supabase link --project-ref uiyojopjbhooxrmamaiw

supabase functions deploy anchor-bitcoin
supabase functions deploy signnow
supabase functions deploy process-bitcoin-anchors
```

✅ **DONE**: Funciones desplegadas

---

### ✅ Paso 3: Configurar Variables de Entorno

1. Abre: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/settings/functions

2. En "Environment Variables" agregar:

```bash
SUPABASE_URL=https://uiyojopjbhooxrmamaiw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<copiar-de-Settings-API>
```

**Opcional** (para funcionalidad completa):
```bash
RESEND_API_KEY=<tu-resend-key>
SIGNNOW_API_KEY=<tu-signnow-key>
```

Para obtener `SUPABASE_SERVICE_ROLE_KEY`:
- Dashboard → Settings → API → `service_role` secret

✅ **DONE**: Variables configuradas

---

## 🧪 Paso 4: PROBAR

Desde tu app (http://localhost:5173):

### Test 1: Certificación Básica

1. Dashboard → Certificar documento
2. **Desmarcar** "Timestamp legal" y "Bitcoin"
3. Certificar

**Esperado**: ✅ Descarga archivo .ecox

---

### Test 2: Bitcoin Anchoring

1. Dashboard → Certificar documento
2. **Marcar** "Anclaje en Bitcoin"
3. Certificar

**Esperado**:
- ✅ Se genera certificado
- ✅ Mensaje: "El anclaje blockchain puede tardar 4-24 horas"
- ✅ NO error 500

**Ver en logs**:
```
🔗 Requesting Bitcoin anchoring (OpenTimestamps)...
⏱️  This process takes 4-24 hours for blockchain confirmation
✅ Bitcoin anchoring queued successfully
```

---

### Test 3: SignNow

1. Dashboard → Certificar documento
2. Paso "Firma legal" → Dibujar firma → Guardar
3. Click "Firmar con SignNow"

**Esperado**:
- ✅ NO error 500
- ⚠️ Puede fallar con "SIGNNOW_API_KEY missing" (normal si no tienes cuenta)
- Si falla: Debería hacer fallback a firma embebida local

---

## 🐛 TROUBLESHOOTING

### Error persiste: "relation anchors does not exist"

→ Volver al Paso 1, asegurarse que el SQL se ejecutó correctamente

### Error: "Edge Function returned 500" en anchor-bitcoin

Ver logs detallados:
1. https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/functions/anchor-bitcoin/logs
2. Buscar el error específico

Errores comunes:
- `Missing Supabase credentials` → Paso 3 no completado
- `permission denied for table` → Falta `GRANT ALL TO service_role`

### Error: "supabase: command not found"

```bash
npm install -g supabase

# Si falla, probar con sudo
sudo npm install -g supabase
```

### No puedo hacer login en supabase CLI

```bash
supabase login

# Si falla, obtener access token manualmente:
# 1. https://supabase.com/dashboard/account/tokens
# 2. Crear nuevo token
# 3. SUPABASE_ACCESS_TOKEN=<token> supabase login
```

---

## ✅ CHECKLIST FINAL

- [ ] SQL ejecutado en dashboard (tablas creadas)
- [ ] Edge Functions desplegadas (3 funciones)
- [ ] Variables de entorno configuradas
- [ ] Test 1: Certificación básica funciona
- [ ] Test 2: Bitcoin anchoring NO da 500
- [ ] Test 3: SignNow NO da 500

---

## 📋 SIGUIENTE PASO: DEPLOY A PRODUCCIÓN

Una vez que TODO funcione (sin errores 500):

Ver: `DEPLOY_TO_PRODUCTION.md` (próximamente)

O saltar directamente a arreglar el error de build:
- `npm run build` en client/ actualmente falla
- Problema: `@noble/hashes` conflicto con polyfills
- Solución en siguiente sesión
