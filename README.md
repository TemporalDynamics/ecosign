# verifysign
Plataforma de firma verificada con NDA para documentos confidenciales

## Descripción
Sistema web para firma digital de documentos confidenciales con NDA (Acuerdo de No Divulgación). Incluye validación de identidad, almacenamiento de firmas digitales y control de acceso.

## Instalación y Configuración

### Requisitos
- Node.js 16+ 
- npm o yarn
- Netlify CLI (`npm install -g netlify-cli`)

### Configuración de Desarrollo

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar variables de entorno**:
Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Supabase:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-from-supabase-here
SUPABASE_BUCKET_SIGNATURES=signatures
```

3. **Obtener credenciales de Supabase**:
- Crea una cuenta en [supabase.com](https://supabase.com)
- Crea un nuevo proyecto
- Copia la URL del proyecto y la "anon key" desde Settings > API
- Crea una base de datos con las tablas necesarias (acceptances, documents)

4. **Ejecutar en modo desarrollo**:
```bash
netlify dev
```

## Estructura de la Base de Datos

### Tabla `acceptances`
- `id`: UUID único
- `doc_id`: ID del documento firmado
- `party_name`: Nombre del firmante
- `party_email`: Email del firmante  
- `signature_url`: URL de la firma digital
- `document_hash`: Hash SHA-256 del documento firmado
- `access_token`: Token de acceso generado
- `ip_address`: IP del firmante
- `user_agent`: User agent del navegador
- `expires_at`: Fecha de expiración del token
- `created_at`: Fecha de creación

### Tabla `documents`
- `id`: UUID único
- `owner_email`: Email del propietario del documento
- `type`: Tipo de documento
- `version`: Versión del documento
- `sha256`: Hash SHA-256 del documento
- `storage_url`: URL de almacenamiento del documento

## Funcionamiento

1. El usuario accede a través de `index.html` o `sign.html`
2. Debe completar el formulario de NDA y firmar digitalmente
3. Se genera un token de acceso y se almacena en Supabase
4. Se redirige al contenido confidencial (`content.html`)
5. El acceso se valida mediante el token en localStorage y contra Supabase

## Variables de Entorno

- `SUPABASE_URL`: URL de tu proyecto de Supabase
- `SUPABASE_ANON_KEY`: Clave anónima de API de Supabase
- `SUPABASE_BUCKET_SIGNATURES`: Nombre del bucket para almacenar firmas

## Despliegue en Producción

1. Configura las variables de entorno en Netlify Dashboard (Site settings > Environment variables)
2. Conecta tu repositorio GitHub
3. Netlify se encargará de construir y desplegar automáticamente

## Seguridad

- Las firmas se almacenan en Supabase Storage
- Tokens con expiración de 7 días
- Validación de tokens contra base de datos
- Protección contra capturas de pantalla (cliente)
- Registro de acceso y tiempo de lectura
