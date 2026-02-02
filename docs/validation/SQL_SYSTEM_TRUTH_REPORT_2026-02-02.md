# Reporte SQL — Verdad Canónica y Consistencia del Sistema

**Fecha:** 2026-02-02  
**Objetivo:** responder solo esto: *¿el sistema es verdadero, consistente y canónico?*  
**No evalúa:** performance, UX, ni latencia (salvo como señal de ejecución).

---

## 1) Verdad canónica — eventos donde deben existir

### 1.1 Documentos con `document.protected.requested` sin `tsa.confirmed`

```sql
select
  d.id as document_entity_id,
  max(e.at) filter (where e.kind = 'document.protected.requested') as requested_at,
  max(e.at) filter (where e.kind = 'tsa.confirmed') as tsa_at
from document_entities d
left join lateral jsonb_to_recordset(d.events)
  as e(kind text, at timestamptz)
on true
group by d.id
having
  max(e.at) filter (where e.kind = 'document.protected.requested') is not null
  and max(e.at) filter (where e.kind = 'tsa.confirmed') is null;
```

**Resultado (muestra):** 7 entidades (históricas) solicitadas sin TSA confirmada.

**Interpretación:** no implica mentira; implica pendiente/colgado histórico. Se debe complementar con el query de “> 30 min”.

---

## 2) Invariante crítica — `entity_id === correlation_id`

```sql
select
  d.id,
  e.kind,
  e.at,
  e.entity_id,
  e.correlation_id
from document_entities d,
     jsonb_to_recordset(d.events)
       as e(kind text, at timestamptz, entity_id uuid, correlation_id uuid)
where e.entity_id <> e.correlation_id;
```

**Resultado:** hay filas históricas (eventos previos a la normalización del writer).

**Interpretación:** deuda histórica. El contrato actual exige igualdad; el control real es que **no se sigan generando** eventos nuevos con desigualdad.

---

## 3) Naming canónico — cero underscores en `kind`

```sql
select
  d.id,
  e.kind,
  e.at
from document_entities d,
     jsonb_to_recordset(d.events)
       as e(kind text, at timestamptz)
where e.kind like '%\_%' escape '\';
```

**Resultado:** 0 filas (en el ledger canónico).

**Interpretación:** el writer canónico está activo y estricto.

---

## 4) Flujo C (Share/NDA) — evidencia mínima

```sql
select
  d.id,
  bool_or(e.kind = 'share.created')   as has_share_created,
  bool_or(e.kind = 'share.opened')    as has_share_opened,
  bool_or(e.kind = 'nda.accepted')    as has_nda_accepted
from document_entities d,
     jsonb_to_recordset(d.events)
       as e(kind text)
group by d.id
having
  bool_or(e.kind = 'share.created')
  and not bool_or(e.kind = 'share.opened');
```

**Resultado:** 0 filas (en el entorno observado).  
**Nota:** no hubo casos reales de share con NDA en este set de pruebas.

---

## 5) Anti “doble verdad” — estado derivado vs evidencia

```sql
select
  d.id as document_id,
  d.status,
  max(e.at) filter (where e.kind = 'tsa.confirmed') as tsa_at
from documents d
join document_entities de on de.id = d.id
left join lateral jsonb_to_recordset(de.events)
  as e(kind text, at timestamptz)
on true
group by d.id, d.status
having
  d.status = 'protected'
  and max(e.at) filter (where e.kind = 'tsa.confirmed') is null;
```

**Resultado:** 0 filas.

**Interpretación:** no existen “protegidos falsos”. El estado `protected` es honesto (deriva de evidencia).

---

## 6) Ejecución — jobs y latencia real

### 6.1 Inspección de estado de jobs (sin asumir columnas)

```sql
select
  id,
  type,
  status,
  entity_id,
  correlation_id,
  now() - coalesce(heartbeat_at, locked_at, run_at, created_at) as silence_for,
  attempts,
  last_error
from executor_jobs
where status in ('running', 'locked', 'queued')
order by silence_for desc;
```

**Resultado:** 0 filas (no hay jobs activos colgados en este momento).

### 6.2 Dedupe (observación)

```sql
select
  type,
  dedupe_key,
  count(*) as jobs,
  min(created_at) as first_seen,
  max(created_at) as last_seen
from executor_jobs
group by type, dedupe_key
having count(*) > 1
order by jobs desc;
```

**Resultado (muestra):**
- `protect_document_v2` con `dedupe_key = null` (histórico)

**Interpretación:** no es un bloqueo actual. El dedupe real requiere `dedupe_key` no-null para ser informativo.

### 6.3 Latencia request → TSA (observación)

```sql
select
  de.id as document_entity_id,
  max(e.at) filter (where e.kind = 'document.protected.requested') as requested_at,
  max(e.at) filter (where e.kind = 'tsa.confirmed') as tsa_at,
  max(e.at) filter (where e.kind = 'tsa.confirmed')
    - max(e.at) filter (where e.kind = 'document.protected.requested')
    as total_latency
from document_entities de
left join lateral jsonb_to_recordset(de.events)
  as e(kind text, at timestamptz)
on true
group by de.id
having
  max(e.at) filter (where e.kind = 'tsa.confirmed') is not null
order by total_latency desc;
```

**Resultado (muestra):** latencias históricas grandes (horas/días) y latencias recientes en minutos/segundos.

**Interpretación:** latencia no implica inconsistencia. La verdad canónica sigue siendo correcta.

---

## 7) Sanity final — entidades fuera del ledger

```sql
select
  count(*) as docs,
  count(*) filter (where events is null or jsonb_array_length(events) = 0) as without_events
from document_entities;
```

**Resultado (muestra):** `without_events = 16`.

**Interpretación:** aceptable si corresponde a cuentas pre-canónicas/históricas. No invalida el sistema actual.

---

## Conclusiones

- ✅ No hay “protegidos falsos”: `protected` siempre implica `tsa.confirmed`.
- ✅ El ledger canónico no contiene underscores en `kind`.
- ✅ No hay jobs colgados activos (en el momento de la medición).
- ⚠️ Existen eventos históricos con `entity_id != correlation_id` (deuda histórica).
- ⚠️ Existen entidades pre-canónicas sin eventos (deuda histórica).
- ✅ La latencia observada es un tema de ejecución/TSA/cola; no contradice evidencia.
