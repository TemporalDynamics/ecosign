# CONTRATO_ECO_ECOX

Version: v1.0
Estado: Canonical
Ambito: Evidencia, forense, orquestacion y narrativa del sistema
Fecha: 2026-01-16

## 0. Proposito
Este contrato define la diferenciacion formal entre ECO y ECOX dentro del sistema, estableciendo:
- que constituye la evidencia primaria entregada al usuario,
- que constituye el registro tecnico interno del sistema,
- y como ambos se relacionan sin comprometer validez juridica, privacidad ni trazabilidad.

El objetivo es garantizar que la evidencia viva con el usuario, sea autosuficiente, y que el sistema sea explicable y defendible sin depender de accesos externos.

## 1. Definiciones

### Contexto Arquitectónico
EcoSign implementa Modelo B (Política Evolutiva) formalizado en
[MODELO_B_POLICY_EVOLUTION.md](./MODELO_B_POLICY_EVOLUTION.md).
Esto permite que ECO intermedio sea válido sin esperar a policy final.

### 1.1 ECO — Evidencia canonica del usuario
ECO es el artefacto de evidencia primario, completo y autosuficiente, generado por el sistema y entregado al usuario como representacion verificable de un hecho digital.

El ECO:
- representa la verdad probatoria del documento o proceso,
- es el unico artefacto que el usuario necesita conservar,
- es el unico artefacto requerido para verificacion por terceros.

Para el usuario y para terceros:
ECO = el documento evidencial.

### 1.2 ECOX — Registro tecnico interno del sistema
ECOX es un registro tecnico interno, de mayor granularidad, que preserva el contexto completo del proceso de generacion de la evidencia.

El ECOX:
- no es el documento del usuario,
- no es requerido para la validez probatoria del ECO,
- existe para fines de explicabilidad del sistema, auditoria tecnica, defensa del metodo, observabilidad y evolucion interna.

El ECOX puede generarse sistematicamente como parte del proceso interno,
independientemente de si el usuario lo solicita o no.

### 1.3 Document Entity = ECOX vivo (implementacion)
`document_entities` junto con su campo `events[]` constituye la implementacion
canonica del ECOX vivo.

- `events[]` representa la linea de tiempo append-only y es la fuente unica de verdad.
- Campos derivados como `tsa_latest`, `anchor_latest` u otros son proyecciones,
  nunca fuentes de verdad.
- El executor y los workers escriben eventos canonicos; no escriben estados.

El archivo `.ECOX` es una exportacion (snapshot) tecnica del estado del ECOX vivo
en un instante dado y no constituye una fuente de verdad.

### 1.4 ECOX exportado (no canonico)
Si existe una tabla `ecox_*`, su funcion es exclusivamente registrar
exportaciones del ECOX.

Dicha tabla puede incluir:
- `document_entity_id`
- `snapshot_seq`
- `requested_by`
- `generated_at`
- `hash`
- `storage_path`

Esta tabla:
- NO es fuente de verdad
- NO define estado del documento
- NO reemplaza a `document_entities.events[]`

## 2. Propiedades del ECO (obligatorias)

### Autosuficiencia probatoria
El ECO debe contener toda la informacion necesaria para:
- verificacion criptografica,
- analisis pericial,
- evaluacion judicial del hecho.

### No reversibilidad
El ECO no debe permitir:
- reconstruir el documento original,
- acceder al contenido sensible subyacente.

### Independencia del sistema
El ECO no debe requerir:
- acceso a la plataforma,
- solicitudes al proveedor,
- informacion externa no incluida.

### Append-only / determinismo verificable
El ECO debe ser:
- append-only, o
- reconstruible de forma deterministica a partir de eventos verificables.

### Neutralidad narrativa
El ECO describe que ocurrio, no por que el sistema decidio algo.

### Alcance de la firma
La firma de EcoSign certifica la fidelidad del snapshot respecto al estado del sistema,
no la inexistencia de eventos futuros.

