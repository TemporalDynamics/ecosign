# Fields & FieldGroup Lifecycle
Fecha: 2026-01-12T17:33:37.144Z

Descripción
-----------
Modelo de campos: field_groups asignados a roles/signers y fields instanciados por página.

Mermaid (flowchart)
--------------------
```mermaid
flowchart LR
  A[Create Field (template)] --> B[Assign to FieldGroup]
  B --> C{Group assignment}
  C -->|role (Firmante 1)| D[role_index=1]
  C -->|unassigned| E[template pool]
  D --> F[Materialize instances]
  F --> G[Instances per page with bbox_norm]
  G --> H[Render in preview]
  H --> I[Signer views own fields]
  I --> J[Signer fills/applies signature => FIELD_COMPLETED]

  subgraph replication
    X[Duplicate local] --> G
    Y[Duplicate across pages] --> F
  end
```

Notas rápidas
-------------
- Posiciones deben guardarse en coordenadas normalizadas (x,y,w,h en 0..1).
- repeat_spec se materializa al bloquear workflow para garantizar determinismo forense.
- Duplicación conserva assignment (mismo signer_role/id).

Nota adicional
---------------
- Field instances are immutable once the workflow enters ACTIVE state.
