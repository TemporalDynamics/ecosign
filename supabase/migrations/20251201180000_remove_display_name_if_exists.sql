-- Eliminar columna display_name si existe en workflow_signers
-- Esta columna no debería existir según el esquema pero está causando errores

ALTER TABLE public.workflow_signers
DROP COLUMN IF EXISTS display_name;

-- Verificar que la tabla solo tenga las columnas correctas
COMMENT ON TABLE public.workflow_signers IS
  'Firmantes de workflows - Schema verificado sin display_name';
