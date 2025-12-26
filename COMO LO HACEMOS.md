# CÓMO LO HACEMOS — Guía técnica (EcoSign)

Este documento describe el **comportamiento verificable** del sistema y el **contrato público de datos** del formato `.ECO`.
No describe detalles internos propietarios (optimización, packaging interno, pipelines, etc.).

## 0) Vocabulario (para evitar ambigüedad)

- **Documento original**: el archivo (PDF, imagen, etc.).
- **.ECO**: contenedor de evidencia técnica (no contiene el documento en claro).
- **Manifiesto**: metadatos + hash del documento + timestamps (si aplica).
- **Integridad criptográfica**: prueba de que el `.ECO` no fue alterado y que el hash corresponde a un contenido.
- **Anclaje**: registro posterior en redes públicas (ej. Polygon / Bitcoin) que refuerza la evidencia.
- **Estado probatorio**: resumen de señales técnicas disponibles al momento de verificar (puede mejorar con el tiempo).

> Nota importante: el `.ECO` es **inmutable**. Lo que cambia con el tiempo no es el `.ECO`, sino la **disponibilidad de señales externas** (confirmaciones/observaciones).

---

## 1) Principios de diseño

1. **Arquitectura ciega al contenido (server-side)**  
   EcoSign no necesita acceder al contenido del documento en claro para generar evidencia. El hash se calcula en el cliente. **Ciega al contenido en sentido operativo: los servidores no acceden ni interpretan el contenido en claro durante el proceso de emisión.**

2. **Evidencia portable y verificable**  
   El `.ECO` permite verificar **offline** la integridad criptográfica (estructura, firma y hash).

3. **Separación entre “hecho” y “refuerzo”**  
   - El **hecho**: la integridad del `.ECO` y su vínculo con el documento (si se provee el original).  
   - El **refuerzo**: anclajes en redes públicas y/o sellos de tiempo de terceros (si existen).

4. **Sin falsos negativos por disponibilidad**  
   Si una señal externa no está disponible (por ejemplo, no se puede consultar el estado de un anclaje), el verificador debe mostrar **“no consultado / no disponible”**, nunca “falso”.

---

## 2) Flujo de emisión: del documento al `.ECO`

Resumen conceptual:

1) El cliente calcula `hash = SHA-256(documento)` localmente.  
2) Se construye un manifiesto con el hash y metadatos (nombre, tamaño, timestamp, etc.).  
3) Se firma el manifiesto con **Ed25519** (clave del lado del cliente).  
4) Se empaqueta en `.ECO` (contenedor de evidencia).  
5) El `.ECO` se entrega al usuario inmediatamente.

> Resultado: el usuario tiene un artefacto portable que puede verificar sin la plataforma.

---

## 3) Verificación: dos capas (sin promesas peligrosas)

La verificación se divide en **dos etapas**:

### A) Verificación OFFLINE (integridad criptográfica)
Esta etapa es autosuficiente y no requiere red.

- Validar estructura del `.ECO`
- Validar firma(s) del manifiesto (Ed25519)
- Si se provee el documento original: recalcular SHA-256 y comparar con el hash del manifiesto

**Salida mínima (offline):**
- Integridad del `.ECO`: ✅ / ❌
- Coincidencia con documento original (si aplica): ✅ / ❌

### B) Resolución de señales externas (opcional, online)
Esta etapa **no reemplaza** la verificación offline; la complementa.

- Consultar señales asociadas al `.ECO` (por ejemplo, anclajes registrados por la plataforma)
- Presentar el resultado como **“observaciones”** y, cuando sea posible, incluir **identificadores públicos** (txid, block, etc.) para que un tercero pueda corroborarlos.

**Regla de oro:**
- Si no se puede consultar o no hay datos aún → mostrar **“No consultado / Pendiente”**, no “Inválido”.

---

## 4) Estado probatorio (definición precisa y no ansiógena)

El verificador muestra un **resumen** basado en señales disponibles:

- **INTEGRIDAD OK**: el `.ECO` es consistente y las firmas/hashes validan.
- **ANCLAJE PENDIENTE**: se solicitó refuerzo, pero todavía no hay confirmación disponible.
- **ANCLAJE CONFIRMADO (POLYGON)**: existe confirmación disponible en Polygon (si se conoce el txid, es verificable públicamente).
- **ANCLAJE CONFIRMADO (BITCOIN)**: existe confirmación disponible en Bitcoin / OpenTimestamps (si aplica y hay evidencia pública disponible).
- **ANCLAJE NO CONSULTADO**: el verificador no pudo obtener la señal en este momento (ej. sin red / servicio no disponible).

---

## 5) Qué guardamos y qué no

EcoSign puede almacenar:
- Metadatos del `.ECO` (no el contenido del documento en claro)
- Datos necesarios para correlacionar anclajes (timestamps, identificadores públicos cuando existan)

EcoSign no necesita almacenar:
- El contenido del documento en claro para emitir/verificar evidencia
- Claves privadas del usuario

---

## 6) Contrato de datos `.ECO` (concepto)

El `.ECO` contiene:
- Manifiesto (hash, metadatos, timestamps)
- Firma(s)

Y puede contener:
- **Intención de anclaje** (qué refuerzos se solicitaron en el momento de emisión)

> Nota: el `.ECO` puede reflejar “intención/solicitud” de anclaje al momento de emisión.  
> Las confirmaciones posteriores se presentan como **observaciones** en el verificador (para no romper inmutabilidad).

---

## 7) Cómo debe verse el resultado (ejemplo de UX técnico)

- Integridad del `.ECO`: ✅  
- Coincide con documento original: ✅  
- Refuerzo (Polygon): Pendiente / Confirmado / No consultado  
- Refuerzo (Bitcoin): Pendiente / Confirmado / No consultado  
- Resumen: **Integridad OK + Refuerzos según disponibilidad**

---

## 8) Aclaraciones Importantes

- **Sobre el "Estado Probatorio"**: El estado probatorio es un **resumen técnico** de señales disponibles, no una calificación procesal ni judicial.
- **Sobre Sellos de Tiempo de Terceros**: La relevancia jurídica de sellos de tiempo de terceros depende del marco normativo aplicable y la jurisdicción.
- **Sobre el Uso del Sistema**: Este sistema no sustituye evaluaciones periciales, notariales o judiciales, sino que provee evidencia técnica verificable que puede ser considerada en dichos procesos.
