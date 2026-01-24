Industrialización de decisiones
Estado actual y plan para D7 / D8

1. Qué logramos con D5 y D6 (lo importante, no lo anecdótico)
Antes

Las notificaciones vivían como efectos colaterales

Autoridad repartida entre:

triggers

edge functions

lógica implícita

Difícil saber:

quién decide

cuándo

con qué dedupe

si el sistema está “bien” o solo “funciona”

Con D5 y D6 hicimos algo clave: industrializamos decisiones

No resolvimos “una notificación”.
Creamos un patrón replicable de migración de autoridad.

2. El patrón industrial (validado con D5 y D6)

Este es el core. Esto es lo que ahora se copia.

🔁 Patrón de decisión canónica con Shadow Mode

Para cada decisión:

Fase 1 — Contrato

Se define una decisión D#

Se documenta:

input

contexto

condiciones

output esperado

Se deja explícito:

qué se decide

qué NO se decide

📄 Ejemplo:
D5_NOTIFY_SIGNER_LINK.md
D6_NOTIFY_SIGNATURE_COMPLETED.md

Fase 2 — Shadow Mode (sin autoridad)

La decisión se implementa en paralelo

Conviven:

legacy_decision (con autoridad, produce efectos)

canonical_decision (observa, no manda)

Ambas se comparan en la misma transacción

Se loguea SIEMPRE:

legacy_decision

canonical_decision

has_divergence (GENERATED)

context completo

📌 Aprendizaje clave D5:

Shadow mode debe loguear matches y divergencias, no solo errores.

Fase 3 — Métrica objetiva

Se crea un summary:

shadow_dX_summary

Mide:

total_runs

divergences

matches

match_percentage

first_run / last_run

📌 Esto convierte “creo que anda” en evidencia cuantificable.

Fase 4 — Aceptación diferida

Una decisión NO se acepta porque:

“ya probamos”

“no falló”

Se acepta cuando:

≥ 500 runs

0 divergencias

ventana temporal real (48–72h)

sin efectos secundarios

📌 Hoy:

D5 → 10+ runs, 0 divergencias

D6 → validado, empezando acumulación

3. Qué problemas reales resolvimos con D5/D6
✔️ Técnicos

Dedupe explícito y alineado

Constraints respetados

No más “INSERT que rompe todo”

Shadow logs que no desaparecen por rollback

✔️ Arquitectónicos

Separación:

decisión

efecto

Autoridad observable

Camino claro hacia orquestador

✔️ Organizacionales (muy importante)

Cualquier dev nuevo:

sabe dónde mirar

sabe cómo agregar una decisión

sabe cuándo algo está “aceptado”

4. Qué NO hicimos todavía (y está bien)

❌ No movimos la autoridad final al orquestador

❌ No apagamos triggers

❌ No tocamos UI

❌ No “limpiamos legacy”

👉 Estamos en fase de observación controlada, que es exactamente lo correcto.

5. Qué son D7 y D8 en este esquema

D7 y D8 no son especiales.
Son la prueba de que el patrón escala.

D7 — notify_workflow_completed

Pregunta que responde:

¿Cuándo el workflow completo está realmente terminado y debemos notificar?

Características:

Trigger: cambio agregado (no evento individual)

Depende de:

estado de TODOS los signers

Riesgos:

doble notificación

condiciones mal evaluadas

edge cases de último firmante

👉 Ideal para el patrón shadow.

D8 — notify_creator_detailed / final

Pregunta que responde:

¿Qué información exacta recibe el creador y cuándo?

Características:

Notificación “rica”

Mucho contexto

Históricamente propensa a bugs

Alta carga semántica

👉 Perfecta para:

validar que el patrón aguanta decisiones complejas

no solo booleanas simples

6. Cómo deberíamos seguir (orden recomendado)
Paso 1 — Definir contratos D7 y D8

Solo esto:

inputs

condiciones

outputs

NO implementación

📄 D7_NOTIFY_WORKFLOW_COMPLETED.md
📄 D8_NOTIFY_CREATOR_FINAL.md

Paso 2 — Implementar shadow mode

Exactamente igual a D5/D6:

legacy decide

canonical observa

log siempre

summary table

📌 Sin apagar nada.

Paso 3 — Validación mínima

1–2 runs manuales

confirmar:

logs aparecen

no hay rollback

no hay divergencias

Paso 4 — Acumulación en paralelo

Mientras:

D5

D6

D7

D8

acumulan runs juntos

7. Resultado esperado al cerrar D8

Cuando D7 y D8 estén en shadow:

Vas a tener:

4 decisiones de notificación

todas bajo el mismo patrón

todas con métricas

todas auditables

todas migrables al orquestador sin miedo

Ahí recién:

tiene sentido apagar legacy

tiene sentido mover autoridad

tiene sentido hablar de “sistema estable”

“D5 y D6 no fueron fixes: fueron la industrialización del proceso de migración de decisiones.
D7 y D8 son simplemente aplicar el mismo patrón para demostrar que escala.”
