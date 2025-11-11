# 🚀 PLAN MAESTRO - VerifySign MVP Pro

**Versión:** 1.0
**Fecha:** 2025-11-11
**Estado actual:** v0.5.0 - Verificación completa implementada
**Objetivo:** MVP Production-Ready con Triple Anchoring + VerifyTracker

---

## 📊 Estado Actual del Proyecto

### ✅ **Completado (100%)**

1. **Autenticación Supabase**
   - Login/Signup funcionando
   - Session management
   - Protected routes

2. **Certificación .ecox**
   - Ed25519 signature (browser-compatible)
   - SHA-256 hashing
   - .ecox file generation
   - Download automático

3. **RFC 3161 Legal Timestamp**
   - FreeTSA integration (simplified)
   - TSR token generation
   - Metadata en .ecox

4. **Verificación Multi-capa**
   - 6-layer verification system
   - Format validation
   - Ed25519 signature check
   - Hash verification
   - Timestamp validation
   - RFC 3161 token check

5. **UI/UX Base**
   - Dashboard con upload
   - Verify page
   - Legal timestamp toggle (verde)
   - Blockchain toggle (naranja)

### 🟡 **Parcial (MVP simplificado)**

1. **OpenTimestamps Blockchain**
   - ✅ UI implementada
   - ✅ Mock proof generation
   - ❌ **NO conectado a calendar servers reales**
   - ❌ **NO usa librería oficial**

### ❌ **Pendiente**

1. NDA requirement (placeholder)
2. VerifyTracker (no-repudiación)
3. Dashboard certifications list
4. API integrations (SignNow, Mifiel)
5. Email notifications
6. Polygon anchoring
7. UI bugs (scroll, etc.)

---

## 🎯 PLAN DE IMPLEMENTACIÓN (Priorizado)

---

# FASE 1: BUGS CRÍTICOS UI (2-3 horas)

## 1.1 ❌ Fix: Scroll en modal de certificación

**Problema:** Modal muy largo, no se ve botón "Descargar certificado"

**Solución:**

```jsx
// client/src/pages/DashboardPage.jsx
// Buscar el div del modal y agregar max-height + overflow

{showUploadModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl
                    max-h-[90vh] overflow-y-auto"> {/* ← AGREGAR ESTO */}
      {/* Contenido del modal */}
    </div>
  </div>
)}
```

**Testing:**
1. Abrir modal de certificación
2. Verificar que se puede scroll
3. Verificar que botón "Descargar" es visible

---

## 1.2 ❌ Fix: Dashboard placeholders

**Archivos a modificar:**
- `client/src/pages/DashboardPage.jsx`

**Placeholders a remover/actualizar:**

```jsx
// ANTES (placeholder)
<div className="text-gray-500">
  Próximamente: Lista de tus certificaciones
</div>

// DESPUÉS (implementar lista real)
<div className="space-y-4">
  {certifications.map(cert => (
    <CertificationCard key={cert.id} data={cert} />
  ))}
</div>
```

**Implementación:**

```jsx
// 1. Agregar state
const [certifications, setCertifications] = useState([]);

// 2. Guardar certificaciones en localStorage (simple MVP)
const saveCertification = (result) => {
  const cert = {
    id: Date.now(),
    fileName: result.fileName,
    hash: result.hash,
    timestamp: result.timestamp,
    ecoxFileName: result.downloadedFileName,
    legalTimestamp: result.legalTimestamp,
    blockchainAnchoring: result.blockchainAnchoring,
    createdAt: new Date().toISOString()
  };

  const existing = JSON.parse(localStorage.getItem('certifications') || '[]');
  existing.unshift(cert);
  localStorage.setItem('certifications', JSON.stringify(existing));
  setCertifications(existing);
};

// 3. Cargar en useEffect
useEffect(() => {
  const saved = JSON.parse(localStorage.getItem('certifications') || '[]');
  setCertifications(saved);
}, []);

// 4. Llamar saveCertification después de certificar
setCertificationResult({...});
saveCertification(result); // ← AGREGAR
```

---

# FASE 2: OPENTIMESTAMPS REAL (4-6 horas)

## 2.1 🔧 Backend API para OpenTimestamps

**Archivo:** `api/blockchain-timestamp.js`

