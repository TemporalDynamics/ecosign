# Suite de Tests de Seguridad

Esta carpeta contiene la suite completa de tests de seguridad para EcoSign.

## Tests Implementados

### 1. Row Level Security (RLS)
- Verifica que los usuarios solo puedan acceder a sus propios datos
- Pruebas conceptuales que requieren entorno de prueba completo con Supabase

### 2. Rate Limiting
- Pruebas de límites de peticiones por usuario/endpoint
- Verifica que los límites se aplican correctamente
- Prueba de reseteo de contadores

### 3. CSRF Protection
- Generación y validación de tokens CSRF
- Pruebas de expiración de tokens
- Resistencia a ataques de timing
- Validación contra tokens manipulados

### 4. Validación de Archivos
- Verificación de tamaño de archivos
- Validación de tipos MIME
- Detección de magic bytes incorrectos
- Prevención de subida de archivos maliciosos
- Validación de extensiones permitidas

### 5. Encriptación de Datos
- Pruebas de cifrado/descifrado AES-256-GCM
- Verificación de IV aleatorios
- Manejo de datos con caracteres especiales
- Resistencia a manipulación de datos encriptados

### 6. Sanitización de Entradas
- Sanitización de HTML (prevención XSS)
- Sanitización de búsquedas (prevención SQL injection)
- Sanitización de nombres de archivos (prevención de path traversal)
- Validación de UUID
- Validación de emails

### 7. Storage Security (Esqueleto)
- Pruebas pendientes para seguridad de almacenamiento en Supabase

## Scripts Disponibles

```bash
# Correr todos los tests de seguridad
npm run test:security

# Correr en modo watch
npm run test:security:watch

# Correr todos los tests
npm run test

# Generar reporte de cobertura
npm run test:coverage
```

## Variables de Entorno Requeridas

Para ejecutar completamente algunos tests, se requieren las siguientes variables:

```env
CSRF_SECRET=clave_secreta_para_csrf
NDA_ENCRYPTION_KEY=clave_hex_para_encriptacion
SUPABASE_URL=URL_DEL_PROYECTO_SUPABASE
SUPABASE_ANON_KEY=ANON_KEY_DE_SUPABASE
SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY_DE_SUPABASE
```

## Filosofía de Seguridad

EcoSign implementa múltiples capas de seguridad:

1. **Autenticación robusta** - Supabase Auth con JWT
2. **Autorización precisa** - Row Level Security en la base de datos
3. **Validación en cliente y servidor** - Validación de entradas en ambos lados
4. **Rate limiting** - Protección contra abuso y ataques de fuerza bruta
5. **Sanitización exhaustiva** - Limpieza de todas las entradas
6. **Cifrado de datos sensibles** - Encriptación de información confidencial
7. **Auditoría completa** - Registro de todas las acciones de seguridad

Esta suite de tests asegura que cada capa de seguridad funcione correctamente y no pueda ser eludida.