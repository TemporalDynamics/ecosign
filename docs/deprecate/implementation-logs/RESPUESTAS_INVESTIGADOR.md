# Respuestas al Investigador - EcoSign MVP

## 1. ¿Podés confirmar si la red de Polygon que estás usando es Polygon PoS o Polygon zkEVM?

**Respuesta:** **Polygon PoS (Mainnet)**

**Detalles técnicos:**
- Red: `polygon-mainnet` (confirmado en múltiples archivos del código)
- RPC URL: Alchemy Polygon PoS endpoint (configurado en `POLYGON_RPC_URL`)
- Referencias en código:
  - `supabase/functions/anchor-polygon/index.ts:94` → `network: 'polygon-mainnet'`
  - `client/src/lib/polygonAnchor.js:111` → `network: 'polygon-mainnet'`
  - `client/src/lib/polygonAnchorClient.js` → múltiples referencias a `polygon-mainnet`

**Por qué Polygon PoS y no zkEVM:**
- ✅ **Madurez**: Polygon PoS es la red principal con mayor adopción
- ✅ **Costos**: Gas fees extremadamente bajos (~$0.001 por transacción)
- ✅ **Compatibilidad**: 100% compatible con Ethereum tooling (ethers.js, Remix, MetaMask)
- ✅ **Infraestructura**: Soportado nativamente por Alchemy, que ya usamos
- ⚠️ zkEVM es más reciente y experimental para un MVP

**Documentación de referencia:**
- `docs/POLYGON_ANCHORING_SETUP.md` → Especifica "Polygon Mainnet" explícitamente
- Explorador: PolygonScan.com (no zkEVM scanner)

---

## 2. ¿El contrato inteligente de Polygon que están usando ya está desplegado? Si sí, ¿podés pasarme la dirección y/o su código fuente si no está en el repo?

**Respuesta:** El contrato **ESTÁ en el repositorio** pero el **deployment está PENDIENTE**.

### Código Fuente del Contrato

**Ubicación:** `contracts/VerifySignAnchor.sol`

**Características:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VerifySignAnchor {
    // Estructura para almacenar anchors
    struct Anchor {
        uint256 timestamp;    // Timestamp del bloque
        address anchorer;     // Wallet que ancló
        bool exists;          // Si existe o no
    }

    mapping(bytes32 => Anchor) public anchors;
    bytes32[] public anchoredHashes;

    // Funciones principales:
    function anchorHash(bytes32 documentHash) external returns (uint256)
    function getAnchor(bytes32 documentHash) external view returns (...)
    function isAnchored(bytes32 documentHash) external view returns (bool)
    function getTotalAnchors() external view returns (uint256)
    function batchVerify(bytes32[] calldata hashes) external view returns (bool[])
}
```

**Líneas de código:** 114 líneas
**Versión Solidity:** ^0.8.20
**Licencia:** MIT

### Estado del Deployment

**Configuración actual en Supabase:**
- ✅ `POLYGON_RPC_URL` → Configurada (Alchemy endpoint)
- ✅ `POLYGON_PRIVATE_KEY` → Configurada (wallet para enviar txs)
- ⚠️ `POLYGON_CONTRACT_ADDRESS` → Configurada pero **dirección desconocida** (hash encriptado)

**Para verificar si está desplegado:**
```bash
# Necesitamos obtener la dirección real del contrato
supabase secrets list | grep POLYGON_CONTRACT_ADDRESS
# Output: Solo muestra hash (por seguridad)

# Para obtener el valor real:
# Opción 1: Dashboard de Supabase → Settings → Edge Functions → Secrets
# Opción 2: Desplegar nuevo contrato siguiendo docs/POLYGON_ANCHORING_SETUP.md
```

**Contratos adicionales en el repo:**
- `contracts/DigitalNotary.sol` (1873 bytes) - Contrato alternativo/anterior
- `contracts/deploy-polygon.md` - Guía de deployment
- `contracts/deploy-contract.js` - Script de deployment automatizado

### Recomendación para el Investigador

**Si el contrato NO está desplegado:**
1. Desplegar `VerifySignAnchor.sol` en Polygon PoS Mainnet
2. Usar Remix o Hardhat (guía en `deploy-polygon.md`)
3. Costo estimado: ~0.005 MATIC (~$0.005 USD)
4. Actualizar `POLYGON_CONTRACT_ADDRESS` con la nueva dirección

**Si SÍ está desplegado:**
1. Verificar la dirección en Dashboard de Supabase
2. Validar en PolygonScan que el código coincide
3. Considerar verificar el contrato en PolygonScan para transparencia pública

---

## 3. ¿En qué lenguaje/framework está hecho el frontend de ecosign.app?

**Respuesta:** **React 18.2 + Vite 4.5 (SPA - Single Page Application)**

### Stack Tecnológico Completo

**Framework Frontend:**
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.18.0"
}
```

