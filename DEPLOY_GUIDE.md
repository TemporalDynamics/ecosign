# 🚀 Guía de Deploy - EcoSign

## 📋 Resumen

Este proyecto tiene un script automatizado que simplifica el proceso de deploy a Vercel.

---

## ⚡ Deploy Rápido (Recomendado)

### **Opción 1: Script Automático** 

```bash
./deploy.sh
```

Esto hará **TODO automáticamente**:
1. ✅ Verifica que estés en la rama `main`
2. ✅ Detecta cambios sin commitear (y te pregunta si quieres commitearlos)
3. ✅ Hace el deploy a Vercel
4. ✅ Asigna los dominios (`www.ecosign.app` y `ecosign.app`)
5. ✅ Te muestra el resultado

---

## 🛠️ Deploy Manual (Paso a Paso)

Si preferís hacerlo manualmente:

### **Paso 1: Commit y Push**
```bash
git add .
git commit -m "tu mensaje descriptivo"
git push origin main
```

### **Paso 2: Deploy a Vercel**
```bash
vercel --prod --force
```

Esperá a que termine y copiá la URL del deployment (ej: `ecosign-abc123.vercel.app`)

### **Paso 3: Asignar Dominios**
```bash
# Reemplazá <URL_DEL_DEPLOYMENT> con la URL que obtuviste
vercel alias set <URL_DEL_DEPLOYMENT> www.ecosign.app
vercel alias set <URL_DEL_DEPLOYMENT> ecosign.app
```

---

## 🎯 Ejemplos de Uso

### **Deploy después de hacer cambios:**
```bash
# 1. Hacer los cambios en tu código
# 2. Ejecutar el script
./deploy.sh

# El script te preguntará si querés commitear
# Ingresá el mensaje del commit
# Y listo!
```

### **Deploy sin cambios (forzar rebuild):**
```bash
# Útil cuando necesitás invalidar caché
./deploy.sh
```

---

## ⚠️ Importante

### **Antes de cada deploy:**
- ✅ Asegurate de estar en la rama `main`
- ✅ Probá los cambios localmente
- ✅ Verificá que no haya errores de build

### **Después del deploy:**
- ⏱️ Esperá 1-2 minutos para que el CDN se actualice
- 🗑️ Limpiá la caché del navegador (`Ctrl+Shift+R`)
- 🔍 Verificá el sitio en modo incógnito primero

---

## 🐛 Troubleshooting

### **El script no se ejecuta:**
```bash
# Asegurate de que tenga permisos de ejecución
chmod +x deploy.sh
```

### **Error: "You are not logged in":**
```bash
# Iniciá sesión en Vercel
vercel login
```

### **El dominio no se actualiza:**
```bash
# Puede ser caché del CDN, esperá 2-3 minutos
# O forzá un nuevo deploy:
./deploy.sh
```

### **Build falla:**
```bash
# Ver los logs completos:
vercel logs --prod
```

---

## 📊 Monitoreo

### **Ver deployments recientes:**
```bash
vercel ls
```

### **Ver logs del último deployment:**
```bash
vercel logs
```

### **Ver qué está en producción:**
```bash
vercel alias ls | grep ecosign.app
```

---

## 🔧 Configuración Avanzada

### **Variables de entorno:**
Las variables se configuran en Vercel Dashboard:
```
https://vercel.com/temporal-dynamics-projects/ecosign/settings/environment-variables
```

Variables necesarias:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### **Build Command:**
```bash
cd eco-packer && npm install && npm run build && cd ../client && npm install && npm run build:skip-validation
```

---

## 📝 Notas

- El script usa `--force` para evitar cache de builds anteriores
- Los alias se asignan automáticamente a ambos dominios
- El deploy se hace desde la rama actual (pero te advierte si no es `main`)

---

**¿Problemas?** Revisá los logs o contactá al equipo de desarrollo.
