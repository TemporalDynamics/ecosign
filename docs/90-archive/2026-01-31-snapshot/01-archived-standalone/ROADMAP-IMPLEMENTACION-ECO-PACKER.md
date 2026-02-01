# 🗺️ ROADMAP DE IMPLEMENTACIÓN - eco-packer en VerifySign

**Fecha**: 2025-11-10
**Objetivo**: Integrar @temporaldynamics/eco-packer para certificación y verificación de documentos
**Timeline**: 2-3 semanas (trabajo enfocado)

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual
- ✅ eco-packer v1.1.0 disponible y funcional
- ✅ VerifySign MVP con UI completo
- ⚠️ Integraciones Mifiel/SignNow son placeholders
- ❌ eco-packer NO está integrado aún

### Objetivo Final
**VerifySign completo con**:
1. Certificación de documentos → genera `.ecox` firmados
2. Verificación pública → valida `.eco`/`.ecox`
3. Gestión de claves criptográficas Ed25519
4. Integración opcional con Mifiel/SignNow

---

## 🎯 FASE 1: INSTALACIÓN Y SETUP (1-2 horas)

### ✅ **Tarea 1.1: Instalar eco-packer**

```bash
cd /home/manu/verifysign/client
npm install ../eco-packer
```

**Verificar**:
```bash
npm list @temporaldynamics/eco-packer
# Debe mostrar: @temporaldynamics/eco-packer@1.1.0
```

---

### ✅ **Tarea 1.2: Configurar variables de entorno**

**Archivo**: `client/.env`

Agregar:
```bash
# eco-packer configuration
VITE_ECO_PACKER_VERSION=1.1.0

# Key storage (localStorage por ahora)
VITE_USE_LOCAL_KEYS=true
```

---

### ✅ **Tarea 1.3: Verificar compilación**

```bash
cd /home/manu/verifysign/client
npm run build
```

**Resultado esperado**:
```
✓ 1780+ modules transformed
✓ built in ~1min
```

---

## 🎯 FASE 2: GESTIÓN DE CLAVES (2-3 horas)

### 📝 **Tarea 2.1: Crear KeyManagement service**

**Archivo**: `client/src/lib/keyManagement.ts`

