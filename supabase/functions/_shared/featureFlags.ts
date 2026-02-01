/**
 * Feature Flags para la migración controlada de autoridad
 *
 * Estos flags permiten activar gradualmente la autoridad canónica
 * por decisión individual, manteniendo la capacidad de rollback.
 */

/**
 * Flags de autoridad canónica por decisión
 *
 * Cuando un flag está en `true`, el sistema canónico tiene autoridad
 * sobre esa decisión específica y el legacy se convierte en "producer" (solo emite eventos).
 */
export const CANONICAL_AUTHORITY_FLAGS = {
  /**
   * D1: run_tsa - Decisión de ejecutar sello de tiempo legal (TSA)
   *
   * Controla si el executor canónico decide sobre la ejecución de TSA
   * en lugar del sistema legacy.
   */
  D1_RUN_TSA_ENABLED: "ENABLE_D1_CANONICAL",

  /**
   * D3: build_artifact - Decisión de construir artifact final
   *
   * Controla si el executor canónico decide sobre la construcción del artifact
   * en lugar del sistema legacy.
   */
  D3_BUILD_ARTIFACT_ENABLED: "ENABLE_D3_CANONICAL",

  /**
   * D4: anchors - Decisiones de anclaje blockchain (Polygon/Bitcoin)
   *
   * Controla si el executor canónico decide sobre los anclajes
   * en lugar del sistema legacy.
   */
  D4_ANCHORS_ENABLED: "ENABLE_D4_CANONICAL",

  /**
   * D5-D9: notifications - Decisiones de notificaciones
   *
   * Controla si el executor canónico decide sobre las notificaciones
   * en lugar de los triggers legacy.
   */
  D5_NOTIFICATIONS_ENABLED: "ENABLE_D5_CANONICAL",
} as const;

const readEnv = (name: string): string | undefined => {
  const denoValue = (globalThis as any).Deno?.env?.get?.(name);
  if (typeof denoValue === 'string') return denoValue;

  const nodeValue = (globalThis as any).process?.env?.[name];
  if (typeof nodeValue === 'string') return nodeValue;

  return undefined;
};

/**
 * Verifica si una decisión específica está bajo autoridad canónica
 * Lee directamente de las variables de entorno de Deno (rápido, sin RPC)
 */
export function isDecisionUnderCanonicalAuthority(decisionId: keyof typeof CANONICAL_AUTHORITY_FLAGS): boolean {
  const envVarName = CANONICAL_AUTHORITY_FLAGS[decisionId];
  if (!envVarName) {
    return false;
  }
  return readEnv(envVarName) === "true";
}

/**
 * Verifica si una decisión específica está en modo shadow
 * (ambos sistemas corren pero solo uno ejecuta side-effects)
 */
export function isDecisionInShadowMode(decisionId: keyof typeof CANONICAL_AUTHORITY_FLAGS): boolean {
  return !isDecisionUnderCanonicalAuthority(decisionId);
}
