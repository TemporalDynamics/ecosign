# Arquitectura EVM Genérica para Anclajes Blockchain

## Objetivo

Preparar el sistema de anclajes para soportar múltiples blockchains EVM (Polygon, Arbitrum, Base, Optimism, etc.) sin duplicar código y de manera escalable.

## Contexto Actual

Hoy el sistema tiene:
- **Polygon**: Campos específicos (`polygon_tx_hash`, `polygon_status`, `polygon_block_number`, etc.)
- **Bitcoin**: Campos específicos (`bitcoin_tx_id`, `bitcoin_status`, `bitcoin_block_height`, etc.)

**Problema**: Si agregamos otra L2 (Arbitrum, Base, etc.), tendríamos que duplicar toda la lógica y campos.

## Estrategia Propuesta

### Fase 1: Mantener compatibilidad actual (Ya implementado)

✅ Polygon y Bitcoin funcionan con sus campos específicos
✅ No romper nada existente

### Fase 2: Preparar para EVM genérico (Diseño)

Dos enfoques posibles:

---

## OPCIÓN A: Columnas Genéricas EVM en `anchors` (Recomendada)

### Ventajas
- No requiere nueva tabla
- Menos JOINs en queries
- Más simple para implementar
- Compatible con sistema actual

### Diseño

#### 1. Migración SQL

```sql
-- Agregar columnas genéricas EVM
ALTER TABLE anchors
ADD COLUMN evm_chain_id INTEGER,
ADD COLUMN evm_chain_name TEXT,
ADD COLUMN evm_explorer_url TEXT;

-- Reutilizar campos polygon_ como genéricos:
-- polygon_tx_hash → representa TX hash de cualquier EVM
-- polygon_status → representa status de cualquier EVM
-- polygon_block_number → representa block number de cualquier EVM
-- etc.

-- Constraint actualizado para evitar duplicados por chain
ALTER TABLE anchors
DROP CONSTRAINT IF EXISTS unique_document_anchor;

ALTER TABLE anchors
ADD CONSTRAINT unique_document_anchor_evm
UNIQUE (document_hash, anchor_type, COALESCE(evm_chain_id, 0));

-- Comentario para documentar
COMMENT ON COLUMN anchors.evm_chain_id IS 'Chain ID para blockchains EVM (137=Polygon, 42161=Arbitrum, 8453=Base, etc.)';
```

#### 2. Valores de Chain ID

```typescript
const EVM_CHAINS = {
  POLYGON: { id: 137, name: 'polygon', rpc: 'POLYGON_RPC_URL' },
  ARBITRUM: { id: 42161, name: 'arbitrum', rpc: 'ARBITRUM_RPC_URL' },
  BASE: { id: 8453, name: 'base', rpc: 'BASE_RPC_URL' },
  OPTIMISM: { id: 10, name: 'optimism', rpc: 'OPTIMISM_RPC_URL' },
} as const;
```

#### 3. Migración de datos existentes

```sql
-- Marcar anchors de Polygon existentes con chain_id
UPDATE anchors
SET
  evm_chain_id = 137,
  evm_chain_name = 'polygon',
  evm_explorer_url = 'https://polygonscan.com'
WHERE anchor_type = 'polygon';
```

#### 4. Edge Function Genérica: `anchor-evm`

```typescript
// supabase/functions/anchor-evm/index.ts
type EVMChainConfig = {
  id: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
  privateKey: string;
  explorerUrl: string;
};

serve(async (req) => {
  const { documentHash, chainId, userDocumentId, ... } = await req.json();

  // Cargar config según chainId
  const chainConfig = getChainConfig(chainId); // 137, 42161, etc.

  // Conectar a la chain específica
  const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
  const wallet = new ethers.Wallet(chainConfig.privateKey, provider);

  // Mismo contrato en todas las chains (desplegado en cada una)
  const contract = new ethers.Contract(
    chainConfig.contractAddress,
    ['function anchorDocument(bytes32 _docHash) external'],
    wallet
  );

  const tx = await contract.anchorDocument('0x' + documentHash);

  // Guardar en DB con chain_id
  await supabase.from('anchors').insert({
    document_hash: documentHash,
    anchor_type: 'evm',
    evm_chain_id: chainId,
    evm_chain_name: chainConfig.name,
    evm_explorer_url: chainConfig.explorerUrl,
    anchor_status: 'pending',
    polygon_status: 'pending', // Reutilizamos campos polygon_ como genéricos
    polygon_tx_hash: tx.hash,
    // ...
  });
});
```

