-- Fix log_ecox_event return type to BIGINT (matches ecox_audit_trail.id)

CREATE OR REPLACE FUNCTION public.log_ecox_event(
    p_workflow_id UUID,
    p_signer_id UUID,
    p_event_type TEXT,
    p_source_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_geolocation JSONB DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_document_hash_snapshot TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_event_id BIGINT;
BEGIN
    INSERT INTO public.ecox_audit_trail (
        workflow_id,
        signer_id,
        event_type,
        source_ip,
        user_agent,
        geolocation,
        details,
        document_hash_snapshot
    ) VALUES (
        p_workflow_id,
        p_signer_id,
        p_event_type,
        p_source_ip,
        p_user_agent,
        p_geolocation,
        p_details,
        p_document_hash_snapshot
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
