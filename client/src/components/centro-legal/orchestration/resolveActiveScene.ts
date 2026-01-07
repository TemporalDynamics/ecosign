/**
 * Resolve which scene to display based on current state
 * 
 * Reglas:
 * - Sin archivo → DocumentScene (upload)
 * - Con archivo + NDA activo → NdaScene
 * - Con archivo + Firma visual → SignatureScene
 * - Con archivo + Flujo activo → FlowScene
 * - Con archivo + Configurado → ReviewScene
 * - Default → DocumentScene (preview)
 */

export type SceneType = 
  | 'document' 
  | 'nda' 
  | 'signature' 
  | 'flow' 
  | 'review';

interface ResolveSceneInput {
  hasFile: boolean;
  ndaEnabled: boolean;
  mySignatureEnabled: boolean;
  workflowEnabled: boolean;
  isReviewStep: boolean;
}

export function resolveActiveScene(input: ResolveSceneInput): SceneType {
  const { 
    hasFile, 
    ndaEnabled, 
    mySignatureEnabled, 
    workflowEnabled,
    isReviewStep 
  } = input;

  // Sin archivo → siempre upload
  if (!hasFile) {
    return 'document';
  }

  // Review final (step 4)
  if (isReviewStep) {
    return 'review';
  }

  // Prioridad de escenas (cuando hay archivo)
  if (ndaEnabled) {
    return 'nda';
  }

  if (mySignatureEnabled) {
    return 'signature';
  }

  if (workflowEnabled) {
    return 'flow';
  }

  // Default: solo preview
  return 'document';
}

/**
 * Determine if we should show 2-column layout
 */
export function shouldShowSplitLayout(scene: SceneType): boolean {
  return ['nda', 'flow', 'review'].includes(scene);
}

/**
 * Get scene title for UI
 */
export function getSceneTitle(scene: SceneType): string {
  const titles: Record<SceneType, string> = {
    document: 'Documento',
    nda: 'Configurar NDA',
    signature: 'Firma Visual',
    flow: 'Flujo de Firmas',
    review: 'Revisar y Certificar'
  };

  return titles[scene];
}