```typescript
import { generateEd25519KeyPair } from '@temporaldynamics/eco-packer/eco-utils';
import { supabase } from './supabaseClient';
import CryptoJS from 'crypto-js';

interface KeyPair {
  privateKey: Buffer;
  publicKey: Buffer;
  keyId: string;
  created: string;
}

export class KeyManagementService {
  private static readonly STORAGE_KEY = 'verifysign_signing_keys';

  /**
   * Generar nuevo par de claves Ed25519
   */
  static async generateKeys(userId: string): Promise<KeyPair> {
    const { privateKey, publicKey } = generateEd25519KeyPair();

    const keyPair: KeyPair = {
      privateKey,
      publicKey,
      keyId: `user-${userId}-${Date.now()}`,
      created: new Date().toISOString()
    };

    // Guardar en localStorage (cifrado)
    await this.storeKeys(userId, keyPair);

    // Guardar clave pública en Supabase
    await this.storePublicKeyInDB(userId, keyPair);

    return keyPair;
  }

  /**
   * Obtener claves del usuario (genera nuevas si no existen)
   */
  static async getOrCreateKeys(userId: string): Promise<KeyPair> {
    const stored = await this.loadKeys(userId);
    if (stored) return stored;

    return await this.generateKeys(userId);
  }

  /**
   * Guardar claves en localStorage (cifradas)
   */
  private static async storeKeys(userId: string, keyPair: KeyPair): Promise<void> {
    // Obtener contraseña del usuario desde auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Usar email como salt para derivar clave de cifrado
    const encryptionKey = CryptoJS.PBKDF2(
      session.user.email!,
      'verifysign-salt',
      { keySize: 256 / 32, iterations: 10000 }
    );

    // Cifrar claves
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify({
        privateKey: keyPair.privateKey.toString('base64'),
        publicKey: keyPair.publicKey.toString('base64'),
        keyId: keyPair.keyId,
        created: keyPair.created
      }),
      encryptionKey.toString()
    ).toString();

    localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, encrypted);
  }

  /**
   * Cargar claves desde localStorage
   */
  private static async loadKeys(userId: string): Promise<KeyPair | null> {
    const encrypted = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
    if (!encrypted) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const encryptionKey = CryptoJS.PBKDF2(
        session.user.email!,
        'verifysign-salt',
        { keySize: 256 / 32, iterations: 10000 }
      );

      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        encryptionKey.toString()
      ).toString(CryptoJS.enc.Utf8);

      const parsed = JSON.parse(decrypted);

      return {
        privateKey: Buffer.from(parsed.privateKey, 'base64'),
        publicKey: Buffer.from(parsed.publicKey, 'base64'),
        keyId: parsed.keyId,
        created: parsed.created
      };
    } catch (error) {
      console.error('Error loading keys:', error);
      return null;
    }
  }

  /**
   * Guardar clave pública en Supabase
   */
  private static async storePublicKeyInDB(userId: string, keyPair: KeyPair): Promise<void> {
    const { error } = await supabase
      .from('user_public_keys')
      .insert([{
        user_id: userId,
        public_key: keyPair.publicKey.toString('base64'),
        key_id: keyPair.keyId,
        created_at: keyPair.created
      }]);

    if (error) {
      console.error('Error storing public key:', error);
      // No throw - el localStorage es suficiente
    }
  }

  /**
   * Exportar claves para backup
   */
  static async exportKeys(userId: string): Promise<string> {
    const keys = await this.loadKeys(userId);
    if (!keys) throw new Error('No keys found');

    const backup = {
      userId,
      publicKey: keys.publicKey.toString('base64'),
      privateKey: keys.privateKey.toString('base64'),
      keyId: keys.keyId,
      created: keys.created,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Importar claves desde backup
   */
  static async importKeys(userId: string, backupJson: string): Promise<void> {
    const backup = JSON.parse(backupJson);

    const keyPair: KeyPair = {
      privateKey: Buffer.from(backup.privateKey, 'base64'),
      publicKey: Buffer.from(backup.publicKey, 'base64'),
      keyId: backup.keyId,
      created: backup.created
    };

    await this.storeKeys(userId, keyPair);
    await this.storePublicKeyInDB(userId, keyPair);
  }
}
```