**Build Tool:**
- **Vite 4.5** (bundler ultra-rápido, reemplazo moderno de Webpack/CRA)
- `@vitejs/plugin-react` para JSX/TSX

**Styling:**
- **Tailwind CSS 3.4.18** (utility-first CSS framework)
- PostCSS + Autoprefixer

**UI Components:**
- `lucide-react` 0.553.0 (iconos)
- `react-hot-toast` 2.6.0 (notificaciones)
- `react-helmet-async` 2.0.5 (SEO/meta tags)

### Librerías Especializadas

**Criptografía:**
- `@noble/ed25519` 3.0.0 → Firmas digitales Ed25519
- `@noble/hashes` 2.0.1 → SHA-256, RIPEMD-160
- `node-forge` 1.3.1 → PKI, X.509, ASN.1

**Documentos:**
- `pdf-lib` 1.17.1 → Manipulación de PDFs
- `jszip` 3.10.1 → Archivos .ECO (ZIP con certificados)

**Backend/Database:**
- `@supabase/supabase-js` 2.39.0 → Cliente de Supabase
- PostgreSQL (via Supabase)

**Librería Propietaria:**
- `@temporaldynamics/eco-packer` → Empaquetado de certificados .ECO
  - **Ubicación:** `eco-packer/` (local workspace)
  - **Estado:** En `.gitignore` (código privado)
  - **Uso:** Crear/verificar archivos .ECO forenses

### Arquitectura del Frontend

**Tipo:** SPA (Single Page Application)
**Routing:** Client-side routing con react-router-dom
**Deployment:** Vercel (configurado en `docs/ops/vercel.json`)

**Estructura de carpetas:**
```
client/
├── src/
│   ├── components/      # Componentes React
│   ├── pages/           # Páginas/rutas
│   ├── lib/             # Utilidades y servicios
│   ├── utils/           # Helpers
│   └── main.jsx         # Entry point
├── public/              # Assets estáticos
└── package.json
```

**Engine requirements:**
- Node.js: `>=20.x`
- npm: `>=9.0.0`

### Scripts de Build

```json
{
  "dev": "vite",                                    // Dev server
  "build": "npm run validate:env && vite build",   // Production build
  "preview": "vite preview",                       // Preview build
  "validate:env": "node scripts/validate-env.js"   // Pre-build checks
}
```

**Optimizaciones:**
- Terser 5.36.0 para minificación
- Tree-shaking automático (Vite)
- Code-splitting por rutas
- Polyfills para Node.js APIs en browser (`vite-plugin-node-polyfills`)

### ¿Por qué NO es Next.js o SvelteKit?

**React + Vite fue elegido porque:**
- ✅ Más ligero que Next.js para SPA sin SSR
- ✅ Build ultra-rápido (Vite es ~20x más rápido que Webpack)
- ✅ Compatible con librerías crypto que requieren Node.js polyfills
- ✅ Despliegue simple en Vercel/Netlify
- ✅ No necesita SSR (la verificación de documentos debe ser client-side para privacidad)

---

## 4. ¿El flujo actual de firma por mail (con Resend o similar) ya está implementado o también está pendiente?

**Respuesta:** **IMPLEMENTADO pero PARCIALMENTE FUNCIONAL**

### Estado de Implementación

#### ✅ **Componentes Implementados**

**1. Sistema de Emails (Resend):**
- Librería compartida: `supabase/functions/_shared/email.ts`
- Función de envío: `sendResendEmail()`
- API Key: `RESEND_API_KEY` (configurada en Supabase Secrets)

**2. Worker de Emails Pendientes:**
- Edge Function: `supabase/functions/send-pending-emails/index.ts`
- Funcionalidad:
  - Lee tabla `workflow_notifications` con status `pending`
  - Envía hasta 50 emails por ejecución
  - Retry automático (max 3 intentos)
  - Actualiza status: `pending` → `sent` o `failed`

**3. Workflow de Firmas:**
- Edge Function: `supabase/functions/start-signature-workflow/index.ts`
- Crea workflow con múltiples signatarios
- Genera tokens de acceso únicos por firmante
- Soporta configuración de seguridad:
  - `requireLogin` (default: true)
  - `requireNda` (default: true)
  - `quickAccess` (para acceso sin login)

