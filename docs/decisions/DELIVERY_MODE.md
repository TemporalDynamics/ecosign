# Decision: Delivery Mode (Email vs Link)

**Fecha:** 2026-01-15
**Estado:** Aprobado
**Autor:** Claude + Manu

## Contexto

Los workflows de firma necesitan dos modos de entrega:
1. **Email**: El sistema envía invitaciones automáticamente a los firmantes
2. **Link**: El creador comparte el link manualmente (sin emails automáticos)

## Opciones Consideradas

1. **Flag por firmante** - Cada signer tiene su propio delivery_mode
2. **Flag por workflow** - Un solo modo para todo el workflow (elegida)
3. **Inferir del contexto** - Sin flag explícito, derivar del comportamiento

## Decisión

**`delivery_mode` es propiedad del workflow, no del firmante.**

Reglas:
- Valores: `'email'` (default) | `'link'`
- **Inmutable después de la creación del workflow**
- Afecta solo notificaciones a firmantes
- Owner siempre recibe notificaciones (independiente del modo)

## Implementación

```typescript
// start-signature-workflow
delivery_mode: deliveryMode // 'email' or 'link'

// process-signature
if (nextSigner && workflowDeliveryMode === 'email') {
  // Enviar notificación
} else if (nextSigner && workflowDeliveryMode === 'link') {
  // Log, no enviar email
}
```

## Consecuencias

**Positivas:**
- UX clara: el creador decide una vez
- Simplicidad: no hay mixed modes por firmante
- Demo-ready: link mode funciona para brokers sin emails

**Negativas:**
- No se puede cambiar mid-workflow (by design)
- Si un firmante necesita email, hay que crear nuevo workflow

## Referencias

- `supabase/functions/start-signature-workflow/index.ts`
- `supabase/functions/process-signature/index.ts`
- `docs/contratos/EVENTS_VS_NOTIFICATIONS.md`