#### 5. Worker Genérico: `process-evm-anchors`

```typescript
// supabase/functions/process-evm-anchors/index.ts
const SUPPORTED_CHAINS = [
  { id: 137, name: 'polygon', rpcUrl: POLYGON_RPC, contract: POLYGON_CONTRACT },
  { id: 42161, name: 'arbitrum', rpcUrl: ARBITRUM_RPC, contract: ARBITRUM_CONTRACT },
  { id: 8453, name: 'base', rpcUrl: BASE_RPC, contract: BASE_CONTRACT },
];

serve(async (req) => {
  for (const chain of SUPPORTED_CHAINS) {
    await processChainAnchors(chain);
  }
});

async function processChainAnchors(chain: ChainConfig) {
  // Obtener anchors pendientes para esta chain
  const { data: anchors } = await supabase
    .from('anchors')
    .select('*')
    .eq('anchor_type', 'evm')
    .eq('evm_chain_id', chain.id)
    .or('polygon_status.eq.pending,polygon_status.eq.processing');

  // Verificar cada TX en la chain específica
  for (const anchor of anchors) {
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    const receipt = await provider.getTransactionReceipt(anchor.polygon_tx_hash);

    if (receipt?.status === 1) {
      // Confirmar anchor
      await supabase.from('anchors').update({
        anchor_status: 'confirmed',
        polygon_status: 'confirmed',
        polygon_block_number: receipt.blockNumber,
        // ...
      }).eq('id', anchor.id);

      // Actualizar user_documents
      await supabase.from('user_documents').update({
        [`has_${chain.name}_anchor`]: true, // Dinámico: has_polygon_anchor, has_arbitrum_anchor, etc.
        [`${chain.name}_anchor_id`]: anchor.id,
      }).eq('id', anchor.user_document_id);
    }
  }
}
```

#### 6. Actualizar `user_documents`

```sql
-- Agregar campos para cada chain que soportemos
ALTER TABLE user_documents
ADD COLUMN has_arbitrum_anchor BOOLEAN DEFAULT false,
ADD COLUMN arbitrum_anchor_id UUID REFERENCES anchors(id),
ADD COLUMN has_base_anchor BOOLEAN DEFAULT false,
ADD COLUMN base_anchor_id UUID REFERENCES anchors(id);

-- Ya existe has_polygon_anchor, polygon_anchor_id
```

#### 7. Frontend/UI

```typescript
// Mostrar timeline genérico de anclajes EVM
const evmAnchors = [
  { chain: 'polygon', status: doc.has_polygon_anchor },
  { chain: 'arbitrum', status: doc.has_arbitrum_anchor },
  { chain: 'base', status: doc.has_base_anchor },
];

{evmAnchors.map(anchor => (
  <div key={anchor.chain}>
    {anchor.status ? (
      <CheckCircle className="text-green-600" />
    ) : (
      <XCircle className="text-gray-300" />
    )}
    {anchor.chain.toUpperCase()}
  </div>
))}
```

---

## OPCIÓN B: Tabla Separada `evm_anchors` (Más compleja)

### Ventajas
- Separación clara de responsabilidades
- Más normalizado
- Fácil agregar campos específicos por chain

### Desventajas
- Requiere más JOINs
- Más compleja de implementar
- Rompe compatibilidad con queries actuales

### Diseño

```sql
CREATE TABLE evm_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_id UUID REFERENCES anchors(id) ON DELETE CASCADE,
  chain_id INTEGER NOT NULL,
  chain_name TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending','confirmed','failed')),
  block_number BIGINT,
  block_hash TEXT,
  confirmed_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (anchor_id, chain_id)
);
```

**Conclusión**: OPCIÓN A es más pragmática y reutiliza infraestructura existente.

---

## Plan de Implementación (Cuando decidas activar L2)

### Paso 1: Migración de Schema
1. Ejecutar migración que agrega `evm_chain_id`, `evm_chain_name`, `evm_explorer_url`
2. Migrar datos existentes de Polygon (marcar con chain_id = 137)
3. Actualizar constraint UNIQUE

### Paso 2: Desplegar Contrato en Nueva Chain
1. Compilar `contracts/VerifySignAnchor.sol`
2. Desplegar en Arbitrum/Base/etc.
3. Guardar contract address en secrets de Supabase

