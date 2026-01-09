# Análisis y Corrección: Certificaciones Bitcoin y Polygon

**Fecha**: 2025-12-21  
**Problema**: Las certificaciones de Bitcoin y Polygon no están funcionando correctamente

## 🔍 Problemas Identificados

### 1. **Edge Functions NO están siendo invocadas desde el cliente** (CRÍTICO)

**Ubicación**: `client/src/utils/documentStorage.ts`

**Problema**: 
- Cuando un usuario certifica un documento, el código solo marca `polygon_status='pending'` y `bitcoin_status='pending'` en la base de datos
- **NUNCA invoca** las edge functions `anchor-bitcoin` o `anchor-polygon`
- Los workers esperan encontrar registros en la tabla `anchors`, pero estos nunca se crean

**Flujo INCORRECTO actual**:
```
Usuario certifica documento 
→ Se guarda en user_documents con status='pending'
→ ❌ NADA MÁS PASA
→ Workers no encuentran nada que procesar
```

**Flujo CORRECTO esperado**:
```
Usuario certifica documento
→ Se guarda en user_documents con status='pending'
→ ✅ Se invoca anchor-bitcoin edge function
→ ✅ Se invoca anchor-polygon edge function
→ Edge functions crean registros en tabla anchors
→ Workers procesan los anchors cada 30s (Polygon) / 5min (Bitcoin)
```

**Corrección aplicada** (líneas 254-354 de documentStorage.ts):
```typescript
// ✅ FIX: Invoke blockchain anchoring edge functions when requested
  
// Polygon Anchoring
if (hasPolygonAnchor && docData.id) {
  try {
    console.log('🔗 Requesting Polygon anchor for document:', docData.id);
    const { data: polygonData, error: polygonError } = await supabase.functions.invoke('anchor-polygon', {
      body: {
        documentHash: documentHash,
        documentId: docData.id,
        userDocumentId: docData.id,
        userId: user.id,
        userEmail: user.email,
        metadata: {
          source: 'certification',
          documentName: pdfFile.name
        }
      }
    });
    // ... error handling
  }
}

// Bitcoin Anchoring (similar structure)
```

### 2. **Polygon Edge Function en MODO MOCK** (CRÍTICO)

**Ubicación**: `supabase/functions/anchor-polygon/index.ts`

**Problema**:
- Todo el código de conexión a blockchain estaba comentado (líneas 86-111)
- Se generaban transacciones FALSAS con hashes mock: `'0xMOCK_TX_HASH_' + documentHash.substring(0, 8)`
- Nunca se enviaban transacciones reales a Polygon

**Código INCORRECTO**:
```typescript
// PRUEBA A: Comentado temporalmente para test
// const provider = new ethers.JsonRpcProvider(rpcUrl)
// const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)
// ... todo comentado

console.log('🧪 MOCK MODE - Skipping blockchain')
const txHash = '0xMOCK_TX_HASH_' + documentHash.substring(0, 8)
```

**Corrección aplicada**:
```typescript
// ✅ PRODUCTION: Real blockchain anchoring
const provider = new ethers.JsonRpcProvider(rpcUrl)
const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)
const sponsorAddress = await sponsorWallet.getAddress()

// Check balance
const balance = await provider.getBalance(sponsorAddress)
if (balance === 0n) {
  return new Response(JSON.stringify({
    error: 'Sponsor wallet has no POL',
    sponsorAddress
  }), { status: 503 })
}

// Contract interaction
const abi = ['function anchorDocument(bytes32 _docHash) external']
const contract = new ethers.Contract(contractAddress, abi, sponsorWallet)
const hashBytes32 = '0x' + documentHash
const tx = await contract.anchorDocument(hashBytes32)
const txHash = tx.hash

console.log('✅ Real transaction submitted to Polygon:', txHash)
```

## 📋 Arquitectura del Sistema

### Flujo Completo de Certificación con Blockchain:

```
1. USUARIO CERTIFICA
   └─> LegalCenterModalV2.tsx
       └─> certifyFile() [basicCertificationWeb.ts]
           └─> saveUserDocument() [documentStorage.ts] ✅ CORREGIDO
               ├─> Guarda en user_documents (status='pending')
               ├─> ✅ NUEVO: Invoca anchor-polygon edge function
               │   └─> Crea registro en tabla 'anchors' (polygon_status='pending')
               └─> ✅ NUEVO: Invoca anchor-bitcoin edge function
                   └─> Crea registro en tabla 'anchors' (anchor_status='queued')

2. WORKERS PROCESAN (Background)
   
   ┌─ POLYGON WORKER (cada 30s)
   │  └─> process-polygon-anchors
   │      ├─> Lee anchors con polygon_status='pending'
   │      ├─> Verifica transacción en blockchain
   │      ├─> Si confirmada: actualiza via anchor_polygon_atomic_tx()
   │      │   ├─> anchors.polygon_status = 'confirmed'
   │      │   ├─> user_documents.polygon_status = 'confirmed'
   │      │   ├─> user_documents.has_polygon_anchor = true
   │      │   └─> upgrade_protection_level() → REINFORCED
   │      └─> Envía notificación
   │
   └─ BITCOIN WORKER (cada 5min)
      └─> process-bitcoin-anchors
          ├─> PASO 1: Procesa anchors con status='queued'
          │   └─> Envía a OpenTimestamps → status='pending'
          │
          └─> PASO 2: Procesa anchors con status='pending'
              ├─> Verifica confirmación en Bitcoin
              ├─> Si confirmada: actualiza via anchor_atomic_tx()
              │   ├─> anchors.anchor_status = 'confirmed'
              │   ├─> user_documents.bitcoin_status = 'confirmed'
              │   ├─> user_documents.has_bitcoin_anchor = true
              │   └─> upgrade_protection_level() → TOTAL
              └─> Envía notificación

3. USUARIO VE RESULTADO
   └─> DashboardPage realtime subscription
       └─> Actualiza UI automáticamente cuando cambia protection_level
```

