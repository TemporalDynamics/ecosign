# Configuración del Sistema de Certificación ECO

Este documento describe cómo configurar el sistema de certificación ECO para que TSA y Polygon funcionen 100% correctamente, y Bitcoin esté en modo "processing".

## Estado Actual del Sistema

### ✅ TSA (Timestamp Authority) - RFC 3161
**Estado**: FUNCIONAL Y REAL

El sistema usa FreeTSA.org (servicio público RFC 3161 compliant) para generar timestamps legales.

**No requiere configuración adicional**. Los tokens son reales y verificables.

**Archivos clave**:
- `supabase/functions/legal-timestamp/index.ts` - Edge function que genera timestamps
- `client/src/lib/tsaService.js` - Cliente que solicita timestamps
- `client/src/lib/tsrVerifier.js` - Verificador de tokens RFC 3161

**Cambios realizados**:
- ✅ Eliminado modo mock/legacy
- ✅ Solo acepta tokens DER reales (RFC 3161)
- ✅ Comentarios actualizados

---

### ⚙️ Polygon Mainnet - Blockchain Anchoring
**Estado**: FUNCIONAL, REQUIERE CONFIGURACIÓN

El sistema usa Polygon Mainnet para anclar documentos on-chain mediante un smart contract.

#### Variables Requeridas (Supabase Secrets)

Configure estas variables en Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
# RPC Provider (Alchemy recomendado)
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Wallet Sponsor (para pagar gas fees)
POLYGON_PRIVATE_KEY=0x... # Private key de una wallet con POL

# Smart Contract Address (después del deploy)
POLYGON_CONTRACT_ADDRESS=0x... # Dirección del contrato desplegado
```

#### Pasos de Configuración

##### 1. Obtener Alchemy API Key
```bash
1. Ir a https://dashboard.alchemy.com/
2. Crear cuenta/login
3. Crear nueva app:
   - Chain: Polygon Mainnet
   - Network: Polygon PoS
4. Copiar el RPC URL completo
```

##### 2. Crear Wallet Sponsor
```bash
1. Crear nueva wallet (MetaMask, etc)
2. Copiar la private key
3. Enviar 5-10 POL a la wallet
   - Costo aproximado: ~$5 USD
   - Permite ~1000 transacciones
```

##### 3. Deploy del Smart Contract

El contrato está en `/contracts/VerifySignAnchor.sol`

```bash
# Instalar dependencias
cd contracts
npm install

# Configurar .env
cat > .env << EOF
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_PRIVATE_KEY=0x...
EOF

# Deploy a Polygon Mainnet
npx hardhat run scripts/deploy.js --network polygon

# Copiar la dirección del contrato desplegado
# Ejemplo: 0x1234567890abcdef...
```

##### 4. Configurar Secrets en Supabase

```bash
# Via CLI (recomendado)
supabase secrets set POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
supabase secrets set POLYGON_PRIVATE_KEY=0x...
supabase secrets set POLYGON_CONTRACT_ADDRESS=0x...

# O via Dashboard:
# Settings → Edge Functions → Secrets → Add Secret
```

##### 5. Verificar Configuración

```bash
# Test la edge function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/anchor-polygon \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"documentHash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}'

# Debe retornar:
# {
#   "success": true,
#   "txHash": "0x...",
#   "explorerUrl": "https://polygonscan.com/tx/0x...",
#   "status": "pending"
# }
```

#### Procesamiento de Confirmaciones

El worker `process-polygon-anchors` se ejecuta cada 1 minuto (cron job) y:
1. Verifica el estado de transacciones pendientes
2. Actualiza la base de datos cuando se confirman
3. Envía notificaciones por email
4. Habilita la descarga del certificado

**Tiempo de confirmación**: 30-60 segundos (Polygon Mainnet)

**Archivos clave**:
- `supabase/functions/anchor-polygon/index.ts` - Envía TX a Polygon
- `supabase/functions/process-polygon-anchors/index.ts` - Procesa confirmaciones
- `client/src/lib/polygonAnchor.js` - Cliente

---

### ⏳ Bitcoin - OpenTimestamps
**Estado**: FUNCIONAL, MODO "PROCESSING"

El sistema usa OpenTimestamps (servicio público) para anclar documentos en Bitcoin blockchain.

**No requiere configuración adicional**. Es gratuito y público.

#### Características

- **Tiempo real**: 4-24 horas (depende de Bitcoin blockchain)
- **Estado inicial**: "queued" → "pending" → "processing" → "confirmed"
- **Gratuito**: No requiere wallet ni funding
- **No bloqueante**: No impide la descarga del certificado si Polygon está confirmado

#### Procesamiento

El worker `process-bitcoin-anchors` se ejecuta cada 5 minutos y:
1. Envía hashes a calendarios OpenTimestamps
2. Verifica confirmaciones cada 5 minutos
3. Aplica política de fallback si tarda más de 24h:
   - Si Polygon está confirmado → documento certificado ✅
   - Si no hay Polygon → documento fallido ❌

**Archivos clave**:
- `supabase/functions/anchor-bitcoin/index.ts` - Crea request
- `supabase/functions/process-bitcoin-anchors/index.ts` - Procesa confirmaciones
- `client/src/lib/opentimestamps.ts` - Cliente

---

## Flujo Completo de Certificación

### Desde LegalCenterModal

```javascript
// Usuario certifica un documento
const options = {
  useLegalTimestamp: true,    // TSA (RFC 3161)
  usePolygonAnchor: true,     // Polygon Mainnet
  useBitcoinAnchor: true,     // OpenTimestamps
  forensicEnabled: true
}

