# Manifiesto de Comunicacion por Email - EcoSign

Version: v1.0
Estado: activo
Alcance: emails transaccionales, de estado y de contexto

Este manifiesto define el sistema de comunicacion por email de EcoSign. No describe piezas aisladas: define reglas consistentes para que todos los mensajes se perciban como parte de un unico sistema confiable, sobrio y coherente.

## Proposito
Definir reglas claras para que todos los emails de EcoSign:
- Se perciban como un solo sistema
- Generen confianza y certeza
- Mantengan coherencia visual y de tono
- Respeten el rol especifico de cada mensaje

## Principios
- Primero el estado del usuario, no la marca.
- Claridad por encima de persuasion.
- Consistencia visual como prueba de seriedad.
- Pocas reglas, estrictas y repetibles.

## Estructura base (no negociable)
Todo email de EcoSign respeta esta estructura:
1) Header (Identidad)
2) Contexto / motivo del mensaje
3) Accion principal (si aplica)
4) Informacion complementaria
5) Footer (verdad institucional + soporte)

Si una seccion no aplica, se omite. Nunca se reemplaza por otra.

## Identidad visual

### Header
- Logo EcoSign alineado a la izquierda.
- Puede incluir simbolo + texto o solo texto, segun legibilidad.
- Usar el logo desde `client/public/assets` en el tamano mas legible sin excederse.
- Fondo blanco.
- Linea divisoria de 1px en #EAEAEA.
- Sin slogans, sin claims.

El header comunica identidad y continuidad, no emocion.

### Tipografia (email-safe)
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

Jerarquia de tamanos:
- Titulo: 20-22px
- Subtitulo/contexto: 15-16px
- Body: 14px
- Footer: 12px

### Colores
- Texto principal: #111111
- Texto secundario: #555555
- Bordes/divisores: #EAEAEA
- CTA: color de marca (uno solo)
- Fondo: blanco

No usar:
- Gradientes
- Sombras
- Fondos de color
- Iconografia decorativa

## Titulos
Un solo titulo por email. Funcional, directo y sin exageracion.
Ejemplos:
- "Verifica tu email para comenzar"
- "Tu cuenta ya esta activa"
- "Documento firmado"

## Voz y estilo
- Frases cortas.
- Tono serio, humano, sin hype.
- Explicar el "por que" cuando hay friccion.
- Sin ventas, sin promesas infladas.

Regla central:
EcoSign no se presenta primero. El mensaje comienza por el estado del usuario.

## Lo que un email de EcoSign no debe generar
- Urgencia artificial.
- Ansiedad.
- Sensacion de venta o promocion.
- Dudas sobre la legitimidad del mensaje.

## CTA
- Un solo CTA principal.
- Texto en primera persona o accion directa.
- Nunca "click aqui".

Ejemplos:
- "Confirmar mi cuenta"
- "Ir al dashboard"
- "Ver documento"

Si el email es informativo o de cierre, el CTA puede omitirse. Nunca se agrega un CTA solo para "llenar".

## Informacion secundaria
Links tecnicos, explicaciones y fallbacks:
- Tipografia mas pequena.
- Visualmente separado del mensaje principal.
- Nunca compite con el CTA.

## Footer (verdad institucional)
El footer es invariante entre emails.
Contenido:
- Frase institucional fija: "No vendemos firmas. Vendemos certeza."
- Linea de soporte: "Si no reconoces esta accion, contactanos."

## Tipos de email (clasificacion)
Cada template declara su tipo:
- Seguridad: verificacion, OTP, cambios de cuenta.
- Estado: cuenta activa, documento firmado, proceso completado.
- Contexto: bienvenida, founder, informacion relevante.

El tipo ajusta el tono, no la estructura.

## Emisor (remitente)
Siempre EcoSign como marca visible.
Segun el tipo:
- EcoSign · Seguridad <support@email.ecosign.app>
- EcoSign <hello@email.ecosign.app>

## Checklist rapido
- [ ] Respeta estructura base
- [ ] Un solo titulo
- [ ] CTA unico y claro (si aplica)
- [ ] Tipografias y colores dentro del sistema
- [ ] Footer institucional presente
- [ ] Remitente coherente con el tipo

## Changelog
- v1.0 - Definicion inicial del sistema de comunicacion por email de EcoSign.
