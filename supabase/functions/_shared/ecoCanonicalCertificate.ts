type CanonicalEvent = {
  kind?: string;
  at?: string;
  witness_hash?: string;
  tsa?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  anchor?: Record<string, unknown>;
};

type CertificateSigner = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  step_index?: number | null;
  step_total?: number | null;
};

type BuildCanonicalEcoInput = {
  document_entity_id: string;
  document_name?: string | null;
  source_hash?: string | null;
  witness_hash?: string | null;
  signed_hash?: string | null;
  issued_at?: string;
  events?: CanonicalEvent[];
  signer?: CertificateSigner | null;
  workflow_id?: string | null;
  identity?: {
    canonical_level?: string | null;
    ial_reference?: string | null;
    operational_level?: string | null;
    owner_user_id?: string | null;
    owner_email?: string | null;
    email_verified?: boolean | null;
  } | null;
  fields?: {
    schema_hash?: string | null;
    schema_version?: number | null;
    signer_state_hash?: string | null;
    signer_state_version?: number | null;
  } | null;
  signature_capture?: {
    present?: boolean | null;
    stored?: boolean | null;
    consent?: boolean | null;
    capture_kind?: string | null;
    store_encrypted_signature_opt_in?: boolean | null;
    store_signature_vectors_opt_in?: boolean | null;
    render_hash?: string | null;
    strokes_hash?: string | null;
    ciphertext_hash?: string | null;
  } | null;
  snapshot_kind?: 'signer_snapshot' | 'final_artifact' | 'protected_snapshot' | 'preview';
  witness_hash_for_snapshot?: string | null;
};

const toIso = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const deriveIssuedAt = (input: BuildCanonicalEcoInput, events: CanonicalEvent[]): string => {
  const explicit = toIso(input.issued_at);
  if (explicit) return explicit;

  const snapshotKind = input.snapshot_kind ?? 'preview';
  const witnessForSnapshot = input.witness_hash_for_snapshot ?? input.witness_hash ?? null;

  if (snapshotKind === 'final_artifact') {
    const artifactFinalized = [...events].reverse().find((event) => event.kind === 'artifact.finalized');
    const artifactAt = toIso(artifactFinalized?.at);
    if (artifactAt) return artifactAt;
    throw new Error('issued_at_required:final_artifact_requires_artifact.finalized.at');
  }

  if (snapshotKind === 'signer_snapshot') {
    if (witnessForSnapshot) {
      const tsaForWitness = [...events].reverse().find((event) =>
        event.kind === 'tsa.confirmed' &&
        ((event.witness_hash && event.witness_hash === witnessForSnapshot) ||
          event.payload?.['witness_hash'] === witnessForSnapshot)
      );
      const tsaAt = toIso(tsaForWitness?.at);
      if (tsaAt) return tsaAt;
    }
    const latestTsa = toIso(findLatest(events, 'tsa.confirmed')?.at);
    if (latestTsa) return latestTsa;
    throw new Error('issued_at_required:signer_snapshot_requires_signed_at_or_tsa.confirmed.at');
  }

  if (snapshotKind === 'protected_snapshot' || snapshotKind === 'preview') {
    if (witnessForSnapshot) {
      const tsaForWitness = [...events].reverse().find((event) =>
        event.kind === 'tsa.confirmed' &&
        ((event.witness_hash && event.witness_hash === witnessForSnapshot) ||
          event.payload?.['witness_hash'] === witnessForSnapshot)
      );
      const tsaAt = toIso(tsaForWitness?.at);
      if (tsaAt) return tsaAt;
    }
    const latestTsa = toIso(findLatest(events, 'tsa.confirmed')?.at);
    if (latestTsa) return latestTsa;
    const protectionRequested = toIso(findLatest(events, 'document.protected.requested')?.at);
    if (protectionRequested) return protectionRequested;
    throw new Error('issued_at_required:protected_snapshot_requires_tsa_or_protection_request');
  }

  throw new Error('issued_at_required:unsupported_snapshot_kind');
};

const findLatest = (events: CanonicalEvent[], kind: string): CanonicalEvent | null => {
  for (let idx = events.length - 1; idx >= 0; idx -= 1) {
    if (events[idx]?.kind === kind) return events[idx];
  }
  return null;
};

const findAnchorProof = (events: CanonicalEvent[], network: 'polygon' | 'bitcoin') => {
  for (let idx = events.length - 1; idx >= 0; idx -= 1) {
    const event = events[idx];
    const anchorData = event?.anchor ?? event?.payload;
    const eventNetwork = anchorData?.['network'];
    if (eventNetwork !== network) continue;
    if (event?.kind !== 'anchor.confirmed' && event?.kind !== 'anchor') continue;

    const txHash = anchorData?.['txid'] ?? anchorData?.['tx_hash'] ?? anchorData?.['transaction_hash'];
    return {
      kind: network,
      status: 'confirmed',
      provider: network,
      ref: txHash ?? null,
      attempted_at: event?.at ?? null,
      witness_hash:
        anchorData?.['witness_hash'] ??
        (typeof event?.witness_hash === 'string' ? event.witness_hash : null) ??
        null,
    };
  }
  return null;
};