const result = await certifyFile(file, options)
```

### Qué sucede internamente

1. **TSA (RFC 3161)** - 1-2 segundos
   - ✅ Solicita timestamp a FreeTSA
   - ✅ Recibe token DER real
   - ✅ Incluye en certificado ECO

2. **Polygon** - 30-60 segundos
   - ✅ Envía TX a Polygon Mainnet
   - ⏳ Retorna txHash inmediatamente
   - ✅ Worker confirma en background
   - ✅ Actualiza estado a "certified"

3. **Bitcoin** - 4-24 horas
   - ⏳ Envía a OpenTimestamps calendars
   - ⏳ Worker verifica cada 5 minutos
   - ⏳ Estado "processing" mientras espera
   - ✅ Confirma cuando Bitcoin mina el bloque

### Estados del Certificado

| TSA | Polygon | Bitcoin | Estado Final | Download |
|-----|---------|---------|-------------|----------|
| ✅ | ✅ | ⏳ | certified | ✅ |
| ✅ | ✅ | ✅ | certified | ✅ |
| ✅ | ⏳ | ⏳ | pending | ❌ |
| ✅ | ❌ | ✅ | certified | ✅ |
| ✅ | ❌ | ❌ | failed | ❌ |

**Política**: TSA + (Polygon O Bitcoin) = Certificado válido

---

## Verificación del Sistema

### Test TSA

```bash
# Desde el browser console
const tsaService = await import('./lib/tsaService.js')
const result = await tsaService.requestLegalTimestamp('0123456789abcdef...')
console.log(result)
// Debe retornar: { success: true, token: "...", timestamp: "..." }
```

### Test Polygon

```bash
# Verificar secrets configurados
supabase secrets list | grep POLYGON

# Debe mostrar:
# POLYGON_RPC_URL
# POLYGON_PRIVATE_KEY
# POLYGON_CONTRACT_ADDRESS

# Test edge function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/anchor-polygon \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"documentHash": "ABC...123"}'
```

### Test Bitcoin

```bash
# Test edge function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/anchor-bitcoin \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"documentHash": "ABC...123"}'

# Debe retornar:
# { "anchorId": "...", "status": "queued", "estimatedTime": "4-24 hours" }
```

---

## Costos

| Servicio | Costo | Frecuencia |
|----------|-------|------------|
| TSA (FreeTSA) | **Gratis** | Por certificado |
| Polygon TX | ~$0.005 USD | Por certificado |
| Bitcoin (OpenTimestamps) | **Gratis** | Por certificado |
| Alchemy API | **Gratis** hasta 300M compute units/mes | - |

**Costo total por certificado**: ~$0.005 USD (solo Polygon gas)

**Para 1000 certificados/mes**: ~$5 USD + tiempo de desarrollo

---

## Checklist de Configuración

### TSA
- [x] Edge function `legal-timestamp` desplegada
- [x] Cliente `tsaService.js` configurado
- [x] Verificador `tsrVerifier.js` sin mocks
- [x] FreeTSA.org accesible

### Polygon
- [ ] Cuenta Alchemy creada
- [ ] API Key configurada
- [ ] Wallet sponsor creada
- [ ] Wallet fondeada con POL (~5-10 POL)
- [ ] Contrato desplegado a Mainnet
- [ ] Secrets configurados en Supabase
- [ ] Cron `process-polygon-anchors` activo

### Bitcoin
- [x] Edge function `anchor-bitcoin` desplegada
- [x] Cliente `opentimestamps.ts` configurado
- [x] Cron `process-bitcoin-anchors` activo
- [x] OpenTimestamps calendars accesibles

---

## Troubleshooting

### TSA falla

```bash
# Error: "TSA request failed (503)"
# Solución: FreeTSA puede estar temporalmente caído
# Acción: Implementar retry logic o TSA de respaldo
```

### Polygon falla

```bash
# Error: "Sponsor wallet has no POL"
# Solución: Fondear la wallet con POL

# Error: "Missing Polygon config"
# Solución: Verificar secrets en Supabase

# Error: "Transaction reverted"
# Solución: Verificar que el contrato esté desplegado correctamente
```

### Bitcoin demora más de 24h

```bash
# Esperado: OpenTimestamps depende de Bitcoin blockchain
# Acción: Si Polygon está confirmado, el certificado es válido
# Política de fallback: Polygon suficiente para certificar
```

---

## Monitoreo

### Logs de Edge Functions

```bash
# Ver logs en tiempo real
supabase functions logs anchor-polygon
supabase functions logs anchor-bitcoin
supabase functions logs legal-timestamp
```

### Base de Datos

```sql
-- Ver anchors pendientes
SELECT * FROM anchors WHERE anchor_status = 'pending';

-- Ver confirmaciones recientes
SELECT * FROM anchors WHERE anchor_status = 'confirmed' ORDER BY confirmed_at DESC LIMIT 10;

-- Ver fallos
SELECT * FROM anchors WHERE anchor_status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

---

## Próximos Pasos

1. ✅ Eliminar modo mock de TSA
2. ✅ Actualizar comentarios obsoletos
3. [ ] Configurar Polygon (deploy + secrets)
4. [ ] Fondear wallet sponsor
5. [ ] Probar flujo completo end-to-end
6. [ ] Monitorear confirmaciones en producción
7. [ ] Implementar alertas de fallos (opcional)

---

## Contacto y Soporte

Para problemas o preguntas sobre la configuración:
- GitHub Issues: https://github.com/your-repo/ecosign/issues
- Email: soporte@ecosign.app
