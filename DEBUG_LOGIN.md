# 🐛 Guía de Depuración - Problema de Login

## Problema Reportado
- El login no funciona
- No se puede acceder al dashboard
- Se queda en la pantalla de login

## Pasos para Depurar

### 1. Limpiar Caché del Navegador
**IMPORTANTE:** Los cambios de contexto requieren limpiar la caché.

```bash
# En Chrome/Firefox
1. Abrir DevTools (F12)
2. Ir a Application/Almacenamiento
3. Click derecho en el sitio
4. "Clear site data" / "Borrar datos del sitio"
5. Recargar la página (Ctrl+Shift+R)
```

### 2. Verificar en Consola del Navegador
Abrir DevTools (F12) y verificar:

**¿Hay errores rojos?**
```javascript
// Buscar mensajes como:
- "LegalCenter called outside provider"
- "Cannot read property of undefined"
- Errores de React
```

**¿El login se ejecuta?**
```javascript
// Deberías ver:
✅ Login exitoso: tu-email@example.com
```

### 3. Verificar que el servidor esté corriendo

```bash
cd /home/manu/dev/ecosign/client
npm run dev
```

Deberías ver:
```
VITE ready in XXX ms
Local: http://localhost:5173/
```

### 4. Verificar Variables de Entorno

```bash
# Asegúrate de tener .env.local con:
VITE_SUPABASE_URL=tu-url
VITE_SUPABASE_ANON_KEY=tu-key
```

### 5. Probar en modo incógnito

1. Abrir ventana incógnita/privada
2. Ir a http://localhost:5173/login
3. Intentar login
4. Ver si funciona

### 6. Verificar Network Tab

En DevTools → Network:
- ¿La petición a Supabase se completa con éxito?
- ¿Hay un redirect después del login?

## Solución Temporal

Si el problema persiste, comentar temporalmente el LegalCenterRoot:

```typescript
// En DashboardApp.tsx
<div className="DashboardApp">
  <DashboardAppRoutes />
  {/* <LegalCenterRoot /> */}
</div>
```

Esto deshabilitará el Centro Legal pero permitirá el login.

## Verificación Final

Si después de limpiar caché sigue sin funcionar:

1. Detener el servidor (Ctrl+C)
2. Limpiar node_modules:
```bash
cd /home/manu/dev/ecosign/client
rm -rf node_modules
npm install
npm run dev
```

3. Limpiar caché del navegador nuevamente
4. Probar login

## Contacto

Si nada funciona, revisar:
- `client/src/DashboardApp.tsx` - Que tenga LegalCenterProvider
- `client/src/contexts/LegalCenterContext.jsx` - Que no lance errores
- Console del navegador para mensajes específicos
