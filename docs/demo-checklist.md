# Checklist de Demo-Readiness (MVP)
_Basado en `MVP-README.md` secciones 9-55_

## Landing Page (`/`)
- [ ] Navegación principal sin enlaces rotos.
- [ ] CTA "Certificar un Documento" redirige a `/dashboard`.
- [ ] CTA "Verificar Autenticidad" redirige a `/verify`.
- [ ] Bloque "Cómo funciona" muestra anclas funcionales.
- [ ] Sección de características tecnológicas visible en desktop y mobile.
- [ ] Sección de casos de uso con copy legible.
- [ ] Bloque de "Transparencia total" incluye disclaimer legal.
- [ ] Footer con enlaces a políticas/contacto operativos.
- [ ] Diseño responsive (al menos breakpoints mobile, tablet, desktop).

## Verificador Público (`/verify`)
- [ ] Drag & drop acepta archivos `.ECO` sin crash.
- [ ] Resultados muestran Hash SHA-256.
- [ ] Resultados incluyen timestamp certificado.
- [ ] Resultados listan firmas digitales simuladas.
- [ ] Sección de anclaje blockchain muestra estado.
- [ ] Flujo funciona sin sesión iniciada.
- [ ] Confirmar que el archivo no se sube (procesamiento local demo-ready).
- [ ] Texto educativo explica qué se valida.

## Dashboard (`/dashboard`)
- [ ] Estadísticas simuladas se cargan sin errores JS.
- [ ] Modal "Crear certificado .ECO" abre y cierra correctamente.
- [ ] Botón "Certificar documento" dispara el modal.
- [ ] Controles para crear enlaces con NDA visibles.
- [ ] Toggle para "Requerir NDA" persiste estado dentro de la sesión.
- [ ] Feed de actividad reciente renderiza mock data.
- [ ] Navegación interna funciona tras login invitado.

## Pricing (`/pricing`)
- [ ] Plan Básico (Gratis) muestra límites <3 certificaciones.
- [ ] Plan Profesional ($29/mes) destaca beneficios pro.
- [ ] Plan Empresarial ($99/mes) incluye CTA a contacto/ventas.
- [ ] FAQ cargada con acordeones funcionales.
- [ ] Enlaces de navegación mantienen la sesión/invitado.

## Autenticación (`/login`)
- [ ] Formulario combina login/registro sin errores visuales.
- [ ] Botón "Continuar como invitado" redirige al dashboard.
- [ ] Validaciones mínimas en email/contraseña (mensajes visibles).
- [ ] Tras login simulado se redirige a `/dashboard`.

> Usa esta checklist como base para `docs/demo-checklist.md` o para issues de QA previas al hardening.
