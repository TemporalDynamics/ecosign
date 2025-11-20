# ✅ Configuración de Resend para EcoSign

## Problema Resuelto
El código ya está actualizado para usar `ecosign.app` en lugar de `verifysign.app`.

## Pasos para Verificar el Dominio en Resend

1. **Acceder a Resend Dashboard**
   - Ve a: https://resend.com/domains
   - Inicia sesión con tu cuenta

2. **Agregar el dominio `ecosign.app`**
   - Click en "Add Domain"
   - Ingresa: `ecosign.app`
   - Click en "Add"

3. **Configurar DNS Records**
   Resend te mostrará 3 registros DNS que debes agregar en tu proveedor de dominio:
   
   ```
   Tipo: TXT
   Name: _resend
   Value: [código que te da Resend]
   
   Tipo: CNAME  
   Name: resend._domainkey
   Value: [código que te da Resend]
   
   Tipo: CNAME
   Name: bounce
   Value: [código que te da Resend]
   ```

4. **Esperar Verificación**
   - La verificación puede tomar de 5 minutos a 24 horas
   - Resend verificará automáticamente los registros DNS

5. **Probar el Envío**
   Una vez verificado, intenta generar un link desde el dashboard

## Alternativa Temporal (Solo para Testing)

Si necesitas probar AHORA y no tienes el dominio verificado, puedes:

1. Usar el dominio de prueba de Resend:
   ```javascript
   from: 'EcoSign <onboarding@resend.dev>'
   ```

2. Cambiar temporalmente en: `supabase/functions/_shared/email.ts`

3. **IMPORTANTE**: Los emails desde `resend.dev` pueden ir a spam. Solo úsalo para testing.

## Verificar Estado Actual

```bash
# Ver si el dominio está verificado en Resend
curl https://api.resend.com/domains \
  -H "Authorization: Bearer re_aEWVjHJF_JP16N6VerN4VBjXvTBNi3hRU"
```

## Cambios Realizados

✅ Frontend actualizado: ahora envía `recipient_email` en lugar de objeto `recipient`
✅ Email templates: cambiados de VerifySign a EcoSign  
✅ Dominios: cambiados de verifysign.app a ecosign.app
✅ Función desplegada: generate-link actualizada en Supabase

## Siguiente Paso

**Verifica el dominio en Resend y luego prueba generar un link desde el dashboard.**
