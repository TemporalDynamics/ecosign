# Blockchain Anchoring con OpenTimestamps

## ¿Qué es?

**OpenTimestamps** es un protocolo descentralizado que ancla timestamps en la blockchain de Bitcoin, proporcionando prueba inmutable de existencia sin costos de transacción.

## Implementación Actual (MVP)

### ✅ Lo que tenemos

1. **Interfaz de usuario completa**
   - Toggle para activar blockchain anchoring
   - Badge naranja "BLOCKCHAIN" en resultados
   - Estado pending/confirmed
   - Integración visual perfecta

2. **Integración en el flujo de certificación**
   - Opción `useBlockchainAnchoring` en certificación
   - Proof almacenado en manifest .ecox
   - Metadata completa en certificaciones

3. **Servicio de blockchain simplificado**
   - `openTimestampsService.js` - API lista
   - Creación de proof structure
   - Verificación básica

### ⚠️ Limitación actual

**Implementación simplificada para browser:**
- No usa librería oficial `opentimestamps` (tiene dependencias Node.js)
- Crea **mock proof** con estructura JSON
- **NO envía realmente a calendar servers**
- **NO genera proofs reales de Bitcoin**

## Roadmap para Producción

### Opción 1: Backend API (Recomendado)

**Crear endpoint de servidor que use la librería real:**

```javascript
// api/blockchain-timestamp.js (Vercel/Netlify function)
import OpenTimestamps from 'opentimestamps';

export default async function handler(req, res) {
  const { hash } = req.body;

  // Usa librería oficial OpenTimestamps
  const detached = OpenTimestamps.DetachedTimestampFile.fromHash(
    new OpenTimestamps.Ops.OpSHA256(),
    Buffer.from(hash, 'hex')
  );

  await OpenTimestamps.stamp(detached);

  const proof = detached.serializeToBytes();

  res.json({
    success: true,
    proof: proof.toString('base64')
  });
}
```

**Ventajas:**
- ✅ Usa protocolo oficial OpenTimestamps
- ✅ Pruebas realmente ancladas en Bitcoin
- ✅ Verificación 100% válida
- ✅ Compatible con opentimestamps.org

**Implementación:**
```bash
# 1. Instalar en servidor
npm install opentimestamps

# 2. Crear función serverless
/api/blockchain-timestamp.js

# 3. Actualizar openTimestampsService.js para llamar API
const response = await fetch('/api/blockchain-timestamp', {
  method: 'POST',
  body: JSON.stringify({ hash })
});
```

### Opción 2: Polygon Direct (Para clientes premium)

**Smart contract simple en Polygon:**

```solidity
// TimestampRegistry.sol
contract TimestampRegistry {
    mapping(bytes32 => uint256) public timestamps;

    event Timestamped(bytes32 hash, uint256 timestamp);

    function register(bytes32 hash) public {
        require(timestamps[hash] == 0, "Already timestamped");
        timestamps[hash] = block.timestamp;
        emit Timestamped(hash, block.timestamp);
    }

    function verify(bytes32 hash) public view returns (uint256) {
        return timestamps[hash];
    }
}
```

**Costo:** ~$0.001 por timestamp (necesitas MATIC)

**Ventajas:**
- ✅ Control total
- ✅ Verificación instant
- ✅ Permanente en blockchain
- ✅ Puede cobrar a clientes

### Opción 3: Híbrida (Mi recomendación)

**Combinar ambos para máximo valor:**

```javascript
// Para usuarios gratis
if (user.plan === 'free') {
  // Usa OpenTimestamps (gratis, backend API)
  await createOTSTimestamp(hash);
}

// Para usuarios premium
if (user.plan === 'premium') {
  // Usa ambos: OTS + Polygon
  await createOTSTimestamp(hash);
  await createPolygonTimestamp(hash); // $0.001
}
```

**Niveles de servicio:**
- **Free:** RFC 3161 + OpenTimestamps (Bitcoin)
- **Basic ($5/mes):** Todo lo anterior + dashboard
- **Premium ($20/mes):** Todo + Polygon direct + API access
- **Enterprise ($100/mes):** Todo + custom blockchain + SLA

## Cómo continuar

### Para implementar OpenTimestamps real:

1. **Crear función serverless:**
```bash
cd /home/manu/verifysign
mkdir -p api
touch api/blockchain-timestamp.js
```

2. **Copiar código del ejemplo Opción 1**

3. **Actualizar `openTimestampsService.js`:**
```javascript
export async function createBlockchainTimestamp(hashHex) {
  const response = await fetch('/api/blockchain-timestamp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash: hashHex })
  });

  const result = await response.json();
  return result;
}
```

4. **Deploy:**
```bash
vercel deploy
```

### Para implementar Polygon:

1. **Comprar MATIC** (como dijiste que harías)
   - Binance: 20-50 MATIC (~$10-25)

2. **Deploy smart contract:**
```bash
# Instalar Hardhat
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Deploy a Polygon Mumbai (testnet)
npx hardhat run scripts/deploy.js --network mumbaiPolygon

# Deploy a Polygon Mainnet (producción)
npx hardhat run scripts/deploy.js --network polygon
```

3. **Crear servicio Polygon:**
```javascript
// polygonService.js
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider(
  'https://polygon-rpc.com'
);

const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  ABI,
  signer
);

export async function timestampOnPolygon(hash) {
  const tx = await contract.register(hash);
  await tx.wait();
  return tx.hash;
}
```

## Valor agregado

### Comparación de métodos:

| Método | Costo | Tiempo | Validez Legal | Descentralización |
|--------|-------|--------|---------------|-------------------|
| **Local timestamp** | Gratis | Instant | ❌ Baja | ❌ |
| **RFC 3161 (TSA)** | Gratis | 1 seg | ✅ Alta | ⚠️ Centralizado |
| **OpenTimestamps** | Gratis | ~10 min | ✅ Alta | ✅ Total |
| **Polygon Direct** | $0.001 | ~3 seg | ✅ Media-Alta | ✅ Alta |
| **Ethereum** | $5-50 | ~15 seg | ✅ Máxima | ✅ Máxima |

### **Tu ventaja competitiva:**

**Triple timestamp (único en el mercado):**
1. RFC 3161 (TSA) → Validez legal inmediata
2. OpenTimestamps → Prueba Bitcoin descentralizada
3. Polygon (premium) → Confirmación rápida + permanente

**Nadie más ofrece esto gratis!**

## Próximos pasos

1. **Mientras consigues MATIC:**
   - Implementar backend API para OTS real
   - Testear con usuarios reales
   - Monitorear calendario servers

2. **Cuando tengas MATIC:**
   - Deploy smart contract a Polygon
   - Crear servicio de timestamping
   - Agregar tier "Premium" con Polygon

3. **Marketing:**
   - "Triple Timestamp Certification™"
   - "Legal + Blockchain + Permanente"
   - "Gratis para siempre (OpenTimestamps)"

## Referencias

- **OpenTimestamps:** https://opentimestamps.org/
- **Documentación API:** https://opentimestamps.org/docs/javascript-opentimestamps/
- **Calendar servers:** https://github.com/opentimestamps/opentimestamps-server
- **Polygon docs:** https://docs.polygon.technology/
- **Smart contracts:** https://hardhat.org/

---

**Estado actual del proyecto:**
- ✅ UI implementada
- ✅ Flujo de certificación listo
- ⏳ Esperando backend API para OTS real
- ⏳ Esperando MATIC para Polygon

**¿Listo para continuar?** 🚀