export function buildCanonicalEcoCertificate(input: BuildCanonicalEcoInput) {
  const events = Array.isArray(input.events) ? input.events : [];
  const issuedAt = deriveIssuedAt(input, events);
  const signer = input.signer ?? null;
  const hasSigner = Boolean(signer?.id);
  const identity = input.identity ?? {};
  const fields = input.fields ?? {};
  const signatureCapture = input.signature_capture ?? {};

  const tsaEvent = findLatest(events, 'tsa.confirmed');
  const tsaProof = tsaEvent
    ? {
        kind: 'tsa',
        status: 'confirmed',
        provider: 'https://freetsa.org/tsr',
        ref: input.witness_hash ?? tsaEvent?.witness_hash ?? null,
        attempted_at: tsaEvent.at ?? null,
        token_b64: typeof tsaEvent.tsa?.['token_b64'] === 'string' ? tsaEvent.tsa?.['token_b64'] : null,
        witness_hash: input.witness_hash ?? tsaEvent?.witness_hash ?? null,
      }
    : null;

  const polygonProof = findAnchorProof(events, 'polygon');
  const bitcoinProof = findAnchorProof(events, 'bitcoin');
  const proofs = [tsaProof, polygonProof, bitcoinProof].filter(Boolean);

  return {
    format: 'eco',
    format_version: '2.0',
    version: 'eco.v2',
    issued_at: issuedAt,
    evidence_declaration: {
      type: hasSigner ? 'digital_signature_evidence' : 'digital_protection_evidence',
      document_name: input.document_name ?? null,
      signer_email: signer?.email ?? null,
      signer_name: signer?.name ?? null,
      signing_step: signer?.step_index ?? null,
      total_steps: signer?.step_total ?? null,
      signed_at: issuedAt,
      identity_assurance_level: identity.canonical_level ?? null,
      summary: [
        'Document integrity preserved',
        hasSigner ? 'Signature recorded' : 'Protection recorded',
        'Evidence is self-contained',
        'Independent verification possible',
      ],
    },
    trust_summary: {
      checks: [
        'Document integrity preserved',
        hasSigner ? 'Signature recorded' : 'Protection recorded',
        'Timestamped (TSA) when available',
        'Evidence is self-contained',
      ],
    },
    document: {
      id: input.document_entity_id,
      name: input.document_name ?? null,
      mime: 'application/pdf',
      source_hash: input.source_hash ?? null,
      witness_hash: input.witness_hash ?? null,
    },
    signing_act: {
      signer_id: signer?.id ?? null,
      signer_email: signer?.email ?? null,
      signer_display_name: signer?.name ?? null,
      step_index: signer?.step_index ?? null,
      step_total: signer?.step_total ?? null,
      signed_at: issuedAt,
    },
    signer: {
      id: signer?.id ?? null,
      email: signer?.email ?? null,
      name: signer?.name ?? null,
    },
    identity: {
      canonical_level: identity.canonical_level ?? null,
      ial_reference: identity.ial_reference ?? null,
      operational_level: identity.operational_level ?? null,
      level: identity.canonical_level ?? null,
      owner_user_id: identity.owner_user_id ?? null,
      owner_email: identity.owner_email ?? null,
      email_verified: identity.email_verified ?? null,
      auth_context: null,
      identity_hash: null,
    },
    fields: {
      schema_hash: fields.schema_hash ?? null,
      schema_version: fields.schema_version ?? 1,
      signer_state_hash: fields.signer_state_hash ?? null,
      signer_state_version: fields.signer_state_version ?? 1,
    },
    signature_capture: {
      present: signatureCapture.present ?? false,
      stored: signatureCapture.stored ?? false,
      consent: signatureCapture.consent ?? true,
      capture_kind: signatureCapture.capture_kind ?? null,
      store_encrypted_signature_opt_in: signatureCapture.store_encrypted_signature_opt_in ?? false,
      store_signature_vectors_opt_in: signatureCapture.store_signature_vectors_opt_in ?? false,
      render_hash: signatureCapture.render_hash ?? null,
      strokes_hash: signatureCapture.strokes_hash ?? null,
      ciphertext_hash: signatureCapture.ciphertext_hash ?? null,
    },
    proofs,
    system: {
      schema: 'eco.canonical.certificate.v1',
      workflow_id: input.workflow_id ?? null,
      source: 'canonical_builder',
      signed_hash: input.signed_hash ?? null,
    },
  };
}
