# VerifySign - Arquitectura del Sistema

## Resumen Ejecutivo

VerifySign es una plataforma de certificación digital que implementa el paradigma .ECO/.ECOX con trazabilidad forense completa, transparencia radical y soberanía de datos. El sistema permite proteger, firmar y verificar documentos sin dependencias gubernamentales ni pagos a terceros.

**Mensaje Central**: "VerifySign no vende firmas, vende Verdad" / "Tu documento, tu prueba, tu soberanía."

---

## Stack Tecnológico

### Frontend
- **Framework**: React 19 + TypeScript
- **UI**: Tailwind CSS + Framer Motion
- **Routing**: React Router v7
- **Estado**: React Hooks + Context API

### Backend
- **Serverless**: Netlify Functions
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Storage**: Supabase Storage

### Seguridad
- **Hash**: SHA-256 (CryptoJS)
- **Cifrado**: AES-256
- **RLS**: Row Level Security (Supabase)
- **Gestión de Claves**: Rotación automática cada 90 días

---

## Arquitectura de Componentes

### 1. Sistema de Certificación (.ECO)

#### Componentes Frontend
- `GuestFlow.tsx` - Generación de certificados para usuarios no registrados
- `Dashboard.tsx` - Panel de control con listado de documentos certificados
- `VerifyDocument.tsx` - Verificación de autenticidad de archivos .ECO

#### Servicios Core
- `crypto.ts` - Servicio de criptografía y generación de .ECO
  - Cálculo de hash SHA-256
  - Generación de nonce criptográfico
  - Creación de prueba de no-repudio
  - Verificación de integridad

#### Netlify Functions
- `mint-eco.ts` - Minteo de certificados
  - Recibe archivo base64
  - Calcula hash SHA-256
  - Genera metadata .ECO
  - Almacena en Supabase
  - Llama a función de anclaje
  - Retorna certificado completo

- `anchor.ts` - Anclaje criptográfico
  - Genera proof de anclaje
  - Simula transacción blockchain
  - Retorna ID de transacción

### 2. Sistema de NDA Digital

#### Componente
- `NdaFlow.tsx` - Flujo completo de firma de NDA
  - Visualización de información del documento
  - Formulario de aceptación de términos
  - Generación de firma digital
  - Token de acceso temporal (7 días)
  - Generación de .ECO de trazabilidad

#### Base de Datos
Tabla `nda_signatures`:
- ID único (UUID)
- Datos del firmante (nombre, email)
- Firma digital (hash del compromiso)
- Token de acceso con expiración
- Metadata de auditoría (IP, user-agent)

### 3. Sistema de Autenticación

#### Componentes
- `AccessGateway.tsx` - Portal de entrada unificado
- `Login.tsx` - Autenticación con Supabase
- `ProtectedRoute.tsx` - HOC para rutas protegidas

#### Seguridad
- Email/Password con Supabase Auth
- Sesiones JWT
- RLS automático en todas las queries

### 4. Dashboard y Gestión

#### Características
- **Estadísticas**: Total, pendientes, anclados, verificados
- **Listado de documentos**: Con estados visuales
- **Acciones**:
  - Descargar .ECO
  - Ver detalles completos
  - Verificar integridad
- **Trazabilidad**: Logs de acceso append-only

### 5. Componentes UI Educativos

#### Modales Informativos
- `InfoModal.tsx` - Modal base reutilizable
- `EcoExplainerModal` - Explicación de archivos .ECO
- `SecurityExplainerModal` - Detalles de seguridad criptográfica
- `SovereigntyExplainerModal` - Filosofía de soberanía digital

---

## Base de Datos (Supabase)

### Tablas

#### `eco_records`
```sql
- id (UUID, PK)
- created_at (TIMESTAMPTZ)
- document_id (TEXT, UNIQUE)
- user_email (TEXT)
- file_name, file_type, file_size
- sha256_hash (TEXT)
- eco_metadata (JSONB)
- blockchain_tx_id (TEXT)
- status (pending | anchored | verified | revoked)
```

**RLS Policies**:
- Usuarios autenticados: Ver solo sus propios registros
- Usuarios anónimos: Verificación pública por hash
- Service role: Acceso completo

#### `access_logs`
```sql
- id (UUID, PK)
- created_at (TIMESTAMPTZ)
- document_id (TEXT)
- user_email (TEXT)
- action (created | accessed | verified | downloaded | shared | revoked)
- ip_address, user_agent (TEXT)
- metadata (JSONB)
```

**Características**:
- Append-only (no UPDATE/DELETE)
- Logs inmutables para auditoría forense
- Indexado por documento, email, acción, fecha

#### `nda_signatures`
```sql
- id (UUID, PK)
- created_at (TIMESTAMPTZ)
- document_id (TEXT)
- signer_name, signer_email (TEXT)
- signature_data (TEXT)
- nda_accepted (BOOLEAN)
- access_token (TEXT, UNIQUE)
- expires_at (TIMESTAMPTZ)
- verified_at (TIMESTAMPTZ)
```

**RLS Policies**:
- Usuarios: Ver firmas de sus propios documentos
- Verificación: Por token de acceso (público)

---

## Seguridad Criptográfica

### 1. Hash SHA-256
- Función hash criptográfica de 256 bits
- Cualquier cambio mínimo produce hash completamente diferente
- Irreversible y determinístico

### 2. Prueba de No-Repudio
```javascript
proofHash = SHA256(sha256Hash + timestamp + nonce)
```
- Combina hash del documento + timestamp + nonce aleatorio
- Genera prueba matemática única
- Imposible de falsificar retroactivamente

### 3. Gestión de Claves

