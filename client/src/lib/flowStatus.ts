export type FlowStatusKey = "draft" | "configured" | "sent" | "signing" | "signed" | "protected";

export const FLOW_STATUS = {
  draft: {
    label: "Borrador",
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  configured: {
    label: "Configurado",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  sent: {
    label: "Enviado",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
  signing: {
    label: "En firma",
    color: "text-purple-700",
    bg: "bg-purple-100",
  },
  signed: {
    label: "Firmado",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
  },
  protected: {
    label: "Protegido",
    color: "text-gray-800",
    bg: "bg-gray-100",
  },
} as const;

type SignerLink = {
  status?: string | null;
};

const normalizeStatus = (value: string | null | undefined) =>
  (value || "").toLowerCase().trim();

export const deriveFlowStatus = (doc: any): { key: FlowStatusKey; detail?: string } => {
  const rawStatus = normalizeStatus(
    doc.lifecycle_status || doc.overall_status || doc.status || doc.workflow_status
  );
  const signerLinks: SignerLink[] = Array.isArray(doc.signer_links) ? doc.signer_links : [];
  const pendingSigners = signerLinks.filter((signer) => {
    const status = normalizeStatus(signer.status);
    return status === "pending" || status === "sent" || status === "queued";
  }).length;

  if (rawStatus === "draft") return { key: "draft" };

  if (
    rawStatus === "protected" ||
    rawStatus === "certified" ||
    rawStatus === "anchored" ||
    doc?.tsa_latest ||
    doc?.has_legal_timestamp
  ) {
    return { key: "protected" };
  }

  if (rawStatus === "needs_witness" || rawStatus === "witness_ready") {
    return { key: "configured" };
  }

  if (rawStatus === "in_signature_flow") {
    if (pendingSigners > 0) {
      return { key: "signing", detail: `Esperando ${pendingSigners} firmante${pendingSigners > 1 ? "s" : ""}` };
    }
    return { key: "sent" };
  }

  if (rawStatus === "signed") return { key: "signed" };

  if (doc.signed_authority || doc.signed_hash) {
    return { key: "signed" };
  }

  if (pendingSigners > 0) {
    return { key: "signing", detail: `Esperando ${pendingSigners} firmante${pendingSigners > 1 ? "s" : ""}` };
  }

  if (signerLinks.length > 0) {
    return { key: "sent" };
  }

  if (doc.witness_current_hash || doc.tsa_latest) {
    return { key: "configured" };
  }

  return { key: "draft" };
};
