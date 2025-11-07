# 🚀 Deploy a Netlify - Pasos Finales

## ✅ Lo que ya está listo:

1. Landing page completa en React ✅
2. Modal integrado con opciones Invitado/Registrado ✅
3. Todas las rutas funcionando ✅
4. Build exitoso ✅
5. netlify.toml configurado ✅

## 📋 Lo que TÚ necesitas hacer:

### Paso 1: Configurar Variables en Netlify

1. Abre [tu sitio en Netlify](https://app.netlify.com)
2. Click en **"Site settings"**
3. Click en **"Environment variables"** (menú izquierdo)
4. Click en **"Add a variable"**

**Variable 1:**
```
Key: VITE_SUPABASE_URL
Value: https://tjuftdwehouvfcxqvxxb.supabase.co
```

**Variable 2:**
```
Key: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdWZ0ZHdlaG91dmZjeHF2eHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Nzk3MTAsImV4cCI6MjA3ODA1NTcxMH0.EKmVIs--B3UqjrQbVFo8d4EG35i_Wrs4BIR-869mW2w
```

### Paso 2: Deploy

1. Ve a **"Deploys"**
2. Click en **"Trigger deploy" → "Deploy site"**
3. Espera 2-5 minutos
4. Click en el link del sitio cuando termine

### Paso 3: Verificar que Funciona

1. Abre tu sitio
2. Deberías ver la nueva landing page
3. Click en cualquier CTA
4. **Modal debería aparecer con 2 opciones** ✅
5. Click en "Modo Invitado" → Te lleva a `/guest` ✅
6. Click en "Cuenta Completa" → Te lleva a `/login` ✅

## 🎉 Si todo funciona:

✅ **YA NO HAY MÁS ERRORES 404**
✅ Los CTAs abren el modal correctamente
✅ El modal tiene las opciones de Invitado/Registrado
✅ Las navegaciones funcionan

## ❓ Si algo no funciona:

### Error: "import.meta.env is undefined"
→ Las variables no están configuradas. Repite Paso 1.

### Error: Build falla
→ Verifica que netlify.toml tenga:
```toml
[build]
  publish = "app/dist"
  command = "cd app && npm install && npm run build"
```

### Modal no aparece
→ Abre DevTools Console y busca errores

---

## 🧪 Test Local (Opcional)

Si quieres probar antes de deployar:

```bash
cd app
npm install
npm run dev
```

Abre: http://localhost:5173

- Landing debe cargar ✅
- Click en CTA → Modal aparece ✅
- Modal tiene 2 opciones ✅

---

**Todo está listo del lado del código. Solo falta configurar las variables y deployar.**

¿Necesitas ayuda? Revisa `CONFIGURAR_NETLIFY.md` para más detalles.
