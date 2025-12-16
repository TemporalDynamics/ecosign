# ❌ Decisiones de NO Implementar (Deliberadas)

> **Propósito:** Documentar decisiones conscientes de NO implementar features/tecnologías.  
> **Por qué:** Para evitar re-discusiones y justificar arquitectura ante auditores/inversores.

---

## 🧭 Principio Rector

**No optimizamos hipótesis. Optimizamos realidad observada.**

Toda decisión de NO implementar tiene un **trigger claro** que define cuándo revisarla.

---

## 🔐 Seguridad

### ❌ KMS (Key Management System)

**Estado:** No implementado  
**Razón:**
- Cambio arquitectónico profundo
- Requiere plan de migración de claves
- Costo >> beneficio en MVP

**Trigger:** Auditoría externa lo recomienda o >1000 usuarios activos.

---

### ❌ WAF Avanzado

**Estado:** No implementado (Vercel tiene básico)  
**Razón:**
- No somos target de alto perfil
- Vercel ya filtra tráfico básico

**Trigger:** Logs muestran intentos de ataque frecuentes.

---

## 🏗️ Arquitectura

### ❌ Microservicios

**Estado:** No implementado  
**Razón:**
- Serverless suficiente (<200ms)
- MVP con tráfico bajo

**Trigger:** p95 latency > 2s o necesidad de escalar componentes independientemente.

---

### ❌ Colas Asíncronas

**Estado:** No implementado  
**Razón:**
- No hay jobs largos
- Procesamiento <200ms

**Trigger:** Jobs >5s o timeouts >5%.

---

## 🧪 Testing

### ❌ Load Testing

**Estado:** No implementado  
**Razón:**
- Pre-optimización
- No hay tráfico representativo

**Trigger:** Lanzamiento público + 1 mes.

---

### ❌ E2E Testing

**Estado:** No implementado  
**Razón:**
- Fase 3 recién estabilizada
- MVP cambia rápido

**Trigger:** 2 semanas sin cambios en flujo crítico.

---

## ⛓️ Blockchain

### ❌ Polygon / Bitcoin Anchoring

**Estado:** No implementado  
**Razón:**
- Costo por transacción
- MVP debe validar demand first

**Trigger:** >100 usuarios solicitan inmutabilidad pública.

---

## 📊 Resumen de Triggers

| Feature | Trigger |
|---------|---------|
| KMS | Auditoría externa o >1000 usuarios |
| Microservicios | p95 latency > 2s |
| Colas async | Timeouts >5% |
| Load testing | Lanzamiento + 1 mes |
| E2E tests | 2 semanas estable |
| Blockchain | >100 usuarios solicitan |

---

**Ver:** [ARCHITECTURE.md](./ARCHITECTURE.md) para detalles completos.

---

**Última revisión:** Sprint 2 Día 3
