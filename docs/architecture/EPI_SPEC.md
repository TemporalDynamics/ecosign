# EPI (Evidence Protocol Integrity) - Spec Base

Estado: draft operativo
Owner: arquitectura EcoSign

## 1. Definicion

EPI (Evidence Protocol Integrity) es el protocolo interno de EcoSign que gobierna:
- transiciones de estado de evidencia,
- invariantes estructurales,
- encadenamiento hash canónico,
- y reglas de autoridad causal sobre eventos.

EPI define la verdad interna del sistema. No reemplaza estandares externos.

## 2. Limites explicitos

- EPI no es C2PA.
- EPI no es CAI (Content Authenticity Initiative).
- EPI puede proyectarse a C2PA mediante adapters, sin acoplar el core.

## 3. Objetivo tecnico

Garantizar que cada acto relevante (identidad, lectura, firma, rechazo, cierre) sea:
- verificable,
- determinista,
- trazable,
- y resistente a mutaciones fuera de contrato.

## 4. Capas

- Capa A (core): ECO/ECOX + eventos canónicos + invariantes EPI.
- Capa B (interop): proyecciones a formatos externos (ej. C2PA).

Regla: Capa A nunca depende de Capa B para cerrar un flujo.

## 5. Estado de nomenclatura

Durante la transicion, puede existir documentacion legacy que mencione "CAI" como protocolo interno.
La nomenclatura canónica nueva para el protocolo interno es EPI.
