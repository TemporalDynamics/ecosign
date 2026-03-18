# Happy Path 01: Onboarding

**Clasificacion:** CORE
**Actor:** Usuario nuevo
**Trigger:** Click en "Sign Up" / "Crear cuenta"
**Fuentes:** ECOSIGN_HAPPY_PATHS_USERS.md, ENTRY_CONTRACT.md

---

## Paso a paso

1. Usuario ingresa email + password + confirmacion de password
2. Sistema envia email de verificacion (template: `supabase/templates/verify-email.html`)
3. Usuario clickea el link de verificacion en su email
4. Sistema valida el token y redirige a Home interno (sin pasos intermedios)
5. Usuario ve CTAs de onboarding:
   - Enviar NDA
   - Proteger documento
   - Firmar documento
   - Crear flujo de firmas
6. (Opcional) 1-2 minutos despues, usuario recibe email "Founder Badge" con garantia de precio lifetime

## Estado final

Usuario verificado, autenticado, listo para operar documentos.

## Reglas

- El acceso a rutas internas DEBE estar bloqueado hasta completar verificacion
- El email de Founder NO debe bloquear ninguna funcionalidad
- La verificacion es one-time: una vez verificado, no se pide de nuevo
