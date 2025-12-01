-- Crear función para insertar signers evitando el problema de display_name
CREATE OR REPLACE FUNCTION insert_workflow_signer(
  p_workflow_id UUID,
  p_signing_order INTEGER,
  p_email TEXT,
  p_name TEXT,
  p_require_login BOOLEAN,
  p_require_nda BOOLEAN,
  p_quick_access BOOLEAN,
  p_status TEXT,
  p_access_token_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signer_id UUID;
BEGIN
  INSERT INTO workflow_signers (
    workflow_id,
    signing_order,
    email,
    name,
    require_login,
    require_nda,
    quick_access,
    status,
    access_token_hash
  ) VALUES (
    p_workflow_id,
    p_signing_order,
    p_email,
    p_name,
    p_require_login,
    p_require_nda,
    p_quick_access,
    p_status,
    p_access_token_hash
  )
  RETURNING id INTO v_signer_id;

  RETURN v_signer_id;
END;
$$;

COMMENT ON FUNCTION insert_workflow_signer IS
  'Inserta un workflow signer evitando problemas con columnas fantasma como display_name';
