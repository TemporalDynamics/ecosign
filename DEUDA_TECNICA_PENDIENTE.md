# Deudas Técnicas Pendientes - EcoSign

## ✅ Completadas

### Paso 1: Consolidación del cliente de Supabase ✅
- ✅ Eliminado `supabaseClient.js` con credenciales hardcodeadas
- ✅ Mantenido `supabaseClient.ts` con validación de environment
- ✅ Limpiado `.env.local` con formato correcto
- ✅ Creado script de validación `validate-env.js`
- ✅ Agregado `validate:env` al build process
- ✅ Creado `tsconfig.json` para el cliente

### Paso 2: Corrección del panel de documentos ✅
- ✅ Ampliado `getUserDocuments()` para devolver todos los campos necesarios
- ✅ Incluidos joins con `events`, `signer_links`, y `anchors`
- ✅ Eliminada transformación restrictiva que filtraba campos
- ✅ Creada migración para campos faltantes (la mayoría ya existían)

### Paso 3: Integridad de cadena de custodia ✅
- ✅ Creada edge function `log-event` con captura server-side de IP
- ✅ Actualizado `eventLogger.js` para usar edge function
- ✅ Eliminado `getClientIP()` que era manipulable
- ✅ Creada migración RLS para bloquear inserts directos desde cliente
- ✅ Solo SERVICE_ROLE (edge functions) puede insertar eventos

---

## ⏳ Pendientes

### Paso 4: Flujos funcionales (PARCIAL)

#### 4A. Sistema de Notificaciones
**Problema:** 19 llamadas a `alert()` en la aplicación que dan mala UX

**Archivos afectados:**
- `CertificationModal.jsx` (6 alerts)
- `SignDocumentPage.jsx` (6 alerts)
- `InvitePage.jsx` (3 alerts)
- `LegalProtectionOptions.jsx` (2 alerts)
- `SignatureWorkshop.jsx` (1 alert)
- `NdaAccessPage.jsx` (1 alert - DEMO)

**Solución:**
1. Crear componente `Toast.jsx` o instalar librería (react-hot-toast recomendada)
2. Crear context `ToastContext` para manejo global
3. Reemplazar todos los `alert()` con toast notifications
4. Usar colores semánticos: success (verde), error (rojo), warning (amarillo), info (azul)

**Ejemplo de implementación:**
```bash
npm install react-hot-toast
```

```jsx
// App.jsx
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Routes>...</Routes>
      <Toaster position="top-right" />
    </>
  );
}
```

```jsx
// Reemplazar alert() con:
import toast from 'react-hot-toast';

// alert('Success!') →
toast.success('Success!');

// alert('Error!') →
toast.error('Error!');
```

#### 4B. TODOs en CertificationModal.jsx

**Línea 84:** Prellenar datos del usuario autenticado
```js
// Actual: TODO comentario
// Fix: Obtener datos reales del usuario
const { data: { user } } = await supabase.auth.getUser();
setOwnerName(user.user_metadata?.full_name || user.email);
```

**Línea 200:** Implementar envío de links únicos
```js
// Actual: TODO comentario
// Fix: Llamar a edge function que envíe emails con Resend
await supabase.functions.invoke('send-signature-invites', {
  body: { documentId, signers: validEmails }
});
```

**Línea 271-272:** Emails ficticios en SignNow
```js
// Actual: userEmail: 'user@example.com'
// Fix: Usar datos reales
const { data: { user } } = await supabase.auth.getUser();
userEmail: user.email,
userName: user.user_metadata?.full_name || 'Usuario',
```

**Línea 1286-1287:** userId y userEmail null en logging
```js
// Actual: null comments
// Fix:
const { data: { user } } = await supabase.auth.getUser();
await logEvent('downloaded', documentId, {
  userId: user.id,
  userEmail: user.email
});
```

#### 4C. Texto "demo" en NdaAccessPage.jsx