## 3. Contenido permitido en el ECO
El ECO puede incluir:
- hashes criptograficos,
- timestamps (TSA, blockchain u otros),
- anclajes (Polygon, Bitcoin, etc.),
- firmas digitales,
- secuencia temporal de eventos relevantes,
- metricas de interaccion (tiempo de visualizacion, scroll, foco, orden de acciones),
- identificadores de artefactos evidenciales (witness, copia fiel, etc.).

Todo contenido incluido en el ECO debe ser:
- relevante para la evaluacion del hecho,
- comprensible por un perito,
- defendible ante terceros.

## 4. Propiedades del ECOX (internas)
El ECOX puede incluir:
- eventos tecnicos internos,
- retries y reintentos,
- decisiones descartadas,
- resultados intermedios de workers,
- metadata de ejecucion (executor, jobs, timing),
- informacion de observabilidad.

El ECOX se entrega al usuario como archivo independiente con extension .ECOX,
tipicamente mediante exportacion o envio por correo electronico, y representa
la capa forense extendida del ECO.
El ECOX no debe:
- presentarse como evidencia primaria,
- ser requerido para verificar un ECO,
- exponerse por defecto al usuario final.

## 5. Relacion ECO ↔ ECOX
- Todo lo que esta en el ECO puede existir en el ECOX.
- No todo lo que esta en el ECOX debe existir en el ECO.
- El ECO es un subset curado.
- El ECOX es un superset tecnico.

Regla de oro:
- Si solo existe el ECO, la evidencia es valida.
- Si existe el ECOX, el sistema es explicable.

## 6. Visibilidad y control
- El usuario solo interactua con ECO.
- El sistema no requiere que el usuario solicite ECOX para defender su caso.
- El ECOX es interno por defecto.
- Cualquier acceso a ECOX, si existiera, es excepcional, tecnico y no probatorio.
- La recepcion de un archivo .ECOX indica un nivel de detalle tecnico superior al ECO,
  sin requerir interpretacion ni intervencion del proveedor.
- La generacion y entrega del ECOX es automatica; el proveedor no inspecciona,
  interpreta ni analiza su contenido.

## 7. Implicancias para la arquitectura

### UI
- Muestra ECO como formato base.
- Puede mostrar artefactos derivados (copia fiel, original si existe).
- No depende de ECOX.

### Executor
- Orquesta procesos basandose en eventos.
- Puede producir eventos que alimenten ECO (si son relevantes) o ECOX (si son tecnicos).
- No toma decisiones basadas en ECOX para afectar la evidencia del usuario.

### Storage
- No almacena contenido sensible sin consentimiento.
- Diferencia entre evidencia usable, evidencia cifrada y registros tecnicos.

## 7.5 ECO Intermedio (Por Firmante) = Snapshot Válido

### Contexto: Modelo B (Política Evolutiva)

En EcoSign, cada firmante recibe su ECO **en el momento en que es su turno**,
no espera a que el proceso termine.

Esta es una característica del Modelo B (Política Evolutiva).
Ver `MODELO_B_POLICY_EVOLUTION.md` para contexto arquitectónico.

### ECO Intermedio: Definición

Un ECO generado durante el flujo (antes de `artifact.finalized`) es válido
y debe ser tratado como tal. Contiene:

- `status: "valid_intermediate"` (estado probatorio válido en curso)
- `certified`: lo que ya está confirmado (ej: TSA confirmado)
- `strengthening_pending`: lo que está en proceso (ej: Bitcoin en 5 minutos)
- `hashes`: H_c (invariable), H_s (acumulados), H_r (Merkle determinístico)
- `signatures_count`: firmas aplicadas hasta ese momento

Ejemplo:
```json
{
  "eco_version": "2.0",
  "generated_at": "2026-02-20T15:31:00Z",
  "status": "valid_intermediate",
  "certified": ["tsa"],
  "strengthening_pending": ["polygon", "bitcoin"],
  "signatures_count": 2,
  "hashes": {
    "content_hash": "abc123...",
    "witness_hash": "def456...",
    "root_hash": "ghi789..."
  }
}
```

