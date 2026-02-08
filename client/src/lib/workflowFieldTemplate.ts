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
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `wf-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
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
    targetPage?: number;
  }
): SignatureField[] {
  const { virtualWidth, virtualHeight, totalPages, targetPage } = options;
  const fields: SignatureField[] = [];

  const sortedSigners = [...signers]
    .map((s) => ({ ...s, email: normalizeEmail(s.email) }))
    .filter((s) => Boolean(s.email))
    .sort((a, b) => a.signingOrder - b.signingOrder);

  const repetitionRule = template.repetitionRule;
  const pagesForSignature = targetPage ? [targetPage] : resolvePages(repetitionRule, totalPages);
  const extrasPage = targetPage ?? 1;

  // Layout: horizontal rows, no overlap.
  // P1: deterministic, no drag required.
  const gap = 10;

  const signatureSize = { w: 260, h: 80 };
  const textSize = { w: 220, h: 36 };
  const dateSize = { w: 160, h: 36 };

  const extras = template.fields.filter((f) => f.kind !== 'signature');
  const extrasCount = extras.length;
  const extrasHeight = extrasCount > 0 ? extrasCount * (textSize.h + gap) : 0;
  const blockHeight = signatureSize.h + (extrasCount > 0 ? gap + extrasHeight : 0);
  const blockWidth = Math.max(signatureSize.w, textSize.w, dateSize.w);

  const paddingX = 24;
  const paddingY = 64;
  const colGap = 40;
  const rowGap = 28;

  const usableWidth = Math.max(1, virtualWidth - paddingX * 2);
  const cols = Math.max(
    1,
    Math.min(sortedSigners.length, Math.floor((usableWidth + colGap) / (blockWidth + colGap)))
  );
  const startY = virtualHeight - paddingY - blockHeight;

  const placeBlock = (index: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = paddingX + col * (blockWidth + colGap);
    const y = startY - row * (blockHeight + rowGap);
    return { x, y };
  };

  for (let signerIndex = 0; signerIndex < sortedSigners.length; signerIndex += 1) {
    const signer = sortedSigners[signerIndex];
    const batchId = createId();
    const assignedTo = signer.email;

    const block = placeBlock(signerIndex);
    const baseX = Math.min(block.x, virtualWidth - blockWidth - paddingX);
    const baseY = Math.max(paddingY, Math.min(block.y, virtualHeight - blockHeight - paddingY));

    // Ensure signature logical field is always included.
    for (const page of pagesForSignature) {
      fields.push({
        id: createId(),
        batchId,
        assignedTo,
        type: 'signature',
        page,
        x: baseX,
        y: baseY,
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

    // Extras stacked vertically under signature.
    let cursorExtraY = baseY + signatureSize.h + gap;
    for (const extra of extras) {
      if (extra.kind === 'date') {
        fields.push({
          id: createId(),
          batchId,
          assignedTo,
          type: 'date',
          page: extrasPage,
          x: baseX,
          y: cursorExtraY,
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
        cursorExtraY = cursorExtraY + dateSize.h + gap;
        continue;
      }

      if (extra.kind === 'name') {
        fields.push({
          id: createId(),
          batchId,
          assignedTo,
          type: 'text',
          page: extrasPage,
          x: baseX,
          y: cursorExtraY,
          width: textSize.w,
          height: textSize.h,
          required: extra.required,
          metadata: {
            label: 'Nombre completo',
            placeholder: 'Nombre y apellido',
            logical_field_kind: 'name',
            logical_field_id: 'name',
            repetition_rule: { kind: 'once' }
          }
        });
        cursorExtraY = cursorExtraY + textSize.h + gap;
        continue;
      }

      if (extra.kind === 'id_number') {
        fields.push({
          id: createId(),
          batchId,
          assignedTo,
          type: 'text',
          page: extrasPage,
          x: baseX,
          y: cursorExtraY,
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
        cursorExtraY = cursorExtraY + textSize.h + gap;
        continue;
      }

      if (extra.kind === 'text') {
        fields.push({
          id: createId(),
          batchId,
          assignedTo,
          type: 'text',
          page: extrasPage,
          x: baseX,
          y: cursorExtraY,
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
        cursorExtraY = cursorExtraY + textSize.h + gap;
      }
    }
  }

  return fields;
}

export function reorderFieldsBySignerBatches(
  fields: SignatureField[],
  options: {
    virtualWidth: number;
    virtualHeight: number;
  }
): SignatureField[] {
  const { virtualWidth, virtualHeight } = options;

  type Group = {
    batchId: string;
    ids: string[];
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };

  const groupsById = new Map<string, Group>();
  for (const field of fields) {
    const batchId = field.batchId || field.id;
    let group = groupsById.get(batchId);
    if (!group) {
      group = {
        batchId,
        ids: [],
        minX: field.x,
        minY: field.y,
        maxX: field.x + field.width,
        maxY: field.y + field.height
      };
      groupsById.set(batchId, group);
    }

    group.ids.push(field.id);
    group.minX = Math.min(group.minX, field.x);
    group.minY = Math.min(group.minY, field.y);
    group.maxX = Math.max(group.maxX, field.x + field.width);
    group.maxY = Math.max(group.maxY, field.y + field.height);
  }

  const groups = Array.from(groupsById.values());
  if (groups.length === 0) return fields;

  const maxBlockWidth = Math.max(...groups.map((g) => g.maxX - g.minX));
  const maxBlockHeight = Math.max(...groups.map((g) => g.maxY - g.minY));

  const paddingX = 24;
  const paddingY = 64;
  const colGap = 56;
  const rowGap = 28;

  const usableWidth = Math.max(1, virtualWidth - paddingX * 2);
  const cols = Math.max(1, Math.floor((usableWidth + colGap) / (maxBlockWidth + colGap)));

  const deltasByBatch = new Map<string, { dx: number; dy: number }>();
  for (let idx = 0; idx < groups.length; idx += 1) {
    const group = groups[idx];
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const targetX = paddingX + col * (maxBlockWidth + colGap);
    const targetY = paddingY + row * (maxBlockHeight + rowGap);
    deltasByBatch.set(group.batchId, { dx: targetX - group.minX, dy: targetY - group.minY });
  }

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(min, v), max);

  return fields.map((field) => {
    const batchId = field.batchId || field.id;
    const delta = deltasByBatch.get(batchId);
    if (!delta) return field;
    const nextX = clamp(field.x + delta.dx, 0, virtualWidth - field.width);
    const nextY = clamp(field.y + delta.dy, 0, virtualHeight - field.height);
    return {
      ...field,
      x: nextX,
      y: nextY,
      metadata: {
        ...field.metadata,
        normalized: {
          x: nextX / virtualWidth,
          y: nextY / virtualHeight,
          width: field.width / virtualWidth,
          height: field.height / virtualHeight
        }
      }
    };
  });
}
