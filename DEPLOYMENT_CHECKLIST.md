# ✅ Checklist: Verificación de Certificaciones Blockchain

## 🔍 Problemas Encontrados y Corregidos

### ✅ PROBLEMA 1: Edge Functions No Invocadas (CRÍTICO)
**Archivo**: `client/src/utils/documentStorage.ts`

**Estado**: ✅ **CORREGIDO**

Las edge functions `anchor-bitcoin` y `anchor-polygon` no estaban siendo invocadas cuando un usuario certificaba un documento. Ahora se invocan correctamente después de guardar en `user_documents`.

### ✅ PROBLEMA 2: Polygon en Modo MOCK (CRÍTICO)
**Archivo**: `supabase/functions/anchor-polygon/index.ts`

**Estado**: ✅ **CORREGIDO**

La función estaba en modo de prueba generando transacciones falsas. Ahora envía transacciones reales a Polygon blockchain.

---

## 📋 Checklist de Verificación Pre-Deploy

Antes de hacer deploy, verifica lo siguiente en Supabase Dashboard:

### 1. Variables de Entorno (Secrets)

Ve a: **Project Settings > Edge Functions > Manage secrets**

Verifica que existen estas 3 variables:

- [ ] `POLYGON_RPC_URL` - URL del proveedor RPC (Alchemy, Infura, etc.)
  - Ejemplo: `https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
  
- [ ] `POLYGON_PRIVATE_KEY` - Clave privada de la wallet sponsor (con fondos POL)
  - Formato: `0x...` (64 caracteres hex después del 0x)
  - ⚠️ **IMPORTANTE**: Esta wallet debe tener POL para pagar gas fees
  
- [ ] `POLYGON_CONTRACT_ADDRESS` - Dirección del contrato desplegado
  - Formato: `0x...` (40 caracteres hex después del 0x)
  - Este debe ser el contrato `DigitalNotary.sol` o `VerifySignAnchor.sol` desplegado en Polygon

**Cómo verificar**:
```bash
# Desde terminal local con Supabase CLI
supabase secrets list --project-ref uiyojopjbhooxrmamaiw

