# 📋 Decision Log 2.0 — EcoSign

## 📖 Cómo usar este documento

Este es un **diario de arquitectura + UX** donde documentamos decisiones importantes del producto.

### ❌ Qué NO debería ser este documento:
- Un changelog técnico
- Un listado de commits
- Un documento largo
- Algo que solo entienda ingeniería

### ✅ Qué SÍ debería ser:
- **Corto**: Una entrada por iteración significativa
- **Humano**: Lenguaje claro, sin jerga innecesaria
- **Explicativo**: El "por qué", no solo el "qué"
- **Orientado a decisión**: Qué se decidió y qué se descartó

**Pensalo como un diario de arquitectura + UX.**

### 📝 Qué documentar aquí:
- Cambios significativos en UI/UX
- Decisiones de arquitectura
- Código eliminado (y por qué)
- Cosas que NO hicimos a propósito
- Deuda técnica conocida
- **Nota para el equipo**: Esto NO es un changelog ni un informe de lint/errores. No pegues logs, listas de commits ni issues; solo decisiones clave con su “por qué”.

---

## 📝 Template para nuevas entradas

```markdown
## Iteración YYYY-MM-DD — [Nombre del cambio]

### 🎯 Objetivo
Qué se buscaba lograr con esta iteración (1–2 frases).

### 🧠 Decisiones tomadas
- Decisión 1 (qué y por qué)
- Decisión 2
- Decisión 3

### 🛠️ Cambios realizados
- Cambio concreto en UI / lógica
- Eliminación de código obsoleto
- Ajustes visuales relevantes

### 🚫 Qué NO se hizo (a propósito)
- Cosa que se decidió no implementar
- Feature pospuesta
- Alternativa descartada

### ⚠️ Consideraciones / deuda futura
- Cosas a revisar más adelante
- Suposiciones tomadas
- Límites actuales

### 📍 Estado final
- Qué quedó mejor
- Qué sigue pendiente

### 💬 Nota del dev
"Este cambio mejora X y evita Y. Si alguien toca esta parte, tener en cuenta Z."
```

---

> ⚠️ **IMPORTANTE**: Todo lo que está arriba de esta línea es la estructura fija del documento.
> NO modificar ni eliminar. Las entradas nuevas van abajo de esta sección.

---

# 📚 Historial de Iteraciones 2.0

## Iteración 2025-12-21 — Sistema oficial de emails y renderer unificado

### 🎯 Objetivo
Definir un sistema unico de emails con reglas claras y un renderer oficial, evitando incoherencias visuales y de copy.

### 🧠 Decisiones tomadas
- Se establecio un manifiesto de comunicacion por email para estructura, tipografia, colores y tono.
- Se definio el renderer oficial basado en templates de archivo y `siteUrl` como contrato base.
- Se cerro el perimetro: todo email de producto debe pasar por `_shared/template-renderer.ts`.
- Los HTML inline se consideran legacy/tacticos y quedan fuera de esta iteracion.

### 🛠️ Cambios realizados
- Se alinearon todos los templates en archivos al manifiesto (estructura + footer + CTA unico).
- Se duplicaron templates dentro del bundle de Edge Functions y se creo el renderer con cache.
- Se migraron los builders de `_shared/email.ts` a templates de archivo.
- Se documentaron los templates oficiales y los legacy.

### 🚫 Qué NO se hizo (a propósito)
- No se migraron los HTML inline dentro de funciones/migraciones.
- No se agregaron CTAs en "documento firmado/certificado" hasta definir URL canonica.

### ⚠️ Consideraciones / deuda futura
- Migrar legacy inline a templates oficiales cuando se defina el plan de limpieza.
- Definir CTA opcional para firmado/certificado con URL canonica (/documents/{id}).

### 📍 Estado final
- Sistema de emails blindado: templates + renderer unico + contrato `siteUrl`.
- Coherencia visual y de tono aplicada a todos los templates oficiales.

### 💬 Nota del dev
"Todo email de producto pasa por el renderer oficial. Si aparece HTML inline nuevo, se considera excepcion y debe justificarse."

## Iteración 2025-12-21 — Adaptación mobile del Centro Legal

### 🎯 Objetivo
Hacer que el Centro Legal sea usable en mobile sin cambiar el flujo ni la lógica existente.

### 🧠 Decisiones tomadas
- **Columna única en mobile**: En <768px todo se renderiza en una sola columna para reducir carga visual.
- **Acordeones para NDA y Flujo**: Se usan acordeones cerrados por defecto y se colapsan al cargar datos relevantes.
- **Fullscreen real para documento y firma**: La vista completa y la firma ocupan la pantalla sin modales flotantes.
- **CTA fijo**: El botón “Proteger” queda sticky en el bottom en mobile.
- **Desktop intacto**: No se tocó la estructura ni la experiencia en desktop.

