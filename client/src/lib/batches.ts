export type Batch<FieldType> = {
  id: string;
  label?: string | null;
  assignedSignerEmail?: string | null;
  fields: FieldType[];
};

export function resolveBatchAssignments<FieldType extends { id: string; batchId?: string; assignedTo?: string | undefined }>(
  fields: FieldType[],
  signers: { email: string }[]
) {
  const batchesMap = new Map<string, FieldType[]>();

  fields.forEach((f) => {
    const bid = (f as any).batchId || f.id;
    if (!batchesMap.has(bid)) batchesMap.set(bid, [] as FieldType[]);
    batchesMap.get(bid)!.push(f);
  });

  const batches: Batch<FieldType>[] = Array.from(batchesMap.entries()).map(([batchId, fs]) => ({
    id: batchId,
    label: null,
    assignedSignerEmail: null,
    fields: fs
  }));

  // If fields were pre-assigned (legacy), promote that to batch assignedSignerEmail
  batches.forEach((b) => {
    for (const f of b.fields) {
      if ((f as any).assignedTo) {
        b.assignedSignerEmail = (f as any).assignedTo;
        break;
      }
    }
  });

  const unassignedBatches = batches.filter((b) => !b.assignedSignerEmail);

  return { batches, unassignedBatches };
}