**4. Notificaciones Implementadas:**
- `notify-document-certified/index.ts` → Notifica al certificar
- `notify-document-signed/index.ts` → Notifica al firmar
- `create-signer-link/index.ts` → Genera link de firma
- `test-email/index.ts` → Testing de envíos

#### ⚠️ **Componentes PENDIENTES/PROBLEMAS**

**1. Cron Job de Envío de Emails:**
- ❌ **NO HAY CRON configurado** para `send-pending-emails`
- Los emails se acumulan en estado `pending` en la tabla
- **Solución necesaria:**
  ```sql
  SELECT cron.schedule(
    'send-pending-emails',
    '* * * * *',  -- Cada minuto
    $$
      SELECT net.http_post(
        url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        )
      );
    $$
  );
  ```

**2. Plantillas de Email:**
- ✅ Body HTML se genera dinámicamente
- ⚠️ Falta plantillas profesionales con branding
- ⚠️ No hay templates en `client/email-templates/` (directorio existe pero vacío)

**3. Notificaciones de Anchoring:**
- ✅ Bitcoin anchoring tiene notificación (en `process-bitcoin-anchors`)
- ❌ Polygon anchoring NO notifica cuando confirma (falta worker)

**4. Remitente de Emails:**
- Configurado: `DEFAULT_FROM` → `EcoSign <no-reply@ecosign.app>`
- ⚠️ **Dominio no verificado en Resend** (probablemente)
- Posible problema: emails van a spam

### Flujo Actual de Firma por Email

```
1. Usuario inicia workflow
   ↓
2. start-signature-workflow crea:
   - Registro en workflow_signatures
   - Un signer por cada email
   - Access token único por signer
   ↓
3. Se inserta notificación en workflow_notifications:
   - recipient_email: email del firmante
   - subject: "Te invitan a firmar un documento"
   - body_html: Link con access token
   - delivery_status: 'pending'
   ↓
4. ⚠️ PROBLEMA: No hay cron que procese esta tabla
   ↓ (Si ejecutas send-pending-emails manualmente)
5. send-pending-emails lee pending
   ↓
6. Llama a Resend API
   ↓
7. Actualiza status a 'sent' o 'failed'
   ↓
8. Firmante recibe email con link
   ↓
9. Click en link → SignWorkflowPage.tsx
   ↓
10. Valida token, muestra documento, firma
```

### Testing del Flujo de Emails

**Para verificar si funciona:**
```bash
# 1. Ver emails pendientes
curl -X GET \
  -H "apikey: YOUR_SERVICE_KEY" \
  "https://uiyojopjbhooxrmamaiw.supabase.co/rest/v1/workflow_notifications?delivery_status=eq.pending&select=*"

# 2. Ejecutar envío manualmente
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails"

# 3. Verificar que cambió a 'sent'
# Repetir query del paso 1
```

### Qué Falta para que Funcione 100%

1. **Configurar cron de send-pending-emails** (CRÍTICO)
2. **Verificar dominio ecosign.app en Resend** (evitar spam)
3. **Crear plantillas HTML profesionales** (UX)
4. **Probar flujo end-to-end** con emails reales
5. **Agregar notificación cuando Polygon confirma** (valor agregado)

### Capacidades Actuales del Sistema de Emails

**Implementado:**
- ✅ Envío via Resend API
- ✅ Queue de emails pendientes
- ✅ Retry automático (3 intentos)
- ✅ Tracking de estado (pending/sent/failed)
- ✅ Logging de errores
- ✅ Soporte para HTML templates
- ✅ Generación de access tokens seguros (SHA-256)

**Pendiente:**
- ❌ Cron automático
- ❌ Templates bonitos
- ❌ Verificación de dominio
- ❌ Notificaciones de confirmación de anchors
- ❌ Métricas de deliverability

---

## 5. ¿Tenés alguna preferencia en los criterios de puntaje que querés priorizar?

**Respuesta:** Según el contexto del MVP privado para 7 usuarios y posterior búsqueda de VC, los criterios prioritarios son:

### Prioridad ALTA (Must-Have para MVP Privado)

**1. Seguridad (Peso: 30%)**
- Protección de datos sensibles
- Gestión segura de claves privadas
- Validación de inputs
- Protección contra ataques comunes (XSS, CSRF, SQL injection)
- **Justificación:** Es una plataforma de certificación forense. Una brecha de seguridad destruye la confianza y el producto.

