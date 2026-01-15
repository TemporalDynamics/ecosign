# Contrato de Derivación de Nivel de Protección

**Fecha:** 2026-01-14
**Estado:** Propuesto

## 1. Principio Rector

El **Nivel de Protección** (`ProtectionLevel`) de un documento no es un estado persistido en la base de datos que se modifica a lo largo del tiempo. Es una **proyección canónica**, una vista de solo lectura calculada en tiempo real a partir del log inmutable de eventos del documento.

Este contrato prohíbe explícitamente la existencia de una función `upgrade_protection_level` o cualquier otro mecanismo que mute un campo `protection_level` en la tabla `user_documents` o `document_entities`.

## 2. Fuente de Verdad Única

La única fuente de verdad para determinar el Nivel de Protección es el array de eventos almacenado en `document_entities.events`.

Este array es de solo-añadido (`append-only`).

## 3. Lógica de Derivación (Función Pura)

El Nivel de Protección se calculará a través de una función pura `deriveProtectionLevel(events: Event[]): ProtectionLevel`.

**Principio de Conmutatividad:** El orden en que los eventos aparecen en el array no debe afectar el resultado final. La función debe basarse en la presencia de ciertos eventos, no en su secuencia.

La lógica de esta función es la siguiente:

```typescript
// Tipos de eventos relevantes
type Event = {
  type: 'tsa.created' | 'anchor.confirmed';
  payload?: {
    network?: 'polygon' | 'bitcoin';
  };
};

type ProtectionLevel = 'NONE' | 'ACTIVE' | 'REINFORCED' | 'TOTAL';

function deriveProtectionLevel(events: Event[]): ProtectionLevel {
  if (!Array.isArray(events)) {
    return 'NONE';
  }

  const hasPolygon = events.some(e => 
    e.type === 'anchor.confirmed' && e.payload?.network === 'polygon'
  );

  const hasBitcoin = events.some(e => 
    e.type === 'anchor.confirmed' && e.payload?.network === 'bitcoin'
  );

  if (hasPolygon && hasBitcoin) {
    return 'TOTAL';
  }

  if (hasPolygon) {
    return 'REINFORCED';
  }

  // Se asume que un documento con eventos de anclaje también tiene un TSA.
  // Si no hay anclajes, se busca la evidencia de un Sello de Tiempo (TSA).
  const hasTSA = events.some(e => e.type === 'tsa.created');
  if (hasTSA) {
    return 'ACTIVE';
  }

  return 'NONE';
}
```

## 4. Implementación en el Frontend

La responsabilidad de implementar este contrato recae en el cliente (frontend).

1.  **Suscripción:** La UI debe suscribirse a los cambios en la tabla `document_entities`, específicamente al campo `events` del documento que se está visualizando.
2.  **Cálculo:** Cada vez que los datos del documento se cargan o la suscripción notifica un cambio, la UI **debe** llamar a la función `deriveProtectionLevel` con el array de eventos actualizado.
3.  **Renderizado:** El resultado de la función `deriveProtectionLevel` será el valor que se pase como `prop` al componente `ProtectionLayerBadge` para su renderizado.

## 5. Consecuencias

-   **Consistencia Garantizada:** El estado visual siempre reflejará la verdad auditable del log de eventos.
-   **Eliminación de Bugs de Sincronización:** Es imposible que la UI y el backend estén desincronizados, ya que la UI deriva su estado de la misma fuente que el backend escribe.
-   **Inmutabilidad:** El historial de protección de un documento es inmutable y verificable. El "nivel" es solo una interpretación humana de ese historial en un punto en el tiempo.