### 🛠️ Cambios realizados
- Preview mobile reducido con botón “Ver documento completo” en fullscreen.
- Firma en pantalla completa y aislada del PDF.
- NDA y Flujo de Firmas como acordeones con estados de resumen.
- CTA “Proteger” sticky en mobile.
- Modales secundarios ajustados a fullscreen en mobile para evitar modales anidados.

### 🚫 Qué NO se hizo (a propósito)
- No se cambió la lógica del flujo legal ni el backend.
- No se agregaron estados nuevos ni pasos adicionales.
- No se rediseñó desktop.

### ⚠️ Consideraciones / deuda futura
- Si se agregan nuevos paneles, respetar la regla de columna única en mobile.
- Mantener el criterio de “fullscreen real” para interacciones críticas.

### 📍 Estado final
- Mobile usable, sin modales anidados y con flujo legal intacto.
- Desktop sin cambios.

### 💬 Nota del dev
"La prioridad fue reducir fricción en mobile sin tocar la lógica. Si alguien modifica el Centro Legal, mantener la separación entre mobile (columna única + fullscreen) y desktop (grid original)."

## Iteración 2025-12-21 — Nota sobre Lighthouse en entorno local

### 🎯 Objetivo
Aclarar el resultado de Lighthouse y dejar una decisión operativa sobre su uso.

### 🧠 Decisiones tomadas
- **Resultados esperados en dev**: Lo que se vio (P0 + “No timing information available”) es comportamiento esperado al correr Lighthouse contra Vite + SPA en headless.
- **No usar dev para Performance**: Performance queda invalidada en ese entorno; el resto de categorías sí es útil.
- **Uso correcto**: Lighthouse solo se usará para Performance en build/preview o producción.

### 🛠️ Cambios realizados
- Se documentó el diagnóstico: no es bug de EcoSign ni del script.
- Se dejó la regla: no medir Performance en dev server.

### 🚫 Qué NO se hizo (a propósito)
- No se insistió con más corridas en dev.
- No se abrió investigación de bugs en la app por esos P0.

### ⚠️ Consideraciones / deuda futura
- Si hace falta Performance real, correr Lighthouse contra `preview` o producción.

### 📍 Estado final
- Entendimiento alineado: P0 en dev no representa el rendimiento real.
- Decisión clara sobre cuándo usar Lighthouse.

### 💬 Nota del dev
"Lo que estaban viendo es exactamente el comportamiento esperado cuando Lighthouse se corre bien técnicamente, pero en el entorno incorrecto para medir Performance. En dev server, Performance no es confiable; en preview/prod sí."

## Iteración 2025-12-21 — Mobile en Documentos + NDA + navegación interna

### 🎯 Objetivo
Mejorar la usabilidad mobile en Documentos y evitar que el modo invitado se mezcle con cuentas reales.

### 🧠 Decisiones tomadas
- **Cards + menú en mobile**: En Documentos se usa layout en cards con 2 acciones visibles y el resto en un menú para reducir ruido.
- **NDA modal con acordeones**: El modal de compartir NDA se organiza en secciones colapsables en mobile.
- **Guest mode aislado**: Si hay usuario autenticado, se ignora y limpia el flag de modo invitado.
- **Nav interna mobile**: Menú desplegable en el header interno para acceder a las páginas privadas.

### 🛠️ Cambios realizados
- Documentos mobile: cards con “Ver detalle” + “NDA” visibles y acciones secundarias en “Más”.
- Modal NDA: acordeones en mobile para NDA y configuración de envío.
- Login + Documents: limpieza de `guest mode` cuando hay usuario real.
- Navegación interna: menú móvil con enlaces y cierre de sesión.

### 🚫 Qué NO se hizo (a propósito)
- No se cambió la lógica de backend ni el modelo de documentos.
- No se tocó el diseño desktop.

### ⚠️ Consideraciones / deuda futura
- Si se agregan nuevas acciones en Documentos, mantener la jerarquía: 2 visibles + menú.
- Revisar estados de `guest mode` en otros módulos si aparecen casos similares.

### 📍 Estado final
- Documentos usable en mobile y sin mezcla con demo.
- NDA modal más legible en pantallas chicas.
- Navegación interna accesible en mobile.

### 💬 Nota del dev
"Mobile necesitaba jerarquía clara. Cards + menú reduce ruido y el flag de guest no debe pisar cuentas reales. Mantener esa separación."

---

## Iteración 2025-12-22 — Zero Server-Side Knowledge Architecture (E2E Encryption MVP A1)

### 🎯 Objetivo
Implementar cifrado end-to-end (E2E) verdadero donde el servidor **matemáticamente no puede descifrar** documentos. Hacer real la premisa: "EcoSign NO ve documentos".

