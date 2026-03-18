# Happy Path 04: Workflow de firma (multi-signer secuencial)

**Clasificacion:** CORE
**Actor:** Owner (crea workflow) + Signers (firman en orden)
**Trigger:** Owner selecciona "Crear flujo de firmas"
**Fuentes:** HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md, GUEST_SIGNATURE_FLOW.md, ECOSIGN_FLOW_SUMMARY.md

---

## Paso a paso

### Fase A: Creacion (Owner)

1. Owner crea `signature_workflow` con status `draft`
2. Owner agrega firmantes con:
   - Orden de firma (1, 2, 3...)
   - Email
   - Nombre (opcional)
   - Requisitos: `require_login`, `require_nda`, `quick_access`
   - Modo de entrega: email, link, o mixto
3. Owner activa workflow: status `draft` -> `active`

### Fase B: Distribucion (Sistema)

4. Sistema pone al primer firmante en status: `pending` -> `ready`
5. Sistema genera `access_token` unico por firmante
6. Trigger `on_signer_created` dispara -> crea `workflow_notifications` con status `pending`
7. Email worker (`send-pending-emails`) envia invitacion con link magico:
   `https://app.ecosign.app/sign/{access_token_hash}`

### Fase C: Firma (cada Signer en orden)

8. Firmante recibe email y clickea link
9. Firmante accede a pagina de firma
10. Sistema logea evento `access_link_opened`
11. (Si configurado) Sistema aplica verificacion OTP
12. Firmante revisa documento y aplica firma (visual/texto/OTP)
13. Sistema procesa firma:
    - Genera RFC 3161 TSA token (si configurado)
    - Crea registro `workflow_signatures` (inmutable)
    - Agrega evento `signature` al documento
    - Actualiza signer status: `ready` -> `signed`

### Fase D: Secuencia (Sistema)

14. Trigger `on_signature_completed` dispara -> notificaciones a owner + signer
15. Siguiente firmante: `pending` -> `ready`, recibe invitacion
16. Repite pasos 8-15 para cada firmante

### Fase E: Cierre

17. Ultimo firmante firma -> Trigger `on_workflow_completed` dispara
18. Owner + todos los signers reciben notificacion con link de descarga ECO
19. Workflow status: `active` -> `completed`

## Estado final

Todos los firmantes han firmado, workflow completado, certificados ECO generados.

## Reglas

- TSA DEBE completarse ANTES de avanzar al siguiente firmante
- Regla dura: "sin evidencia forense = no avanza"
- Cada access_token es unico y no reutilizable entre firmantes
- Las firmas son inmutables: no se pueden editar ni eliminar
- El orden secuencial es estricto: signer 2 NO puede firmar antes que signer 1
