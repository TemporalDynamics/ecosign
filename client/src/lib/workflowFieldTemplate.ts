import type { SignatureField } from '../types/signature-fields';

export type LogicalFieldKind = 'signature' | 'name' | 'id_number' | 'date' | 'text';

export type RepetitionRule =
  | { kind: 'once' }
  | { kind: 'all_pages' }
  | { kind: 'pages'; pages: number[] };

export type SignerRef = {
  email: string;
  signingOrder: number;
};

export type WizardTemplate = {
  fields: Array<
    | { kind: 'signature' }
    | { kind: 'name'; required: boolean }
    | { kind: 'id_number'; required: boolean }
    | { kind: 'date'; required: boolean }
    | { kind: 'text'; required: boolean; label?: string; placeholder?: string }
  >;
  repetitionRule: RepetitionRule;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function uniqNumbers(values: number[]) {
  return Array.from(new Set(values)).filter((n) => Number.isFinite(n) && n >= 1).sort((a, b) => a - b);
}

function createId() {
  return crypto.randomUUID();
}

function resolvePages(repetitionRule: RepetitionRule, totalPages: number | null): number[] {
  if (repetitionRule.kind === 'once') return [1];
  if (repetitionRule.kind === 'pages') return uniqNumbers(repetitionRule.pages);

  // all_pages
  if (!totalPages || totalPages < 1) return [1];
  return Array.from({ length: totalPages }, (_, idx) => idx + 1);
}

export function generateWorkflowFieldsFromWizard(
  signers: SignerRef[],
  template: WizardTemplate,
  options: {
    virtualWidth: number;
    virtualHeight: number;
    totalPages: number | null;
  }
): SignatureField[] {
  const { virtualWidth, virtualHeight, totalPages } = options;
  const fields: SignatureField[] = [];

  const sortedSigners = [...signers]
    .map((s) => ({ ...s, email: normalizeEmail(s.email) }))
    .filter((s) => Boolean(s.email))
    .sort((a, b) => a.signingOrder - b.signingOrder);

  const repetitionRule = template.repetitionRule;
  const pagesForSignature = resolvePages(repetitionRule, totalPages);

  // Layout: place each signer block in a simple grid to avoid overlaps.
  // P1: deterministic, no drag required.
  const gap = 10;

  const signatureSize = { w: 260, h: 80 };
  const textSize = { w: 220, h: 36 };
  const dateSize = { w: 160, h: 36 };

  const extras = template.fields.filter((f) => f.kind !== 'signature');
  const extrasCount = extras.length;
  const extrasHeight = extrasCount > 0 ? extrasCount * (textSize.h + gap) : 0;
  const blockHeight = signatureSize.h + (extrasCount > 0 ? gap + extrasHeight : 0);

  const paddingX = 24;
  const paddingY = 64;
  const colGap = 56;
  const rowGap = 28;

  const usableHeight = Math.max(1, virtualHeight - paddingY * 2);
  const rowsPerColumn = Math.max(1, Math.floor((usableHeight + rowGap) / (blockHeight + rowGap)));

  for (let signerIndex = 0; signerIndex < sortedSigners.length; signerIndex += 1) {
    const signer = sortedSigners[signerIndex];
    const batchId = createId();
    const assignedTo = signer.email;

    const colIndex = Math.floor(signerIndex / rowsPerColumn);
    const rowIndex = signerIndex % rowsPerColumn;

    const baseX = paddingX + colIndex * (signatureSize.w + colGap);
    const baseY = paddingY + rowIndex * (blockHeight + rowGap);

    const resolvedX = Math.min(baseX, virtualWidth - signatureSize.w - paddingX);
    const resolvedY = Math.min(baseY, virtualHeight - signatureSize.h - paddingY);

    // Ensure signature logical field is always included.
    for (const page of pagesForSignature) {
      fields.push({
        id: createId(),
        batchId,
        assignedTo,
        type: 'signature',
        page,
        x: resolvedX,
        y: resolvedY,
        width: signatureSize.w,
        height: signatureSize.h,
        required: true,
        metadata: {
          label: 'Firma',
          logical_field_kind: 'signature',
          logical_field_id: 'signature',
          repetition_rule: repetitionRule
        }
      });
    }

    // Extras are anchored once (P1 default): use page 1.
    let cursorY = Math.min(resolvedY + signatureSize.h + gap, virtualHeight - paddingY - textSize.h);
    for (const extra of extras) {
      if (extra.kind === 'date') {
        fields.push({
          id: createId(),
          batchId,
          assignedTo,
          type: 'date',
          page: 1,
          x: Math.min(resolvedX, virtualWidth - dateSize.w - paddingX),
          y: cursorY,
          width: dateSize.w,
          height: dateSize.h,
          required: extra.required,
          metadata: {
            label: 'Fecha',
            logical_field_kind: 'date',
            logical_field_id: 'date',
            repetition_rule: { kind: 'once' }
          }
        });
        cursorY = Math.min(cursorY + dateSize.h + gap, virtualHeight - paddingY - textSize.h);
        continue;
      }

      if (extra.kind === 'name') {
        fields.push({
          id: createId(),
          batchId,
          assignedTo,
          type: 'text',
          page: 1,
          x: Math.min(resolvedX, virtualWidth - textSize.w - paddingX),
          y: cursorY,
          width: textSize.w,
          height: textSize.h,
          required: extra.required,
          metadata: {
            label: 'Nombre',
            placeholder: 'Nombre y apellido',
            logical_field_kind: 'name',
            logical_field_id: 'name',
            repetition_rule: { kind: 'once' }
          }
        });
        cursorY = Math.min(cursorY + textSize.h + gap, virtualHeight - paddingY - textSize.h);
        continue;
      }

      if (extra.kind === 'id_number') {
        fields.push({
          id: createId(),
          batchId,
          assignedTo,
          type: 'text',
          page: 1,
          x: Math.min(resolvedX, virtualWidth - textSize.w - paddingX),
          y: cursorY,
          width: textSize.w,
          height: textSize.h,
          required: extra.required,
          metadata: {
            label: 'Documento',
            placeholder: 'DNI / ID',
            logical_field_kind: 'id_number',
            logical_field_id: 'id_number',
            repetition_rule: { kind: 'once' }
          }
        });
        cursorY = Math.min(cursorY + textSize.h + gap, virtualHeight - paddingY - textSize.h);
        continue;
      }

      if (extra.kind === 'text') {
        fields.push({
          id: createId(),
          batchId,
          assignedTo,
          type: 'text',
          page: 1,
          x: Math.min(resolvedX, virtualWidth - textSize.w - paddingX),
          y: cursorY,
          width: textSize.w,
          height: textSize.h,
          required: extra.required,
          metadata: {
            label: extra.label || 'Texto',
            placeholder: extra.placeholder,
            logical_field_kind: 'text',
            logical_field_id: 'text',
            repetition_rule: { kind: 'once' }
          }
        });
        cursorY = Math.min(cursorY + textSize.h + gap, virtualHeight - paddingY - textSize.h);
      }
    }
  }

  return fields;
}