```javascript
// api/blockchain-timestamp.js
import OpenTimestamps from 'opentimestamps';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { hash, action } = req.body;

    if (!hash) {
      return res.status(400).json({ error: 'Hash required' });
    }

    // Acción: stamp (crear timestamp)
    if (action === 'stamp') {
      console.log('🕐 Creating OpenTimestamps proof for hash:', hash);

      // Convertir hex a Buffer
      const hashBytes = Buffer.from(hash, 'hex');

      // Crear DetachedTimestampFile
      const detached = OpenTimestamps.DetachedTimestampFile.fromHash(
        new OpenTimestamps.Ops.OpSHA256(),
        hashBytes
      );

      // Enviar a calendar servers (INSTANT)
      await OpenTimestamps.stamp(detached);

      // Serializar proof
      const proof = detached.serializeToBytes();
      const proofBase64 = proof.toString('base64');

      console.log('✅ OTS proof created:', proofBase64.substring(0, 50) + '...');

      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        blockchain: 'Bitcoin',
        protocol: 'OpenTimestamps',
        status: 'pending',
        otsProof: proofBase64,
        otsProofSize: proof.length,
        hash: hash,
        calendarServers: [
          'alice.btc.calendar.opentimestamps.org',
          'bob.btc.calendar.opentimestamps.org',
          'finney.calendar.eternitywall.com'
        ],
        note: 'Timestamp submitted to calendar servers. Bitcoin confirmation in ~10 minutes.',
        estimatedConfirmation: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        verificationUrl: 'https://opentimestamps.org/'
      });
    }

    // Acción: upgrade (verificar confirmación)
    if (action === 'upgrade') {
      const { otsProof } = req.body;

      if (!otsProof) {
        return res.status(400).json({ error: 'OTS proof required' });
      }

      console.log('🔄 Upgrading OTS proof...');

      // Deserializar proof
      const proofBytes = Buffer.from(otsProof, 'base64');
      const detached = OpenTimestamps.DetachedTimestampFile.deserialize(proofBytes);

      // Intentar upgrade
      const changed = await OpenTimestamps.upgrade(detached);

      if (changed) {
        console.log('✅ Proof upgraded! Now confirmed on Bitcoin.');

        // Obtener info del bloque
        const info = OpenTimestamps.info(detached);
        const blockHeight = info?.bitcoin?.height;

        return res.json({
          success: true,
          upgraded: true,
          otsProof: detached.serializeToBytes().toString('base64'),
          blockHeight: blockHeight,
          message: 'Timestamp confirmed on Bitcoin blockchain'
        });
      } else {
        console.log('⏳ No upgrade available yet.');

        return res.json({
          success: true,
          upgraded: false,
          message: 'Not yet confirmed. Try again in a few minutes.'
        });
      }
    }

    // Acción: verify
    if (action === 'verify') {
      const { otsProof, originalHash } = req.body;

      console.log('🔍 Verifying OTS proof...');

      const proofBytes = Buffer.from(otsProof, 'base64');
      const detached = OpenTimestamps.DetachedTimestampFile.deserialize(proofBytes);

      const originalHashBytes = Buffer.from(originalHash, 'hex');
      const original = OpenTimestamps.DetachedTimestampFile.fromHash(
        new OpenTimestamps.Ops.OpSHA256(),
        originalHashBytes
      );

      const result = await OpenTimestamps.verify(detached, original);

      if (result && result.bitcoin) {
        return res.json({
          valid: true,
          blockchain: 'Bitcoin',
          protocol: 'OpenTimestamps',
          status: 'confirmed',
          blockHeight: result.bitcoin.height,
          blockTime: new Date(result.bitcoin.timestamp * 1000).toISOString(),
          explorerUrl: `https://mempool.space/block/${result.bitcoin.height}`
        });
      } else {
        return res.json({
          valid: true,
          status: 'pending',
          message: 'Proof valid but not yet confirmed on blockchain'
        });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

**Instalar dependencia:**

```bash
npm install opentimestamps
```

**Configurar Vercel:**

```json
// vercel.json
{
  "functions": {
    "api/blockchain-timestamp.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

---

## 2.2 🔧 Actualizar Frontend para usar API real

**Archivo:** `client/src/lib/openTimestampsService.js`

**REEMPLAZAR completamente con:**

```javascript
/**
 * OpenTimestamps Service - Real Implementation
 * Uses backend API for actual OTS timestamping
 */

import { hexToBytes, bytesToHex } from '@noble/hashes/utils.js';

// API endpoint (Vercel function)
const API_URL = '/api/blockchain-timestamp';

/**
 * Creates a timestamp proof using real OpenTimestamps
 */
export async function createBlockchainTimestamp(hashHex) {
  console.log('⛓️ Creating blockchain timestamp with OpenTimestamps API...');
  console.log('  Hash:', hashHex);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'stamp',
        hash: hashHex
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    console.log('✅ OTS proof created via API');
    console.log('  Status:', result.status);

    return result;

  } catch (error) {
    console.error('❌ OpenTimestamps API error:', error);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      blockchain: 'Bitcoin',
      protocol: 'OpenTimestamps',
      status: 'failed'
    };
  }
}

/**
 * Verifies a blockchain timestamp proof
 */
export async function verifyBlockchainTimestamp(otsProofBase64, originalHashHex) {
  console.log('🔍 Verifying blockchain timestamp via API...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'verify',
        otsProof: otsProofBase64,
        originalHash: originalHashHex
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Verification error:', error);

    return {
      valid: false,
      error: error.message,
      blockchain: 'Bitcoin',
      protocol: 'OpenTimestamps',
      status: 'failed'
    };
  }
}

/**
 * Upgrades a pending timestamp
 */
export async function upgradeTimestamp(otsProofBase64) {
  console.log('🔄 Upgrading timestamp via API...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'upgrade',
        otsProof: otsProofBase64
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Upgrade error:', error);

    return {
      success: false,
      error: error.message
    };
  }
}

