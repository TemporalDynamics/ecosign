-- Add signature_data column to store signature image and metadata
ALTER TABLE public.workflow_signers
ADD COLUMN signature_data JSONB NULL;

-- Add a comment to the column for clarity
COMMENT ON COLUMN public.workflow_signers.signature_data IS 'Stores the signature data captured from the frontend, including image (base64 or URL) and coordinates, for the async worker to use.';
