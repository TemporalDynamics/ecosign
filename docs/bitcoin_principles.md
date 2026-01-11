Principios rectores para anchoring en Bitcoin

Fecha: 2026-01-11T12:45:50.507Z

Resumen ejecutivo

Bitcoin no es UX, es finality. No debe bloquear flujos, no debe mentir, no debe apurarse. Bitcoin actúa como ancla de cierre: evidencia de máxima refutabilidad y la última línea de defensa. Todo lo demás se deriva de esta decisión de diseño.

1) Rol de Bitcoin en EcoSign

No es UX ni confirmación rápida.
No es requisito para que un documento sea válido.
No es algo que el firmante tenga que esperar.

Sí debe ser:
- Anclaje de cierre del documento.
- Prueba de máxima refutabilidad (última línea de defensa).
- Evidencia fuerte post‑flujo, no durante el flujo.

TSA + Polygon protegen el "aquí y ahora"; Bitcoin protege "para siempre".

2) Cuándo anclar en Bitcoin

Regla: anclar en Bitcoin SOLO cuando el flujo esté cerrado — todos los firmantes completaron y el documento ya no cambia (protection_level = REINFORCED).

Beneficios:
- Un único hash estable
- Un único evento anchor canónico en Bitcoin
- Historia limpia y defendible

Nunca anclar "por firmante".

3) Qué anclar exactamente

Canon: hash del witness final (no del source, no del PDF intermedio, no del .eco parcial).
Ideal: bitcoin_anchor_input = hash(witness_pdf_final)

Así el .eco + PDF son suficientes para verificación y el anchor es portable fuera de EcoSign.

4) Tecnología recomendada

- OpenTimestamps: seguir como default. Diseñado para este caso, no custodia, permite batching y es verificable offline.
- Transacción directa en Bitcoin: reservar para casos enterprise/auditorías especiales (más control, más coste, más complejidad).

5) UX honesta para Bitcoin (estados mínimos)

Estados que deben existir:
- pending — "Confirmando (puede tardar horas)"
- confirmed — "Anclado en Bitcoin"
- failed — "Intento fallido (el sistema reintentará)"

Microcopy clave:
"Bitcoin es la capa más fuerte y la más lenta. El documento ya está protegido; esta capa refuerza la evidencia a largo plazo."

6) Política de retries (operacional)

- Reintentos automáticos.
- Sin límite agresivo.
- No bloquear flujos por fallos en Bitcoin.
- No borrar intentos fallidos; mantener histórico (anchor.attempt, anchor.failed, anchor.confirmed).

7) Visibilidad y privacidad

- Bitcoin NO debe volver público el documento ni mostrar TX públicamente sin prueba.
- El verificador muestra Bitcoin solo si el .eco lo trae (proof-first).

8) Resumen ejecutivo (decisiones cerradas)

- Bitcoin se usa solo al cierre del flujo.
- Ancla un único hash final (witness final).
- OpenTimestamps como default.
- UX honesta: lento pero definitivo.
- Retries visibles; no ocultos.
- Verificación siempre proof-first (.eco + PDF).

Notas operativas para desarrolladores

- Implementar anchoring en Bitcoin como un job asincrónico que se dispara solo sobre documentos con estado cerrado/reinforced.
- Registrar intentos en la tabla de anchoring (append-only) con referencias a audit_logs.
- No exponer claves de custodia o service-role en frontend.

Fin del documento.