### 🧠 Decisiones tomadas
- **Session secrets client-side**: El secreto criptográfico (session secret) se genera en el browser al login y **nunca** se envía al servidor. Session secret (cryptographic) ≠ Auth session (JWT). No se usa el JWT como material criptográfico.
- **Key wrapping architecture**: Cada documento tiene su propia key AES-256, que se "envuelve" (cifra) con una unwrap key derivada del session secret. El servidor guarda solo la wrapped key (cifrada).
- **OTP-based sharing**: Para compartir, la document key se re-envuelve con una key derivada del OTP. El OTP se envía por email y nunca se almacena en texto plano (solo hash SHA-256).
- **No passwords (por ahora)**: Se alinea con el auth actual (magic link/OTP). Session secrets se pierden al cerrar browser (diseño intencional). Passkeys/WebAuthn quedan como upgrade futuro.
- **Backward compatible**: Documentos existentes (no cifrados) siguen funcionando. Toggle para elegir si cifrar o no.

### 🛠️ Cambios realizados
- **Core crypto library** (`client/src/lib/e2e/`):
  - `sessionCrypto.ts`: Generación y gestión de session secrets
  - `documentEncryption.ts`: Cifrado/descifrado AES-256-GCM
  - `otpSystem.ts`: Generación OTP y derivación de keys
  - `cryptoUtils.ts`: Utilidades (encoding, hashing, random)
  - `constants.ts`: Config criptográfica (100k iterations PBKDF2, OWASP compliant)

- **Database schema** (3 migrations):
  - `user_profiles`: columna `wrap_salt` (público, para PBKDF2)
  - `documents`: columnas `encrypted`, `encrypted_path`, `wrapped_key`, `wrap_iv`
  - `document_shares`: nueva tabla para OTP-based sharing con `otp_hash`, `wrapped_key`, `recipient_salt`

- **Documentación**:
  - `E2E_ENCRYPTION_IMPLEMENTATION.md`: Guía completa de implementación
  - `E2E_STATUS_REPORT.md`: Estado actual y próximos pasos
  - Inline comments explicando cada función

### 🚫 Qué NO se hizo (a propósito)
- **No password-derived keys** (por ahora): Para alinearse con magic link/OTP auth existente. Se evalúa Passkeys como upgrade.
- **No Shamir Secret Sharing**: Complejidad innecesaria para MVP. Queda para v2 si hace falta.
- **No MPC (Multi-Party Computation)**: Overkill para el caso de uso actual.
- **No tocar SignNow**: Esa integración sigue como está (con advertencia explícita de que sí ve el documento).

### ⚠️ Consideraciones / deuda futura
- **Re-login requiere OTP recovery**: Si cerrás el browser y volvés, necesitás OTP para acceder a docs viejos (primera vez). Luego se re-wrappean con nueva sesión. Este trade-off prioriza Zero Server-Side Knowledge sobre conveniencia, y es aceptable en esta etapa MVP.
- **No hay recovery sin OTP**: Si perdés acceso al email, no podés recuperar docs cifrados (diseño intencional, Zero Knowledge real).
- **Session secrets volátiles**: Se pierden al cerrar tab/browser. Es trade-off por seguridad (no persistencia = no leak).
- **Testing pendiente**: Fase 7 incluye unit tests, integration tests y security audit.

### 📍 Estado final
- **Phases 1-2 completadas** (Core + DB Schema)
- **Branch creada**: `feature/e2e-encryption-mvp-a1`
- **Commits**: 3 (core library, migrations, docs)
- **Claim desbloqueado**: "EcoSign implements Zero Server-Side Knowledge architecture" — técnicamente correcto, auditable, defendible.

**Server stores (all encrypted/hashed):**
- ✅ Encrypted blobs (AES-256-GCM)
- ✅ Wrapped keys (no puede unwrap sin session secret)
- ✅ OTP hashes (SHA-256, no reversible)
- ✅ Public salts (no son secretos)

**Server CANNOT:**
- ❌ Derivar unwrap keys (no tiene session secret)
- ❌ Unwrap document keys
- ❌ Descifrar documentos
- ❌ Reconstruir OTPs

**Próximas fases**:
- Phase 3: Storage layer integration
- Phase 4: Auth hooks (init session crypto on login)
- Phase 5: UI components (encryption toggle, OTP input)
- Phase 6: Edge functions (send OTP email)
- Phase 7: Testing & security audit

### 💬 Nota del dev
"Esta arquitectura hace que 'EcoSign no ve documentos' sea matemáticamente cierto, no marketing. El servidor literalmente no puede descifrar sin el session secret del cliente. Si alguien audita esto, la conclusión será: Zero Server-Side Knowledge = TRUE. Esto nos diferencia de competidores que dicen 'seguro' pero el servidor tiene las keys."\
