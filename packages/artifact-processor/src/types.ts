export type SignatureInput = {
  signer: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AnchorInput = {
  network: 'polygon' | 'bitcoin';
  txid?: string;
  confirmed_at?: string;
};

export type ArtifactMetadata = {
  document_entity_id: string;
  created_at: string;
  artifact_version: 'v1';
};

export type ArtifactInput = {
  pdf_base: Uint8Array;
  signatures: SignatureInput[];
  tsa_token?: Uint8Array | null;
  anchors: AnchorInput[];
  metadata: ArtifactMetadata;
};

export type ArtifactOutput = {
  artifact: Uint8Array;
  hash: string;
  mime: 'application/pdf';
  size_bytes: number;
  artifact_version: 'v1';
};
