# ✅ Sistema de Links y Emails - ARREGLADO

## Problemas Identificados y Resueltos

### 1. ❌ Frontend enviaba datos incorrectos
**Antes:** Enviaba objeto `recipient` completo
**Ahora:** Envía solo `recipient_email` como string

### 2. ❌ Dominio no verificado en Resend  
**Antes:** Intentaba usar `ecosign.app` (no verificado)
**Ahora:** Usa `verifysign.pro` (verificado ✅)

### 3. ❌ URL incorrecta en los links
**Antes:** `https://app.verifysign.pro`
**Ahora:** `https://ecosign.app`

## Cambios Realizados

1. **LinkGenerator.jsx** - Corregido el payload enviado a la Edge Function
2. **email.ts** - Actualizado dominio a verifysign.pro (verificado)
3. **generate-link/index.ts** - URL actualizada a ecosign.app
4. **Función desplegada** - Cambios en producción

## Cómo Probar

1. Ve al Dashboard de EcoSign
2. Selecciona un documento
3. Click en "Generar Link NDA"
4. Completa el formulario con un email válido
5. Click en "Generar Enlace"

**Resultado esperado:**
- ✅ Link generado exitosamente
- ✅ Email enviado al destinatario desde `no-reply@verifysign.pro`
- ✅ El link apunta a `https://ecosign.app/nda/[token]`

## Para el Futuro: Migrar a ecosign.app

Cuando quieras que los emails vengan de `@ecosign.app`:

1. Ve a https://resend.com/domains
2. Agrega el dominio `ecosign.app`
3. Configura los registros DNS (TXT, CNAME) que te indique Resend
4. Espera la verificación (5 min - 24 horas)
5. Actualiza `supabase/functions/_shared/email.ts`:
   ```typescript
   from: 'EcoSign <no-reply@ecosign.app>'
   ```
6. Redespliega: `npx supabase functions deploy generate-link`

## Debugging

Si algo falla, revisa los logs:
```bash
npx supabase functions logs generate-link
```

O verifica en: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/functions
