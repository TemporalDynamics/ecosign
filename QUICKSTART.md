# VerifySign - Guía de Inicio Rápido

## 🚀 Comenzar en 5 Minutos

### Prerequisitos
- Node.js 18+ instalado
- npm o yarn
- Cuenta de Netlify (opcional, para deploy)
- Cuenta de Supabase (ya configurada)

---

## Desarrollo Local

### 1. Clonar e Instalar

```bash
# Instalar dependencias raíz
npm install

# Instalar dependencias de la app
cd app
npm install
cd ..
```

### 2. Configurar Variables de Entorno

El archivo `.env` ya está configurado con Supabase:

```env
VITE_SUPABASE_URL=https://tjuftdwehouvfcxqvxxb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Iniciar Servidor de Desarrollo

```bash
# Opción 1: Netlify Dev (recomendado)
npm run dev

# Opción 2: Solo frontend
cd app
npm run dev
```

Abre el navegador en: `http://localhost:8888` (Netlify) o `http://localhost:5173` (Vite)

---

## Probar Funcionalidades

### Flujo 1: Generar Certificado .ECO

1. Navega a `/app/access`
2. Selecciona "Modo Invitado"
3. Sube un archivo de prueba (cualquier PDF, imagen, etc.)
4. Ingresa tu email
5. Haz clic en "Generar Certificado .ECO"
6. Descarga el archivo `.eco.json` generado

**Lo que sucede**:
- El archivo se sube codificado en base64
- Se calcula el hash SHA-256
- Se genera un certificado con proof criptográfico
- Se ancla el hash (simulado)
- Se almacena en Supabase

### Flujo 2: Verificar Documento

1. Navega a `/verify`
2. Sube el archivo `.eco.json` que descargaste
3. (Opcional) Sube también el archivo original
4. Haz clic en "Verificar Autenticidad"

**Lo que sucede**:
- Se verifica la integridad del .ECO (proof hash)
- Si subiste el original, se compara el hash
- Se consulta la base de datos
- Se muestra el resultado con ✅ o ❌

### Flujo 3: Dashboard (Requiere Registro)

1. Navega a `/app/access`
2. Selecciona "Con Cuenta"
3. Crea una cuenta con email/password
4. Genera varios certificados
5. Ve el historial completo en el dashboard

**Lo que sucede**:
- Autenticación con Supabase Auth
- Todos los certificados se asocian a tu cuenta
- Puedes descargar, verificar y ver detalles
- Estadísticas actualizadas en tiempo real

---

## Estructura del Proyecto

```
verifysign/
├── app/                          # Frontend React
│   ├── src/
│   │   ├── pages/               # Páginas principales
│   │   │   ├── AccessGateway.tsx
│   │   │   ├── GuestFlow.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── VerifyDocument.tsx
│   │   │   ├── NdaFlow.tsx
│   │   │   └── Login.tsx
│   │   ├── components/          # Componentes reutilizables
│   │   │   ├── ui/
│   │   │   ├── InfoModal.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── lib/                 # Servicios core
│   │   │   ├── crypto.ts
│   │   │   ├── supabaseClient.ts
│   │   │   ├── keyManagement.ts
│   │   │   └── supabase.ts
│   │   └── App.tsx              # Configuración de rutas
│   └── package.json
│
├── netlify/
│   └── functions/               # Funciones serverless
│       ├── mint-eco.ts
│       └── anchor.ts
│
├── supabase/
│   └── migrations/              # Migraciones de BD
│       └── 001_create_verifysign_schema.sql
│
├── VERIFYSIGN_ARCHITECTURE.md   # Arquitectura completa
├── IMPLEMENTATION_GUIDE.md      # Guía de implementación
├── SECURITY.md                  # Documento de seguridad
├── SUMMARY.md                   # Resumen ejecutivo
└── QUICKSTART.md                # Esta guía
```

---

## Comandos Útiles

### Desarrollo
```bash
npm run dev          # Iniciar Netlify Dev
cd app && npm run dev    # Solo frontend
```

### Build
```bash
cd app && npm run build  # Compilar aplicación
```

### Supabase
```bash
# Ver tablas
# Ir a: https://supabase.com/dashboard/project/tjuftdwehouvfcxqvxxb/editor

# Ver logs de acceso
SELECT * FROM access_logs ORDER BY created_at DESC LIMIT 10;

# Ver certificados generados
SELECT * FROM eco_records ORDER BY created_at DESC LIMIT 10;
```

---

## Solución de Problemas

### Error: "Cannot find module '@supabase/supabase-js'"

```bash
cd app
npm install @supabase/supabase-js crypto-js @types/crypto-js
```

### Error: "tsc: not found"

```bash
cd app
npm install
```

### Error de compilación TypeScript

```bash
cd app
npm run build
# Ver errores específicos y corregir
```

### Base de datos: Tabla no existe

La migración ya está aplicada. Verifica en Supabase Dashboard:
- Tablas: `eco_records`, `access_logs`, `nda_signatures`

---

## Rutas Disponibles

### Públicas
- `/app/access` - Portal de entrada
- `/app/guest` - Generación sin registro
- `/verify` - Verificación de documentos
- `/nda` - Firma de NDA (con documentId en query)

### Protegidas (requieren login)
- `/dashboard` - Panel de control
- `/app/dashboard` - Alias del dashboard

### Auth
- `/app/login` - Login/Registro

---

## Próximos Pasos

### 1. Personalización
- Actualizar colores en `tailwind.config.cjs`
- Modificar textos en componentes
- Agregar logo personalizado

### 2. Integraciones
- Integrar blockchain real (ver `IMPLEMENTATION_GUIDE.md`)
- Agregar email notifications
- Implementar rate limiting

### 3. Deploy
```bash
# Conectar a Netlify
netlify login
netlify init

# Deploy
netlify deploy --prod
```

### 4. Configurar Dominio
- Comprar dominio
- Configurar en Netlify
- Habilitar SSL automático

---

## Recursos Adicionales

### Documentación
- [Arquitectura Completa](./VERIFYSIGN_ARCHITECTURE.md)
- [Guía de Implementación](./IMPLEMENTATION_GUIDE.md)
- [Seguridad](./SECURITY.md)
- [API Docs](./API_DOCS.md)

### Enlaces Externos
- [Supabase Docs](https://supabase.com/docs)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Demo en Vivo

Prueba el sistema en línea: `https://verifysign.netlify.app` (configurar tras deploy)

---

## Soporte

¿Problemas o preguntas?

1. Revisa la [Guía de Implementación](./IMPLEMENTATION_GUIDE.md)
2. Consulta logs de Netlify/Supabase
3. Abre un issue en GitHub
4. Contacta: dev@verifysign.com

---

**¡Listo para comenzar!** 🎉

Ejecuta `npm run dev` y empieza a generar certificados .ECO con soberanía digital.
