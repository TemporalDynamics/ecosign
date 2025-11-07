# Variantes de Copy para A/B Testing - VerifySign

## Objetivo
Maximizar conversiones en la landing page probando diferentes enfoques de messaging.

---

## Variante A: "Urgencia y Protección" (Actual Mejorada)

### Hero Section
**Título**: La Capa de Confianza Digital que Necesitas Hoy

**Subtítulo**: No esperes a mañana para proteger tus documentos más valiosos. VerifySign crea evidencia forense inmutable en minutos, sin burocracias ni dependencias gubernamentales.

**CTAs**:
- Botón Principal: "Proteger Mis Documentos Ahora"
- Botón Secundario: "Ver Cómo Funciona"

### Sección de Valor
**Headline**: Tu Documento, Tu Prueba, Tu Soberanía

**Copy**:
Cada segundo sin protección es un riesgo. VerifySign te da:
- ✅ Prueba de autoría instantánea
- ✅ Timestamp criptográfico inviolable
- ✅ Certificados .ECO que funcionan sin nosotros
- ✅ Reconocimiento legal en crecimiento

**CTA**: "Crear Mi Primer Certificado Gratis"

---

## Variante B: "Empoderamiento y Justicia"

### Hero Section
**Título**: Devuélvele el Poder de la Verdad a Tus Manos

**Subtítulo**: Durante décadas, certificar documentos ha sido caro, lento y dependiente de terceros. Ya no más. VerifySign democratiza la confianza digital para todos.

**CTAs**:
- Botón Principal: "Unirme a la Revolución Digital"
- Botón Secundario: "Conocer la Tecnología"

### Sección de Valor
**Headline**: No Vendemos Firmas, Vendemos Verdad

**Copy**:
VerifySign nació de una convicción simple: la justicia digital debe ser accesible.

- 💪 Sin intermediarios innecesarios
- 🌐 Evidencia verificable por cualquiera
- 🔓 Tu certificado funciona para siempre
- ⚖️ Válido en procesos legales globales

**CTA**: "Comenzar Mi Certificación Forense"

---

## Variante C: "Simplicidad y Velocidad"

### Hero Section
**Título**: Certificación Digital en 3 Minutos

**Subtítulo**: Sube tu archivo. Recibe tu certificado .ECO. Listo. La protección forense de documentos nunca fue tan simple ni tan rápida.

**CTAs**:
- Botón Principal: "Probar Gratis en 3 Minutos"
- Botón Secundario: "Ver Ejemplo de Certificado"

### Sección de Valor
**Headline**: ¿Por Qué Esperar Semanas Si Puedes Tener Tu Evidencia Hoy?

**Copy**:
No más trámites interminables. No más papeleos. No más esperas.

- ⚡ Certificado .ECO en menos de 5 minutos
- 🎯 Sin registro obligatorio para empezar
- 📦 Descarga instantánea de tu evidencia
- ✅ Funciona para contratos, proyectos, NDA y más

**CTA**: "Empezar Ahora (Sin Tarjeta)"

---

## Recomendación de Testing

### Test Principal (60% tráfico)
**Variante A** - Balance entre urgencia y protección. Enfoque en el valor inmediato.

### Test Secundario (20% tráfico cada una)
- **Variante B** - Para audiencia consciente de problemas de justicia digital
- **Variante C** - Para audiencia que valora velocidad y simplicidad

### Métricas a Medir
1. **Tasa de Conversión Principal**: CTAs a /app/access
2. **Engagement**: Tiempo en página
3. **Conversión a Pago**: Free → Standard/Premium
4. **Bounce Rate**: Porcentaje que sale sin interactuar

### Herramientas Sugeridas
- **Google Optimize** (gratis, fácil integración)
- **Supabase** (tracking interno de eventos)
- **Netlify Analytics** (métricas de tráfico)

---

## Implementación

### Paso 1: Crear archivo de configuración
```typescript
// app/src/config/copyVariants.ts
export const copyVariants = {
  A: { /* Variante A */ },
  B: { /* Variante B */ },
  C: { /* Variante C */ },
};

export function getActiveVariant(): string {
  const stored = localStorage.getItem('copy_variant');
  if (stored) return stored;

  const variants = ['A', 'A', 'A', 'B', 'C']; // 60-20-20
  const selected = variants[Math.floor(Math.random() * variants.length)];
  localStorage.setItem('copy_variant', selected);

  return selected;
}
```

### Paso 2: Actualizar index.html
Usar JavaScript para cambiar dinámicamente el copy según la variante asignada.

### Paso 3: Tracking
```typescript
// Registrar en Supabase qué variante vio y si convirtió
await supabase.from('conversion_events').insert({
  variant: getActiveVariant(),
  action: 'cta_click',
  timestamp: new Date().toISOString(),
});
```

---

## Análisis Esperado

### Hipótesis
- **Variante A** tendrá mejor conversión inicial (CTR más alto)
- **Variante B** tendrá mejor conversión a pago (usuarios más comprometidos)
- **Variante C** tendrá menor bounce rate (mensaje más claro)

### Duración del Test
Mínimo 2 semanas o 1000 visitantes por variante (lo que ocurra primero).

### Criterio de Éxito
Mejora de +15% en conversión principal o +25% en conversión a pago.

---

## Copy Adicional para Secciones Clave

### Testimonios (Placeholder)
> "VerifySign me dio la tranquilidad de que mi proyecto estaba protegido antes de compartirlo. El certificado .ECO fue aceptado como evidencia en mi disputa." - María G., Diseñadora

> "Como abogado, necesitaba una solución rápida y confiable. VerifySign entregó en segundos lo que hubiera tardado días con un notario." - Dr. Carlos M., Abogado

### Trust Indicators
- 🔒 Cifrado de nivel militar (AES-256)
- ⛓️ Anclaje en blockchain público
- 🏛️ Reconocido en procesos legales de EE.UU.
- 🌍 Más de 10,000 certificados generados

---

## Próximos Pasos

1. **Implementar tracking básico** en Supabase
2. **Crear componente A/B Test** en React
3. **Desplegar variantes** con rotación automática
4. **Monitorear métricas** semanalmente
5. **Iterar** basado en resultados

---

**Última actualización**: Noviembre 2025
**Responsable**: Equipo VerifySign
**Estado**: Listo para implementar
