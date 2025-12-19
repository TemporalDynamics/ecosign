# Worker System Design - Blockchain Anchors
**Versión**: 1.0
**Fecha**: 2025-12-18
**Estado**: Diseño aprobado

---

## 🎯 Objetivo

Resolver anchors blockchain de forma **confiable, server-side, y desacoplada del frontend**.

Reemplazar los triggers temporales del frontend con workers robustos que:
- No dependen del navegador abierto
- Resisten timeouts/CORS/network issues
- Escalan independientemente
- Mantienen la invariante: `protection_level` solo sube

---

## 🏗️ Arquitectura

```
user_documents
  ↓
  polygon_status='pending' ──→ [Worker Polygon] ──→ Anchor confirmado
  bitcoin_status='pending' ──→ [Worker Bitcoin] ──→ Anchor confirmado
                                       ↓
                            Update protection_level ↑
```

### Componentes

1. **Edge Function Cron**: `process-polygon-anchors` (ya existe, mejorar)
2. **Edge Function Cron**: `process-bitcoin-anchors` (ya existe, mejorar)
3. **Database Triggers**: Automático upgrade de `protection_level`
4. **Event Log**: ChainLog de todos los cambios

---

## 📋 Especificación Técnica

### 1. Worker Polygon

**Edge Function**: `supabase/functions/process-polygon-anchors/index.ts`

**Trigger**: Cron cada 30 segundos (Supabase Cron)

**Lógica**:
```typescript
1. SELECT * FROM user_documents
   WHERE polygon_status = 'pending'
   AND created_at > NOW() - INTERVAL '1 hour'
   LIMIT 100

2. Para cada documento:
   a. Verificar si ya existe anchor en tabla 'anchors'
   b. Si NO existe:
      - Llamar a Edge Function 'anchor-polygon'
      - Crear registro en 'anchors' con status='pending'
   c. Si existe:
      - Consultar estado en blockchain (via ethers.js)
      - Si confirmado:
         * UPDATE anchors SET polygon_status='confirmed'
         * UPDATE user_documents SET polygon_status='confirmed'
         * Ejecutar DB function upgrade_protection_level(doc_id)
         * Log evento 'anchored_polygon'
      - Si falló N veces:
         * UPDATE polygon_status='failed'
         * NO tocar protection_level

3. Handle errors: retry logic con exponential backoff
```

**Retry Policy**:
- Intento 1: Inmediato
- Intento 2: +2 minutos
- Intento 3: +5 minutos
- Intento 4-10: Cada 30 minutos
- Después de 10 intentos: `polygon_status='failed'`

---

### 2. Worker Bitcoin

**Edge Function**: `supabase/functions/process-bitcoin-anchors/index.ts`

**Trigger**: Cron cada 1 hora (Bitcoin tarda 4-24h)

**Lógica**:
```typescript
1. SELECT * FROM user_documents
   WHERE bitcoin_status = 'pending'
   AND created_at > NOW() - INTERVAL '48 hours'
   LIMIT 100

2. Para cada documento:
   a. Verificar anchor en tabla 'anchors'
   b. Si NO existe:
      - Llamar a opentimestamps.requestBitcoinAnchor()
      - Crear registro con status='pending'
   c. Si existe:
      - Consultar OpenTimestamps API para confirmar
      - Si confirmado:
         * UPDATE bitcoin_status='confirmed'
         * UPDATE user_documents SET bitcoin_status='confirmed'
         * Ejecutar upgrade_protection_level(doc_id)
         * Log evento 'anchored_bitcoin'
      - Si pasaron >48h sin confirmar:
         * Continuar intentando (Bitcoin puede tardar)

3. Email notification cuando confirma
```

**Retry Policy**:
- Polling cada 1 hora durante 48 horas
- Después de 48h: Cada 6 horas
- Timeout definitivo: 7 días → `bitcoin_status='failed'`

---

### 3. Database Function: `upgrade_protection_level()`

**Archivo**: `supabase/migrations/20251218150000_upgrade_protection_level_function.sql`

**Lógica**:
```sql
CREATE OR REPLACE FUNCTION upgrade_protection_level(doc_id UUID)
RETURNS void AS $$
BEGIN
  -- REGLA INNEGOCIABLE: protection_level solo sube

  -- Si Bitcoin confirmado → TOTAL
  UPDATE user_documents
  SET protection_level = 'TOTAL'
  WHERE id = doc_id
    AND bitcoin_status = 'confirmed'
    AND protection_level != 'TOTAL';

  -- Si Polygon confirmado (y Bitcoin no) → REINFORCED
  UPDATE user_documents
  SET protection_level = 'REINFORCED'
  WHERE id = doc_id
    AND polygon_status = 'confirmed'
    AND bitcoin_status != 'confirmed'
    AND protection_level = 'ACTIVE';

  -- NUNCA bajar nivel
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Invariantes garantizadas**:
- `ACTIVE → REINFORCED → TOTAL` (solo hacia arriba)
- Si `bitcoin_status='confirmed'` → siempre `TOTAL`
- Si `polygon_status='confirmed'` y `bitcoin_status!='confirmed'` → `REINFORCED`

---

## 🔄 Flujo Completo (End-to-End)

```
1. User certifica documento
   └→ saveUserDocument()
      └→ polygon_status='pending', protection_level='ACTIVE'

