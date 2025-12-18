# Ecosign Client

Este es el frontend de Ecosign, construido con **React + Vite + TypeScript + Tailwind CSS**.

---

## 🚀 Guía Rápida

### 1. Requisitos Previos
- Node.js >= 20.x
- npm >= 9.x

### 2. Instalar Dependencias

Desde dentro del directorio `client/`, ejecuta:
```bash
npm install
```

### 3. Configurar Variables de Entorno

Copia el archivo de ejemplo y edítalo con tus credenciales de un proyecto de Supabase.

```bash
# Copiar .env.example
cp .env.example .env

# Editar .env con tus credenciales
```

**Variables requeridas**:
- `VITE_SUPABASE_URL`: La URL de tu proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: La `anon key` (pública) de tu proyecto Supabase.

### 4. Ejecutar en Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`. El servidor se recargará automáticamente al detectar cambios.

---

## 🛠️ Comandos Útiles

- **`npm run build`**: Compila la aplicación para producción. Los archivos resultantes se generan en la carpeta `dist/`.
- **`npm run lint`**: Ejecuta el linter (ESLint) para encontrar y reportar problemas en el código.
- **`npm run typecheck`**: Ejecuta el compilador de TypeScript para verificar los tipos en todo el proyecto sin generar archivos.

---

## 🌐 Backend y Despliegue

- **Backend**: Toda la lógica de backend (autenticación, base de datos, almacenamiento y funciones serverless) es manejada por **Supabase**. Las funciones se encuentran en el directorio `/supabase/functions`.
- **Despliegue**: El frontend se despliega automáticamente en **Vercel** al hacer push a la rama principal. La configuración de despliegue se puede encontrar en `vercel.json`.

---

## 📚 Stack Tecnológico Principal

- **Framework**: React 18
- **Build Tool**: Vite
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React
- **Backend-as-a-Service**: Supabase
- **Hosting**: Vercel