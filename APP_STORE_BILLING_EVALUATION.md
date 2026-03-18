# Evaluación: Billing vía Play Store / App Store

**Fecha:** 2026-03-17  
**Objetivo:** Evaluar viabilidad de usar stores móviles para billing automático  
**Recomendación:** NO es viable pre-beta (requiere app nativa + 4-6 semanas)

---

## 📊 ESTADO ACTUAL

### Arquitectura Actual

| Componente | Estado | Tecnología |
|------------|--------|------------|
| **Frontend** | ✅ Web SPA | React + Vite |
| **Backend** | ✅ Edge Functions | Supabase (Deno) |
| **Mobile** | ❌ NO EXISTE | — |
| **Billing** | ⚠️ Manual | Admin functions (cURL) |

**Conclusión:** No hay app móvil nativa. EcoSign es 100% web-based.

---

## 🎯 OPCIONES PARA USAR STORES

### Opción A: App Nativa (iOS + Android)

**Tiempo estimado:** 4-6 semanas  
**Complejidad:** Alta  
**Costo:** $99/año (Apple) + $25 one-time (Google)

**Qué requiere:**
1. [ ] Desarrollar app iOS (Swift/SwiftUI)
2. [ ] Desarrollar app Android (Kotlin/Compose)
3. [ ] Integrar In-App Purchases (StoreKit + Google Play Billing)
4. [ ] Backend: Webhooks de Apple/Google
5. [ ] Revisión de Apple (3-7 días) + Google (2-5 días)
6. [ ] Mantener 2 apps + web

**Fees de los stores:**
- **Apple App Store:** 15% (primer año), 30% (subsecuente)
- **Google Play:** 15% (primer $1M USD/año), 30% (excedente)

**Ventajas:**
- ✅ Billing automático manejado por stores
- ✅ Usuarios confían en Apple/Google
- ✅ Refunds manejados por stores

**Desventajas:**
- ❌ 4-6 semanas de desarrollo (no hay app hoy)
- ❌ Fees altísimos (15-30% vs 2.9% de Stripe)
- ❌ Review process (Apple puede rechazar)
- ❌ Mantener 2 codebases nativos + web

---

### Opción B: App Híbrida (Capacitor/React Native)

**Tiempo estimado:** 2-3 semanas  
**Complejidad:** Media  
**Costo:** $99/año (Apple) + $25 one-time (Google)

**Qué requiere:**
1. [ ] Instalar Capacitor en proyecto React existente
2. [ ] Configurar iOS + Android builds
3. [ ] Integrar plugin de In-App Purchases
4. [ ] Backend: Webhooks de Apple/Google
5. [ ] Revisión de stores

