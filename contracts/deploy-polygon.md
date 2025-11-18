# Deployment de Smart Contract en Polygon Mainnet

## Prerrequisitos

1. **Cuenta Alchemy configurada** ✅ (ya tienes la URL)
2. **Metamask con fondos**:
   - Necesitas ~0.01 MATIC (~$0.01 USD) para gas
   - Dirección de Metamask debe tener MATIC en Polygon Mainnet

## Opción 1: Deploy con Remix (Más Fácil)

### Paso 1: Preparar el contrato
1. Ve a https://remix.ethereum.org
2. Crea nuevo archivo: `VerifySignAnchor.sol`
3. Copia el contenido de `contracts/VerifySignAnchor.sol`

### Paso 2: Compilar
1. Click en "Solidity Compiler" (icono de S)
2. Selecciona versión: `0.8.20` o superior
3. Click "Compile VerifySignAnchor.sol"
4. Debe compilar sin errores

### Paso 3: Deploy
1. Click en "Deploy & Run Transactions" (icono de Ethereum)
2. En "Environment" selecciona: **Injected Provider - MetaMask**
3. MetaMask debe conectarse a **Polygon Mainnet** (verifica la red)
4. Click "Deploy"
5. MetaMask pedirá confirmación → **Aprobar transacción**
6. Espera 10-30 segundos

### Paso 4: Copiar dirección del contrato
1. Una vez desplegado, verás el contrato bajo "Deployed Contracts"
2. **Copia la dirección** (ej: `0x1234...abcd`)
3. Guarda esta dirección - la necesitas para Supabase

### Paso 5: Verificar en PolygonScan (Opcional pero recomendado)
1. Ve a https://polygonscan.com
2. Busca la dirección de tu contrato
3. Ve a "Contract" → "Verify and Publish"
4. Sigue el wizard (selecciona Solidity 0.8.20, sin optimización)

---

## Opción 2: Deploy con Hardhat (Avanzado)

```bash
# En la raíz del proyecto
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers

# Inicializar Hardhat
npx hardhat init
# Selecciona "Create a JavaScript project"

# Copiar contrato
cp contracts/VerifySignAnchor.sol contracts/

# Configurar hardhat.config.js
```

**hardhat.config.js**:
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    polygon: {
      url: "https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY",
      accounts: ["TU_PRIVATE_KEY_SIN_0x"]
    }
  }
};
```

**scripts/deploy.js**:
```javascript
async function main() {
  const VerifySignAnchor = await ethers.getContractFactory("VerifySignAnchor");
  const anchor = await VerifySignAnchor.deploy();
  await anchor.waitForDeployment();

  const address = await anchor.getAddress();
  console.log("VerifySignAnchor deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Deploy**:
```bash
npx hardhat run scripts/deploy.js --network polygon
# Output: VerifySignAnchor deployed to: 0x...
```

---

## Configurar Variables de Entorno en Supabase

Una vez desplegado el contrato, configura estos secrets en Supabase:

### En Supabase Dashboard:

1. Ve a **Project Settings** → **Edge Functions** → **Manage secrets**
2. Agrega estos 3 secrets:

```bash
# URL de Alchemy (ya la tienes)
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/OBJkEAhQmQDkgNiqFE-En

# Private key de tu wallet (cuidado - NUNCA compartir)
POLYGON_PRIVATE_KEY=tu_private_key_aqui_sin_0x

# Dirección del contrato que acabas de desplegar
POLYGON_CONTRACT_ADDRESS=0x1234...abcd
```

### Obtener tu Private Key de Metamask:

1. Abre Metamask
2. Click en los 3 puntos → Account Details
3. Click "Export Private Key"
4. **IMPORTANTE**: Esta key da acceso total a tus fondos
   - Solo úsala en Supabase (encriptado)
   - Nunca la compartas
   - Considera usar una wallet separada solo para anchoring

### Configurar via CLI (alternativa):

```bash
# Asegúrate de estar en el proyecto correcto
supabase link --project-ref tbxowirrvgtvfnxcdqks

# Configurar secrets
supabase secrets set POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/OBJkEAhQmQDkgNiqFE-En"
supabase secrets set POLYGON_PRIVATE_KEY="tu_private_key"
supabase secrets set POLYGON_CONTRACT_ADDRESS="0x..."
```

---

## Verificar que funciona

```bash
# Desplegar la función
supabase functions deploy anchor-polygon --no-verify-jwt

# Probar con curl
curl -X POST "https://tbxowirrvgtvfnxcdqks.supabase.co/functions/v1/anchor-polygon" \
  -H "Content-Type: application/json" \
  -d '{
    "documentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "userEmail": "tu@email.com"
  }'

# Debe devolver:
# {
#   "status": "confirmed",
#   "txHash": "0x...",
#   "blockNumber": 12345,
#   "explorerUrl": "https://polygonscan.com/tx/0x..."
# }
```

---

## Costos

- **Deploy del contrato**: ~0.005 MATIC (~$0.005)
- **Cada anchor (transacción)**: ~0.001-0.003 MATIC (~$0.001-$0.003)
- **100 anchors**: ~$0.10-$0.30

Polygon es extremadamente barato comparado con Ethereum Mainnet.

---

## Seguridad

⚠️ **IMPORTANTE**:

1. **Private Key**: Guárdala SOLO en Supabase Secrets (encriptado)
2. **Wallet separada**: Usa una wallet diferente para anchoring (no tu wallet principal)
3. **Fondos mínimos**: Mantén solo 0.1 MATIC en esa wallet (~$0.10)
4. **Monitoreo**: Revisa PolygonScan periódicamente
5. **Rate limiting**: Implementa límites para evitar spam de transacciones

---

## Próximos pasos

1. ✅ Deploy del contrato (Remix o Hardhat)
2. ✅ Configurar secrets en Supabase
3. ✅ Desplegar `anchor-polygon` function
4. ⏭️ Actualizar `basicCertificationWeb.js` para usar Polygon
5. ⏭️ Crear función de verificación
6. ⏭️ Testing end-to-end