// Keep other utility functions (downloadOtsProof, etc.)
// ... resto del código sin cambios
```

---

## 2.3 🔧 Cron Job para auto-upgrade

**Archivo:** `api/cron/check-ots-confirmations.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🔄 Checking OTS confirmations...');

  try {
    // Get pending certifications (older than 10 min)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: pending, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('ots_status', 'pending')
      .lt('created_at', tenMinutesAgo)
      .limit(100);

    if (error) throw error;

    console.log(`  Found ${pending.length} pending certifications`);

    let confirmed = 0;

    for (const cert of pending) {
      // Call upgrade API
      const upgradeRes = await fetch(`${process.env.VERCEL_URL}/api/blockchain-timestamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade',
          otsProof: cert.ots_proof
        })
      });

      const result = await upgradeRes.json();

      if (result.success && result.upgraded) {
        // Update database
        await supabase
          .from('certifications')
          .update({
            ots_status: 'confirmed',
            ots_proof: result.otsProof,
            ots_block_height: result.blockHeight,
            confirmed_at: new Date().toISOString()
          })
          .eq('id', cert.id);

        // TODO: Send email notification
        // await sendConfirmationEmail(cert);

        confirmed++;
        console.log(`  ✅ Confirmed: ${cert.file_name}`);
      }
    }

    console.log(`✅ Checked ${pending.length}, confirmed ${confirmed}`);

    return res.json({
      success: true,
      checked: pending.length,
      confirmed: confirmed
    });

  } catch (error) {
    console.error('❌ Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Configurar en vercel.json:**

```json
{
  "crons": [{
    "path": "/api/cron/check-ots-confirmations",
    "schedule": "*/5 * * * *"
  }]
}
```

**Variables de entorno (.env):**

```bash
CRON_SECRET=tu-secret-aleatorio-aqui
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
VERCEL_URL=https://verifysign.pro
```

---

# FASE 3: VERIFYTRACKER (No-Repudiación) (6-8 horas)

## 3.1 📊 Schema Supabase

```sql
-- Tabla de tracking
CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Documento
  certification_id UUID REFERENCES certifications(id),
  document_hash TEXT NOT NULL,
  document_name TEXT,

  -- Acceso
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  browser_fingerprint TEXT,

  -- Geolocalización (opcional)
  country TEXT,
  city TEXT,

  -- Interacción
  viewed_duration_seconds INTEGER, -- Cuánto tiempo lo vio
  scroll_percentage INTEGER, -- % que scrolleó
  downloaded BOOLEAN DEFAULT FALSE,

  -- Metadata
  referer TEXT,
  session_id TEXT
);

-- Index
CREATE INDEX idx_verification_logs_hash
ON verification_logs(document_hash);

CREATE INDEX idx_verification_logs_accessed
ON verification_logs(accessed_at DESC);
```

---

## 3.2 🔧 API para registrar acceso

**Archivo:** `api/track-verification.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      documentHash,
      documentName,
      userAgent,
      browserFingerprint,
      viewedDuration,
      scrollPercentage,
      downloaded
    } = req.body;

    // Get IP from Vercel headers
    const ip = req.headers['x-forwarded-for'] ||
               req.headers['x-real-ip'] ||
               req.socket.remoteAddress;

    // Log to database
    const { data, error } = await supabase
      .from('verification_logs')
      .insert({
        document_hash: documentHash,
        document_name: documentName,
        accessed_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
        browser_fingerprint: browserFingerprint,
        viewed_duration_seconds: viewedDuration,
        scroll_percentage: scrollPercentage,
        downloaded: downloaded || false,
        referer: req.headers.referer,
        session_id: req.headers['x-session-id']
      })
      .select()
      .single();

    if (error) throw error;

    console.log('📊 Verification logged:', {
      hash: documentHash,
      ip: ip
    });

    return res.json({
      success: true,
      logId: data.id,
      timestamp: data.accessed_at
    });

  } catch (error) {
    console.error('❌ Tracking error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

---

## 3.3 🔧 Frontend tracking en VerifyPage

**Archivo:** `client/src/pages/VerifyPage.jsx`

**Agregar al inicio:**

```javascript
import { useEffect, useRef } from 'react';

// Browser fingerprinting (simple)
function getBrowserFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);

  return canvas.toDataURL().slice(-50); // Últimos 50 chars
}

function VerifyPage() {
  const viewStartTime = useRef(Date.now());
  const [scrollPercentage, setScrollPercentage] = useState(0);

  // Track scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percentage = Math.round((scrollTop / docHeight) * 100);
      setScrollPercentage(Math.max(scrollPercentage, percentage));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollPercentage]);

  // Track verification access
  const trackAccess = async (documentHash, documentName) => {
    const viewDuration = Math.floor((Date.now() - viewStartTime.current) / 1000);

    await fetch('/api/track-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentHash: documentHash,
        documentName: documentName,
        userAgent: navigator.userAgent,
        browserFingerprint: getBrowserFingerprint(),
        viewedDuration: viewDuration,
        scrollPercentage: scrollPercentage,
        downloaded: false
      })
    });
  };

  // Llamar trackAccess cuando se verifica exitosamente
  const verifyFile = async () => {
    // ... código existente ...

    if (verificationResult.valid) {
      // Track successful verification
      await trackAccess(
        verificationResult.data.hash,
        verificationResult.data.fileName
      );
    }
  };

  // ... resto del código
}
```

---

## 3.4 🔧 Dashboard para ver tracking

**Archivo:** `client/src/pages/TrackingDashboard.jsx` (NUEVO)

```jsx
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function TrackingDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('verification_logs')
      .select('*')
      .order('accessed_at', { ascending: false })
      .limit(100);

    if (!error) {
      setLogs(data);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📊 VerifyTracker</h1>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Documento</th>
                <th className="px-6 py-3 text-left">Fecha/Hora</th>
                <th className="px-6 py-3 text-left">IP</th>
                <th className="px-6 py-3 text-left">Navegador</th>
                <th className="px-6 py-3 text-left">Duración</th>
                <th className="px-6 py-3 text-left">Scroll %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {log.document_name}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {log.document_hash.substring(0, 16)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(log.accessed_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">
                    {log.ip_address}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.user_agent.substring(0, 30)}...
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.viewed_duration_seconds}s
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${log.scroll_percentage}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        {log.scroll_percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TrackingDashboard;
```

**Agregar ruta:**

```jsx
// client/src/App.jsx
import TrackingDashboard from './pages/TrackingDashboard';

// En las rutas
<Route path="/tracking" element={<TrackingDashboard />} />
```

---

# FASE 4: POLYGON TRIPLE ANCHORING (8-12 horas)

## 4.1 💰 Preparación

**Comprar MATIC:**
1. Binance.com
2. Verificar identidad (KYC)
3. Depositar EUR (SEPA, gratis)
4. Comprar 20-50 MATIC (~$10-25)
5. Retirar a MetaMask

**Crear wallet:**
```bash
# Instalar MetaMask browser extension
# Crear nueva wallet
# Copiar private key (NUNCA compartir!)
```

---

## 4.2 📝 Smart Contract

**Archivo:** `contracts/TimestampRegistry.sol` (NUEVO)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TimestampRegistry {
    // Mapping: hash => timestamp
    mapping(bytes32 => uint256) public timestamps;

    // Mapping: hash => block number
    mapping(bytes32 => uint256) public blockNumbers;

    // Events
    event Timestamped(
        bytes32 indexed documentHash,
        uint256 timestamp,
        uint256 blockNumber,
        address indexed submitter
    );

    /**
     * Register a document hash
     */
    function register(bytes32 documentHash) public {
        require(timestamps[documentHash] == 0, "Already timestamped");

        timestamps[documentHash] = block.timestamp;
        blockNumbers[documentHash] = block.number;

        emit Timestamped(
            documentHash,
            block.timestamp,
            block.number,
            msg.sender
        );
    }

    /**
     * Verify if hash is registered
     */
    function verify(bytes32 documentHash) public view returns (
        bool exists,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        exists = timestamps[documentHash] != 0;
        timestamp = timestamps[documentHash];
        blockNumber = blockNumbers[documentHash];
    }

    /**
     * Batch register multiple hashes
     */
    function registerBatch(bytes32[] memory hashes) public {
        for (uint i = 0; i < hashes.length; i++) {
            if (timestamps[hashes[i]] == 0) {
                timestamps[hashes[i]] = block.timestamp;
                blockNumbers[hashes[i]] = block.number;

                emit Timestamped(
                    hashes[i],
                    block.timestamp,
                    block.number,
                    msg.sender
                );
            }
        }
    }
}
```

---

## 4.3 🚀 Deploy Smart Contract

**Setup Hardhat:**

```bash
# Crear directorio
mkdir contracts
cd contracts

# Inicializar proyecto
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Inicializar Hardhat
npx hardhat init
```

**Configurar Hardhat:**

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [process.env.PRIVATE_KEY]
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  }
};
```

**Script de deploy:**

```javascript
// scripts/deploy.js
async function main() {
  console.log("🚀 Deploying TimestampRegistry...");

  const TimestampRegistry = await ethers.getContractFactory("TimestampRegistry");
  const registry = await TimestampRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("✅ Deployed to:", address);
  console.log("Save this address!");

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Deploy:**

```bash
# Testnet (gratis, para probar)
npx hardhat run scripts/deploy.js --network mumbai

# Mainnet (cuesta MATIC real)
npx hardhat run scripts/deploy.js --network polygon
```

**Guardar el contract address que devuelve!**

---

## 4.4 🔧 Backend API para Polygon

**Archivo:** `api/polygon-timestamp.js`

```javascript
import { ethers } from 'ethers';

// Contract ABI (copia del output de Hardhat)
const CONTRACT_ABI = [
  "function register(bytes32 documentHash) public",
  "function verify(bytes32 documentHash) public view returns (bool exists, uint256 timestamp, uint256 blockNumber)",
  "event Timestamped(bytes32 indexed documentHash, uint256 timestamp, uint256 blockNumber, address indexed submitter)"
];

const CONTRACT_ADDRESS = process.env.POLYGON_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, hash } = req.body;

    // Setup provider
    const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    if (action === 'register') {
      console.log('⛓️ Registering on Polygon:', hash);

      // Convert hex hash to bytes32
      const hashBytes = ethers.keccak256('0x' + hash);

      // Send transaction
      const tx = await contract.register(hashBytes);
      console.log('  TX sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Confirmed in block:', receipt.blockNumber);

      return res.json({
        success: true,
        blockchain: 'Polygon',
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date().toISOString(),
        explorerUrl: `https://polygonscan.com/tx/${tx.hash}`
      });
    }

    if (action === 'verify') {
      console.log('🔍 Verifying on Polygon:', hash);

      const hashBytes = ethers.keccak256('0x' + hash);
      const result = await contract.verify(hashBytes);

      if (result.exists) {
        return res.json({
          valid: true,
          blockchain: 'Polygon',
          timestamp: new Date(Number(result.timestamp) * 1000).toISOString(),
          blockNumber: Number(result.blockNumber),
          explorerUrl: `https://polygonscan.com/block/${result.blockNumber}`
        });
      } else {
        return res.json({
          valid: false,
          message: 'Not registered on Polygon'
        });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('❌ Polygon error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

**Variables de entorno:**

```bash
POLYGON_CONTRACT_ADDRESS=0x... # Address del deploy
POLYGON_PRIVATE_KEY=0x... # Private key de MetaMask
```

---

## 4.5 🔧 Frontend Polygon Service

**Archivo:** `client/src/lib/polygonService.js` (NUEVO)

```javascript
const API_URL = '/api/polygon-timestamp';

export async function registerOnPolygon(hashHex) {
  console.log('⛓️ Registering on Polygon blockchain...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        hash: hashHex
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Registered on Polygon:', result.txHash);

    return result;

  } catch (error) {
    console.error('❌ Polygon error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function verifyOnPolygon(hashHex) {
  console.log('🔍 Verifying on Polygon...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        hash: hashHex
      })
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Verification error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}
```

---

## 4.6 🔧 Integrar en certificación

**Actualizar:** `client/src/lib/basicCertificationBrowser.js`

```javascript
import { registerOnPolygon } from './polygonService.js';

// En certifyFile(), después del blockchain anchoring
if (options.usePolygonAnchoring) {
  console.log('⛓️ Registering on Polygon...');
  try {
    const polygonResponse = await registerOnPolygon(hash);
    if (polygonResponse.success) {
      console.log('✅ Polygon anchoring complete!');
      // Guardar en manifest .ecox
    }
  } catch (error) {
    console.error('⚠️ Polygon anchoring failed:', error);
  }
}
```

**Agregar toggle en Dashboard:**

```jsx
// DashboardPage.jsx
const [usePolygonAnchoring, setUsePolygonAnchoring] = useState(false);

// Toggle (color violeta/morado)
<div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
  <div>
    <h4 className="text-gray-900 font-semibold flex items-center">
      💎 Anclaje Polygon (Premium)
      <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-bold">INSTANT</span>
    </h4>
    <p className="text-sm text-gray-600 mt-1">
      Confirmación instantánea en Polygon blockchain
    </p>
    <p className="text-xs text-purple-700 font-medium mt-1">
      ⚡ ~3 segundos • $0.001 por certificado
    </p>
  </div>
  <button
    onClick={() => setUsePolygonAnchoring(!usePolygonAnchoring)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      usePolygonAnchoring ? 'bg-purple-600' : 'bg-gray-300'
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
      usePolygonAnchoring ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
</div>
```

---

# FASE 5: INTEGRACIONES API (4-6 horas)

## 5.1 🔧 SignNow Integration

**Documentación:** https://docs.signnow.com/

**Flujo:**
1. Usuario certifica documento en VerifySign
2. Opcionalmente, envía a SignNow para firma electrónica
3. Recibe documento firmado
4. Certifica documento firmado nuevamente

**Implementación básica:**

```javascript
// api/signnow-integration.js
export default async function handler(req, res) {
  const { action, documentId, recipientEmail } = req.body;

  // SignNow API credentials
  const accessToken = process.env.SIGNNOW_ACCESS_TOKEN;

  if (action === 'upload') {
    // Upload document to SignNow
    const formData = new FormData();
    formData.append('file', documentBuffer);

    const response = await fetch('https://api.signnow.com/document', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });

    const result = await response.json();
    return res.json(result);
  }

  if (action === 'send') {
    // Send for signature
    const response = await fetch(`https://api.signnow.com/document/${documentId}/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: [{ email: recipientEmail }]
      })
    });

    const result = await response.json();
    return res.json(result);
  }
}
```

---

## 5.2 🔧 Mifiel Integration

**Documentación:** https://docs.mifiel.com/

**Similar a SignNow pero específico para México (FIEL)**

```javascript
// api/mifiel-integration.js
import { Mifiel } from '@mifiel/api-client';

