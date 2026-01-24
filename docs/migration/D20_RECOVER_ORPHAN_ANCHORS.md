# D20 - Recover Orphan Anchors (Contrato)

**Fecha de inicio:** 2026-01-24  
**Fase:** 1 - Contrato (DEFINICION)  
**Grupo:** 4 - Anchoring / Infra (worker)

---

## Que decide

**Decision:** "¿Se debe disparar recovery para anchors huérfanos?"

**Contexto:**  
Safety net por cron. Detecta documentos con `polygon_status` o `bitcoin_status`
pendiente pero sin registro en `anchors`, y dispara edge functions de creación
de anchors como fallback.

```
Cron (pg_cron): detect_and_recover_orphan_anchors()
         ↓
     [D20: Recover?] → net.http_post /functions/v1/anchor-polygon
                      net.http_post /functions/v1/anchor-bitcoin
```

**Responsabilidad actual:** SQL cron job  
`supabase/migrations/20251221100003_orphan_recovery_cron_fixed.sql`

---

## Inputs

### Datos requeridos (query):
- **user_documents**:
  - `polygon_status = 'pending'` con **no** anchor `polygon`
  - `bitcoin_status = 'pending'` con **no** anchor `opentimestamps`
- **created_at** dentro de `NOW() - 2 hours`

### Contexto adicional:
- **anchors** (para verificar ausencia)
- **auth.users** (email para notificación / metadata)

---

## Output

### Resultado (si decision es TRUE):

1) **Disparar creación de anchor polygon**
```sql
SELECT net.http_post('/functions/v1/anchor-polygon', payload)
```

2) **Disparar creación de anchor bitcoin**
```sql
SELECT net.http_post('/functions/v1/anchor-bitcoin', payload)
```

---

## Invariantes

1) **Solo documentos recientes**
- `created_at > NOW() - INTERVAL '2 hours'`.

2) **Sin anchor existente**
- No debe existir `anchors` asociado al documento para la red objetivo.

3) **Solo pending**
- `polygon_status = 'pending'` o `bitcoin_status = 'pending'`.

4) **Throttle**
- Máximo 10 documentos por corrida (por red).

5) **Ejecución segura**
- No muta `user_documents` directamente.
- No crea eventos canónicos.

---

## Que NO decide

- No confirma anchors (eso es D21/D22).
- No valida witness hash ni causalidad.
- No actualiza `protection_level`.
- No encola TSA ni artifact.

---

## Regla canonica (formal)

```typescript
export interface RecoverOrphanAnchorsInput {
  document: {
    id: string;
    created_at: string;
    polygon_status?: string | null;
    bitcoin_status?: string | null;
    has_polygon_anchor: boolean;
    has_bitcoin_anchor: boolean;
  };
  now: string;
}

export const shouldRecoverPolygon = (input: RecoverOrphanAnchorsInput): boolean => {
  const recent = new Date(input.document.created_at) > new Date(Date.now() - 2 * 60 * 60 * 1000);
  return recent && input.document.polygon_status === 'pending' && !input.document.has_polygon_anchor;
};

export const shouldRecoverBitcoin = (input: RecoverOrphanAnchorsInput): boolean => {
  const recent = new Date(input.document.created_at) > new Date(Date.now() - 2 * 60 * 60 * 1000);
  return recent && input.document.bitcoin_status === 'pending' && !input.document.has_bitcoin_anchor;
};
```

---

## Casos de prueba

**Test 1:** Polygon orphan reciente
```typescript
Input: polygon_status='pending', no anchor, created_at reciente
Output: true
```

**Test 2:** Documento antiguo
```typescript
Input: created_at > 2h
Output: false
```

**Test 3:** Anchor ya existe
```typescript
Input: has_polygon_anchor=true
Output: false
```

