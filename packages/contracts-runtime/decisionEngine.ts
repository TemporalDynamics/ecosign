/**
 * Decision Engine - Motor de Decisiones Canónicas
 * 
 * Implementación canónica de la lógica de decisión del sistema.
 * Cada decisión es pura, verificable y reproducible.
 * 
 * Este es el motor que el orquestador usará para decidir qué hacer.
 */

import type { GenericEvent } from './types.ts';

export type JobType = 
  | 'run_tsa'
  | 'build_artifact'
  | 'submit_anchor_polygon'
  | 'submit_anchor_bitcoin';

export type DecisionResult = {
  jobs: JobType[];
  reason: string;
};

// Verifica si hay un evento específico
const hasEvent = (events: GenericEvent[], kind: string): boolean => {
  return events.some(event => event.kind === kind);
};

// Verifica si hay un anchor confirmado para una red específica
const hasAnchorConfirmed = (events: GenericEvent[], network: 'polygon' | 'bitcoin'): boolean => {
  return events.some((event) => {
    // Verificar que sea el tipo correcto de evento
    if (event.kind !== 'anchor' && event.kind !== 'anchor.confirmed') {
      return false;
    }

    // Verificar que tenga la red correcta
    const hasCorrectNetwork = ((event as any).anchor?.network === network || (event as any).payload?.network === network);
    if (!hasCorrectNetwork) {
      return false;
    }

    // Verificar que tenga confirmed_at
    const confirmedAtValue = (event as any).anchor?.confirmed_at || (event as any).payload?.confirmed_at;
    if (!confirmedAtValue) {
      return false;
    }

    // Verificar causalidad temporal: confirmed_at >= at
    try {
      const confirmedAt = new Date(confirmedAtValue);
      const at = new Date(event.at);
      if (confirmedAt < at) {
        return false; // Rompe causalidad temporal
      }
    } catch {
      return false; // Fecha inválida
    }

    return true;
  });
};

// Verifica si todos los anclajes requeridos están confirmados
const hasRequiredAnchors = (events: GenericEvent[], protection: string[]): boolean => {
  const hasPolygon = protection.includes('polygon') ? hasAnchorConfirmed(events, 'polygon') : true;
  const hasBitcoin = protection.includes('bitcoin') ? hasAnchorConfirmed(events, 'bitcoin') : true;

  return hasPolygon && hasBitcoin;
};

/**
 * Decisión principal: qué jobs ejecutar basado en eventos y protección requerida
 * 
 * Este es el corazón del orquestador. Toma eventos y protección requerida
 * y decide qué hacer a continuación.
 * 
 * @param events - Eventos canónicos del documento
 * @param protection - Array de protecciones requeridas ['polygon', 'bitcoin']
 * @returns DecisionResult con jobs a ejecutar y razón
 */
export const decideNextJobs = (
  events: GenericEvent[],
  protection: string[] = []
): DecisionResult => {
  // Si no hay solicitud de protección, no hacer nada
  if (!hasEvent(events, 'document.protected.requested')) {
    return { jobs: [], reason: 'noop_missing_request' };
  }

  // Si no hay TSA confirmado, ejecutar TSA
  if (!hasEvent(events, 'tsa.confirmed')) {
    return { jobs: ['run_tsa'], reason: 'needs_tsa' };
  }

  // Si hay TSA confirmado pero no artifact finalizado y se tienen todos los anclajes requeridos
  if (!hasEvent(events, 'artifact.finalized')) {
    const hasAllRequiredEvidence = hasRequiredAnchors(events, protection);
    
    if (hasAllRequiredEvidence) {
      return { jobs: ['build_artifact'], reason: 'needs_artifact' };
    }
  }

  // Si no se ha generado artifact pero faltan anclajes, encolarlos
  const jobs: JobType[] = [];
  if (protection.includes('polygon') && !hasAnchorConfirmed(events, 'polygon')) {
    jobs.push('submit_anchor_polygon');
  }
  if (protection.includes('bitcoin') && !hasAnchorConfirmed(events, 'bitcoin')) {
    jobs.push('submit_anchor_bitcoin');
  }

  return jobs.length > 0 
    ? { jobs, reason: 'needs_anchors' } 
    : { jobs: [], reason: 'noop_complete' };
};

/**
 * Decisión específica: ¿debería encolarse run_tsa?
 * 
 * Esta función específica decide si se debe encolar run_tsa
 * Basada únicamente en los eventos actuales.
 * 
 * @param events - Eventos canónicos del documento
 * @returns true si se debería encolar run_tsa
 */
export const shouldEnqueueRunTsa = (events: GenericEvent[]): boolean => {
  const hasRequest = hasEvent(events, 'document.protected.requested');
  const hasTsaConfirmed = hasEvent(events, 'tsa.confirmed');
  
  return hasRequest && !hasTsaConfirmed;
};

/**
 * Decisión específica: ¿está listo para generar artifact?
 * 
 * Esta función decide si se puede generar el artifact final
 * Basada en tener TSA + todos los anclajes requeridos confirmados.
 * 
 * @param events - Eventos canónicos del documento
 * @param protection - Array de protecciones requeridas
 * @returns true si está listo para generar artifact
 */
export const isReadyForArtifact = (events: GenericEvent[], protection: string[]): boolean => {
  const hasTsa = hasEvent(events, 'tsa.confirmed');
  const hasArtifact = hasEvent(events, 'artifact.finalized');
  const hasRequiredAnchorsCompleted = hasRequiredAnchors(events, protection);
  
  return hasTsa && !hasArtifact && hasRequiredAnchorsCompleted;
};