**Instalar dependencia adicional**:
```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

---

### 📝 **Tarea 2.2: Crear UI para gestión de claves**

**Archivo**: `client/src/components/KeyManagement.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { KeyManagementService } from '../lib/keyManagement';
import { supabase } from '../lib/supabaseClient';
import { Key, Download, Upload, Shield, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KeyManagement() {
  const [user, setUser] = useState(null);
  const [hasKeys, setHasKeys] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndCheckKeys();
  }, []);

  async function loadUserAndCheckKeys() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    setUser(user);

    try {
      const keys = await KeyManagementService.getOrCreateKeys(user.id);
      if (keys) {
        setHasKeys(true);
        setPublicKey(keys.publicKey.toString('base64'));
      }
    } catch (error) {
      console.error('Error loading keys:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateKeys() {
    if (!user) return;

    setLoading(true);
    try {
      const keys = await KeyManagementService.generateKeys(user.id);
      setHasKeys(true);
      setPublicKey(keys.publicKey.toString('base64'));
      toast.success('✅ Claves generadas correctamente');
    } catch (error) {
      console.error('Error generating keys:', error);
      toast.error('Error generando claves: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportKeys() {
    if (!user) return;

    try {
      const backup = await KeyManagementService.exportKeys(user.id);

      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verifysign-keys-backup-${user.email}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('✅ Claves exportadas - GUÁRDALAS EN UN LUGAR SEGURO');
    } catch (error) {
      console.error('Error exporting keys:', error);
      toast.error('Error exportando claves: ' + error.message);
    }
  }

  async function handleImportKeys(event) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupJson = e.target?.result as string;
        await KeyManagementService.importKeys(user.id, backupJson);

        const keys = await KeyManagementService.getOrCreateKeys(user.id);
        setHasKeys(true);
        setPublicKey(keys.publicKey.toString('base64'));

        toast.success('✅ Claves importadas correctamente');
      } catch (error) {
        console.error('Error importing keys:', error);
        toast.error('Error importando claves: ' + error.message);
      }
    };
    reader.readAsText(file);
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center space-x-3 mb-4">
        <Shield className="w-6 h-6 text-cyan-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Claves de Firma Criptográfica (Ed25519)
        </h3>
      </div>

      {!hasKeys ? (
        <div>
          <p className="text-gray-600 mb-4">
            No tienes claves de firma configuradas. Genera un par de claves para empezar a certificar documentos.
          </p>
          <button
            onClick={handleGenerateKeys}
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium px-6 py-3 rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <Key className="w-5 h-5" />
            <span>Generar Claves Ed25519</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm font-medium text-green-700">Claves activas</p>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              <strong>Public Key:</strong>
            </p>
            <p className="text-xs text-gray-600 font-mono break-all bg-white p-2 rounded mt-1">
              {publicKey}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportKeys}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Backup</span>
            </button>

            <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-3 rounded-lg flex items-center justify-center space-x-2 cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>Importar Claves</span>
              <input type="file" accept=".json" onChange={handleImportKeys} className="hidden" />
            </label>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">⚠️ Importante - Backup de Claves</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Exporta y guarda tus claves en un lugar seguro (USB, password manager)</li>
                  <li>• Si pierdes las claves, NO podrás firmar nuevos documentos</li>
                  <li>• NUNCA compartas tu archivo de backup con nadie</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Instalar react-hot-toast** (si no está):
```bash
npm install react-hot-toast
```

---

## 🎯 FASE 3: CERTIFICACIÓN DE DOCUMENTOS (3-4 horas)

### 📝 **Tarea 3.1: Crear servicio de certificación**

**Archivo**: `client/src/lib/certificationService.ts`

```typescript
import { pack, sha256Hex } from '@temporaldynamics/eco-packer';
import { supabase } from './supabaseClient';
import { KeyManagementService } from './keyManagement';

export interface CertificationResult {
  projectId: string;
  ecoxUrl: string;
  ecoHash: string;
  documentUrl: string;
}

export class CertificationService {
  /**
   * Certificar un documento (generar .ecox firmado)
   */
  static async certifyDocument(file: File, userId: string): Promise<CertificationResult> {
    // 1. Obtener claves del usuario
    const keys = await KeyManagementService.getOrCreateKeys(userId);

    // 2. Upload archivo original a Supabase Storage
    const originalFilename = `${userId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(originalFilename, file);

    if (uploadError) throw uploadError;

    // 3. Calcular hash del archivo
    const arrayBuffer = await file.arrayBuffer();
    const fileHash = sha256Hex(new Uint8Array(arrayBuffer));

    // 4. Crear manifest ECO
    const projectId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const project = {
      version: '1.1.0',
      projectId,
      createdBy: (await supabase.auth.getUser()).data.user?.email || 'unknown',
      createdAt: new Date().toISOString(),
      assets: [{
        assetId: 'main-document',
        type: this.getAssetType(file.type),
        source: originalFilename,
        metadata: {
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
          certifiedOn: new Date().toISOString()
        }
      }],
      segments: [],
      metadata: {
        title: file.name,
        certifiedBy: 'VerifySign',
        platform: 'verifysign.pro',
        description: `Documento certificado con VerifySign - ${new Date().toLocaleString()}`
      }
    };

    // 5. Preparar asset hashes
    const assetHashes = new Map<string, string>();
    assetHashes.set('main-document', fileHash);

    // 6. Pack → generar .ecox
    const ecoxBuffer = await pack(project, assetHashes, {
      privateKey: keys.privateKey,
      keyId: keys.keyId,
      signerId: project.createdBy,
      compressionLevel: 6
    });

    // 7. Upload .ecox a Storage
    const ecoxFilename = `${userId}/${projectId}.ecox`;
    const { data: ecoxUpload, error: ecoxError } = await supabase.storage
      .from('eco-files')
      .upload(ecoxFilename, Buffer.from(ecoxBuffer));

    if (ecoxError) throw ecoxError;

    // 8. Guardar metadata en database
    const { data: docData, error: dbError } = await supabase
      .from('documents')
      .insert([{
        id: projectId,
        owner_id: userId,
        title: file.name,
        original_filename: file.name,
        eco_hash: fileHash,
        ecox_url: ecoxFilename,
        status: 'active',
        eco_manifest: project,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // 9. Retornar resultado
    return {
      projectId,
      ecoxUrl: ecoxFilename,
      ecoHash: fileHash,
      documentUrl: originalFilename
    };
  }

  /**
   * Obtener tipo de asset basado en MIME type
   */
  private static getAssetType(mimeType: string): 'document' | 'image' | 'video' | 'audio' | 'text' {
    if (mimeType.startsWith('application/pdf')) return 'document';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/')) return 'text';
    return 'document';
  }

  /**
   * Descargar archivo .ecox
   */
  static async downloadEcox(ecoxUrl: string, filename: string): Promise<void> {
    const { data, error } = await supabase.storage
      .from('eco-files')
      .download(ecoxUrl);

    if (error) throw error;

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.ecox`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

---

### 📝 **Tarea 3.2: Actualizar DashboardPage con certificación**

**Archivo**: `client/src/pages/DashboardPage.jsx`

Agregar el modal de certificación:

```jsx
import { CertificationService } from '../lib/certificationService';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

// Dentro del componente DashboardPage:

const [certifying, setCertifying] = useState(false);
const [showCertifyModal, setShowCertifyModal] = useState(false);
const [selectedFile, setSelectedFile] = useState(null);

async function handleCertifyDocument() {
  if (!selectedFile) {
    toast.error('Selecciona un archivo primero');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error('Debes iniciar sesión');
    return;
  }

  setCertifying(true);

  try {
    const result = await CertificationService.certifyDocument(selectedFile, user.id);

    toast.success('✅ Documento certificado con éxito!');

    // Descargar .ecox automáticamente
    await CertificationService.downloadEcox(result.ecoxUrl, selectedFile.name);

    // Cerrar modal
    setShowCertifyModal(false);
    setSelectedFile(null);

    // Refresh documents list
    loadDocuments();

  } catch (error) {
    console.error('Error certificando documento:', error);
    toast.error(`Error: ${error.message}`);
  } finally {
    setCertifying(false);
  }
}

// En el JSX:
<div className="modal">
  <h3>Certificar Documento</h3>

  <div className="mb-4">
    <input
      type="file"
      accept=".pdf,.doc,.docx,image/*"
      onChange={(e) => setSelectedFile(e.target.files?.[0])}
      className="border rounded px-3 py-2 w-full"
    />
  </div>

  {selectedFile && (
    <div className="bg-gray-50 p-3 rounded mb-4">
      <p className="text-sm text-gray-600">Archivo seleccionado:</p>
      <p className="font-medium">{selectedFile.name}</p>
      <p className="text-xs text-gray-500">
        {(selectedFile.size / 1024).toFixed(2)} KB
      </p>
    </div>
  )}

  <button
    onClick={handleCertifyDocument}
    disabled={!selectedFile || certifying}
    className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg disabled:opacity-50"
  >
    {certifying ? (
      <span className="flex items-center">
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Certificando...
      </span>
    ) : (
      'Certificar y Descargar .ecox'
    )}
  </button>
</div>
```

---

## 🎯 FASE 4: VERIFICACIÓN DE DOCUMENTOS (2-3 horas)

### 📝 **Tarea 4.1: Crear servicio de verificación**

**Archivo**: `client/src/lib/verificationService.ts`

```typescript
import { unpack } from '@temporaldynamics/eco-packer';
import JSZip from 'jszip';

export interface VerificationResult {
  valid: boolean;
  projectId?: string;
  hash?: string;
  timestamp?: string;
  author?: string;
  signatures?: Array<{
    keyId: string;
    signedAt: string;
    valid: boolean;
  }>;
  manifest?: any;
  error?: string;
}

export class VerificationService {
  /**
   * Verificar archivo .eco o .ecox
   */
  static async verifyEcoFile(file: File): Promise<VerificationResult> {
    try {
      // 1. Leer archivo
      const arrayBuffer = await file.arrayBuffer();

      // 2. Cargar ZIP
      const zip = await JSZip.loadAsync(arrayBuffer);

      // 3. Extraer manifest
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) {
        throw new Error('Invalid .eco/.ecox file - missing manifest.json');
      }

      const manifestText = await manifestFile.async('text');
      const manifest = JSON.parse(manifestText);

      // 4. Extraer signature
      const signatureFile = zip.file('signature.json');
      let signatures = [];

      if (signatureFile) {
        const signatureText = await signatureFile.async('text');
        const signatureData = JSON.parse(signatureText);

        signatures.push({
          keyId: signatureData.keyId,
          signedAt: signatureData.signedAt,
          valid: false // Sin publicKey, no podemos verificar aquí
        });
      }

      // 5. Retornar resultado
      return {
        valid: true,
        projectId: manifest.projectId,
        hash: manifest.assets?.[0]?.metadata?.originalName ?
              manifest.assets[0].fileHash : 'N/A',
        timestamp: manifest.createdAt,
        author: manifest.createdBy,
        signatures,
        manifest
      };

    } catch (error) {
      console.error('Error verifying file:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar con clave pública (opcional)
   */
  static async verifyWithPublicKey(
    file: File,
    publicKey: Buffer
  ): Promise<VerificationResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Usar unpack de eco-packer
      const manifest = await unpack(arrayBuffer, {
        publicKey,
        verifyHashes: false // No tenemos acceso a assets
      });

      return {
        valid: manifest.signatures?.[0]?.valid || false,
        projectId: manifest.projectId,
        hash: manifest.assets?.[0]?.fileHash,
        timestamp: manifest.createdAt,
        author: manifest.createdBy,
        signatures: manifest.signatures?.map(sig => ({
          keyId: sig.keyId,
          signedAt: sig.signedAt,
          valid: sig.valid
        })),
        manifest
      };

    } catch (error) {
      console.error('Error verifying with public key:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }
}
```

---

### 📝 **Tarea 4.2: Actualizar VerifyPage**

**Archivo**: `client/src/pages/VerifyPage.jsx`

```jsx
import { VerificationService } from '../lib/verificationService';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

// Reemplazar el verifyFile actual:

const verifyFile = async () => {
  if (!file) return;

  setVerifying(true);

  try {
    const result = await VerificationService.verifyEcoFile(file);

    setResult({
      valid: result.valid,
      hash: result.hash || 'N/A',
      timestamp: result.timestamp || new Date().toISOString(),
      author: result.author || 'Unknown',
      projectId: result.projectId || 'N/A',
      signatures: result.signatures || [],
      error: result.error,
      manifest: result.manifest,
      blockchain: {
        anchored: false,
        network: 'N/A',
        txId: 'N/A'
      }
    });

  } catch (error) {
    console.error('Error verifying file:', error);
    setResult({
      valid: false,
      error: error.message
    });
  } finally {
    setVerifying(false);
  }
};

// Agregar UI para mostrar resultado:

{result && (
  <div className={`mt-6 p-6 rounded-lg border ${
    result.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  }`}>
    <div className="flex items-center space-x-3 mb-4">
      {result.valid ? (
        <>
          <CheckCircle className="w-8 h-8 text-green-600" />
          <h3 className="text-xl font-bold text-green-900">✅ Archivo Válido</h3>
        </>
      ) : (
        <>
          <XCircle className="w-8 h-8 text-red-600" />
          <h3 className="text-xl font-bold text-red-900">❌ Archivo Inválido</h3>
        </>
      )}
    </div>

    {result.valid && (
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-gray-600 font-medium">Project ID:</p>
            <p className="text-gray-900 font-mono text-xs">{result.projectId}</p>
          </div>
          <div>
            <p className="text-gray-600 font-medium">Timestamp:</p>
            <p className="text-gray-900">{new Date(result.timestamp).toLocaleString()}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-600 font-medium">SHA-256 Hash:</p>
            <p className="text-gray-900 font-mono text-xs break-all">{result.hash}</p>
          </div>
          <div>
            <p className="text-gray-600 font-medium">Certified By:</p>
            <p className="text-gray-900">{result.author}</p>
          </div>
        </div>

        {result.signatures && result.signatures.length > 0 && (
          <div className="mt-4 pt-4 border-t border-green-200">
            <p className="text-gray-600 font-medium mb-2">Signatures:</p>
            {result.signatures.map((sig, idx) => (
              <div key={idx} className="bg-white rounded p-3 mb-2">
                <p className="text-xs text-gray-600">Key ID: {sig.keyId}</p>
                <p className="text-xs text-gray-600">Signed: {new Date(sig.signedAt).toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500 mr-1" />
                  <p className="text-xs text-amber-600">Signature not verified (public key required)</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {result.error && (
      <div className="text-red-700 text-sm mt-2">
        <p><strong>Error:</strong> {result.error}</p>
      </div>
    )}
  </div>
)}
```

---

## 🎯 FASE 5: INTEGRACIÓN EN DASHBOARD (1-2 horas)

### 📝 **Tarea 5.1: Agregar KeyManagement al Dashboard**

**En DashboardPage.jsx**:

```jsx
import KeyManagement from '../components/KeyManagement';

// Agregar en la sección de configuración:

<div className="grid grid-cols-1 gap-6">
  <KeyManagement />
  {/* Otros componentes */}
</div>
```

---

### 📝 **Tarea 5.2: Crear lista de documentos certificados**

```jsx
const [documents, setDocuments] = useState([]);

useEffect(() => {
  loadDocuments();
}, []);

async function loadDocuments() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading documents:', error);
    return;
  }

  setDocuments(data || []);
}

// UI para mostrar documentos:

<div className="bg-white rounded-lg shadow-md p-6">
  <h3 className="text-lg font-semibold mb-4">Documentos Certificados</h3>

  {documents.length === 0 ? (
    <p className="text-gray-500 text-center py-8">
      No hay documentos certificados aún
    </p>
  ) : (
    <div className="space-y-3">
      {documents.map(doc => (
        <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-gray-900">{doc.title}</p>
              <p className="text-sm text-gray-600">
                {new Date(doc.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500 font-mono mt-1">
                Hash: {doc.eco_hash.substring(0, 16)}...
              </p>
            </div>
            <button
              onClick={() => CertificationService.downloadEcox(doc.ecox_url, doc.title)}
              className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
            >
              Descargar .ecox
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## 🎯 FASE 6: TESTING Y VALIDACIÓN (1 día)

### ✅ **Test 1: Flujo completo de certificación**

1. Login como usuario
2. Ir a Dashboard
3. Generar claves (si no existen)
4. Certificar un PDF
5. Verificar que se descarga .ecox
6. Verificar que aparece en lista de documentos

---

### ✅ **Test 2: Flujo de verificación**

1. Ir a /verify
2. Subir archivo .ecox generado en Test 1
3. Verificar que muestra información correcta
4. Verificar que hash coincide

---

### ✅ **Test 3: Exportar/Importar claves**

1. Exportar backup de claves
2. Limpiar localStorage
3. Importar backup
4. Verificar que puede certificar nuevos documentos

---

## 🎯 FASE 7: DOCUMENTACIÓN (2-3 horas)

### 📝 **Crear guía de usuario**

**Archivo**: `docs/GUIA-USO-ECO-PACKER.md`

```markdown
# Guía de Uso - Certificación con eco-packer

## ¿Qué es un archivo .ecox?

Un archivo `.ecox` es un contenedor criptográficamente firmado que contiene:
- Manifest JSON con metadata del documento
- Firma digital Ed25519
- Hash SHA-256 del documento original

## Cómo certificar un documento

1. Inicia sesión en VerifySign
2. Ve a Dashboard
3. Click en "Certificar Documento"
4. Selecciona tu archivo (PDF, imagen, etc.)
5. Click en "Certificar"
6. Se descargará automáticamente el archivo .ecox

## Cómo verificar un documento

1. Ve a https://verifysign.pro/verify
2. Arrastra tu archivo .ecox
3. Ver resultado de verificación

## Gestión de Claves

### Generar claves nuevas
- Dashboard → Gestión de Claves → Generar

### Exportar backup
- Dashboard → Gestión de Claves → Exportar Backup
- GUARDA EL ARCHIVO EN UN LUGAR SEGURO

### Importar backup
- Dashboard → Gestión de Claves → Importar
- Selecciona tu archivo .json de backup

## FAQ

### ¿Puedo perder mis claves?
Sí, si limpias tu navegador o cambias de dispositivo.
**SOLUCIÓN**: Exporta backup regularmente.

### ¿Qué pasa si pierdo mis claves?
- No podrás firmar nuevos documentos con las mismas claves
- Los documentos ya firmados siguen siendo válidos
- Puedes generar nuevas claves

### ¿Puedo compartir mi .ecox?
Sí, el archivo .ecox es público y puede ser verificado por cualquiera.

### ¿El .ecox contiene el documento original?
No, solo contiene el hash y la metadata.
El documento original se guarda por separado en Storage.
```

---

## 📊 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Setup ✅
- [ ] eco-packer instalado
- [ ] Variables de entorno configuradas
- [ ] Build exitoso

### Fase 2: Gestión de Claves
- [ ] KeyManagementService implementado
- [ ] KeyManagement component creado
- [ ] Cifrado de claves en localStorage
- [ ] Export/Import funcional

### Fase 3: Certificación
- [ ] CertificationService implementado
- [ ] DashboardPage actualizado
- [ ] Upload a Supabase Storage
- [ ] Generación de .ecox
- [ ] Lista de documentos

### Fase 4: Verificación
- [ ] VerificationService implementado
- [ ] VerifyPage actualizado
- [ ] UI de resultados

### Fase 5: Integración
- [ ] KeyManagement en Dashboard
- [ ] Lista de documentos certificados
- [ ] Descarga de .ecox

### Fase 6: Testing
- [ ] Test certificación E2E
- [ ] Test verificación
- [ ] Test export/import claves

### Fase 7: Documentación
- [ ] Guía de usuario
- [ ] Documentación técnica
- [ ] FAQ

---

## 🚀 DEPLOYMENT

### Preparación pre-deploy

1. **Supabase SQL**:
```sql
-- Ejecutar schema updates
ALTER TABLE documents ADD COLUMN IF NOT EXISTS eco_manifest JSONB;
-- ... (resto del schema de AUDIT-COMPLETO-INTEGRACIONES.md)
```

2. **Variables de entorno en Vercel**:
```bash
VITE_ECO_PACKER_VERSION=1.1.0
VITE_USE_LOCAL_KEYS=true
```

3. **Build final**:
```bash
cd client
npm run build
npm run preview  # Test local
```

4. **Deploy**:
```bash
git add .
git commit -m "feat: Integrate eco-packer for document certification"
git push origin main
```

---

## 📞 SOPORTE

**Problemas con eco-packer**:
- Docs: `/home/manu/verifysign/eco-packer/README.md`
- API: `/home/manu/verifysign/eco-packer/API.md`

**Problemas con VerifySign**:
- Issues: GitHub
- Docs: `/home/manu/verifysign/docs/`

---

**Timeline Total**: 2-3 semanas (trabajo enfocado)
**Tiempo estimado por fase**: Ver secciones individuales

¿Listo para empezar? 🚀