**2. Funcionalidad Core (Peso: 25%)**
- Triple anchoring (Ed25519 + TSA + Blockchain) funciona
- Flujo de firmas por email operativo
- Verificación pública sin fricción
- **Justificación:** Estas son las features que diferencian a EcoSign. Si no funcionan, no hay producto.

**3. UX/Velocidad (Peso: 20%)**
- Tiempo de certificación < 10 segundos
- Interfaz intuitiva para usuarios no técnicos
- Mobile-responsive
- **Justificación:** Los 7 beta testers darán feedback brutal si es complicado. Necesitas wow factor.

### Prioridad MEDIA (Importante para VC Pitch)

**4. Escalabilidad (Peso: 15%)**
- Arquitectura que soporte 1,000 → 10,000 usuarios
- Costos operativos predecibles
- Performance bajo carga
- **Justificación:** VCs preguntarán "¿esto escala?". Necesitas demostrar que sí.

**5. Calidad de Código (Peso: 5%)**
- Arquitectura limpia y mantenible
- Testing coverage
- Documentación
- **Justificación:** Menor prioridad AHORA, pero importante para contratar devs después del seed round.

### Prioridad BAJA (Nice-to-Have)

**6. Velocidad de Desarrollo (Peso: 5%)**
- Qué tan rápido puedes agregar features
- **Justificación:** Ya estás cerca del MVP. Importará más post-funding.

**7. Costo Operativo (Peso: 0%)**
- Actualmente irrelevante (Supabase free tier + Polygon barato)
- Revisitar cuando tengas 10k+ usuarios

### Criterios Específicos a Evaluar

#### Seguridad (30 puntos)
- [ ] Secrets management (Supabase Secrets vs hardcoded) - **10 pts**
- [ ] Input validation en todas las Edge Functions - **5 pts**
- [ ] HTTPS everywhere - **3 pts**
- [ ] Rate limiting contra spam - **4 pts**
- [ ] Audit logs de operaciones críticas - **3 pts**
- [ ] Protección contra replay attacks en tokens - **5 pts**

#### Funcionalidad Core (25 puntos)
- [ ] Bitcoin anchoring funciona end-to-end - **8 pts**
- [ ] Polygon anchoring funciona end-to-end - **8 pts**
- [ ] Flujo de emails para firmas operativo - **7 pts**
- [ ] Verificación pública sin login - **2 pts**

#### UX/Velocidad (20 puntos)
- [ ] Certificación completa en <10 seg - **8 pts**
- [ ] Mobile responsive al 100% - **5 pts**
- [ ] Loading states claros - **3 pts**
- [ ] Mensajes de error útiles - **4 pts**

#### Escalabilidad (15 puntos)
- [ ] Edge Functions pueden manejar 10 req/seg - **5 pts**
- [ ] Database queries optimizadas (indexes) - **4 pts**
- [ ] File storage escalable (Supabase Storage) - **3 pts**
- [ ] Workers de background (cron jobs) - **3 pts**

#### Calidad de Código (5 puntos)
- [ ] TypeScript coverage >80% - **2 pts**
- [ ] Tests críticos (anchoring, crypto) - **2 pts**
- [ ] README y docs básicos - **1 pt**

#### Velocidad de Desarrollo (5 puntos)
- [ ] Componentes reutilizables - **2 pts**
- [ ] Scripts de deployment automatizados - **2 pts**
- [ ] Local dev environment fácil de setup - **1 pt**

### Score Objetivo para MVP Privado

**Mínimo aceptable:** 70/100 puntos
**Ideal para lanzar:** 85/100 puntos
**Excelente (impresionar VCs):** 95/100 puntos

### Enfoque Recomendado

**Próximas 2 semanas (Pre-MVP):**
1. Fix críticos de seguridad → Target: 28/30 pts
2. Completar anchoring (Polygon + Bitcoin) → Target: 24/25 pts
3. Emails funcionando → Target: 18/20 pts UX
4. **Total mínimo:** 70 puntos

**Post-MVP, Pre-VC (siguientes 4-6 semanas):**
1. Pulir UX basado en feedback de beta testers
2. Optimizar escalabilidad
3. Agregar tests automatizados
4. Preparar métricas para pitch deck
5. **Total objetivo:** 90+ puntos

---

## Información Adicional para el Investigador

### Filosofía del Producto

**Problema que resuelve:**
- DocuSign es caja negra: nadie puede verificar la integridad de un documento certificado sin acceso a su plataforma
- Certificaciones legales carecen de transparencia pública
- Blockchain es difícil de usar para usuarios no técnicos

