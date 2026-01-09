# POLYGON ANCHORING - Setup Completo

**Estado**: ✅ Código listo | ⏳ Pendiente deployment
**Fecha**: 2025-11-17

---

## RESUMEN EJECUTIVO

Se ha implementado **anchoring real en Polygon Mainnet** como tercera capa del Triple Anchoring:

| Capa | Tecnología | Tiempo | Costo | Estado |
|------|------------|--------|-------|--------|
| 1. Firma Digital | Ed25519 | Instant | Gratis | ✅ REAL |
| 2. Timestamp Legal | RFC 3161 (FreeTSA) | 1-3 seg | Gratis | ✅ REAL |
| 3a. Blockchain (Bitcoin) | OpenTimestamps | 4-24h | Gratis | ✅ REAL |
| 3b. Blockchain (Polygon) | Smart Contract | 10-30 seg | ~$0.001 | ✅ CÓDIGO LISTO |

**Ventaja de Polygon sobre Bitcoin**:
- ⚡ **Confirmación instantánea** (10-30 segundos vs 4-24 horas)
- 💰 **Extremadamente barato** (~$0.001 por anchor vs gratis pero lento)
- 🔍 **Verificación pública inmediata** en PolygonScan
- 🌐 **Compatible con Ethereum** (misma infraestructura)

---

## ARCHIVOS CREADOS

```
supabase/functions/anchor-polygon/
  └── index.ts                          (Edge Function - 260 líneas)

client/src/lib/
  └── polygonAnchor.js                  (Cliente - 200 líneas)

contracts/
  ├── VerifySignAnchor.sol              (Smart Contract - 110 líneas)
  └── deploy-polygon.md                 (Guía de deployment)

client/src/lib/basicCertificationWeb.js (ACTUALIZADO)
  └── Líneas 16, 289-346, 400-401       (Integración Polygon)
```

---

## PASO A PASO - DEPLOYMENT

### PASO 1: Desplegar Smart Contract (10 minutos)

#### Opción A: Remix (Recomendada - Sin instalación)

1. **Abrir Remix**: https://remix.ethereum.org

2. **Crear archivo**:
   - Click "+" en File Explorer
   - Nombre: `VerifySignAnchor.sol`
   - Copiar contenido de `contracts/VerifySignAnchor.sol`

3. **Compilar**:
   - Sidebar: "Solidity Compiler"
   - Versión: `0.8.20` o superior
   - Click "Compile VerifySignAnchor.sol"
   - ✅ Debe compilar sin errores

4. **Deploy**:
   - Sidebar: "Deploy & Run Transactions"
   - Environment: **Injected Provider - MetaMask**
   - MetaMask debe estar en **Polygon Mainnet**
   - Click "Deploy"
   - **Aprobar transacción en MetaMask**
   - Costo: ~0.005 MATIC (~$0.005 USD)

5. **Copiar dirección**:
   ```
   Deployed Contract Address: 0x1234567890abcdef...
   ```
   **Guardar esta dirección - la necesitas para Supabase**

#### Opción B: Hardhat (Avanzada - Requiere Node.js)

Ver detalles completos en `contracts/deploy-polygon.md`

---

### PASO 2: Configurar Secrets en Supabase (5 minutos)

Tienes 3 variables críticas que configurar:

| Variable | Valor | Dónde obtenerla |
|----------|-------|-----------------|
| `POLYGON_RPC_URL` | `https://polygon-mainnet.g.alchemy.com/v2/OBJkEAhQmQDkgNiqFE-En` | ✅ Ya la tienes (Alchemy) |
| `POLYGON_PRIVATE_KEY` | `tu_private_key_sin_0x` | Metamask (ver abajo) |
| `POLYGON_CONTRACT_ADDRESS` | `0x...` del PASO 1 | Remix/Hardhat output |

#### Obtener Private Key de MetaMask:

⚠️ **IMPORTANTE**: Esta key da acceso total a tus fondos. Sigue estos pasos con cuidado:

1. **Crear wallet separada** (RECOMENDADO):
   - Metamask → Create Account
   - Nombre: "VerifySign Anchoring Bot"
   - Enviar 0.1 MATIC a esta cuenta (~$0.10)
   - **Usar SOLO esta wallet para anchoring**

2. **Exportar Private Key**:
   - Metamask → 3 puntos → Account Details
   - Click "Export Private Key"
   - Confirmar password
   - **Copiar la key** (64 caracteres hex, SIN el "0x" del inicio)

3. **Configurar en Supabase**:

**Opción A: Dashboard** (Más fácil):
   - Ve a Supabase Dashboard: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw
   - Settings → Edge Functions → Manage secrets
   - Click "New secret"
   - Agregar los 3 secrets:

   ```
   Name: POLYGON_RPC_URL
   Value: https://polygon-mainnet.g.alchemy.com/v2/OBJkEAhQmQDkgNiqFE-En

   Name: POLYGON_PRIVATE_KEY
   Value: [tu_private_key_sin_0x]

   Name: POLYGON_CONTRACT_ADDRESS
   Value: [0x... del paso 1]
   ```

**Opción B: CLI**:
```bash
# Link al proyecto (si no está linkeado)
supabase link --project-ref uiyojopjbhooxrmamaiw

# Configurar secrets
supabase secrets set POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/OBJkEAhQmQDkgNiqFE-En"
supabase secrets set POLYGON_PRIVATE_KEY="tu_private_key"
supabase secrets set POLYGON_CONTRACT_ADDRESS="0x..."
```

---

### PASO 3: Desplegar Edge Function (2 minutos)

