-- Forzar eliminación de display_name de workflow_signers
-- Esta columna existe en la base de datos pero no debería

DO $$
BEGIN
    -- Intentar eliminar la columna si existe
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'workflow_signers'
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE public.workflow_signers DROP COLUMN display_name;
        RAISE NOTICE 'Columna display_name eliminada de workflow_signers';
    ELSE
        RAISE NOTICE 'Columna display_name no existe en workflow_signers';
    END IF;
END $$;
