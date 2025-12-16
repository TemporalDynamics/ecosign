# 🔧 Setup Supabase Local para Tests

## Problema

Al ejecutar `supabase start`, las migraciones fallan porque:
1. La migración `20251125120000_fix_security_performance_issues.sql` intenta alterar funciones que no existen
2. Hay referencias a tabla `integration_requests` que no existe aún

## Solución

### Opción A: Usar el script de fix (Recomendado)

1. **Iniciar Supabase ignorando errores:**
   ```bash
   supabase start --ignore-health-check
   ```

2. **Ejecutar el fix manual:**
   ```bash
   supabase db reset
   ```
   
   Si falla, continuar con Opción B.

### Opción B: Aplicar fix SQL manual

1. **Comentar temporalmente la migración problemática:**
   
   Renombra el archivo para que no se ejecute:
   ```bash
   cd supabase/migrations
   mv 20251125120000_fix_security_performance_issues.sql 20251125120000_fix_security_performance_issues.sql.disabled
   ```

2. **Iniciar Supabase:**
   ```bash
   supabase start
   ```

3. **Aplicar el fix SQL:**
   ```bash
   supabase db execute -f FIX_SUPABASE_MIGRATIONS.sql
   ```

4. **Verificar que funciona:**
   ```bash
   supabase status
   ```

### Opción C: Fix definitivo (para commit)

**Reemplazar la migración completa:**

Edita `supabase/migrations/20251125120000_fix_security_performance_issues.sql` y reemplaza TODO el contenido con esto:

```sql
-- =================================================================
-- MIGRATION: Fix Security & Performance Issues (2025-11-25)
-- =================================================================
-- This migration addresses issues reported by the Supabase dashboard.
-- NOW WITH DEFENSIVE CHECKS: Only alters existing functions/tables
-- =================================================================

-- =================================================================
-- 1. SECURITY FIXES: Set secure search_path for trigger functions
-- =================================================================

DO $$
BEGIN
  -- Only fix functions that exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_anchors_updated_at') THEN
    ALTER FUNCTION public.update_anchors_updated_at() SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_invites_updated_at') THEN
    ALTER FUNCTION public.update_invites_updated_at() SET search_path = public;
  END IF;
END $$;

-- =================================================================
-- 2. PERFORMANCE FIXES: Optimize RLS policies
-- =================================================================

-- Policy on: public.recipients (defensive)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'recipients' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Recipients can view their own record" ON public.recipients;
    CREATE POLICY "Recipients can view their own record"
      ON public.recipients FOR SELECT
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'email') = email);
  END IF;
END $$;

-- Policy on: public.events (defensive)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'events' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can view events for their documents" ON public.events;
    CREATE POLICY "Users can view events for their documents"
      ON public.events FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.user_documents
          WHERE user_documents.id = events.document_id
            AND user_documents.user_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================
```

**Después:**
```bash
supabase db reset
```

---

## Verificación

Después de cualquier opción, verifica:

```bash
# Estado de servicios
supabase status

# Ejecutar tests
npm run test

# Solo integration tests
npm run test tests/integration/

# Solo security tests  
npm run test tests/security/
```

**Resultado esperado:**
- ✅ 64/64 tests passing (100%)
- ✅ Supabase local corriendo en http://localhost:54321

---

## Si sigues teniendo problemas

1. **Limpiar todo y empezar de cero:**
   ```bash
   supabase stop
   supabase db reset
   rm -rf supabase/.branches supabase/.temp
   supabase start
   ```

2. **Ver logs detallados:**
   ```bash
   supabase start --debug
   ```

3. **Verificar qué tablas existen:**
   ```bash
   supabase db execute "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
   ```

4. **Verificar qué funciones existen:**
   ```bash
   supabase db execute "SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname;"
   ```

---

## Notas

- El archivo `FIX_SUPABASE_MIGRATIONS.sql` es **defensivo**: verifica existencia antes de alterar
- La tabla `integration_requests` probablemente es una feature futura que aún no está implementada
- Si ves "Table/Function does not exist, skipping" en los logs, es **normal** y esperado
- Los tests de integración/security **solo pasan** con Supabase local corriendo

---

**Última actualización:** 2025-12-16  
**Autor:** Quick Wins Sprint 1 - Testing
