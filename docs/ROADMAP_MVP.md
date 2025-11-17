# VerifySign MVP Roadmap

**Objetivo MVP**: Cerrar 3 flujos end-to-end completos.

> La base técnica está sólida (React + Vite + Supabase + eco-packer + 61/61 tests).
> Lo que falta es cerrar los flujos de punta a punta.

---

## Resumen de Estado

| Flujo | Estado | Descripción |
|-------|--------|-------------|
| **FLUJO 1** - Certificar documento | ⚠️ Parcial | eco-packer funciona local, falta backend completo |
| **FLUJO 2** - Compartir con NDA | ❌ Incompleto | Schema listo, faltan edge functions y UI |
| **FLUJO 3** - Verificar público | ⚠️ Parcial | VerifyPage existe, falta UX forense clara |

---

## FLUJO 1: "Certificar mi documento" (Owner)

**Objetivo**: Usuario logueado puede subir archivo → certificarlo → obtener .ecox + guardarlo.

### Estado Actual
- ✅ Frontend sube archivos
- ✅ eco-packer funciona como librería
- ✅ DB tiene tabla `documents`
- ⚠️ Storage y Edge Functions no completamente conectados
- ⚠️ Falta persistencia cloud completa

### Tareas

#### 1.1 Edge Function `certify-document`
- [ ] Recibe: `file` + `user_id`
- [ ] Valida tipo y tamaño (reusa `fileValidation`)
- [ ] Llama a eco-packer en el server
- [ ] Genera `.ecox` + calcula `eco_hash`
- [ ] Sube archivo original a bucket `verifysign-documents`
- [ ] Sube `.ecox` a bucket `verifysign-certificates`
- [ ] Inserta registro en `documents`
- [ ] Devuelve: `signedUrlEcox` + metadata

#### 1.2 Integración en Dashboard
- [ ] Botón "Certificar documento" funcional
- [ ] Progreso visible ("Subiendo", "Generando .ECO", "Listo")
- [ ] Card del documento en lista al terminar
- [ ] Botón "Descargar .ECO" y "Ver detalles"

#### 1.3 VerifyPage para .ecox
- [ ] Input: subir .ecox (+ opcionalmente archivo original)
- [ ] Lógica: `unpack()` + verificar firmas, hash, timestamps
- [ ] UI con resultado VERDE/ROJO/AMARILLO
- [ ] Mostrar hash, fecha, algoritmo, anchors

#### 1.4 Tests
- [ ] Test E2E manual documentado
- [ ] login → subir → certificar → descargar → verificar

---

## FLUJO 2: "Compartir con NDA y VerifyTracker" (Owner → Invitado)

**Objetivo**: Compartir documento certificado con NDA y tracking de accesos.

### Estado Actual
- ✅ Tablas listas: `links`, `recipients`, `nda_acceptances`, `access_events`
- ❌ No hay lógica de negocio completa
- ❌ No hay UI final para invitados

### Tareas

#### 2.1 Edge Function `generate-link`
- [ ] Input: `{ document_id, recipient_email, expires_in_hours }`
- [ ] Genera token seguro (JWT o UUID + firma)
- [ ] Inserta en `links` + `recipients`
- [ ] Devuelve URL: `https://app.verifysign.pro/nda/{token}`
- [ ] Dispara email (mock/manual por ahora)

#### 2.2 Edge Function `verify-access`
- [ ] Input: `{ token }`
- [ ] Valida expiración + estado
- [ ] Captura: IP, user-agent, geoloc, fingerprint
- [ ] Inserta en `access_events`
- [ ] Devuelve: estado del link + metadatos del documento

#### 2.3 NDA Page (invitado sin login)
- [ ] Ruta: `/nda/:token`
- [ ] Llama a `verify-access` al cargar
- [ ] Muestra NDA (texto legal)
- [ ] Form: nombre + email + checkbox aceptación
- [ ] Al aceptar: guardar en `nda_acceptances`
- [ ] Mostrar botones: "Descargar documento" + "Descargar .ECO"
- [ ] CTA sutil: "Guardá tu .ECO gratis en tu cuenta"

