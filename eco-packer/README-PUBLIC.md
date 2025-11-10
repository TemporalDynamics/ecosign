# eco-packer

**⚠️ Código Fuente Protegido - En Proceso de Patente**

Este módulo contiene el motor criptográfico propietario de VerifySign para la generación y validación de archivos `.ECO` y `.ECOX`.

## Uso Público (Solo API)

El código fuente de este paquete **NO está disponible públicamente** mientras se tramita la patente.

### Instalación (Usuarios Autorizados)

```bash
npm install @verifysign/eco-packer
```

### API Pública

```typescript
import { packEco, unpackEco, verifyEco } from '@verifysign/eco-packer';

// Generar certificado .ECO
const eco = await packEco({
  documentHash: 'sha256-hash-here',
  timestamp: Date.now(),
  signerPublicKey: 'ed25519-public-key'
});

// Verificar certificado
const isValid = await verifyEco(ecoBuffer);
```

## Licencia

Código propietario. Uso comercial requiere licencia de Temporal Dynamics LLC.

Para consultas de licenciamiento: security@verifysign.com

---

**Documentación completa**: https://docs.verifysign.com/eco-format