### Semántica de "Valid Intermediate"

La presencia de `status: "valid_intermediate"` significa:

✓ **Contenido íntegro**: H_c coincide (sin adulteración)
✓ **Firmas válidas**: H_s confirmados son auténticos
✓ **Próxima acción esperada**: Más firmas o anchors vienen
✓ **Suficiente para auditoría**: Perito puede revisar estado intermedio

NO significa:
✗ "Incompleto" (ese es término negativo, evitar)
✗ "Borrador" (sugiere que no es final, pero SÍ es válido para su momento)
✗ "Provisional" (sugiere que puede cambiar, NO: H_c es inmutable)

### Cuándo Se Genera ECO Intermedio

ECO intermedio se genera:

1. **Al completar acción de firmante**: Cuando Firmante 1 firma, recibe su ECO
2. **Al confirmar TSA**: ECO con TSA confirmado, otros anchors pending
3. **Al confirmar Polygon**: ECO con TSA + Polygon, Bitcoin pending
4. **En cualquier punto del flujo**: Donde el verificador pueda auditar

### Invariante: H_c NUNCA Cambia

Aunque otros campos evolucionen:
- `certified` crece
- `signatures_count` crece
- `strengthening_pending` se reduce

El **content_hash (H_c) permanece IDÉNTICO** en todos los ECO intermedios.

Verificador usará esta propiedad:
- Si H_c es igual en ECO_T1 y ECO_T2 → contenido es íntegro (sin cambios)
- Si H_c es diferente → contenido fue alterado (RECHAZAR)

---

## 7.6 ECO Final = Institucional Firmado

### Cuándo Se Genera ECO Final

ECO final se genera **cuando `artifact.finalized` ocurre**:
- Todas las firmas requeridas están presentes
- Todos los anchors en `required_evidence` están confirmados
- Sistema emite evento `artifact.finalized`

### Estructura de ECO Final

ECO final incluye **firma institucional** (Ed25519):

```json
{
  "eco_version": "2.0",
  "generated_at": "2026-02-20T15:35:00Z",
  "status": "valid_final",
  "certified": ["tsa", "polygon", "bitcoin"],
  "strengthening_pending": [],
  "signatures_count": 5,
  "hashes": {
    "content_hash": "abc123...",
    "witness_hash": "def456...",
    "root_hash": "ghi789..."
  },
  "ecosign_signature": {
    "key_id": "ks_2026_001",
    "algorithm": "Ed25519",
    "signature": "base64_encoded_signature_here...",
    "signed_at": "2026-02-20T15:35:00Z"
  }
}
```

### Qué Certifica La Firma Institucional

La firma Ed25519 certifica:

✓ **Fidelidad del snapshot**: El contenido del ECO es exacto al momento `signed_at`
✓ **Integridad del árbol Merkle**: H_c, H_s, H_r son derivados correctamente
✓ **Completitud del proceso**: Todas las acciones registradas están incluidas

NO certifica:
✗ "Inexistencia de eventos futuros" (regla 2.6 del contrato)
✗ "Finalidad absoluta" (podría haber ECOX adicional, pero no afecta ECO)

### Cómo Se Relacionan ECO Intermedio y ECO Final

| Característica | ECO Intermedio | ECO Final |
|---|---|---|
| `status` | `valid_intermediate` | `valid_final` |
| `certified` | Parcial (ej: ["tsa"]) | Completo (todas las requeridas) |
| `strengthening_pending` | No-vacío | Vacío |
| Firma institucional | NO | SÍ (Ed25519) |
| H_c | Invariable | Invariable (IGUAL a intermedio) |
| Validez probatoria | ✓ Válido | ✓ Válido (más fuerte) |
| Uso en juicio | Válido para etapa intermedia | Preferible para conclusión |

**Principio**: El H_c invariable garantiza que ambos se refieren al MISMO contenido.
No hay contradicción. Solo hay refinamiento temporal.

---