const mifiel = new Mifiel(
  process.env.MIFIEL_APP_ID,
  process.env.MIFIEL_APP_SECRET
);

export default async function handler(req, res) {
  const { action, documentPath, signers } = req.body;

  if (action === 'create') {
    const document = await mifiel.documents.create({
      file: documentPath,
      signers: signers
    });

    return res.json(document);
  }

  if (action === 'sign') {
    // Webhook when signed
    const { document_id, status } = req.body;

    if (status === 'signed') {
      // Download signed document
      // Re-certify with VerifySign
    }

    return res.json({ success: true });
  }
}
```

---

# FASE 6: NDA SERVICE (2-3 horas)

## 6.1 🔧 NDA Requirement Logic

**Actualizar:** `client/src/lib/basicCertificationBrowser.js`

```javascript
export async function certifyFile(file, options = {}) {
  // ... código existente ...

  // Si NDA está activado, agregar metadata especial
  if (options.ndaRequired) {
    project.metadata.nda = {
      required: true,
      version: '1.0',
      text: `
        ACUERDO DE CONFIDENCIALIDAD

        Al acceder a este documento, usted acepta:

        1. Mantener confidencial toda la información contenida
        2. No divulgar, copiar o distribuir este documento sin autorización
        3. Usar la información únicamente para fines autorizados
        4. Notificar inmediatamente cualquier acceso no autorizado

        El incumplimiento puede resultar en acciones legales.

        Timestamp: ${timestamp}
        Hash: ${hash}
      `,
      acceptedAt: null // Se llenará cuando el usuario acepte
    };
  }

  // ... resto del código
}
```

---

## 6.2 🔧 NDA Acceptance Screen

**Actualizar:** `client/src/pages/VerifyPage.jsx`

```jsx
const [ndaAccepted, setNdaAccepted] = useState(false);
const [showNDA, setShowNDA] = useState(false);