#### `keyManagement.ts`
- Generación de pares de claves localmente
- Cifrado AES-256 para almacenamiento
- Rotación automática cada 90 días
- Política de retención de claves antiguas (máx. 3)
- Export/Import seguro con verificación de integridad

#### Flujo de Rotación
```typescript
1. Verificar edad de clave activa
2. Si > 90 días → generar nueva clave
3. Cifrar y almacenar nueva clave
4. Marcar como activa
5. Retener claves antiguas (max 3)
6. Eliminar claves obsoletas
```

### 4. Anclaje Blockchain (Simulado)
- Genera proof de anclaje único
- Simula transacción con timestamp
- Almacena ID de transacción
- Preparado para integración con blockchain real

---

## Flujos de Usuario

### Flujo 1: Usuario Invitado (Sin Registro)
```
1. Accede a /app/access
2. Selecciona "Modo Invitado"
3. Sube archivo
4. Proporciona email
5. Backend:
   - Calcula hash SHA-256
   - Genera metadata .ECO
   - Ancla hash
   - Almacena en Supabase
6. Descarga certificado .ECO
7. NO se crea historial ni dashboard
```

### Flujo 2: Usuario Registrado
```
1. Accede a /app/access
2. Selecciona "Con Cuenta"
3. Inicia sesión / Registra
4. Dashboard con historial completo
5. Genera nuevos .ECO
6. Descarga certificados
7. Verifica autenticidad
8. Ve logs de acceso
```

### Flujo 3: Firma de NDA
```
1. Recibe link con documentId
2. Ve información del documento
3. Lee términos de confidencialidad
4. Completa datos personales
5. Acepta NDA
6. Backend:
   - Genera firma digital
   - Crea token de acceso (7 días)
   - Registra en access_logs
   - Genera .ECO de firma
7. Recibe token y confirmación
8. Puede acceder al documento
```

### Flujo 4: Verificación de Documento
```
1. Accede a /verify
2. Sube archivo .ECO
3. (Opcional) Sube archivo original
4. Backend verifica:
   - Integridad del .ECO (proof hash)
   - Hash del archivo vs .ECO
   - Estado en base de datos
   - Anclaje blockchain
5. Muestra resultado:
   - ✅ Válido / ❌ Inválido
   - Detalles completos
   - Metadata del certificado
```

---

## Estructura de Archivos .ECO

### Formato JSON
```json
{
  "metadata": {
    "schemaVersion": "1.0.0",
    "documentId": "uuid-v4",
    "fileName": "documento.pdf",
    "fileType": "application/pdf",
    "fileSize": 1024000,
    "sha256Hash": "a1b2c3...",
    "timestamp": "2025-11-07T12:00:00.000Z",
    "userEmail": "user@example.com",
    "blockchainAnchor": {
      "transactionId": "verifysign-anchor-...",
      "network": "verifysign-testnet",
      "blockNumber": 1730000000
    }
  },
  "proof": {
    "hash": "d4e5f6...",
    "timestamp": 1730000000000,
    "nonce": "g7h8i9..."
  }
}
```

### Diferencia .ECO vs .ECOX

#### .ECO (Privado)
- Certificado completo con todos los detalles
- Incluye email del propietario
- Metadata sensible
- Uso: Evidencia forense personal

#### .ECOX (Público)
- Solo hash + timestamp + proof
- Sin información sensible
- Verificable públicamente
- Uso: Compartir sin revelar contenido

---

## Principios de Diseño

### 1. Transparencia Total
- Código auditable
- Operaciones criptográficas verificables
- Sin "cajas negras"
- Logs append-only inmutables

### 2. Soberanía de Datos
- Usuario es propietario absoluto
- Certificados exportables
- Verificación offline posible
- Sin dependencia de plataforma

### 3. Seguridad por Diseño
- RLS habilitado en todas las tablas
- Cifrado en tránsito y reposo
- Rotación automática de claves
- Pruebas matemáticas de integridad

### 4. UX Intuitiva
- Flujos claros y educativos
- Modales explicativos
- Feedback visual inmediato
- Diseño responsive

---

## Próximos Pasos (Roadmap)

### Corto Plazo
1. Integración con blockchain real (Ethereum, Polygon)
2. Generación de .ECOX público
3. API pública para verificación
4. Función de compartir documentos con NDA

### Medio Plazo
1. Firma digital con certificados X.509
2. Integración con servicios de timestamping RFC 3161
3. Plugin para navegadores
4. Extensión para Google Drive/Dropbox

### Largo Plazo
1. SDK para desarrolladores
2. Red descentralizada de verificación
3. Marketplace de validadores independientes
4. Protocolo interoperable con otros sistemas

---

## Mantenimiento y Operaciones

### Monitoreo
- Logs de errores en Netlify Functions
- Métricas de uso en Supabase
- Alertas de latencia
- Auditoría de accesos sospechosos

### Backups
- Supabase: Backups automáticos diarios
- Exportación de claves mensual
- Versionado de migraciones

### Seguridad
- Revisión de políticas RLS trimestral
- Actualización de dependencias mensual
- Penetration testing semestral
- Rotación de service keys anual

---

## Conclusión

VerifySign implementa una arquitectura robusta y escalable que prioriza la soberanía digital del usuario sobre la comodidad centralizada. Cada decisión arquitectónica refuerza el mensaje central: la evidencia forense pertenece al usuario, no a la plataforma.

El sistema está diseñado para sobrevivir incluso si la plataforma desaparece, garantizando que los certificados .ECO mantengan su validez matemática indefinidamente.

**"Tu documento, tu prueba, tu soberanía."**
