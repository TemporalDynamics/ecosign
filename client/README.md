# VerifySign Client

Frontend de VerifySign construido con **React + Vite + TypeScript + Tailwind CSS**.

---

## 🚀 Quick Start

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

```bash
# Copiar .env.example
cp .env.example .env

# Editar .env con tus credenciales de Supabase
```

**Variables requeridas**:
- `VITE_SUPABASE_URL` - URL de tu proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` - Anon key (pública) de Supabase

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

### 4. Build para Producción

```bash
npm run build
```

Los archivos compilados estarán en `dist/`

---

## 📁 Estructura del Proyecto

```
client/
├── src/
│   ├── components/
│   │   ├── ProtectedRoute.tsx    # HOC para rutas protegidas
│   │   ├── Tooltip.jsx            # Tooltip pedagógico
│   │   └── CardWithImage.jsx      # Card reutilizable
│   ├── hooks/
│   │   └── useAuth.ts             # Hook de autenticación
│   ├── lib/
│   │   ├── supabaseClient.ts      # Cliente Supabase
│   │   └── api.ts                 # Helper para Netlify Functions
│   ├── pages/
│   │   ├── LandingPage.jsx        # Home pública
│   │   ├── LoginPage.tsx          # Login/Signup con Supabase
│   │   ├── DashboardPage.jsx      # Panel protegido
│   │   ├── VerifyPage.jsx         # Verificador público
│   │   ├── PricingPage.jsx        # Pricing
│   │   ├── NdaPage.jsx            # Flujo NDA
│   │   └── GuestPage.jsx          # Vista invitado
│   ├── App.jsx                    # Router principal
│   └── main.jsx                   # Entry point
├── public/
├── .env.example
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 🔐 Autenticación (Supabase)

### useAuth Hook

```tsx
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <button onClick={() => signIn('email@example.com', 'password')}>Login</button>;
  }

  return (
    <div>
      <p>Hola, {user.email}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### ProtectedRoute Component

```tsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

---

## 📡 API Client (Netlify Functions)

### Uso Básico

```tsx
import { api } from './lib/api';

// Generar enlace NDA
const result = await api.generateLink({
  document_id: 'uuid-here',
  recipient_email: 'recipient@example.com',
  expires_in_hours: 24
});

console.log(result.access_url); // https://verifysign.app/nda/{token}
```

**Endpoints disponibles**:
- `api.generateLink(params)` - Crear enlace seguro
- `api.verifyAccess(token, otp?)` - Validar token de acceso
- `api.logEvent(recipientId, eventType)` - Registrar evento

**Nota**: El API client maneja automáticamente:
- ✅ CSRF tokens (cachear + renovación)
- ✅ Authorization headers (JWT de Supabase)
- ✅ Error handling

---

## 🎨 Componentes Principales

### Tooltip Pedagógico

```tsx
<Tooltip
  term="hash SHA-256"
  definition="Huella digital única de 256 bits..."
/>
```

### CardWithImage

```tsx
<CardWithImage
  title="Creadores & Emprendedores"
  description="Protege tu propiedad intelectual..."
  imagePosition="right"
  image="/assets/users/creadores.png"
  icon={Lightbulb}
/>
```

---

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm run test

# Type-check
npx tsc --noEmit
```

---

## 🚢 Deploy

### Netlify (Automático)

Conectar el repo en Netlify Dashboard:

1. **Build Command**: `cd client && npm install && npm run build`
2. **Publish Directory**: `client/dist`
3. **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Deploy Manual

```bash
npm run build
netlify deploy --prod --dir=dist
```

---

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

✅ Verificar que `.env` existe y tiene las variables correctas

### Build falla con errores de TypeScript

✅ Ejecutar `npm install` para actualizar dependencias

### Auth no funciona

✅ Verificar que Supabase Auth está configurado (Email provider habilitado)

---

## 📚 Stack Tecnológico

- **Framework**: React 18
- **Build Tool**: Vite 4
- **Routing**: React Router DOM 6
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Backend**: Supabase (Auth + Database + Storage)
- **Functions**: Netlify Functions (TypeScript)

---

## 🔗 Links Útiles

- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)

---

**Última actualización**: 2025-11-09
