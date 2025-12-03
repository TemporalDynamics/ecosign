# 🩺 Health Check Setup Guide - EcoSign

**Fecha**: 2025-12-01
**Objetivo**: Monitorear servicios externos proactivamente

---

## 📋 ¿Qué es el Health Check?

El health check es un endpoint que verifica la disponibilidad y funcionalidad de todos los servicios externos críticos:

- ✅ **Polygon RPC** - Blockchain anchoring
- ✅ **Bitcoin mempool.space** - Bitcoin data
- ✅ **OpenTimestamps calendars** - Timestamping
- ✅ **SignNow API** - E-signatures
- ✅ **Resend API** - Email delivery

---

## 🚀 Endpoint Desplegado

**URL**: `https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/health-check`

**Método**: `GET`

**Query parameters**:
- `service` (opcional): Filtrar por servicio específico (`polygon`, `bitcoin`, `opentimestamps`, `signnow`, `resend`)

---

## 🔐 Configuración de Acceso

Por defecto, Supabase Edge Functions requieren autenticación. Para health checks, hay dos opciones:

### **Opción 1: Acceso con API Key (Recomendado para interno)**

```bash
curl "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/health-check" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### **Opción 2: Acceso público (Para status pages)**

Para hacer el endpoint completamente público (sin auth):

1. Ir a **Supabase Dashboard** → **Edge Functions** → **health-check**
2. Click en **Settings**
3. Desactivar **Require JWT verification**

O configurar en `supabase/config.toml`:

```toml
[functions.health-check]
verify_jwt = false
```

Luego redesplegar:
```bash
supabase functions deploy health-check
```

---

## 📊 Ejemplo de Respuesta

### **Todos los servicios healthy**

```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T10:30:00.000Z",
  "services": {
    "polygon": {
      "status": "healthy",
      "latencyMs": 234,
      "details": {
        "blockNumber": 79769500,
        "balance": "0.05 POL",
        "sponsorAddress": "0x44da5bc78a316231af82Ec7dC1778b4041f6ff05",
        "rpcUrl": "polygon-mainnet.g.alchemy.com"
      }
    },
    "bitcoin": {
      "status": "healthy",
      "latencyMs": 189,
      "details": {
        "currentBlockHeight": 870000,
        "apiUrl": "https://mempool.space/api"
      }
    },
    "opentimestamps": {
      "status": "healthy",
      "latencyMs": 456,
      "details": {
        "totalServers": 3,
        "onlineServers": 3,
        "servers": [
          { "url": "https://alice.btc.calendar.opentimestamps.org", "online": true, "status": 200 },
          { "url": "https://bob.btc.calendar.opentimestamps.org", "online": true, "status": 200 },
          { "url": "https://finney.calendar.eternitywall.com", "online": true, "status": 200 }
        ]
      }
    },
    "signnow": {
      "status": "healthy",
      "latencyMs": 567,
      "details": {
        "apiBase": "https://api-eval.signnow.com",
        "authenticated": true
      }
    },
    "resend": {
      "status": "healthy",
      "latencyMs": 123,
      "details": {
        "domainsConfigured": 1
      }
    }
  }
}
```

### **Servicio degradado**

```json
{
  "status": "degraded",
  "timestamp": "2025-12-01T10:35:00.000Z",
  "services": {
    "polygon": {
      "status": "degraded",
      "latencyMs": 234,
      "details": {
        "blockNumber": 79769500,
        "balance": "0.005 POL",  // ⚠️ Balance bajo
        "sponsorAddress": "0x44da5bc78a316231af82Ec7dC1778b4041f6ff05"
      }
    },
    "opentimestamps": {
      "status": "degraded",
      "latencyMs": 789,
      "details": {
        "totalServers": 3,
        "onlineServers": 1,  // ⚠️ Solo 1 de 3 online
        "servers": [
          { "url": "https://alice.btc.calendar.opentimestamps.org", "online": true, "status": 200 },
          { "url": "https://bob.btc.calendar.opentimestamps.org", "online": false, "status": 0 },
          { "url": "https://finney.calendar.eternitywall.com", "online": false, "status": 0 }
        ]
      }
    }
  }
}
```

### **Servicio unhealthy**

```json
{
  "status": "unhealthy",
  "timestamp": "2025-12-01T10:40:00.000Z",
  "services": {
    "polygon": {
      "status": "unhealthy",
      "latencyMs": 0,
      "error": "fetch failed: unable to connect to RPC"
    },
    "bitcoin": {
      "status": "unhealthy",
      "latencyMs": 5234,
      "error": "mempool.space returned 503"
    }
  }
}
```

---

## 🔄 Monitoreo Automático

### **1. UptimeRobot (Gratis)**

1. Crear cuenta en [UptimeRobot](https://uptimerobot.com/)
2. Agregar nuevo monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/health-check`
   - **Interval**: 5 minutos
   - **Alert Contacts**: Tu email