#### 2.4 Dashboard - Sección VerifyTracker
- [ ] Lista de enlaces creados
- [ ] Destinatario, vencimiento, estado (abierto/no, NDA firmada/no)
- [ ] Click en enlace → ver log de accesos (timeline)

#### 2.5 Tests
- [ ] Flujo E2E manual: crear enlace → incognito → NDA → descargar → ver logs
- [ ] 2-3 tests unitarios de edge functions

---

## FLUJO 3: "Verificar como tercero" (Público)

**Objetivo**: Cualquiera puede subir .ecox y obtener respuesta clara.

### Estado Actual
- ✅ VerifyPage existe
- ✅ eco-packer puede `unpack()`
- ⚠️ Falta narrativa y UX forense clara

### Tareas

#### 3.1 Refinar VerifyPage
- [ ] Dropzone para .ecox
- [ ] Dropzone opcional para archivo original
- [ ] Card grande con resultado:
  - Integridad de .ECO
  - Timestamp
  - Algoritmos
  - Anchors (cuando estén)
- [ ] Si hay archivo original: "El contenido coincide / NO coincide"
- [ ] Estados con colores:
  - 🟢 VERDE: todo ok
  - 🔴 ROJO: mismatch
  - 🟡 AMARILLO: solo .ECO (sin original)

#### 3.2 Punto de extensión para diff visual
- [ ] Por ahora: mensaje claro si hay mismatch
- [ ] "El archivo actual no coincide con el certificado"
- [ ] Más adelante: comparador visual

#### 3.3 Tests
- [ ] .ecox válido + archivo correcto → VERDE
- [ ] .ecox válido + archivo modificado → ROJO
- [ ] .ecox corrupto → ERROR
- [ ] Solo .ecox (sin original) → AMARILLO

---

## Checklist Pre-Beta

- [ ] 3 flujos E2E probados manualmente
- [ ] 61/61+ tests pasando
- [ ] 1 test manual documentado por flujo
- [ ] Variables de entorno en producción configuradas
- [ ] Buckets de Supabase Storage listos
- [ ] Página de invitación a beta
- [ ] Landing page pulida
- [ ] Pricing claro y comunicado

---

## Prioridades Inmediatas

1. **FLUJO 1** - Es el core del producto. Sin esto no hay nada.
2. **FLUJO 3** - Validación pública es clave para credibilidad.
3. **FLUJO 2** - VerifyTracker es diferenciador, pero puede esperar al MVP+.

---

## Notas Técnicas

### Stack
- Frontend: React + Vite + TailwindCSS
- Backend: Supabase (Postgres + Edge Functions + Storage)
- Crypto: eco-packer (SHA-256, firma Ed25519, AES-256-GCM)
- Auth: Supabase Auth con RLS
- Deploy: Vercel (frontend) + Supabase Cloud

### Seguridad ya implementada
- CSRF tokens
- AES-256-GCM encryption
- Row Level Security (RLS)
- Input sanitization
- Rate limiting
- File validation
- 61/61 security tests pasando

### Modelo de Datos (core)
```sql
documents       -- archivos certificados
links           -- enlaces de acceso con NDA
recipients      -- destinatarios de enlaces
access_events   -- log de accesos (VerifyTracker)
nda_acceptances -- firmas de NDA
anchors         -- anclajes blockchain (Bitcoin, Polygon)
```

---

## Métricas de Éxito MVP

1. Usuario puede certificar documento en < 30 segundos
2. .ECO verificable sin depender de VerifySign
3. NDA firmable en < 1 minuto
4. Tracking de accesos visible en dashboard
5. 0 vulnerabilidades de seguridad críticas

---

*Última actualización: 2025-11-16*
*Autor: Manuel + Claude AI + ChatGPT*
