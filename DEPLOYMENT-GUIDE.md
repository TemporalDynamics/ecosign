# Guía de Deployment - VerifySign MVP

## 🚀 Deployment a Netlify (Recomendado)

### Opción 1: Deployment desde Git (Recomendado)

1. **Preparar el repositorio**
```bash
cd /home/manu/verifysign
git add client/*
git commit -m "feat: VerifySign MVP completo - Landing, Verify, Dashboard y Pricing funcionales"
git push origin main
```

2. **Conectar con Netlify**
   - Ve a [netlify.com](https://netlify.com)
   - Click en "Add new site" → "Import an existing project"
   - Conecta tu repositorio de GitHub
   - Selecciona el branch `main` (o el que corresponda)

3. **Configuración de Build**
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`

4. **Variables de Entorno** (para futuro)
   ```
   VITE_SUPABASE_URL=<tu-supabase-url>
   VITE_SUPABASE_ANON_KEY=<tu-anon-key>
   ```

5. **Deploy!**
   - Click en "Deploy site"
   - Espera 2-3 minutos
   - Tu sitio estará en una URL tipo: `https://random-name-123.netlify.app`

### Opción 2: Deployment Manual

```bash
# 1. Instalar Netlify CLI
npm install -g netlify-cli

# 2. Navegar al cliente
cd /home/manu/verifysign/client

# 3. Build
npm run build

# 4. Login en Netlify
netlify login

# 5. Deploy
netlify deploy --prod --dir=dist
```

## 🔧 Deployment a Vercel (Alternativa)

### Desde Git

1. **Conectar con Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - "Import Project" → Selecciona tu repositorio

2. **Configuración**
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Deploy**
   - Click "Deploy"
   - Listo en ~1 minuto

### Desde CLI

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Navegar y buildear
cd /home/manu/verifysign/client
npm run build

# 3. Deploy
vercel --prod
```

## 📋 Checklist Pre-Deployment

- [x] Todas las rutas funcionan sin 404
- [x] CTAs redirigen correctamente
- [x] Landing page es profesional y clara
- [x] Página de verificación es funcional
- [x] Dashboard tiene navegación correcta
- [x] Pricing está completo
- [x] Footer tiene links válidos
- [x] Diseño responsive
- [x] No hay errores en consola

## 🔐 Post-Deployment

### Configurar Dominio Personalizado

**En Netlify:**
1. Domain settings → Add custom domain
2. Ingresa tu dominio (ej: `verifysign.com`)
3. Configura DNS según instrucciones
4. Activa HTTPS automático (gratuito)

**En Vercel:**
1. Project Settings → Domains
2. Add domain → Sigue instrucciones

### Optimizaciones Adicionales

1. **Analytics**
   - Activa Netlify Analytics o Vercel Analytics
   - Agrega Google Analytics (opcional)

2. **Performance**
   - El build ya está optimizado con Vite
   - Compresión automática en Netlify/Vercel
   - CDN global incluido

3. **SEO**
   - Verifica meta tags en cada página
   - Agrega `robots.txt`
   - Genera `sitemap.xml`

## 🐛 Troubleshooting

### Error: "Build failed"
```bash
# Asegúrate de que el build local funciona
cd client
npm install
npm run build
```

### Error: "Page not found" en rutas
Agrega archivo `_redirects` en `/client/public/`:
```
/*    /index.html   200
```

Para Vercel, agrega `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

## 📊 Monitoreo

Una vez deployado, monitorea:
- **Uptime**: Netlify/Vercel Dashboard
- **Performance**: Lighthouse en Chrome DevTools
- **Errores**: Console de Netlify/Vercel

## 🎯 URLs de Prueba

Después del deployment, verifica:
- ✅ `https://tu-sitio.com` → Landing
- ✅ `https://tu-sitio.com/verify` → Verificador
- ✅ `https://tu-sitio.com/dashboard` → Dashboard
- ✅ `https://tu-sitio.com/pricing` → Pricing
- ✅ `https://tu-sitio.com/login` → Login
- ✅ `https://tu-sitio.com/cualquier-ruta-invalida` → Redirect a /

## 📝 Notas Importantes

1. **SSL/HTTPS**: Automático y gratuito en ambas plataformas
2. **CDN**: Global y automático
3. **Costo**: Gratis para proyectos pequeños/medianos
4. **CI/CD**: Auto-deploy en cada push a main
5. **Rollback**: Fácil desde el dashboard

---

**Tiempo estimado de deployment**: 5-10 minutos
**Costo**: $0 (plan gratuito suficiente para MVP)