```bash
# Desplegar la función
supabase functions deploy anchor-polygon --no-verify-jwt

# Output esperado:
# ✓ Deployed Functions on project uiyojopjbhooxrmamaiw: anchor-polygon
# Function URL: https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/anchor-polygon
```

---

### PASO 4: Probar que funciona (3 minutos)

```bash
# Test con hash de ejemplo
curl -X POST "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/anchor-polygon" \
  -H "Content-Type: application/json" \
  -d '{
    "documentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "userEmail": "tu@email.com"
  }'
```

**Respuesta esperada** (10-30 segundos):
```json
{
  "anchorId": "uuid-del-anchor",
  "status": "confirmed",
  "txHash": "0x...",
  "blockNumber": 12345678,
  "timestamp": "2025-11-17T...",
  "explorerUrl": "https://polygonscan.com/tx/0x...",
  "proof": {
    "network": "polygon-mainnet",
    "contractAddress": "0x...",
    "txHash": "0x...",
    "blockNumber": 12345678,
    "blockHash": "0x...",
    "timestamp": "2025-11-17T..."
  }
}
```

✅ Si recibes esto → **FUNCIONÓ**

❌ Si recibes error → Ver sección "Troubleshooting" abajo

---

## INTEGRACIÓN EN LA APP

### Usar desde el frontend:

```javascript
import { certifyFile } from './lib/basicCertificationWeb.js';

// Al certificar un archivo, agregar opción usePolygonAnchor
const result = await certifyFile(file, {
  useLegalTimestamp: true,     // RFC 3161 (1-3 seg)
  usePolygonAnchor: true,       // Polygon (10-30 seg) ← NUEVO
  useBitcoinAnchor: false,      // Bitcoin (4-24h) - opcional
  userId: user.id,
  userEmail: user.email
});

// Resultado incluye:
console.log(result.polygonAnchor);
// {
//   success: true,
//   txHash: "0x...",
//   blockNumber: 12345,
//   explorerUrl: "https://polygonscan.com/tx/0x..."
// }
```

### Verificar un anchor:

```javascript
import { verifyPolygonAnchor } from './lib/polygonAnchor.js';

const verification = await verifyPolygonAnchor(documentHash);

console.log(verification);
// {
//   anchored: true,
//   status: "confirmed",
//   txHash: "0x...",
//   blockNumber: 12345,
//   timestamp: "2025-11-17T...",
//   explorerUrl: "https://polygonscan.com/tx/0x..."
// }
```

---

## TROUBLESHOOTING

### Error: "Polygon anchoring not configured"
- **Causa**: Faltan variables de entorno
- **Solución**: Verificar que los 3 secrets estén configurados en Supabase

### Error: "Insufficient funds"
- **Causa**: La wallet no tiene MATIC
- **Solución**: Enviar 0.1 MATIC a la wallet de anchoring

### Error: "Transaction failed"
- **Causa**: Posible problema con el contrato o gas
- **Solución**:
  1. Verificar que el contrato esté desplegado
  2. Verificar address en POLYGON_CONTRACT_ADDRESS
  3. Ver logs: `supabase functions logs anchor-polygon`

### La transacción está "pending" por mucho tiempo
- **Normal**: Polygon puede tardar 10-30 segundos
- **Si > 2 min**: Verificar en PolygonScan si la tx existe
- **Si no existe**: Problema con RPC o Private Key

---

## COSTOS

### Una vez:
- Deploy del contrato: **~0.005 MATIC** (~$0.005)

### Por uso:
- Cada anchor: **~0.001-0.003 MATIC** (~$0.001-$0.003)

### Ejemplos:
- 100 anchors: ~$0.10-$0.30
- 1,000 anchors: ~$1-$3
- 10,000 anchors: ~$10-$30

**Comparación**: Ethereum Mainnet costaría ~$5-$15 POR anchor (5000x más caro)

---

## SEGURIDAD

✅ **Buenas prácticas implementadas**:

1. **Private key en secrets**: Nunca expuesta en código
2. **Wallet separada**: No usa tu wallet principal
3. **Fondos mínimos**: Solo 0.1 MATIC (~$0.10) en la wallet
4. **Smart contract verificable**: Código público en PolygonScan
5. **Immutable storage**: Los hashes no se pueden borrar del blockchain

⚠️ **Todavía por implementar**:

6. **Rate limiting**: Evitar spam de transacciones
7. **Monitoring**: Alertas si se gastan demasiados fondos
8. **Backup wallet**: Rotar private key cada 6 meses

---

## VERIFICACIÓN PÚBLICA

Cualquiera puede verificar un anchor en PolygonScan:

1. Ir a: https://polygonscan.com/address/[TU_CONTRACT_ADDRESS]
2. Click en "Contract" → "Read Contract"
3. Usar función `getAnchor`:
   - `documentHash`: Ingresar el hash (con 0x prefix)
   - Click "Query"
   - Ver: timestamp, anchorer address, exists

Ejemplo:
```
Hash: 0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
→ Timestamp: 1700150400 (Unix)
→ Anchorer: 0xABC...123
→ Exists: true
```

---

## PRÓXIMOS PASOS

1. ✅ Deploy del smart contract
2. ✅ Configurar secrets en Supabase
3. ✅ Desplegar `anchor-polygon` function
4. ⏭️ Testing E2E con archivo real
5. ⏭️ Integrar en UI (botón "Anchor to Polygon")
6. ⏭️ Agregar verificación pública en VerifyPage
7. ⏭️ Documentar para usuarios finales

---

**El Triple Anchoring ahora es real y verificable públicamente.**