# Debe mostrar:
# POLYGON_RPC_URL = https://polygon-mainnet...
# POLYGON_PRIVATE_KEY = 0x...
# POLYGON_CONTRACT_ADDRESS = 0x...
```

### 2. Cron Jobs (Workers)

Ve a: **Database > Cron Jobs** (o ejecuta en SQL Editor)

Verifica que están activos:

- [ ] `process-polygon-anchors` - Ejecuta cada 30 segundos
  ```sql
  SELECT * FROM cron.job WHERE jobname = 'process-polygon-anchors';
  -- Debe existir y tener schedule = '*/30 * * * *' (o '30 seconds')
  ```

- [ ] `process-bitcoin-anchors` - Ejecuta cada 5 minutos
  ```sql
  SELECT * FROM cron.job WHERE jobname = 'process-bitcoin-anchors';
  -- Debe existir y tener schedule = '*/5 * * * *'
  ```

**Si no existen**, créalos ejecutando:
```sql
-- Polygon worker (cada 30 segundos)
SELECT cron.schedule(
  'process-polygon-anchors',
  '30 seconds',
  $$
  SELECT net.http_post(
    url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-polygon-anchors',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Bitcoin worker (cada 5 minutos)
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-bitcoin-anchors',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### 3. Verificar Wallet Tiene Fondos

**Opción A: Desde Polygonscan**
1. Ve a https://polygonscan.com
2. Busca la address de `POLYGON_PRIVATE_KEY` (puedes obtenerla del contrato)
3. Verifica que tiene balance > 0 POL

**Opción B: Desde código**
```javascript
// En supabase/functions/anchor-polygon puedes ver el balance en logs
// O ejecuta manualmente:
const address = await sponsorWallet.getAddress()
const balance = await provider.getBalance(address)
console.log(`Balance: ${ethers.formatEther(balance)} POL`)
```

**⚠️ IMPORTANTE**: Si balance = 0, envía POL a esa wallet antes de testear.

### 4. Permisos de la Tabla `anchors`

Ve a: **Database > Tables > anchors > RLS policies**

Verifica que existe política para service role:

- [ ] Policy: `Service role can insert anchors`
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'anchors';
  ```

Si no existe, créala:
```sql
-- Permitir insert desde service role (edge functions)
CREATE POLICY "Service role can insert anchors"
ON anchors
FOR INSERT
TO service_role
WITH CHECK (true);

-- Permitir update desde service role (workers)
CREATE POLICY "Service role can update anchors"
ON anchors
FOR UPDATE
TO service_role
USING (true);
```

---

## 🧪 Checklist de Testing Post-Deploy

Después de hacer deploy, ejecuta estas pruebas:

### Test 1: Certificación con Polygon

1. [ ] Ir a la app web
2. [ ] Certificar un documento con **Polygon activado**
3. [ ] Verificar en browser console que aparece:
   ```
   🔗 Requesting Polygon anchor for document: [UUID]
   ✅ Polygon anchor created: {...}
   ```
4. [ ] Esperar ~60 segundos
5. [ ] Verificar en Supabase que:
   ```sql
   SELECT 
     id, 
     document_hash, 
     polygon_status, 
     polygon_tx_hash,
     created_at,
     updated_at
   FROM anchors 
   WHERE anchor_type = 'polygon' 
   ORDER BY created_at DESC 
   LIMIT 1;
   
   -- polygon_status debe cambiar de 'pending' → 'confirmed'
   ```
6. [ ] Verificar transacción en Polygonscan:
   - Ir a: `https://polygonscan.com/tx/[TX_HASH]`
   - Debe mostrar status "Success"

### Test 2: Certificación con Bitcoin

1. [ ] Certificar un documento con **Bitcoin activado**
2. [ ] Verificar en browser console que aparece:
   ```
   🔗 Requesting Bitcoin anchor for document: [UUID]
   ✅ Bitcoin anchor created: [ANCHOR_ID]
   ```
3. [ ] Esperar ~5-10 minutos
4. [ ] Verificar en Supabase que el anchor pasó a `pending`:
   ```sql
   SELECT 
     id, 
     document_hash, 
     anchor_status,
     ots_proof,
     created_at,
     updated_at
   FROM anchors 
   WHERE anchor_type = 'opentimestamps' 
   ORDER BY created_at DESC 
   LIMIT 1;
   
   -- anchor_status debe cambiar de 'queued' → 'pending'
   -- ots_proof debe tener valor (base64)
   ```
5. [ ] **Esperar 4-24 horas** (Bitcoin es lento)
6. [ ] Verificar confirmación:
   ```sql
   SELECT 
     id, 
     anchor_status, 
     bitcoin_tx, 
     bitcoin_block_height,
     confirmed_at
   FROM anchors 
   WHERE id = '[ANCHOR_ID]';
   
   -- anchor_status debe ser 'confirmed'
   -- bitcoin_tx debe tener valor
   ```

### Test 3: Verificar Actualización de Protection Level

1. [ ] Después de que Polygon confirme (~60s):
   ```sql
   SELECT 
     id,
     document_name,
     protection_level,
     polygon_status,
     has_polygon_anchor
   FROM user_documents 
   WHERE id = '[DOC_ID]';
   
   -- protection_level debe ser 'REINFORCED'
   -- polygon_status = 'confirmed'
   -- has_polygon_anchor = true
   ```

2. [ ] Después de que Bitcoin confirme (4-24h):
   ```sql
   SELECT 
     id,
     document_name,
     protection_level,
     bitcoin_status,
     has_bitcoin_anchor
   FROM user_documents 
   WHERE id = '[DOC_ID]';
   
   -- protection_level debe ser 'TOTAL'
   -- bitcoin_status = 'confirmed'
   -- has_bitcoin_anchor = true
   ```

---

## 🔍 Debugging: Qué hacer si algo falla

### Si Polygon no confirma después de 2 minutos:

1. **Ver logs del worker**:
   ```bash
   supabase functions logs process-polygon-anchors --tail 50
   ```

2. **Verificar manualmente el anchor**:
   ```sql
   SELECT * FROM anchors 
   WHERE anchor_type = 'polygon' 
   AND polygon_status IN ('pending', 'processing')
   ORDER BY created_at DESC;
   ```

3. **Ver error específico**:
   ```sql
   SELECT 
     id,
     polygon_tx_hash,
     polygon_status,
     polygon_error_message,
     polygon_attempts
   FROM anchors 
   WHERE polygon_status = 'failed';
   ```

### Si Bitcoin no avanza de 'queued':

1. **Ver logs del worker**:
   ```bash
   supabase functions logs process-bitcoin-anchors --tail 50
   ```

2. **Verificar que OpenTimestamps está respondiendo**:
   - Probar manualmente: https://opentimestamps.org/
   - Ver si `ots_proof` tiene valor en la BD

3. **Ver intentos**:
   ```sql
   SELECT 
     id,
     anchor_status,
     bitcoin_attempts,
     bitcoin_error_message,
     updated_at
   FROM anchors 
   WHERE anchor_type = 'opentimestamps'
   AND anchor_status IN ('queued', 'pending', 'processing');
   ```

### Si la transacción de Polygon falla:

1. **Verificar balance de la wallet**:
   - Ir a Polygonscan con la address
   - Debe tener al menos 0.01 POL

2. **Ver si el contrato existe**:
   ```bash
   # En Polygonscan buscar POLYGON_CONTRACT_ADDRESS
   # Debe mostrar "Contract" (no solo una address)
   ```

3. **Ver el error exacto en Polygonscan**:
   - Buscar el `polygon_tx_hash` en Polygonscan
   - Si status = "Failed", ver el error message

---

## 📊 Métricas de Éxito

Después de 1 hora de testing:

- [ ] Al menos 1 documento certificado con Polygon → `protection_level = 'REINFORCED'`
- [ ] Al menos 1 documento certificado con Bitcoin → `anchor_status = 'pending'` (confirmación tardará 4-24h)
- [ ] Worker de Polygon ejecutándose sin errores (ver logs)
- [ ] Worker de Bitcoin ejecutándose sin errores (ver logs)
- [ ] No hay anchors en estado `failed` (o si los hay, entiendes por qué)

---

## 📝 Notas Finales

- **Polygon**: Confirmación instantánea (~30-60s), requiere POL en wallet
- **Bitcoin**: Confirmación lenta (4-24h), no requiere wallet (usa OpenTimestamps)
- **Workers**: Ejecutan automáticamente cada 30s (Polygon) y 5min (Bitcoin)
- **Protection Level**: Crece monotónicamente (ACTIVE → REINFORCED → TOTAL)
- **Failsafe**: Si Polygon falla, el certificado sigue siendo válido (ACTIVE level con TSA)

---

**Estado del Fix**: ✅ Código corregido y listo para deploy  
**Build Status**: ✅ Compilación exitosa sin errores  
**Siguiente Paso**: Deploy y ejecutar este checklist 🚀
