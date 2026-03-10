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
  source_mime?: string | null;
  source_hash?: string | null;
  witness_hash?: string | null;
  signed_hash?: string | null;
  issued_at?: string;
  events?: CanonicalEvent[];
  signer?: CertificateSigner | null;
  workflow_id?: string | null;
  /**
   * evidence_scope declares what this ECO represents:
   * - 'signature_act': snapshot of the signing act at the exact moment it occurred
   * - 'accumulated_document_evidence': snapshot of all evidence accumulated for this document
   *   at the time of generation (includes anchors that arrived after the signing act)
   * - 'document_artifact': final consolidated artifact after all proofs confirmed
   */
  evidence_scope?: 'signature_act' | 'accumulated_document_evidence' | 'document_artifact' | null;
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
  issued_at_source_override?: string | null;
};

const toIso = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const deriveIssuedAt = (
  input: BuildCanonicalEcoInput,
  events: CanonicalEvent[],
): { issuedAt: string; issuedAtSource: string } => {
  const explicit = toIso(input.issued_at);
  if (explicit) {
    return {
      issuedAt: explicit,
      issuedAtSource: input.issued_at_source_override ?? 'input.issued_at',
    };
  }

  const snapshotKind = input.snapshot_kind ?? 'preview';
  const witnessForSnapshot = input.witness_hash_for_snapshot ?? input.witness_hash ?? null;

  if (snapshotKind === 'final_artifact') {
    const artifactFinalized = [...events].reverse().find((event) => event.kind === 'artifact.finalized');
    const artifactAt = toIso(artifactFinalized?.at);
    if (artifactAt) {
      return { issuedAt: artifactAt, issuedAtSource: 'artifact.finalized.at' };
    }
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
      if (tsaAt) {
        return { issuedAt: tsaAt, issuedAtSource: 'tsa.confirmed.at_for_witness' };
      }
    }
    const latestTsa = toIso(findLatest(events, 'tsa.confirmed')?.at);
    if (latestTsa) {
      return { issuedAt: latestTsa, issuedAtSource: 'tsa.confirmed.at_latest' };
    }
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
      if (tsaAt) {
        return { issuedAt: tsaAt, issuedAtSource: 'tsa.confirmed.at_for_witness' };
      }
    }
    const latestTsa = toIso(findLatest(events, 'tsa.confirmed')?.at);
    if (latestTsa) {
      return { issuedAt: latestTsa, issuedAtSource: 'tsa.confirmed.at_latest' };
    }
    const protectionRequested = toIso(findLatest(events, 'document.protected.requested')?.at);
    if (protectionRequested) {
      return { issuedAt: protectionRequested, issuedAtSource: 'document.protected.requested.at' };
    }
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
    // status reflects whether a verifiable on-chain reference exists.
    // 'confirmed': anchor recorded and txid/ref available for independent verification.
    // 'confirmed_no_ref': anchor event received but txid missing — cannot be independently verified.
    // A forensic reader should treat 'confirmed_no_ref' as weaker evidence.
    const status = (txHash != null && String(txHash).length > 0) ? 'confirmed' : 'confirmed_no_ref';
    return {
      kind: network,
      status,
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
  const { issuedAt, issuedAtSource } = deriveIssuedAt(input, events);
  const signer = input.signer ?? null;
  const hasSigner = Boolean(signer?.id);
  const identity = input.identity ?? {};
  const fields = input.fields ?? {};
  const signatureCapture = input.signature_capture ?? {};

  // If no explicit signer but signature.completed events exist, this is a signing document.
  const hasSigningEvents = events.some((e) => e.kind === 'signature.completed');
  const profile = (hasSigner || hasSigningEvents) ? 'signing' : 'protection';

  // evidence_scope: auto-derive when not explicitly passed.
  // signature_act → passed explicitly by apply-signer-signature (immediate ECO).
  // accumulated_document_evidence → auto-derived when signing events exist (get-eco, generate-signature-evidence without explicit scope).
  const evidenceScope = input.evidence_scope ??
    (hasSigningEvents ? 'accumulated_document_evidence' : null);

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

  // rekor.confirmed: emitted by build-artifact / finalize-document (protection + full workflow).
  // signer.rekor.confirmed: emitted by apply-signer-signature per signer act.
  // Both count as Rekor confirmation for the proofs array.
  const rekorEvent = findLatest(events, 'rekor.confirmed') ?? findLatest(events, 'signer.rekor.confirmed');
  const rekorProof = rekorEvent
    ? {
        kind: 'rekor',
        status: 'confirmed',
        provider: 'rekor.sigstore.dev',
        ref: rekorEvent.payload?.['ref'] ?? null,
        attempted_at: rekorEvent.at ?? null,
        statement_hash: rekorEvent.payload?.['statement_hash'] ?? null,
        statement_type: rekorEvent.payload?.['statement_type'] ?? null,
        public_key_b64: rekorEvent.payload?.['public_key_b64'] ?? null,
        log_index: rekorEvent.payload?.['log_index'] ?? null,
        witness_hash: rekorEvent.payload?.['witness_hash'] ?? null,
      }
    : null;

  const proofs = [tsaProof, rekorProof, polygonProof, bitcoinProof].filter(Boolean);

  const trustChecks: string[] = [
    'Document integrity preserved',
    profile === 'signing' ? 'Signature recorded' : 'Protection recorded',
    ...(tsaProof ? ['RFC 3161 timestamp (TSA) confirmed'] : []),
    ...(rekorProof ? ['Rekor transparency log confirmed'] : []),
    ...(polygonProof ? ['Polygon blockchain anchor confirmed'] : []),
    ...(bitcoinProof ? ['Bitcoin blockchain anchor confirmed'] : []),
    'Evidence is self-contained',
  ];

  // Per-signer workflow evidence: collect signature.completed + signer.rekor.confirmed
  // and join by step_index (primary) or witness_hash (fallback).
  const signerCompletedEvents = events.filter((e) => e.kind === 'signature.completed');
  const signerRekorEvents = events.filter((e) => e.kind === 'signer.rekor.confirmed');
  const signersEvidence = signerCompletedEvents.length > 0
    ? signerCompletedEvents.map((e) => {
        const eAny = e as any;
        const stepIndex = eAny.signer?.order ?? e.payload?.['step_index'] ?? null;
        const witnessHash = eAny.evidence?.witness_pdf_hash ?? e.payload?.['witness_hash'] ?? null;
        const rekorForSigner = signerRekorEvents.find((r) =>
          (stepIndex !== null && r.payload?.['step_index'] === stepIndex) ||
          (witnessHash && r.payload?.['witness_hash'] === witnessHash)
        );
        return {
          step_index: stepIndex,
          signer_id: eAny.signer?.id ?? null,
          signer_email: eAny.signer?.email ?? null,
          signer_name: eAny.signer?.name ?? null,
          witness_hash: witnessHash,
          identity_level: eAny.evidence?.identity_level ?? null,
          signed_at: e.at ?? null,
          rekor: rekorForSigner
            ? {
                ref: rekorForSigner.payload?.['ref'] ?? null,
                log_index: rekorForSigner.payload?.['log_index'] ?? null,
                integrated_time: rekorForSigner.payload?.['integrated_time'] ?? null,
                witness_hash: rekorForSigner.payload?.['witness_hash'] ?? null,
              }
            : null,
        };
      }).sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
    : null;

  // NDA acceptances: collect all nda.accepted events across all flows
  // (share link, invite, workflow signer). Privacy-preserving: only ip_hash, not raw IP.
  const ndaAcceptedEvents = events.filter((e) => e.kind === 'nda.accepted');
  const ndaEvidence = ndaAcceptedEvents.length > 0
    ? ndaAcceptedEvents.map((e) => {
        const eAny = e as any;
        const nda = eAny.nda ?? {};
        const context = eAny.context ?? {};
        return {
          accepted_at: e.at ?? null,
          recipient_email: nda.recipient_email ?? null,
          nda_hash: nda.nda_hash ?? null,
          acceptance_method: nda.acceptance_method ?? null,
          ip_hash: context.ip_hash ?? null,
          browser: context.browser ?? null,
          geo: context.geo ?? null,
          // Source context (one of share_id, invite_id, or workflow_id+signer_id)
          share_id: nda.share_id ?? null,
          invite_id: nda.invite_id ?? null,
          workflow_id: nda.workflow_id ?? null,
          signer_id: nda.signer_id ?? null,
          nda_source: nda.nda_source ?? null,
          template_id: nda.template_id ?? null,
          template_version: nda.template_version ?? null,
        };
      })
    : null;

  const sameHash = input.source_hash != null &&
    input.witness_hash != null &&
    input.source_hash === input.witness_hash;

  // artifact_stage: 'intermediate' if any required anchor was submitted but not yet confirmed.
  // Covers both Polygon and Bitcoin — neither can be missing if they were requested.
  const hasAnchorPending = (network: string): boolean => {
    if (network === 'polygon' && polygonProof) return false;
    if (network === 'bitcoin' && bitcoinProof) return false;
    return events.some((e) => {
      const anchorData = e?.anchor ?? e?.payload;
      return e?.kind === 'anchor.submitted' && anchorData?.['network'] === network;
    });
  };
  const artifactStage: 'final' | 'intermediate' =
    (hasAnchorPending('bitcoin') || hasAnchorPending('polygon')) ? 'intermediate' : 'final';

  // reader_intro: human-readable narrative for non-technical readers.
  const proofLabels = [
    tsaProof ? 'RFC 3161 timestamp (TSA)' : null,
    rekorProof ? 'Rekor transparency log' : null,
    polygonProof ? 'Polygon blockchain anchor' : null,
    bitcoinProof ? 'Bitcoin blockchain anchor' : null,
  ].filter((l): l is string => l !== null);
  const proofSentence = proofLabels.length > 0
    ? `Confirmed evidence: ${proofLabels.join(', ')}.`
    : '';
  const stageSentence = artifactStage === 'intermediate'
    ? ' Bitcoin anchoring is in progress and will be confirmed within 4–24 hours.'
    : '';
  const docName = input.document_name ? `"${input.document_name}"` : 'this document';
  const issuedDate = issuedAt.split('T')[0];
  const readerIntro = profile === 'signing'
    ? `This ECO certifies that ${docName} was signed and recorded by EcoSign on ${issuedDate}. The signature and document integrity can be independently verified. ${proofSentence}${stageSentence}`.trim()
    : `This ECO certifies that ${docName} was protected by EcoSign on ${issuedDate}. The document's integrity can be independently verified at any time. ${proofSentence}${stageSentence}`.trim();

  return {
    format: 'eco',
    version: 'eco.v2',
    schema_version: 1,
    profile,
    artifact_stage: artifactStage,
    evidence_scope: evidenceScope,
    issued_at: issuedAt,
    reader_intro: readerIntro,
    evidence_declaration: {
      type: profile === 'signing' ? 'digital_signature_evidence' : 'digital_protection_evidence',
      document_name: input.document_name ?? null,
      ...(hasSigner ? {
        signer_email: signer?.email ?? null,
        signer_name: signer?.name ?? null,
        signing_step: signer?.step_index ?? null,
        total_steps: signer?.step_total ?? null,
        signed_at: issuedAt,
        identity_assurance_level: identity.canonical_level ?? null,
      } : {}),
    },
    trust_summary: {
      checks: trustChecks,
    },
    document: {
      id: input.document_entity_id,
      name: input.document_name ?? null,
      mime: input.source_mime ?? null,
      // witness_mime: present when source was converted to PDF witness (e.g. TXT → PDF).
      ...(input.source_mime && input.source_mime !== 'application/pdf'
        ? { witness_mime: 'application/pdf' }
        : {}),
      source_hash: input.source_hash ?? null,
      witness_hash: input.witness_hash ?? null,
      ...(sameHash ? { witness_relationship: 'same_as_source' } : {}),
    },
    ...(hasSigner ? {
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
    } : {}),
    proofs,
    ...(signersEvidence !== null ? { signers_evidence: signersEvidence } : {}),
    ...(ndaEvidence !== null ? { nda_evidence: ndaEvidence } : {}),
    system: {
      schema: 'eco.canonical.certificate.v1',
      workflow_id: input.workflow_id ?? null,
      source: 'canonical_builder',
      issued_at_source: issuedAtSource,
      signed_hash: input.signed_hash ?? null,
    },
  };
}
