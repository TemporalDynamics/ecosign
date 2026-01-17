# WORKSPACE PLAN CONTRACT

Version: v1.0  
Estado: CANONICO  
Ambito: Economico · Operativo · Enforcement Backend

## 1. Proposito
Definir de manera canonica el modelo de planes, limites y enforcement de
EcoSign, estableciendo al workspace como la unidad unica de control
economico, legal y operativo.

Este contrato rige:

- planes
- limites
- add-ons
- upgrades / downgrades
- enforcement backend

## 2. Definicion fundamental: Workspace Pooled
Un workspace es la unidad economica, legal y de enforcement del sistema.

Los planes se asignan a workspaces.  
Los usuarios pertenecen a workspaces.  
Todos los recursos se consumen en pool a nivel workspace.

No existen planes por usuario.  
No existen limites individuales por usuario.

## 3. Entidades canonicas

### 3.1 Workspace
Representa una organizacion, empresa o cuenta individual.

Un workspace:

- posee un plan activo
- posee limites
- acumula add-ons
- contiene usuarios, documentos y operaciones

### 3.2 Usuario (Seat)
Un usuario es un asiento dentro de un workspace.

Consume un seat del plan.

Tiene un rol (owner / supervisor / member / read-only).

No posee limites propios.

### 3.3 Plan
Un plan define:

- limites base
- capabilities (feature flags)
- precio de referencia (no billing)

Ejemplos:

- FREE
- PRO
- BUSINESS
- ENTERPRISE

ENTERPRISE puede definir limites y capabilities custom por contrato.

## 4. Recursos sujetos a enforcement

### 4.1 Recursos con limite
Los siguientes recursos se controlan por workspace:

Recurso | Tipo
--- | ---
Usuarios (seats) | Limite duro
Storage base (GB) | Limite duro
Firmas legales incluidas | Cuota periodica
Workflows activos (solo FREE) | Limite blando
Re-notificaciones | Rate limit

### 4.2 Recursos sin limite
No se limitan:

- cantidad de documentos
- cantidad de flujos totales
- cantidad de firmantes invitados

## 5. Storage

### 5.1 Storage base
Cada plan incluye una cantidad de storage base.

### 5.2 Storage extra (add-on)
El storage extra:

- se compra como ampliacion permanente de cuota
- se acumula en el workspace
- no expira
- no se pierde al bajar de plan

Condicion canonica:

El storage extra es valido mientras la cuenta exista y permanezca activa,
sujeto a politicas de uso razonable y continuidad del servicio.

### 5.3 Enforcement de storage
Si storage_usado >= storage_total:

- se bloquean nuevos uploads
- no se borra contenido
- no se cobra excedente automatico

## 6. Firmas

### 6.1 Firmas legales incluidas
Son una cuota del workspace.

Se consumen en pool.

La cuota periodica se reinicia segun el ciclo del plan activo.

Al agotarse:

- se bloquea iniciar nuevos flujos de firma
- no se afecta la lectura ni descarga de documentos existentes

### 6.2 Firmas certificadas (QES)
No forman parte del plan.

Se consumen por uso o saldo prepago.

Si no hay saldo:

- se bloquea esa accion puntual
- no se bloquea la cuenta ni el workspace

## 7. Blindaje forense (Capabilities)
El blindaje forense se expresa mediante capabilities, no textos ambiguos.

Ejemplos:

- tsa_enabled
- polygon_anchor_enabled
- bitcoin_anchor_enabled
- ecoX_export_enabled
- audit_panel_enabled
- api_access_scope = none | limited | full

Regla:

FREE puede operar con rutas de proteccion mas lentas.  
Capabilities avanzadas pueden ofrecerse como add-ons.

## 8. Documentos incompletos y enforcement
Un documento incompleto se define por el contrato
DOCUMENT_INCOMPLETE_CONTRACT.md.

Reglas:

- No se penaliza la existencia de documentos incompletos.
- En FREE pueden limitarse:
  - workflows activos simultaneos
  - re-notificaciones por workflow
- Los planes pagos no limitan documentos incompletos.

### 8.1 Archivar documento
Archivar es un estado terminal suave.

Cancela flujos activos sin borrar evidencia.

Equivale a cancelacion a efectos de enforcement.

Evento canonico: document.archived

## 9. Upgrade y Downgrade de plan

### 9.1 Upgrade
Efecto inmediato.

Aumenta limites y capabilities.

### 9.2 Downgrade
No borra datos.

Si el workspace excede limites:

- seats excedentes -> usuarios pasan a estado inactive
- storage excedido -> se bloquean nuevos uploads
- firmas agotadas -> se bloquean nuevos flujos

El supervisor decide como ajustar el workspace.

## 10. Auditoria y ECOX
Todos los workspaces generan evidencia ECOX.

La evidencia no depende del plan.

"Auditoria avanzada" define:

- UI
- herramientas
- facilidad de acceso
- APIs

No define la existencia de evidencia.

## 11. Principios de enforcement
Nunca borrar datos por limites.

Nunca cobrar excedentes automaticos.

Nunca bloquear lectura o descarga.

Bloquear solo nuevas acciones.

Enforcement siempre a nivel workspace.

Enforcement basado en hechos canonicos.

## 12. Precedencia
En caso de conflicto:

1. Este contrato
2. Contratos canonicos relacionados
3. Implementacion tecnica