**Plugins disponibles:**
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capgo/capacitor-native-biometric  # Para auth
npm install @capgo/inapppurchase  # Billing
```

**Fees:** Mismos que app nativa (15-30%)

**Ventajas:**
- ✅ Reutiliza 80-90% del código React existente
- ✅ 2-3 semanas vs 4-6 de nativa
- ✅ Single codebase

**Desventajas:**
- ❌ Fees altísimos (15-30%)
- ❌ Review process igual de estricto
- ❌ Performance inferior a nativa
- ❌ Algunas features nativas limitadas

---

### Opción C: PWA + Stripe (Recomendado)

**Tiempo estimado:** 1 semana  
**Complejidad:** Media-Baja  
**Costo:** 2.9% + $0.30 por transacción

**Qué requiere:**
1. [ ] Convertir web a PWA (Progressive Web App)
2. [ ] Integrar Stripe Checkout
3. [ ] Backend: Webhooks de Stripe
4. [ ] NO requiere app stores

**Fees:**
- **Stripe:** 2.9% + $0.30
- **Apple/Google:** $0 (no pasa por stores)

**Ventajas:**
- ✅ 1 semana vs 2-6 semanas de apps
- ✅ Fees 6-10x menores (2.9% vs 15-30%)
- ✅ NO requiere review de Apple/Google
- ✅ Single codebase (web)
- ✅ Funciona en iOS + Android + Desktop

**Desventajas:**
- ⚠️ No está en App Store (menos discoverability)
- ⚠️ iOS Safari no soporta PWA 100% (pero sí lo necesario)

---

## 📱 COMPARACIÓN DETALLADA

### Tiempo de Implementación

| Opción | Desarrollo | Review | Total |
|--------|------------|--------|-------|
| **Nativa** | 4-6 semanas | 1-2 semanas | **5-8 semanas** |
| **Híbrida** | 2-3 semanas | 1-2 semanas | **3-5 semanas** |
| **PWA + Stripe** | 1 semana | 0 días | **1 semana** |

---

### Fees (Ejemplo: $15 USD/mes × 100 usuarios × 12 meses)

| Opción | Fee | Costo Anual | Neto para EcoSign |
|--------|-----|-------------|-------------------|
| **Nativa (15%)** | 15% | $2,700 | $15,300 |
| **Híbrida (15%)** | 15% | $2,700 | $15,300 |
| **PWA + Stripe (2.9%)** | 2.9% + $0.30 | $630 | $17,370 |

**Ahorro con PWA + Stripe:** **$2,070 USD/año** (13.5% más de revenue)

---

### Reach Potencial

| Canal | Reach | Fricción |
|-------|-------|----------|
| **App Store** | Alto (usuarios buscan apps) | Media (download + install) |
| **Google Play** | Alto (usuarios buscan apps) | Media (download + install) |
| **Web (SEO)** | Medio-Alto (Google search) | Baja (click → usa) |
| **Web (Directo)** | Bajo (usuarios existentes) | Muy baja (login → usa) |

**Para B2B (brokers inmobiliarios):** Web es suficiente (ya te conocen, no necesitan descubrirte en App Store)

---

## 🚫 POR QUÉ NO USAR APP STORES PRE-BETA

### 1. **No hay app móvil hoy**

EcoSign es 100% web-based (React SPA). No hay:
- ❌ Código Swift/SwiftUI (iOS)
- ❌ Código Kotlin/Compose (Android)
- ❌ Código React Native/Capacitor

**Implicancia:** Empezar de cero → 2-6 semanas mínimo.

---

### 2. **Beta es para validar PMF, no para escalar**

**Objetivo del beta:**
- ✅ Validar que 10 brokers entienden el producto
- ✅ Validar que protegen documentos sin llamarte
- ✅ Validar que están dispuestos a pagar

**NO es objetivo del beta:**
- ❌ Tener billing automático
- ❌ Estar en App Store
- ❌ Escalar a 1000 usuarios

**Si el producto no funciona con billing manual, no va a funcionar con billing automático.**

---

### 3. **Fees de 15-30% matan el unit economics**

**Ejemplo real:**
- Plan PRO: $15 USD/mes
- Costo de serving (Supabase + emails): ~$2 USD/mes
- **Con Stripe (2.9%):** $15 - $0.74 - $2 = **$12.26 USD/mes de margen**
- **Con Apple (15%):** $15 - $2.25 - $2 = **$10.75 USD/mes de margen**
- **Con Apple (30%):** $15 - $4.50 - $2 = **$8.50 USD/mes de margen**

**Impacto:** 30% menos de margen → necesitás 43% más usuarios para mismo revenue.

---

### 4. **Review process puede bloquear el beta**

**Apple App Store:**
- Review: 3-7 días hábiles
- Rechazos comunes:
  - "App no tiene suficiente contenido"
  - "App es muy simple"
  - "App requiere cuenta externa (Supabase)"
  - "App no funciona offline"

**Google Play:**
- Review: 2-5 días hábiles
- Rechazos comunes:
  - "App no cumple políticas de billing"
  - "App requiere cuenta externa"

**Riesgo:** Beta retrasado 1-2 semanas por review.

---

### 5. **Mantenimiento de 2-3 codebases**

**Con app nativa:**
- Codebase iOS (Swift)
- Codebase Android (Kotlin)
- Codebase Web (React) ← el que ya tenés

**Con app híbrida:**
- Codebase híbrido (React Native/Capacitor)
- Codebase Web (React) ← el que ya tenés
- Bugs que aparecen solo en móvil
- Features que funcionan en web pero no en app

**Con PWA:**
- Single codebase (React) ← el que ya tenés
- ✅ Zero mantenimiento adicional

---

## ✅ CUÁNDO SÍ USAR APP STORES

### Trigger 1: 100+ usuarios pagos

**Señales:**
- ✅ 100 usuarios pagos activos
- ✅ $1,500+ USD/mes de revenue
- ✅ Churn < 5% mensual
- ✅ Soporte saturado con preguntas de billing

**Acción:** Implementar Stripe Billing + PWA primero, evaluar apps después.

---

### Trigger 2: Usuarios piden app móvil

**Señales:**
- ✅ 10+ usuarios piden app en App Store
- ✅ Usuarios usan mucho desde móvil (>50% de sesiones)
- ✅ Competidores tienen app y los mencionan

**Acción:** Encuesta a usuarios: "¿Pagarías $X más por app nativa?"

---

### Trigger 3: Enterprise lo requiere

**Señales:**
- ✅ Enterprise customer ($500+ USD/mes) requiere app
- ✅ Security/compliance requiere app nativa (MDM, etc.)
- ✅ Integration con sistemas internos requiere app

**Acción:** Desarrollar app nativa solo para ese customer (custom build).

---

## 📋 PLAN RECOMENDADO

### **Fase 0 (Beta, AHORA): Web + Billing Manual**

**Qué hay:**
- ✅ Web SPA (React)
- ✅ Admin functions para trials (cURL)
- ✅ 10 usuarios beta

**Qué NO hay:**
- ❌ Billing automático
- ❌ App móvil

**Duración:** 4-8 semanas (hasta validar PMF)

---

### **Fase 1 (Post-Beta, 50-100 usuarios): PWA + Stripe Checkout**

**Qué agregar:**
- ✅ PWA manifest (install en home screen)
- ✅ Stripe Checkout (redirige a Stripe)
- ✅ Webhook: `checkout.session.completed`
- ✅ Dashboard básico de billing

**Qué NO agregar:**
- ❌ App nativa
- ❌ Stripe Billing (subscriptions complejas)

**Tiempo:** 1 semana  
**Costo:** 2.9% + $0.30 por transacción

---

### **Fase 2 (Post-Tracción, 100+ usuarios): Stripe Billing + UI Completa**

**Qué agregar:**
- ✅ Stripe Billing (subscriptions recurrentes)
- ✅ Prorrateo automático
- ✅ Invoices descargables
- ✅ Cancelación desde UI
- ✅ Coupons/descuentos

**Qué evaluar:**
- ⚠️ App híbrida (Capacitor) si usuarios piden

**Tiempo:** 2-3 semanas  
**Costo:** 2.9% + $0.30 por transacción

---

### **Fase 3 (Enterprise, 500+ usuarios): Evaluar App Nativa**

**Qué evaluar:**
- ⚠️ App nativa solo si enterprise lo requiere
- ⚠️ Fees de 15-30% vs revenue adicional
- ⚠️ Costo de mantenimiento (2-3 codebases)

**Tiempo:** 4-6 semanas (solo si hay ROI claro)  
**Costo:** 15-30% fees + $99/año Apple + $25 Google

---

## 💰 COMPARACIÓN DE COSTOS (PRIMER AÑO)

### Escenario: 100 usuarios × $15 USD/mes × 12 meses = $18,000 USD revenue

| Opción | Fees | Dev Time | Dev Cost | Total Cost | Neto |
|--------|------|----------|----------|------------|------|
| **PWA + Stripe** | $630 (2.9%) | 1 semana | $2,000 | $2,630 | $15,370 |
| **Híbrida (15%)** | $2,700 | 3 semanas | $6,000 | $8,700 | $9,300 |
| **Nativa (15%)** | $2,700 | 6 semanas | $12,000 | $14,700 | $3,300 |

**Ahorro con PWA + Stripe:** **$12,070 USD** vs nativa (3.7x más neto)

---

## 🎯 RECOMENDACIÓN FINAL

### **NO usar App Stores pre-beta**

**Por qué:**
1. ❌ No hay app móvil (2-6 semanas de desarrollo)
2. ❌ Fees de 15-30% matan el unit economics
3. ❌ Review process puede retrasar beta
4. ❌ Mantenimiento de 2-3 codebases
5. ✅ Beta es para validar PMF, no para escalar

### **Usar PWA + Stripe post-beta**

**Por qué:**
1. ✅ 1 semana de desarrollo
2. ✅ Fees de 2.9% (6-10x menores que stores)
3. ✅ NO requiere review
4. ✅ Single codebase (web)
5. ✅ Funciona en iOS + Android + Desktop

### **Evaluar App Stores solo si:**
- ✅ 100+ usuarios pagos
- ✅ $1,500+ USD/mes de revenue
- ✅ Usuarios piden app explícitamente
- ✅ Enterprise customer lo requiere

---

## 📄 CÓDIGO BASE (PWA + Stripe)

### `manifest.json` (PWA)

```json
{
  "name": "EcoSign",
  "short_name": "EcoSign",
  "description": "Protegé tu trabajo con evidencia verificable",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0E4B8B",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### `index.html` (agregar al `<head>`)

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0E4B8B" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="EcoSign" />
```

### Stripe Checkout (ya incluido en análisis anterior)

Ver `ARCHITECTURE_VS_HAPPY_PATHS_ANALYSIS.md` para código completo de:
- `create-checkout-session` Edge Function
- `stripe-webhook` Edge Function
- Handlers de eventos

---

**FIN DEL DOCUMENTO**