// Después de verificar, si tiene NDA
if (result.data.nda && result.data.nda.required && !ndaAccepted) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-yellow-900 mb-4">
          ⚠️ Acuerdo de Confidencialidad Requerido
        </h2>

        <div className="bg-white p-4 rounded border border-yellow-300 max-h-96 overflow-y-auto mb-4">
          <pre className="whitespace-pre-wrap text-sm">
            {result.data.nda.text}
          </pre>
        </div>

        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="nda-accept"
            checked={ndaAccepted}
            onChange={(e) => setNdaAccepted(e.target.checked)}
            className="w-4 h-4 text-yellow-600"
          />
          <label htmlFor="nda-accept" className="ml-2 text-sm text-gray-700">
            He leído y acepto el Acuerdo de Confidencialidad
          </label>
        </div>

        <button
          disabled={!ndaAccepted}
          onClick={() => {
            // Log acceptance
            logNDAAcceptance(result.data.hash);
            // Show document
            setShowNDA(false);
          }}
          className="w-full bg-yellow-600 text-white py-2 px-4 rounded disabled:bg-gray-300"
        >
          Aceptar y Continuar
        </button>
      </div>
    </div>
  );
}

// Log NDA acceptance
const logNDAAcceptance = async (documentHash) => {
  await fetch('/api/track-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentHash: documentHash,
      action: 'nda_accepted',
      timestamp: new Date().toISOString(),
      ip: await fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => d.ip)
    })
  });
};
```

---

# FASE 7: EMAIL NOTIFICATIONS (3-4 horas)

## 7.1 🔧 SendGrid Setup

**Registrarse:** https://sendgrid.com/free/

**Get API Key:**
1. Settings → API Keys
2. Create API Key
3. Guardar en `.env`

```bash
SENDGRID_API_KEY=SG.xxx...
```

---

## 7.2 🔧 Email Service

**Archivo:** `api/send-email.js`

```javascript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  const { to, subject, html, type } = req.body;

  try {
    let template;

    if (type === 'ots_confirmed') {
      template = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Certificado Confirmado</h1>
          </div>

          <div style="padding: 40px; background: #f8f9fa;">
            <h2>Tu documento está confirmado en Bitcoin</h2>

            <p>Tu certificado <strong>${req.body.fileName}</strong> ha sido confirmado en la blockchain de Bitcoin.</p>

            <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
              <p><strong>Hash:</strong><br/>
              <code style="font-size: 12px;">${req.body.hash}</code></p>

              <p><strong>Bloque Bitcoin:</strong> ${req.body.blockHeight}</p>

              <p><strong>Timestamp:</strong> ${req.body.timestamp}</p>
            </div>

            <a href="https://verifysign.pro/dashboard"
               style="display: inline-block; background: #667eea; color: white; padding: 15px 30px;
                      text-decoration: none; border-radius: 5px; margin-top: 20px;">
              Ver en Dashboard
            </a>
          </div>

          <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>VerifySign - Certificación Digital con Blockchain</p>
          </div>
        </body>
        </html>
      `;
    }

    const msg = {
      to: to,
      from: 'noreply@verifysign.pro',
      subject: subject,
      html: template || html
    };

    await sgMail.send(msg);

    return res.json({ success: true });

  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

---

## 7.3 🔧 Llamar desde Cron Job

**En:** `api/cron/check-ots-confirmations.js`

```javascript
// Después de confirmar
if (result.upgraded) {
  // Update DB
  await supabase.from('certifications').update({...});

  // Send email
  await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: cert.user_email,
      subject: '✅ Tu certificado está confirmado en Bitcoin',
      type: 'ots_confirmed',
      fileName: cert.file_name,
      hash: cert.file_hash,
      blockHeight: result.blockHeight,
      timestamp: new Date().toISOString()
    })
  });
}
```

---

# FASE 8: SUPABASE DATABASE COMPLETO (4-6 horas)

## 8.1 📊 Schema Completo

```sql
-- Tabla de usuarios (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  company TEXT,
  plan TEXT DEFAULT 'free', -- free, basic, premium, enterprise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de certificaciones
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),

  -- File info
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL UNIQUE,
  file_size INTEGER,
  mime_type TEXT,

  -- Certification data
  public_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  ecox_data JSONB, -- Full .ecox manifest

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  local_timestamp TIMESTAMPTZ,

  -- RFC 3161
  tsa_token TEXT,
  tsa_status TEXT DEFAULT 'success',
  tsa_verified BOOLEAN DEFAULT FALSE,

  -- OpenTimestamps
  ots_proof TEXT,
  ots_status TEXT DEFAULT 'pending', -- pending, confirmed, failed
  ots_block_height INTEGER,
  ots_confirmed_at TIMESTAMPTZ,
  estimated_ots_confirmation TIMESTAMPTZ,

  -- Polygon
  polygon_tx_hash TEXT,
  polygon_status TEXT DEFAULT 'none', -- none, pending, confirmed
  polygon_block_number INTEGER,
  polygon_confirmed_at TIMESTAMPTZ,

  -- Metadata
  nda_required BOOLEAN DEFAULT FALSE,
  shared_url TEXT UNIQUE, -- Public verification URL
  download_count INTEGER DEFAULT 0,
  verification_count INTEGER DEFAULT 0
);