**Línea 135:** Eliminar mensaje de demo
```js
// Actual:
alert('En esta versión demo, el documento se descargaría aquí...');

// Fix: Implementar descarga real
const downloadUrl = await getDocumentDownloadUrl(document.pdf_storage_path);
const link = document.createElement('a');
link.href = downloadUrl;
link.download = document.document_name;
link.click();

// O usar toast:
toast.success('Descarga iniciada');
```

#### 4D. Funcionalidades "próximamente"

**InvitePage.jsx:325:** Botón de firma deshabilitado
```js
onClick={() => alert('Funcionalidad de firma próximamente')}

// Fix: Habilitar cuando el flujo de firma esté completo
// O ocultar el botón si no está disponible
```

### Paso 5: Dependencias y reproducibilidad

#### 5A. Verificar @temporaldynamics/eco-packer en package.json

**Acción:**
```bash
cd client
cat package.json | grep eco-packer
# Si no aparece, agregar:
npm install @temporaldynamics/eco-packer@latest --save
```

#### 5B. Verificar build limpio

```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

Si falla, documentar error y fix.

#### 5C. Agregar test de build al CI/CD

```yaml
# .github/workflows/test.yml (ejemplo)
- name: Test clean build
  run: |
    cd client
    npm ci
    npm run build
```

### Paso 6: Tests de seguridad

#### 6A. Configurar entorno de test

**Archivo:** `tests/.env.test`
```env
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # CRÍTICO para tests
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
```

#### 6B. Smoke tests básicos

Crear `tests/smoke/basic-flows.test.ts`:
```ts
describe('Basic Flows', () => {
  it('should create and retrieve a document', async () => {
    // 1. Authenticate test user
    // 2. Upload a test PDF
    // 3. Verify document appears in getUserDocuments()
  });

  it('should log events securely', async () => {
    // 1. Try to insert event directly (should fail)
    // 2. Call log-event edge function (should succeed)
    // 3. Verify event appears with server-side IP
  });

  it('should restrict RLS correctly', async () => {
    // 1. User A creates document
    // 2. User B tries to access (should fail)
    // 3. User A accesses (should succeed)
  });
});
```

#### 6C. Test de seguridad específicos

```ts
describe('Security Tests', () => {
  it('should not allow direct event inserts from client', async () => {
    const { error } = await supabase
      .from('events')
      .insert({ document_id: '...', event_type: 'fake' });

    expect(error).toBeDefined();
    expect(error.message).toContain('policy');
  });

  it('should validate Supabase credentials on build', async () => {
    // Run validate-env.js and check it passes
  });
});
```

#### 6D. README de setup

Agregar a `client/README.md`:
```md
## Test Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Configure Supabase credentials:
   - Get from https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
   - Never commit real credentials

3. Validate environment:
   ```bash
   npm run validate:env
   ```

4. Run tests:
   ```bash
   npm test
   ```
```

---

## Prioridades

1. **Alta:** Paso 4A (Sistema de notificaciones) - UX crítica
2. **Alta:** Paso 4B (TODOs con emails ficticios) - Funcionalidad rota
3. **Media:** Paso 4C (Texto demo) - Puede confundir usuarios
4. **Media:** Paso 5 (Dependencias) - Afecta builds
5. **Baja:** Paso 6 (Tests) - Importante pero no bloqueante para beta privada

---

## Comandos útiles

```bash
# Buscar TODOs pendientes
grep -rn "TODO" client/src --include="*.jsx" --include="*.tsx"

# Buscar alerts
grep -rn "alert(" client/src --include="*.jsx"

# Buscar emails ficticios
grep -rn "@example.com\|@test.com" client/src

# Validar environment
cd client && npm run validate:env

# Build limpio
cd client && rm -rf node_modules && npm install && npm run build

# Aplicar migraciones pendientes
cd /home/manu/ecosign && supabase db push --include-all
```
