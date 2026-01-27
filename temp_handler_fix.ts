// Agregar constante para run_tsa job type
const RUN_TSA_JOB_TYPE = 'run_tsa';

// Agregar handler para run_tsa jobs
async function handleRunTsa(supabase: ReturnType<typeof createClient>, job: ExecutorJob): Promise<void> {
  const payload = job.payload ?? {};
  const documentEntityId = String(payload['document_entity_id'] ?? '');
  const witnessHash = String(payload['witness_hash'] ?? '');

  if (!documentEntityId) {
    throw new Error('document_entity_id missing in run_tsa job payload');
  }

  if (!witnessHash) {
    throw new Error('witness_hash missing in run_tsa job payload');
  }

  console.log(`[fase1-executor] Ejecutando TSA para entity: ${documentEntityId}`);

  // Llamar al worker de TSA
  const tsaResponse = await callFunction('legal-timestamp', {
    hash_hex: witnessHash,
  });

  // Registrar evento de TSA completado
  const tsaEvent = {
    kind: 'tsa.completed',
    at: new Date().toISOString(),
    payload: {
      witness_hash: witnessHash,
      token_b64: tsaResponse.token,
      tsa_url: tsaResponse.tsa_url,
      algorithm: tsaResponse.algorithm,
      standard: tsaResponse.standard,
    }
  };

  await appendEvent(
    supabase,
    documentEntityId,
    tsaEvent,
    'fase1-executor'
  );

  console.log(`[fase1-executor] TSA completado para entity: ${documentEntityId}`);
}

// Agregar el handler al switch de procesamiento
// } else if (job.type === SUBMIT_ANCHOR_BITCOIN_JOB_TYPE) {
//   await handleSubmitAnchorBitcoin(supabase, job);
// } else if (job.type === RUN_TSA_JOB_TYPE) {
//   await handleRunTsa(supase, job);
// } else {