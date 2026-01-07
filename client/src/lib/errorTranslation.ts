/**
 * Error Translation Utilities
 *
 * Purpose: Translate technical errors to human-friendly Spanish
 * Anti-explosion: B (Incomprensible)
 *
 * P0.4: translateError - technical → human language
 */

/**
 * P0.4: Translate technical errors to Spanish with context
 *
 * Maps common technical errors to human-friendly explanations.
 * Never shows "Something went wrong" - always provides context.
 */
export function translateError(error: any): string {
  const errorMsg = error?.message || String(error);
  const errorLower = errorMsg.toLowerCase();

  // Map técnico → humano (ordered by priority)
  const errorMap: Array<[string, string]> = [
    [
      'witness hash mismatch',
      'Hubo un problema de integridad en el documento. Reintentá o contactá soporte si persiste.'
    ],
    [
      'witness_hash',
      'Hubo un problema de integridad en el documento. Reintentá o contactá soporte si persiste.'
    ],
    [
      'tsa timeout',
      'El servicio de timestamping tardó demasiado. Reintentá en unos minutos.'
    ],
    [
      'tsa failed',
      'No se pudo generar el timestamp legal. Verificá tu conexión y reintentá.'
    ],
    [
      'timestamp',
      'Hubo un problema con el timestamping legal. Reintentá en unos minutos.'
    ],
    [
      'polygon anchor failed',
      'El anclaje en Polygon falló. Tu documento está protegido con timestamp. Podés reintentar el anclaje.'
    ],
    [
      'polygon',
      'Hubo un problema con el anclaje en Polygon. Tu documento tiene timestamp. Podés reintentar.'
    ],
    [
      'bitcoin anchor failed',
      'El anclaje en Bitcoin falló. Tu documento está protegido con timestamp y Polygon. Podés continuar.'
    ],
    [
      'bitcoin',
      'Hubo un problema con el anclaje en Bitcoin. Tu documento tiene protección Polygon.'
    ],
    [
      'network error',
      'Problema de conexión. Verificá tu internet y reintentá.'
    ],
    [
      'fetch failed',
      'Problema de conexión. Verificá tu internet y reintentá.'
    ],
    [
      'invalid pdf',
      'El PDF tiene un problema de estructura. Probá abrirlo en un lector y guardarlo de nuevo.'
    ],
    [
      'pdf structure',
      'El PDF tiene un problema de estructura. Probá abrirlo en un lector y guardarlo de nuevo.'
    ],
    [
      'unauthorized',
      'No tenés permisos para esta acción. Verificá que estés logueado.'
    ],
    [
      'forbidden',
      'No tenés permisos para esta acción. Contactá soporte si creés que es un error.'
    ],
    [
      'not found',
      'No se encontró el documento. Puede haber sido eliminado.'
    ],
    [
      'timeout',
      'La operación tardó demasiado. Reintentá en unos momentos.'
    ],
    [
      'abort',
      'La operación fue cancelada. Podés reintentarla.'
    ],
  ];

  // Search for match
  for (const [key, translation] of errorMap) {
    if (errorLower.includes(key)) {
      return translation;
    }
  }

  // Fallback genérico pero humano (no "Something went wrong")
  return `No se pudo completar la certificación. ${
    errorMsg ? `Detalle: ${errorMsg.slice(0, 100)}.` : ''
  } Contactá soporte si el problema persiste.`;
}