## 7.7 Cómo Verificar Sin Rechazar Intermedios

### Rol del Verificador

Verificador puede ser:
- Usuario mismo (auto-verificación)
- Perito judicial
- Auditor técnico
- Tercero neutral

### Algoritmo de Verificación

```
1. Recibe ECO (intermedio o final)

2. Calcula H_c_local = SHA256(contenido_proporcionado)

3. Compara:
   IF H_c_local == ECO.content_hash THEN
     "Contenido íntegro ✓"
   ELSE
     "Adulteración detectada ✗"
     REJECT

4. Valida Merkle tree (H_s, H_r):
   IF H_r_computed == ECO.root_hash THEN
     "Árbol Merkle válido ✓"
   ELSE
     "Discrepancia en hashes ✗"
     REJECT

5. Verifica firma institucional (si existe):
   IF verify(ECO.ecosign_signature, ECO_body) THEN
     "Firma Ed25519 válida ✓"
   ELSE
     "Firma falsa ✗"
     REJECT

6. Emite resultado:
   IF ECO.status == "valid_final" AND todo lo anterior THEN
     "VÁLIDO FINAL" → máxima confianza
   ELSE IF ECO.status == "valid_intermediate" AND H_c OK AND H_r OK THEN
     "VÁLIDO INTERMEDIO" → confianza actual, refuerzo pendiente
   ELSE
     "INVÁLIDO" → rechazar
```

### Mensajes de Verificación

El verificador DEBE comunicar:

**Estado Intermedio (Correcto)**:
```
✓ Documento válido en estado intermedio
  Contenido: íntegro (H_c confirmado)
  Firmas: 2 de 5 presentes
  Anchors: TSA confirmado, Bitcoin en proceso
  Refuerzo esperado: ~5 minutos
```

**Estado Final (Correcto)**:
```
✓ Documento válido - estado final
  Contenido: íntegro (H_c confirmado)
  Firmas: 5 de 5 completadas
  Anchors: TSA, Polygon, Bitcoin confirmados
  Certificado por EcoSign (Ed25519)
```

**Adulteración (Incorrecto)**:
```
✗ DOCUMENTO ADULTERADO
  Razón: Content hash no coincide
  H_c esperado: abc123...
  H_c actual: xyz789...
```

### Lo Que NO Debe Hacer El Verificador

- ✗ Rechazar "válido intermedio" como "incompleto"
- ✗ Exigir firma institucional para aceptar intermedio
  (Firma institucional es para **máxima confianza**, no requisito)
- ✗ Requieren acceso a EcoSign para verificar
  (Todo se calcula localmente de los hashes)
- ✗ Confundir "intermedio" con "falso negativo"
  (Intermedio = positivo, refuerzo en curso)

---

## 8. Principio rector final
La evidencia pertenece al usuario.
El sistema no es custodio de la verdad, sino garante de su trazabilidad.

El ECO existe para probar un hecho.
El ECOX existe para explicar el sistema.

Confundir ambos debilita la evidencia.
Separarlos fortalece la arquitectura.

## 9. Clausula de independencia
La ausencia, perdida o no disponibilidad de un ECOX no invalida ni debilita
un ECO existente.

## 10. Estado del contrato
Este contrato es canonico.
Toda implementacion futura (executor, workers, UI, storage, verificacion) debe alinearse con estas definiciones.
Referencia operativa: `docs/ops/HITO_CORE_E2E_LOCAL.md`.
### Regla Operativa de Terminología

Para contratos, UI y verificadores, usar siempre el literal `valid_intermediate`:

- `valid_intermediate` identifica un ECO válido en etapa no terminal.
- `valid_intermediate` no requiere esperar cierre total del workflow.
- `valid_intermediate` preserva soberanía de evidencia por firmante.
- `valid_intermediate` es aceptado por el verificador como estado válido.
- `valid_intermediate` es compatible con refuerzo posterior (`strengthening_pending`).
- `valid_intermediate` debe mantenerse estable entre capas (backend/UI/verificador).