2. Worker Polygon (30s después)
   └→ Detecta polygon_status='pending'
   └→ Llama anchor-polygon Edge Function
   └→ Crea registro en 'anchors'

3. Worker Polygon (1 min después)
   └→ Consulta blockchain
   └→ Confirmado ✅
   └→ UPDATE polygon_status='confirmed'
   └→ CALL upgrade_protection_level(doc_id)
      └→ protection_level: ACTIVE → REINFORCED

4. UI actualiza badge automáticamente (realtime subscription)
   └→ Badge cambia de gris → verde
```

---

## 🛡️ Garantías de Sistema

1. **Idempotencia**: Workers pueden ejecutarse N veces sin duplicar anchors
2. **Atomicidad**: Updates de status + protection_level en transacción
3. **Monotonía**: protection_level nunca decrece
4. **Observabilidad**: Todos los cambios logueados en `events` table
5. **Resiliencia**: Retry logic con exponential backoff

---

## 📊 Métricas de Monitoreo

- `anchors_pending_polygon`: COUNT WHERE polygon_status='pending'
- `anchors_pending_bitcoin`: COUNT WHERE bitcoin_status='pending'
- `anchors_failed_polygon`: COUNT WHERE polygon_status='failed'
- `avg_time_to_polygon_confirm`: AVG(confirmed_at - created_at)
- `protection_level_distribution`: COUNT GROUP BY protection_level

---

## 🚀 Plan de Implementación

### Fase 1: Database Function (5 min)
- [ ] Crear migración `upgrade_protection_level()`
- [ ] Testear con datos de prueba

### Fase 2: Polygon Worker (30 min)
- [ ] Mejorar `process-polygon-anchors` existente
- [ ] Agregar retry logic
- [ ] Integrar con `upgrade_protection_level()`
- [ ] Configurar Supabase Cron (cada 30s)

### Fase 3: Bitcoin Worker (30 min)
- [ ] Mejorar `process-bitcoin-anchors` existente
- [ ] Agregar polling de OpenTimestamps
- [ ] Integrar con `upgrade_protection_level()`
- [ ] Configurar Supabase Cron (cada 1h)

### Fase 4: Frontend Realtime (15 min)
- [ ] Subscribe a cambios en `user_documents.protection_level`
- [ ] Update badge cuando cambie de ACTIVE → REINFORCED → TOTAL

### Fase 5: Cleanup Frontend (5 min)
- [ ] Eliminar triggers temporales de Polygon/Bitcoin
- [ ] Dejar solo el guardado con status='pending'

**Tiempo total estimado**: ~1.5 horas

---

## ✅ Criterios de Éxito

1. ✅ Usuario certifica documento → Recibe badge "Protección Activa" (gris) inmediatamente
2. ✅ Polygon confirma (30s-2min) → Badge cambia a "Protección Reforzada" (verde)
3. ✅ Bitcoin confirma (4-24h) → Badge cambia a "Protección Total" (azul)
4. ✅ Si Polygon falla → Badge queda en "Protección Activa" (no baja)
5. ✅ Si usuario cierra navegador → Workers continúan procesando
6. ✅ Logs muestran toda la cadena de custodia

---

## 🧠 Decisiones de Diseño

### ¿Por qué Cron y no Database Triggers?

**Cron (elegido)**:
- ✅ Control explícito de timing
- ✅ Batch processing eficiente
- ✅ Retry logic más fácil
- ✅ Observabilidad superior

**DB Triggers**:
- ❌ Difícil testear
- ❌ Retry logic compleja
- ❌ Performance impact en writes

### ¿Por qué no WebSockets desde frontend?

**Server-side worker (elegido)**:
- ✅ Funciona si usuario cierra navegador
- ✅ No depende de CORS
- ✅ Retry automático
- ✅ Escalable

**Frontend WebSocket**:
- ❌ Usuario debe estar conectado
- ❌ Mobile background issues
- ❌ Network timeouts
- ❌ No escalable

---

## 📝 Notas Finales

Este diseño cierra el loop completo de certificación verificable:

1. **Certificado nace**: `certifyFile()` → ACTIVE
2. **Certificado se refuerza**: Worker Polygon → REINFORCED
3. **Certificado se maximiza**: Worker Bitcoin → TOTAL
4. **Nunca retrocede**: protection_level monotónico

El sistema ahora es:
- ✅ Auditable
- ✅ Confiable
- ✅ Escalable
- ✅ Legalmente defendible

---

**Próximo paso**: Implementar Fase 1 (Database Function)
