/**
 * Overlay Spec Converter
 *
 * Convierte SignatureField[] del frontend al formato OverlaySpec[]
 * requerido por el backend para stamping en PDF Witness.
 *
 * Contrato: SPRINT5_BACKEND_CONTRACT.md
 */

import type { SignatureField } from '../types/signature-fields';
import type { OverlaySpecItem } from './pdfSignature';

/**
 * Calcula coordenadas normalizadas (0-1) desde píxeles absolutos
 *
 * CRÍTICO: Estas coordenadas son relativas al tamaño de página PDF REAL,
 * no al viewport del preview.
 *
 * @param pixelX - Coordenada X en píxeles del preview
 * @param pixelY - Coordenada Y en píxeles del preview
 * @param pixelWidth - Ancho en píxeles del preview
 * @param pixelHeight - Alto en píxeles del preview
 * @param previewWidth - Ancho total del preview en píxeles
 * @param previewHeight - Alto total del preview en píxeles
 * @returns Coordenadas normalizadas (0-1)
 */
export function normalizeCoordinates(
  pixelX: number,
  pixelY: number,
  pixelWidth: number,
  pixelHeight: number,
  previewWidth: number,
  previewHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: pixelX / previewWidth,
    y: pixelY / previewHeight,
    width: pixelWidth / previewWidth,
    height: pixelHeight / previewHeight,
  };
}

/**
 * Convierte SignatureField a OverlaySpecItem
 *
 * @param field - Campo del frontend (con coordenadas en píxeles)
 * @param previewWidth - Ancho del preview en píxeles
 * @param previewHeight - Alto del preview en píxeles
 * @param actor - ID del actor ('owner', 'signer_1', etc.)
 * @returns OverlaySpecItem con coordenadas normalizadas
 */
export function fieldToOverlaySpec(
  field: SignatureField,
  previewWidth: number,
  previewHeight: number,
  actor: string = 'owner'
): OverlaySpecItem {
  // Usar coordenadas normalizadas si ya existen, sino calcularlas
  const normalized = field.metadata?.normalized || normalizeCoordinates(
    field.x,
    field.y,
    field.width,
    field.height,
    previewWidth,
    previewHeight
  );

  // Mapear tipo de campo frontend → tipo overlay backend
  let overlayType: 'signature' | 'field_signature' | 'field_text' | 'field_date';
  if (field.type === 'signature') {
    overlayType = 'field_signature';
  } else if (field.type === 'text') {
    overlayType = 'field_text';
  } else if (field.type === 'date') {
    overlayType = 'field_date';
  } else {
    overlayType = 'field_text'; // Fallback seguro
  }

  return {
    page: field.page,
    x: normalized.x,
    y: normalized.y,
    w: normalized.width,
    h: normalized.height,
    kind: overlayType,
    value: field.value || '',
    label: field.metadata?.label || undefined,
    actor,
    required: field.required,
  };
}

/**
 * Convierte signaturePreview a OverlaySpecItem
 *
 * @param signatureData - Datos de la firma (imageUrl + coordenadas)
 * @param page - Número de página donde aparece la firma
 * @param previewWidth - Ancho del preview en píxeles
 * @param previewHeight - Alto del preview en píxeles
 * @param actor - ID del actor ('owner')
 * @returns OverlaySpecItem para la firma
 */
export function signatureToOverlaySpec(
  signatureData: { imageUrl?: string; text?: string; x: number; y: number; width: number; height: number },
  page: number,
  previewWidth: number,
  previewHeight: number,
  actor: string = 'owner'
): OverlaySpecItem {
  const normalized = normalizeCoordinates(
    signatureData.x,
    signatureData.y,
    signatureData.width,
    signatureData.height,
    previewWidth,
    previewHeight
  );

  return {
    page,
    x: normalized.x,
    y: normalized.y,
    w: normalized.width,
    h: normalized.height,
    kind: 'signature',
    value: signatureData.text,
    imageDataUrl: signatureData.imageUrl,
    actor,
    required: true, // Firma siempre es requerida
  };
}

/**
 * Convierte todos los campos + firma a formato OverlaySpec[]
 *
 * IMPORTANTE: Este es el formato canónico que se persiste en draft_metadata
 * y que el backend usa para stamping en PDF Witness.
 *
 * @param fields - Array de SignatureField del frontend
 * @param signature - Datos de la firma (si existe)
 * @param previewWidth - Ancho del preview en píxeles
 * @param previewHeight - Alto del preview en píxeles
 * @param actor - ID del actor ('owner', 'signer_1', etc.)
 * @returns Array de OverlaySpecItem listos para backend
 */
export function convertToOverlaySpec(
  fields: SignatureField[],
  signature:
    | { imageUrl?: string; text?: string; x: number; y: number; width: number; height: number; page: number }
    | null,
  previewWidth: number,
  previewHeight: number,
  actor: string = 'owner'
): OverlaySpecItem[] {
  const overlays: OverlaySpecItem[] = [];

  // 1. Convertir campos (text, date, field_signature)
  for (const field of fields) {
    overlays.push(fieldToOverlaySpec(field, previewWidth, previewHeight, actor));
  }

  // 2. Convertir firma principal (si existe)
  if (signature && signature.imageUrl) {
    overlays.push(signatureToOverlaySpec(
      signature,
      signature.page,
      previewWidth,
      previewHeight,
      actor
    ));
  }

  return overlays;
}

/**
 * Valida que overlay_spec tenga coordenadas válidas (0-1)
 *
 * @param overlays - Array de overlays a validar
 * @returns true si todos los overlays son válidos
 */
export function validateOverlaySpec(overlays: OverlaySpecItem[]): boolean {
  for (const overlay of overlays) {
    if (
      overlay.x < 0 || overlay.x > 1 ||
      overlay.y < 0 || overlay.y > 1 ||
      overlay.w < 0 || overlay.w > 1 ||
      overlay.h < 0 || overlay.h > 1
    ) {
      console.error('Invalid overlay coordinates:', overlay);
      return false;
    }

    if (overlay.page < 1) {
      console.error('Invalid page number:', overlay.page);
      return false;
    }
  }

  return true;
}

/**
 * Serializa overlay_spec para persistencia en draft_metadata
 *
 * @param overlays - Array de OverlaySpecItem
 * @returns JSON string o objeto según necesidad
 */
export function serializeOverlaySpec(overlays: OverlaySpecItem[]): Record<string, unknown> {
  return {
    overlay_spec: overlays,
    version: '1.0',
    generated_at: new Date().toISOString(),
  };
}