-- Tabla de verificaciones (VerifyTracker)
CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certification_id UUID REFERENCES certifications(id),

  -- Document
  document_hash TEXT NOT NULL,
  document_name TEXT,

  -- Access
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  browser_fingerprint TEXT,
  country TEXT,
  city TEXT,

  -- Interaction
  viewed_duration_seconds INTEGER,
  scroll_percentage INTEGER,
  downloaded BOOLEAN DEFAULT FALSE,
  nda_accepted BOOLEAN,
  nda_accepted_at TIMESTAMPTZ,

  -- Metadata
  referer TEXT,
  session_id TEXT
);

-- Tabla de API integrations
CREATE TABLE api_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),

  service TEXT NOT NULL, -- signnow, mifiel, etc.
  api_key_encrypted TEXT,
  status TEXT DEFAULT 'active', -- active, inactive
  last_used TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_certifications_user ON certifications(user_id);
CREATE INDEX idx_certifications_hash ON certifications(file_hash);
CREATE INDEX idx_certifications_ots_status ON certifications(ots_status, created_at);
CREATE INDEX idx_verification_logs_hash ON verification_logs(document_hash);
CREATE INDEX idx_verification_logs_accessed ON verification_logs(accessed_at DESC);

-- RLS Policies
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own certifications
CREATE POLICY "Users can view own certifications"
  ON certifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own certifications"
  ON certifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verification logs are public (read-only for users)
