# 🏗️ Arquitectura de EcoSign

> **Última actualización:** 2024-12-16  
> **Estado:** MVP Pre-lanzamiento  
> **Versión:** 0.9.0

---

## 🎯 Principio Rector

**EcoSign es un sistema de certificación ciego por diseño.**

El contenido de los documentos **nunca** es accesible al servidor.  
La verificación se basa en **huellas criptográficas** generadas localmente.

---

## 🧩 Vista General

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Usuario carga documento (PDF)                               │
│  2. Sistema genera HASH localmente (SHA-256)                    │
│  3. Usuario firma (canvas → imagen)                             │
│  4. Sistema crea certificado .ECO (metadatos + hash)            │
│                                                                  │
│  ❌ El PDF NUNCA sale del navegador (salvo si usuario elige)   │
│  ✅ Solo el HASH viaja al servidor                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HASH
┌─────────────────────────────────────────────────────────────────┐
│                      API BACKEND (Netlify)                       │
├─────────────────────────────────────────────────────────────────┤
│  - Recibe: hash, timestamp, metadatos                           │
│  - Genera: certificado .ECO                                     │
│  - Registra: evento en audit log                                │
│  - Retorna: certificado firmado                                 │
│                                                                  │
│  ❌ Backend es CIEGO al contenido                               │
│  ✅ Solo ve huellas criptográficas                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Evento
┌─────────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS (Supabase)                      │
├─────────────────────────────────────────────────────────────────┤
│  documents:                                                      │
│    - id, hash, timestamp, owner_id                              │
│    - encrypted_file (opcional, cifrado AES-256-GCM)             │
│                                                                  │
│  audit_events:                                                   │
│    - event_type, timestamp, user_id, hash                       │
│    - ip_hash (nunca IP clara)                                   │
│                                                                  │
│  RLS activo: usuario solo ve sus documentos                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Ancla (futuro)
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN (Post-MVP)                         │
├─────────────────────────────────────────────────────────────────┤
│  - Polygon / Bitcoin                                            │
│  - Ancla pública del hash                                       │
│  - Inmutabilidad                                                │
│  - NO implementado todavía                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Flujo de Certificación

### **Modo Simple (Sin Guardar)**
1. Usuario carga PDF
2. Sistema calcula hash localmente
3. Usuario firma
4. Sistema crea .ECO con hash + timestamp + firma
5. Backend registra evento
6. Usuario descarga .ECO
7. PDF se borra del navegador

**Resultado:** El servidor **nunca vio** el PDF.

### **Modo Guardado (Opcional)**
1-3. Igual que modo simple
4. Usuario elige "Guardar documento"
5. Sistema cifra PDF con AES-256-GCM (client-side)
6. Sube PDF cifrado + hash
7. Backend registra evento
8. Usuario descarga .ECO

**Resultado:** El servidor tiene PDF **cifrado**, clave en cliente.

---

## 📋 Decisiones Arquitectónicas Clave

### **Por qué NO microservicios**
- MVP con tráfico bajo
- Serverless es suficiente
- **Trigger:** p95 latency > 2s

### **Por qué NO colas asíncronas**
- Procesamiento <200ms
- **Trigger:** Jobs >5s o timeouts >5%

### **Por qué NO KMS todavía**
- Cambio arquitectónico profundo
- Costo > beneficio en MVP
- **Trigger:** Auditoría externa lo recomienda

---

## 📚 Referencias

- [NOT_IMPLEMENTED.md](./NOT_IMPLEMENTED.md) - Decisiones de NO implementar
- [SECURITY.md](../SECURITY.md) - Prácticas de seguridad
- [PERFORMANCE.md](../PERFORMANCE.md) - Guía de performance

---

**Última revisión:** Sprint 2 Día 3