### Paso 3: Crear Edge Functions Genéricas
1. Crear `anchor-evm` parametrizable
2. Crear `process-evm-anchors` que recorre todas las chains
3. Deprecar `anchor-polygon` y `process-polygon-anchors` (o mantenerlos como wrappers)

### Paso 4: Actualizar Frontend
1. Agregar columnas a `user_documents` para nueva chain
2. Actualizar UI para mostrar timeline de múltiples chains
3. Actualizar `.ECO` para incluir múltiples anclajes

### Paso 5: Testing
1. Testear en testnet primero (Arbitrum Sepolia, Base Sepolia)
2. Verificar confirmaciones
3. Verificar notificaciones
4. Desplegar a producción

---

## Variables de Entorno Necesarias

```bash
# Polygon (ya existe)
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/...
POLYGON_PRIVATE_KEY=0x...
POLYGON_CONTRACT_ADDRESS=0x...

# Arbitrum (nuevo)
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/...
ARBITRUM_PRIVATE_KEY=0x... # Puede ser la misma wallet
ARBITRUM_CONTRACT_ADDRESS=0x... # Mismo contrato, desplegado en Arbitrum

# Base (nuevo)
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/...
BASE_PRIVATE_KEY=0x... # Puede ser la misma wallet
BASE_CONTRACT_ADDRESS=0x... # Mismo contrato, desplegado en Base
```

---

## Crons

```sql
-- Procesar todas las chains EVM cada 1 minuto
SELECT cron.schedule(
  'process-evm-anchors',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/process-evm-anchors',
    headers := jsonb_build_object('Authorization', 'Bearer <service_role_key>')
  ) AS request_id;
  $$
);
```

---

## Estrategia de Estados "Certificado Listo"

Según tu análisis:

### Fase 1: Certificado Listo (Rápido)
```typescript
// Documento se considera "certificado listo" cuando tiene:
if (doc.has_legal_timestamp && doc.has_polygon_anchor) {
  overall_status = 'certified'; // Listo en segundos
  download_enabled = true;
}
```

### Fase 2: Triple Anclaje Completo (Bonus)
```typescript
// Bitcoin confirma después (4-24h)
if (doc.bitcoin_status === 'confirmed') {
  // Enviar email: "✅ Triple anclaje completado"
  sendEmail('bitcoin_completed');
}
```

### Con EVM Genérico:
```typescript
// Opción 1: TSA + cualquier EVM rápida = "Certificado listo"
if (doc.has_legal_timestamp && (doc.has_polygon_anchor || doc.has_arbitrum_anchor || doc.has_base_anchor)) {
  overall_status = 'certified';
  download_enabled = true;
}

// Opción 2: TSA + 2 EVMs = "Triple anclaje rápido"
const evmCount = [doc.has_polygon_anchor, doc.has_arbitrum_anchor, doc.has_base_anchor].filter(Boolean).length;
if (doc.has_legal_timestamp && evmCount >= 2) {
  overall_status = 'certified';
  message = 'Triple anclaje rápido completado';
}
```

---

## Costos Estimados por Chain

| Chain | Gas Cost (anchor) | TX Confirmación | Costo USD (aprox) |
|-------|------------------|-----------------|-------------------|
| Polygon | ~100k gas | 10-30 seg | $0.001 - $0.01 |
| Arbitrum | ~50k gas | 1-5 seg | $0.01 - $0.05 |
| Base | ~50k gas | 1-5 seg | $0.005 - $0.02 |
| Optimism | ~50k gas | 1-5 seg | $0.01 - $0.03 |

**Estrategia**: Usar Polygon como primaria (más barata) y Arbitrum/Base como backup/redundancia.

---

## Resumen

✅ **Opción A recomendada**: Reutilizar campos `polygon_*` como genéricos EVM con `evm_chain_id`

✅ **Cuando activar**: Después de pulir Polygon y Bitcoin actuales

✅ **Beneficios**:
- Escalable a N chains EVM
- Sin duplicar código
- Fácil de testear chain por chain
- Compatible con sistema actual

✅ **Triple anclaje real**: TSA + Polygon + Bitcoin (sin necesidad de más L2s ahora)

✅ **L2 adicional (futuro)**: Arbitrum o Base como redundancia/backup