CREATE POLICY "Users can view verification logs for own docs"
  ON verification_logs FOR SELECT
  USING (
    certification_id IN (
      SELECT id FROM certifications WHERE user_id = auth.uid()
    )
  );
```

---

## 8.2 🔧 Supabase Client Setup

**Archivo:** `client/src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper: Save certification to DB
export async function saveCertification(certData, userId) {
  const { data, error } = await supabase
    .from('certifications')
    .insert({
      user_id: userId,
      file_name: certData.fileName,
      file_hash: certData.hash,
      file_size: certData.fileSize,
      public_key: certData.publicKey,
      signature: certData.signature,
      ecox_data: certData.ecoxManifest,
      local_timestamp: certData.timestamp,
      tsa_token: certData.legalTimestamp?.token,
      ots_proof: certData.blockchainAnchoring?.otsProof,
      ots_status: certData.blockchainAnchoring?.enabled ? 'pending' : 'none',
      estimated_ots_confirmation: certData.blockchainAnchoring?.estimatedConfirmation,
      polygon_tx_hash: certData.polygonAnchoring?.txHash,
      polygon_status: certData.polygonAnchoring?.enabled ? 'pending' : 'none',
      nda_required: certData.ndaRequired || false,
      shared_url: `${window.location.origin}/verify/${certData.hash.substring(0, 16)}`
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper: Get user certifications
export async function getUserCertifications(userId) {
  const { data, error } = await supabase
    .from('certifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Helper: Get verification logs for cert
export async function getVerificationLogs(certificationId) {
  const { data, error } = await supabase
    .from('verification_logs')
    .select('*')
    .eq('certification_id', certificationId)
    .order('accessed_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

---

## 8.3 🔧 Actualizar Dashboard para usar Supabase

**Archivo:** `client/src/pages/DashboardPage.jsx`

```javascript
import { useEffect, useState } from 'react';
import { supabase, saveCertification, getUserCertifications } from '../lib/supabase';

function DashboardPage() {
  const [user, setUser] = useState(null);
  const [certifications, setCertifications] = useState([]);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user);
      if (session?.user) {
        loadCertifications(session.user.id);
      }
    });
  }, []);

  const loadCertifications = async (userId) => {
    const data = await getUserCertifications(userId);
    setCertifications(data);
  };

  const handleCreateLink = async () => {
    // ... código de certificación existente ...

    // Después de certificar exitosamente
    if (result.success && user) {
      // Guardar en Supabase
      await saveCertification(result, user.id);

      // Recargar lista
      await loadCertifications(user.id);
    }
  };

  // ... resto del código
}
```

---

# FASE 9: TESTING & QA (4-6 horas)

## 9.1 ✅ Checklist de Testing

### **UI/UX:**
- [ ] Modal de certificación tiene scroll
- [ ] Todos los toggles funcionan
- [ ] Badges se muestran correctamente
- [ ] Responsive en mobile
- [ ] No hay placeholders visibles

### **Certificación:**
- [ ] .ecox se descarga correctamente
- [ ] Hash es correcto (verificar con echo -n "contenido" | sha256sum)
- [ ] Firma Ed25519 válida
- [ ] RFC 3161 timestamp incluido
- [ ] OpenTimestamps proof incluido (si activado)
- [ ] Polygon tx hash incluido (si activado)

### **Verificación:**
- [ ] Verifica .ecox correctamente
- [ ] Muestra todos los checks
- [ ] Error messages claros
- [ ] Hash mismatch detectado

### **Database:**
- [ ] Certifications se guardan
- [ ] User puede ver solo sus certificaciones
- [ ] Verification logs se registran
- [ ] RLS policies funcionan

### **Backend:**
- [ ] OTS API responde
- [ ] Polygon API responde
- [ ] Emails se envían
- [ ] Cron job funciona

---

## 9.2 🐛 Debug Tools

**Console logs útiles:**

```javascript
// En cualquier función importante
console.group('🔍 Certification Process');
console.log('1. File read:', file.name);
console.log('2. Hash calculated:', hash);
console.log('3. Signature created:', signature.substring(0, 20) + '...');
console.log('4. OTS proof:', otsProof ? 'YES' : 'NO');
console.groupEnd();
```

**Verificar hash manualmente:**

```bash
# Linux/Mac
echo -n "contenido" | sha256sum

# Node.js
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('contenido').digest('hex'));"
```

---

# FASE 10: DEPLOYMENT & PRODUCTION (2-3 horas)

## 10.1 🚀 Vercel Deploy Checklist

```bash
# 1. Build local
npm run build

# 2. Test build
npm run preview

# 3. Commit
git add .
git commit -m "feat: Production ready MVP"

# 4. Push
git push origin main

# 5. Deploy
vercel --prod
```

---

## 10.2 🔧 Variables de Entorno (Production)

**En Vercel Dashboard → Settings → Environment Variables:**

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ... # Server-side only

# OpenTimestamps (ninguna necesaria, usa public servers)

# Polygon
POLYGON_CONTRACT_ADDRESS=0x...
POLYGON_PRIVATE_KEY=0x... # NUNCA commitear!

# Email
SENDGRID_API_KEY=SG.xxx...

# Cron
CRON_SECRET=random-secret-string

# API Integrations (opcional)
SIGNNOW_ACCESS_TOKEN=xxx
MIFIEL_APP_ID=xxx
MIFIEL_APP_SECRET=xxx
```

---

## 10.3 🔒 Security Checklist

- [ ] Private keys en .env (NUNCA en git)
- [ ] CORS configurado correctamente
- [ ] RLS policies en Supabase
- [ ] Rate limiting en APIs
- [ ] Input validation en todos los endpoints
- [ ] HTTPS everywhere
- [ ] CSP headers configurados

---

# 🎯 RESUMEN EJECUTIVO

## Orden de Implementación Recomendado:

1. **FASE 1** - Bugs UI (2-3h) ← PRIMERO
2. **FASE 8** - Database Supabase (4-6h) ← SEGUNDO (base para todo)
3. **FASE 2** - OpenTimestamps real (4-6h) ← CORE
4. **FASE 3** - VerifyTracker (6-8h) ← DIFERENCIADOR
5. **FASE 6** - NDA Service (2-3h) ← RÁPIDO
6. **FASE 7** - Emails (3-4h) ← NICE TO HAVE
7. **FASE 4** - Polygon (8-12h) ← CUANDO TENGAS MATIC
8. **FASE 5** - API Integrations (4-6h) ← OPCIONAL
9. **FASE 9** - Testing (4-6h) ← CRÍTICO
10. **FASE 10** - Deploy (2-3h) ← FINAL

---

## Tiempo Total Estimado:

| Fase | Horas | Prioridad |
|------|-------|-----------|
| 1. UI Bugs | 2-3 | 🔴 Alta |
| 2. OTS Real | 4-6 | 🔴 Alta |
| 3. VerifyTracker | 6-8 | 🟡 Media |
| 4. Polygon | 8-12 | 🟢 Baja (cuando tengas MATIC) |
| 5. API Integrations | 4-6 | 🟢 Baja |
| 6. NDA | 2-3 | 🟡 Media |
| 7. Emails | 3-4 | 🟡 Media |
| 8. Database | 4-6 | 🔴 Alta |
| 9. Testing | 4-6 | 🔴 Alta |
| 10. Deploy | 2-3 | 🔴 Alta |
| **TOTAL** | **40-57 horas** | |

---

## MVP Mínimo (Solo lo esencial):

**Fases obligatorias:** 1, 2, 8, 9, 10 = **16-24 horas**

Esto te da:
- ✅ UI funcionando bien
- ✅ Doble anchoring real (RFC 3161 + OTS)
- ✅ Database con certificaciones
- ✅ Testing completo
- ✅ Production ready

---

## Recursos Necesarios:

### **Costos ($0 en free tier):**
- Vercel: $0 (hasta 100 GB-Hours)
- Supabase: $0 (hasta 500 MB DB)
- SendGrid: $0 (hasta 100 emails/día)
- OpenTimestamps: $0 (siempre gratis)
- FreeTSA: $0 (siempre gratis)

### **Costos con Polygon:**
- MATIC inicial: ~$10-25 (20-50 MATIC)
- Por timestamp: ~$0.001
- 1000 timestamps: ~$1

---

## Herramientas Recomendadas:

1. **VSCode Extensions:**
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - Solidity (si usas Polygon)

2. **Testing:**
   - Browser DevTools
   - Postman (para APIs)
   - https://opentimestamps.org/ (verificar OTS)
   - https://mempool.space/ (explorar Bitcoin)
   - https://polygonscan.com/ (explorar Polygon)

3. **Monitoring:**
   - Vercel Analytics (gratis)
   - Sentry (error tracking, gratis)
   - LogRocket (session replay, plan gratuito)

---

## 🆘 Si Te Atascas:

1. **OpenTimestamps no funciona:**
   - Verifica que la API responda: `curl -X POST https://verifysign.pro/api/blockchain-timestamp -d '{"action":"stamp","hash":"abc123"}'`
   - Check logs en Vercel dashboard
   - Prueba directo en opentimestamps.org

2. **Supabase RLS issues:**
   - Deshabilita RLS temporalmente para debugging
   - Verifica que auth.uid() devuelve el user correcto
   - Check policies en Supabase dashboard

3. **Build fails:**
   - Limpia cache: `rm -rf node_modules dist && npm install`
   - Check que todas las deps estén instaladas
   - Verifica no hay imports de Node.js modules

4. **Polygon tx falla:**
   - Verifica balance MATIC
   - Check gas price
   - Usa Mumbai testnet primero

---

## 📞 Contactos Útiles:

- **OpenTimestamps Telegram:** https://t.me/opentimestamps
- **Polygon Discord:** https://discord.gg/polygon
- **Supabase Discord:** https://discord.supabase.com/

---

## ✅ Checklist Final Pre-Launch:

- [ ] Todos los tests pasan
- [ ] UI sin placeholders
- [ ] Database migrations aplicadas
- [ ] Variables de entorno en production
- [ ] Cron jobs configurados
- [ ] Emails funcionando
- [ ] OTS real conectado
- [ ] Backups de DB configurados
- [ ] Monitoring configurado
- [ ] Custom domain (opcional)
- [ ] SSL/TLS verificado
- [ ] Terms of Service
- [ ] Privacy Policy

---

**¡Éxito con el MVP! 🚀**

Si tienes dudas sobre alguna fase específica, revisa este documento paso a paso.

---

**Última actualización:** 2025-11-11
**Versión:** 1.0