### Tabla de Estados:

| Campo | Valores Posibles | Propósito |
|-------|-----------------|-----------|
| `overall_status` | draft, sent, pending, signed, rejected, expired, **certified** | Estado del ciclo de vida del documento |
| `protection_level` | **ACTIVE**, **REINFORCED**, **TOTAL** | Jerarquía probatoria (nunca decrece) |
| `polygon_status` | null, **pending**, confirmed, failed | Estado específico de Polygon |
| `bitcoin_status` | null, **pending**, confirmed, failed | Estado específico de Bitcoin |
| `has_polygon_anchor` | false, **true** | Flag conservador (solo true cuando CONFIRMADO) |
| `has_bitcoin_anchor` | false, **true** | Flag conservador (solo true cuando CONFIRMADO) |

## ✅ Verificación de la Solución

### Antes del fix:
```
1. Usuario certifica con Polygon+Bitcoin activado
2. Documento queda en user_documents (polygon_status='pending', bitcoin_status='pending')
3. ❌ Edge functions nunca se invocan
4. ❌ No se crean registros en tabla anchors
5. ❌ Workers no encuentran nada que procesar
6. ❌ Estados quedan en 'pending' para siempre
```

### Después del fix:
```
1. Usuario certifica con Polygon+Bitcoin activado
2. Documento queda en user_documents (polygon_status='pending', bitcoin_status='pending')
3. ✅ Edge function anchor-polygon se invoca → crea registro en anchors
4. ✅ Edge function anchor-bitcoin se invoca → crea registro en anchors
5. ✅ Worker process-polygon-anchors (30s) encuentra el anchor y lo procesa
6. ✅ Transacción REAL se envía a Polygon blockchain
7. ✅ En ~60s: Polygon confirma → polygon_status='confirmed', protection_level='REINFORCED'
8. ✅ Worker process-bitcoin-anchors (5min) encuentra el anchor y lo procesa
9. ✅ Hash se envía a OpenTimestamps
10. ✅ En 4-24h: Bitcoin confirma → bitcoin_status='confirmed', protection_level='TOTAL'
```

## 🔧 Archivos Modificados

1. **`client/src/utils/documentStorage.ts`** (líneas 254-354)
   - ✅ Agregadas invocaciones a anchor-polygon y anchor-bitcoin
   - ✅ Manejo de errores para cada blockchain
   - ✅ Actualización de estados en caso de fallo

2. **`supabase/functions/anchor-polygon/index.ts`** (líneas 86-116)
   - ✅ Descomentado código de producción
   - ✅ Eliminado modo MOCK
   - ✅ Restaurada conexión real a Polygon blockchain

## 📊 Tiempos Esperados

- **Polygon**: ~30-60 segundos (confirmación casi inmediata)
- **Bitcoin**: 4-24 horas (requiere confirmación en blockchain de Bitcoin)

## 🧪 Pruebas Recomendadas

1. **Certificar un documento con Polygon activado**
   ```bash
   # Verificar que se crea el registro en anchors
   SELECT * FROM anchors WHERE anchor_type='polygon' ORDER BY created_at DESC LIMIT 1;
   
   # Verificar que el worker lo procesa en ~30s
   # Revisar logs de process-polygon-anchors
   ```

2. **Certificar un documento con Bitcoin activado**
   ```bash
   # Verificar que se crea el registro en anchors
   SELECT * FROM anchors WHERE anchor_type='opentimestamps' ORDER BY created_at DESC LIMIT 1;
   
   # Verificar que el worker lo procesa en ~5min
   # Revisar logs de process-bitcoin-anchors
   ```

3. **Verificar variables de entorno en Supabase**
   ```bash
   # Asegurarse de que existen:
   - POLYGON_RPC_URL
   - POLYGON_PRIVATE_KEY
   - POLYGON_CONTRACT_ADDRESS
   ```

## 🚀 Próximos Pasos

1. ✅ Deploy de los cambios
2. ⏳ Probar certificación con Polygon
3. ⏳ Probar certificación con Bitcoin
4. ⏳ Verificar que los workers procesan correctamente
5. ⏳ Monitorear logs de las edge functions

## 📝 Notas Adicionales

- El sistema usa **"verdad conservadora"**: los flags `has_polygon_anchor` y `has_bitcoin_anchor` solo se marcan como `true` cuando la blockchain confirma, nunca por intención
- El `protection_level` es **monotónicamente creciente**: ACTIVE → REINFORCED → TOTAL (nunca decrece)
- Los workers tienen **retry logic** y **exponential backoff** para manejar fallos temporales
- Las certificaciones **nunca bloquean la entrega del .eco**: el archivo siempre está disponible inmediatamente, los anchors se resuelven asíncronamente

---

**Status**: ✅ Correcciones aplicadas  
**Build**: ✅ Compilación exitosa  
**Pendiente**: Deploy y testing en producción