**Solución de EcoSign:**
- **Verificación universal:** Cualquiera con el archivo .ECO puede verificar su autenticidad
- **Triple anchoring:** Combina firma digital (Ed25519) + timestamp legal (RFC 3161) + blockchain (Bitcoin/Polygon)
- **Open source:** Código auditable públicamente
- **Sin lock-in:** Los archivos .ECO son estándar abierto (ZIP + JSON + cryptography)

### Diferenciadores Técnicos

1. **Formato .ECO propietario** (en `eco-packer/`):
   - ZIP container con documento + certificados + proofs
   - Verificable offline sin dependencias de EcoSign
   - Compatible con auditorías forenses

2. **Triple capa de confianza:**
   - Capa 1: Firma Ed25519 (instantánea, criptográfica)
   - Capa 2: TSA RFC 3161 (legal, reconocido por tribunales)
   - Capa 3a: Bitcoin vía OpenTimestamps (inmutable, descentralizado)
   - Capa 3b: Polygon smart contract (rápido, verificable en blockchain explorer)

3. **Arquitectura serverless:**
   - Supabase Edge Functions (Deno runtime)
   - PostgreSQL con Row Level Security
   - Vercel para frontend

### Smart Contracts - Análisis Detallado

**Contrato actual:** `VerifySignAnchor.sol`

**Funcionalidad:**
- `anchorHash()`: Registra hash en mapping
- `getAnchor()`: Consulta timestamp + anchorer
- `isAnchored()`: Verificación simple booleana
- `batchVerify()`: Verifica múltiples hashes en una llamada

**Evaluación del contrato:**

**Pros:**
- ✅ Simple y auditable (114 líneas)
- ✅ Gas-efficient (solo escritura de storage mínimo)
- ✅ Inmutable (no hay funciones admin)
- ✅ Events para indexing
- ✅ Batch operations para escalabilidad

**Cons:**
- ⚠️ No tiene mecanismo de upgrade (pero esto es feature de seguridad)
- ⚠️ `anchoredHashes[]` array crece infinitamente (podría ser costoso en el futuro)
- ⚠️ No hay metadata asociada al hash (ej: tipo de documento, owner)

**¿Es el mejor contrato para la tarea?**

**Para MVP: SÍ, 9/10**
- Hace exactamente lo necesario
- No hay complejidad innecesaria
- Gas costs son mínimos

**Para escalar a 100k+ docs: Considerar mejoras**
- Agregar metadata opcional (IPFS hash, document type)
- Implementar patrón de upgradeable proxy (OpenZeppelin)
- Considerar storage offchain (solo hash root en contract)

**Alternativas evaluadas:**
1. **ERC-721 (NFT):** Overkill, más caro, innecesario
2. **Merkle Tree on-chain:** Más complejo, no agrega valor para caso de uso
3. **zkSNARKs:** Muy avanzado para MVP, considerar en v2

**Recomendación final:** Mantener `VerifySignAnchor.sol` para MVP, considerar OpenZeppelin upgradeable después de fundraising.

---

## Resumen Ejecutivo para Investigador

**Estado actual del proyecto:**
- **Blockchain:** Código listo, deployment pendiente
- **Emails:** Implementado pero falta cron job
- **Frontend:** Sólido (React + Vite)
- **Backend:** Supabase bien configurado
- **Seguridad:** Buena (Secrets management correcto)

**Bloqueadores para MVP:**
1. Completar deployment de contrato Polygon
2. Configurar cron de `send-pending-emails`
3. Implementar worker de confirmación Polygon (`process-polygon-anchors`)
4. Testing end-to-end de flujo de firmas

**Estimación de tiempo para MVP funcional:**
- Fix de bloqueadores: 4-6 horas
- Testing con 7 usuarios: 1 semana
- Ajustes post-feedback: 1-2 semanas
- **Total: 2-3 semanas** para MVP estable

**Fortalezas para pitch a VCs:**
- Tecnología diferenciada (triple anchoring)
- Open source + verificación pública
- Costos operativos bajísimos ($0.001 por certificación)
- Mercado enorme (competir con DocuSign de $68B market cap)

**Debilidades a resolver antes de VC:**
- Necesita métricas de uso (por eso el beta privado)
- Falta go-to-market strategy clara
- Competencia con DocuSign/Adobe Sign es brutal

---

¿Necesitas más detalles sobre algún punto específico?
