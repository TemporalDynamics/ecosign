# Mini Roadmap (Hoy)

## Objetivo
Resolver P0 de entrada (CTA + guard tecnico) y dejar el crypto init estable, sin ampliar alcance.

## Paso 1 - Contrato de entrada (30-45 min)
- Confirmar y fijar el contrato en `docs/ENTRY_CONTRACT.md`.
- Criterio de listo: contrato breve, claro y no contradictorio con UX actual.

## Paso 2 - CTA de entrada (1-2 h)
- Separar "Crear cuenta gratis" de "Probar como invitado".
- Criterio de listo: el CTA principal dispara signup; invitado es opcion secundaria.

## Paso 3 - Guard tecnico guest + auth (30-60 min)
- En `useAuth`, si `isGuest && isAuth` => `disableGuestMode()` inmediato.
- Criterio de listo: no queda estado mixto luego de login/back.

## Paso 4 - Crypto init sin timeout (30-60 min)
- Remover `setTimeout` y navegar solo despues de `initializeSessionCrypto`.
- Agregar loading simple de inicializacion.
- Criterio de listo: no hay error "sessionCrypto not initialized".

## Fuera de alcance (Hoy)
- SignNow credentials, UI de pending anchors, pagina /verify/:id.
- Limites de guest y refactor de errores.

## Pruebas manuales
- CTA: click "Comenzar gratis" => signup, sin activar invitado.
- Estado mixto: login + back => guest desactivado.
- Crypto init: login y cifrado inmediato sin error.
