# 🔍 Sentry Error Monitoring - Setup Guide

## 📋 Qué es Sentry

Sentry es una plataforma de error monitoring que te permite:
- 🐛 Ver errores en tiempo real
- 📊 Stack traces completos
- 👤 Saber qué usuarios están afectados
- 📈 Métricas de performance
- 🎬 Session replays (solo en errores, privacy-first)

---

## 🚀 Setup Rápido (5 minutos)

### 1. Crear cuenta en Sentry

1. Ve a https://sentry.io
2. Sign up (GitHub OAuth recomendado)
3. Create Project → React
4. Copia el DSN (Data Source Name)

### 2. Configurar variables de entorno

#### Desarrollo local:
```bash
# client/.env
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

#### Producción (Vercel):
```bash
# Vercel Dashboard → Settings → Environment Variables
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

### 3. Testear que funciona

```javascript
// En la consola del navegador:
throw new Error('Test Sentry');

// Deberías ver el error en Sentry Dashboard en ~10 segundos
```

---

## 🔒 Configuración de Privacy

Ya configurado en `client/src/main.jsx`:

✅ **Datos sensibles removidos:**
- `request.data` eliminado
- `request.cookies` eliminado

✅ **Session Replay privacy-first:**
- Todo el texto enmascarado
- Media bloqueada
- Solo captura errores (no todas las sesiones)

✅ **Sampling rates:**
- Performance: 10% en producción
- Replays: Solo en errores (0% sesiones normales)

---

## 📊 Qué monitorear

### Errores automáticos capturados:
- JavaScript exceptions
- Unhandled promise rejections
- Network errors (fetch/axios)
- React component errors

### Errores personalizados (opcional):
```javascript
import * as Sentry from '@sentry/react';

// Capturar error manual
Sentry.captureException(new Error('Something went wrong'));

// Agregar contexto
Sentry.setContext('user_action', {
  action: 'document_upload',
  documentId: 'abc123',
});

// Breadcrumbs (registro de eventos)
Sentry.addBreadcrumb({
  message: 'User clicked sign button',
  level: 'info',
});
```

---

## 🎯 Alerts Recomendadas

Configure en Sentry Dashboard → Alerts:

1. **Critical Errors**
   - Frecuencia: > 10 errores/minuto
   - Notificación: Email inmediato

2. **New Issues**
   - Primer error de un tipo nuevo
   - Notificación: Slack/Email

3. **Performance Degradation**
   - Response time > 3s
   - Notificación: Daily digest

---

## 📈 Métricas Clave

### Para MVP, enfócate en:
1. **Error Rate** - Mantener < 1%
2. **Affected Users** - Ver impacto real
3. **Top Issues** - Priorizar por frecuencia
4. **Release Health** - Comparar versiones

### Dashboard recomendado:
```
- Total Errors (last 24h)
- Unique Errors (last 24h)
- Affected Users (last 24h)
- Top 5 Issues by frequency
- Performance P95 (95th percentile)
```

---

## 🔧 Troubleshooting

### No veo errores en Sentry

1. Verifica que `VITE_SENTRY_DSN` esté configurado
2. Check console del browser: debe aparecer "Sentry initialized"
3. Fuerza un error de prueba: `throw new Error('test')`

### Demasiados errores de terceros

Agregar a `ignoreErrors` en `main.jsx`:
```javascript
ignoreErrors: [
  'ResizeObserver loop limit exceeded',
  'Non-Error promise rejection captured',
  // Agregar más patterns aquí
],
```

### Performance overhead

Ya optimizado con:
- Sampling 10% en producción
- Session replay solo en errores
- Breadcrumbs limitados a últimos 50 eventos

---

## 💰 Costo

**Free tier de Sentry:**
- ✅ 5,000 errors/mes
- ✅ 10,000 performance transactions/mes
- ✅ 50 session replays/mes
- ✅ 1 proyecto

**Suficiente para MVP con ~500 usuarios activos**

---

## ✅ Checklist de Setup

- [ ] Cuenta en Sentry creada
- [ ] Proyecto React creado en Sentry
- [ ] `VITE_SENTRY_DSN` configurado en `.env`
- [ ] `VITE_SENTRY_DSN` configurado en Vercel
- [ ] Build exitoso (`npm run build`)
- [ ] Error de prueba capturado en Sentry Dashboard
- [ ] Alert configurada para errores críticos

---

## 🚀 Próximos Pasos

Después del MVP:
1. Configurar Source Maps para stack traces precisos
2. Integrar con Slack para notificaciones
3. Configurar User Feedback (capturas de pantalla)
4. Agregar custom tags por feature

---

**Status:** ✅ Código implementado
**Falta:** Configurar DSN y testear (5 min)