### **2. Better Uptime (Gratis hasta 10 monitores)**

1. Crear cuenta en [Better Uptime](https://betteruptime.com/)
2. Crear nuevo monitor HTTP
3. Configurar:
   - **URL**: Health check endpoint
   - **Expected status**: 200
   - **Check interval**: 1 minuto
   - **Alerts**: Email/Slack/SMS

### **3. Cron Job + Slack Webhook**

Crear función que chequee cada hora y notifique en Slack:

```bash
# Agregar a crontab
0 * * * * curl https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/health-check | jq 'if .status != "healthy" then . else empty end' | curl -X POST -H 'Content-Type: application/json' --data @- YOUR_SLACK_WEBHOOK_URL
```

---

## 📊 Dashboards

### **Integración con Grafana**

1. Instalar Grafana Cloud (gratis)
2. Crear datasource HTTP
3. Query: `https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/health-check`
4. Parsear JSON response
5. Crear panels para cada servicio

### **Status Page público**

Usar servicios como:
- [StatusPage.io](https://www.atlassian.com/software/statuspage)
- [Cachet](https://cachethq.io/) (self-hosted)
- [Upptime](https://upptime.js.org/) (GitHub Actions based)

---

## 🚨 Alertas Recomendadas

### **Críticas** (Alerta inmediata)

| Condición | Acción |
|-----------|--------|
| `status == "unhealthy"` | Email + SMS + Slack |
| Polygon balance < 0.01 POL | Email (refill needed) |
| Todos los OTS calendars offline | Email + Slack |
| SignNow auth falla | Email |

### **Advertencias** (Alerta diferida)

| Condición | Acción |
|-----------|--------|
| `status == "degraded"` | Email diario |
| Latency > 5s | Log para investigación |
| 1-2 OTS calendars offline | Log (fallback funcionando) |

---

## 🧪 Testing

### **Test manual**

```bash
# All services
curl "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/health-check" \
  -H "apikey: YOUR_KEY" \
  -H "Authorization: Bearer YOUR_KEY" | jq .

# Single service
curl "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/health-check?service=polygon" \
  -H "apikey: YOUR_KEY" \
  -H "Authorization: Bearer YOUR_KEY" | jq .
```

### **Test automatizado**

Crear test que corra en CI/CD:

```typescript
// test-health-check.ts
const response = await fetch(
  'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/health-check',
  {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    },
  }
);

const data = await response.json();

// Assert all services are healthy
for (const [service, health] of Object.entries(data.services)) {
  if (health.status === 'unhealthy') {
    throw new Error(`Service ${service} is unhealthy: ${health.error}`);
  }
}

console.log('✅ All services healthy');
```

---

## 🔍 Troubleshooting

### **Error: "Invalid JWT"**

**Solución**: Agregar headers de autenticación:
```bash
-H "apikey: YOUR_KEY" \
-H "Authorization: Bearer YOUR_KEY"
```

### **Error: "Missing Polygon configuration"**

**Solución**: Verificar secrets de Supabase:
```bash
supabase secrets list
```

Asegurar que existan:
- `POLYGON_RPC_URL`
- `POLYGON_PRIVATE_KEY`
- `POLYGON_CONTRACT_ADDRESS`

### **Service timeout**

**Síntoma**: Health check tarda > 10s o timeout

**Solución**:
1. Verificar conectividad a servicios externos
2. Revisar logs de Supabase
3. Considerar aumentar timeout en código

---

## 📈 Métricas Clave

### **Latencia**

- **Objetivo**: < 2s para todos los servicios
- **Advertencia**: > 5s
- **Crítico**: > 10s o timeout

### **Disponibilidad**

- **Objetivo**: 99.9% uptime
- **Mínimo aceptable**: 99% (< 7.2 horas downtime/mes)

### **Balance de Polygon**

- **Objetivo**: > 0.1 POL
- **Advertencia**: < 0.05 POL
- **Crítico**: < 0.01 POL

---

## ✅ Checklist de Setup

- [ ] Desplegar función `health-check`
- [ ] Configurar acceso público (opcional)
- [ ] Probar endpoint manualmente
- [ ] Configurar monitor en UptimeRobot/Better Uptime
- [ ] Configurar alertas por email
- [ ] (Opcional) Integrar con Slack
- [ ] (Opcional) Crear dashboard en Grafana
- [ ] (Opcional) Publicar status page

---

## 🎯 Próximos Pasos

1. **Ahora**: Configurar UptimeRobot básico
2. **Próxima semana**: Integrar con Slack
3. **Largo plazo**: Status page público

¿Quieres que configure el monitor en UptimeRobot o prefieres hacerlo tú?
