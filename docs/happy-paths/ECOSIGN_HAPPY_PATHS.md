📘 ECOSIGN — HAPPY PATHS (versión corregida y alineada)

Versión: corregida
Fecha: 2026-01-12T15:51:38.670Z

Resumen
-------
Documento único que recoge los happy paths canónicos, estados (LIVE / PENDING) y notas técnicas para desarrollo. Sin UI, sin marketing: foco en comportamiento y checklist.

1️⃣ ONBOARDING (cerrado) — LIVE
--------------------------------
🟢 O1 — Crear cuenta (flujo correcto)

Happy path canónico

- Usuario elige "Crear cuenta".
- Completa: Email, Password, Confirmación de password.
- Sistema envía mail de verificación.
- Usuario hace click en verificar.
- La verificación redirige directamente al Home interno.

Home muestra:
- Bienvenida
- CTAs claros: Enviar NDA, Proteger documento, Firmar documento, Crear flujo de firmas

📌 Importante
- No hay link previo ni acceso parcial.
- El mail de verificación es el único gate.

🟢 O2 — Mail de insignia fundador (evento diferido, no bloqueante)

- 1–2 minutos después de la verificación, usuario recibe mail con:
  - Insignia Founder
  - Número de fundador
  - Explicación: Precio congelado de por vida mientras no cambie de cuenta

📌 Este mail:
- No inicia flujos ni desbloquea features.
- Es identidad / narrativa / valor, no técnica.

✔️ Onboarding termina acá

2️⃣ CENTRO LEGAL (núcleo absoluto) — LIVE
----------------------------------------
Regla canónica (muy importante):
- Centro Legal es un modal transversal.
- No pertenece a una página; vive en todas.

Se puede abrir desde: Home, Documents, Operations, Planes, cualquier CTA de acción legal.

3️⃣ DOCUMENTOS — PROTEGER / FIRMAR
---------------------------------

🟢 D1 — Proteger documento (happy path real) — LIVE

- Usuario abre Centro Legal y sube documento.
- Protección activada por default; usuario puede dejarla o desactivarla explícitamente.
- CTA: Proteger.
- Sistema aplica TSA y genera evidencia.
- Documento aparece en el directorio Documents.

📌 Aclaraciones importantes:
- No existe “documento suelto” como concepto: todo entra al directorio Documents.
- El sistema invita siempre a proteger.

✔️ Flujo cerrado

🟢 D2 — Firmar documento (mi firma) — LIVE

- Flujo idéntico a D1 con acción extra: usuario elige "Mi firma".
- Se abre modal de firma con opciones: Teclado, Mouse, Touch, Subir firma existente.
- Al aplicar, la firma queda “volando” en sector visible y puede: Drag & drop, Borrar, Reposicionar.

📌 Nota técnica (detectada):
- Falta mejorar drag continuo con scroll: la firma debe acompañar el desplazamiento vertical.
- Esto es un ajuste UX/técnico puntual, no un cambio conceptual.

✔️ Flujo conceptual cerrado

4️⃣ BATCH (pendiente, pero bien definido) — PENDING
---------------------------------------------------
🟡 B1 — Enviar documentos como batch

Ubicación lógica: Operations principalmente, secundariamente desde Documents.

Happy path esperado:
- Usuario selecciona múltiples documentos (checkbox por documento) o "Enviar todo" dentro de una operación.
- Usuario elige "Enviar como batch".
- Sistema abre Centro Legal y verifica que todos los documentos tengan TSA; si alguno no tiene, se genera automáticamente.
- Se construye: Batch witness y flujo unificado de firmas (si aplica).

📌 Punto clave:
- El batch no saltea TSA: coagula protección, no la reemplaza.

⚠️ Falta:
- Nombre final en español (batch / conjunto).
- UX de selección.

5️⃣ FIRMA PRESENCIAL (flujo avanzado) — PENDING
----------------------------------------------
🟡 P1 — Firma presencial por documento u operación

- Usuario activa Firma presencial (desde Documents o Operations).
- Sistema genera QR; firmante escanea QR.

Casos:
- Firmante con cuenta: sistema verifica que los documentos coincidan, advierte "Son los mismos documentos que ya firmaste", permite firmar / reconfirmar.
- Firmante sin cuenta: sistema solicita ECO(s) y archivos originales; verifica integridad y completa firma presencial.

Sistema: eleva Assurance Identity Level y registra evento especial de cierre.

📌 Este flujo no reemplaza firmas previas; las consolida. Es cierre de operación / batch.

✔️ Concepto muy sólido

6️⃣ OPERACIONES — LIVE / PENDING
--------------------------------
🟢 OPR1 — Crear operación — LIVE
- Desde CTA y desde documento. Funciona perfecto.

🟢 OPR2 — Mover documentos a operación — LIVE
- Canon resuelto; sin referencias rotas.

🟡 OPR3 — Compartir documentos — PENDING
- Estado actual: Compartir link + OTP → OK.
- Falta cerrar: Compartir batch sin firmas; Compartir batch con protección avanzada.

📌 Punto a pulir: definir claramente diferencias entre compartir simple y compartir con protección (este último debe redirigir a Centro Legal).

7️⃣ VERIFICACIÓN EXTERNA — LIVE
-------------------------------
🟢 V1 — Verificador público

- Usuario (sin cuenta) abre verificador y sube: ECO + Documento actual (PDF; futuro: TXT, DOC).
- Sistema verifica integridad y muestra timeline con la vida completa del documento, tooltips y eventos ordenados.

📌 QR todavía no, pero el flujo ya existe.

8️⃣ QUÉ FALTA (claramente identificado)
---------------------------------------
- Batch: Naming, UX selección, Compartir batch.
- Drag continuo de firma.
- Mail Founder: ubicación clara, referenciado en docs internos, documento canónico para dev.

9️⃣ Próximo paso (propuesta)
---------------------------
- Convertir todo esto en un documento único: docs/happy-paths/ECOSIGN_HAPPY_PATHS.md (este archivo).
- Incluir: Secciones numeradas, Estados (LIVE / PENDING), Notas técnicas para dev, Sin UI, Sin marketing.

Qué permite:
- Mandarlo a un dev, detectar regresiones y usarlo como checklist.

— FIN —
