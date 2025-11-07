export interface CopyVariant {
  id: string;
  hero: {
    title: string;
    subtitle: string;
    primaryCTA: string;
    secondaryCTA: string;
  };
  value: {
    headline: string;
    description: string;
    features: Array<{ icon: string; text: string }>;
    cta: string;
  };
}

export const copyVariants: Record<string, CopyVariant> = {
  A: {
    id: "A",
    hero: {
      title: "La Capa de Confianza Digital que Necesitas Hoy",
      subtitle: "No esperes a mañana para proteger tus documentos más valiosos. VerifySign crea evidencia forense inmutable en minutos, sin burocracias ni dependencias gubernamentales.",
      primaryCTA: "Proteger Mis Documentos Ahora",
      secondaryCTA: "Ver Cómo Funciona",
    },
    value: {
      headline: "Tu Documento, Tu Prueba, Tu Soberanía",
      description: "Cada segundo sin protección es un riesgo. VerifySign te da:",
      features: [
        { icon: "✅", text: "Prueba de autoría instantánea" },
        { icon: "✅", text: "Timestamp criptográfico inviolable" },
        { icon: "✅", text: "Certificados .ECO que funcionan sin nosotros" },
        { icon: "✅", text: "Reconocimiento legal en crecimiento" },
      ],
      cta: "Crear Mi Primer Certificado Gratis",
    },
  },
  B: {
    id: "B",
    hero: {
      title: "Devuélvele el Poder de la Verdad a Tus Manos",
      subtitle: "Durante décadas, certificar documentos ha sido caro, lento y dependiente de terceros. Ya no más. VerifySign democratiza la confianza digital para todos.",
      primaryCTA: "Unirme a la Revolución Digital",
      secondaryCTA: "Conocer la Tecnología",
    },
    value: {
      headline: "No Vendemos Firmas, Vendemos Verdad",
      description: "VerifySign nació de una convicción simple: la justicia digital debe ser accesible.",
      features: [
        { icon: "💪", text: "Sin intermediarios innecesarios" },
        { icon: "🌐", text: "Evidencia verificable por cualquiera" },
        { icon: "🔓", text: "Tu certificado funciona para siempre" },
        { icon: "⚖️", text: "Válido en procesos legales globales" },
      ],
      cta: "Comenzar Mi Certificación Forense",
    },
  },
  C: {
    id: "C",
    hero: {
      title: "Certificación Digital en 3 Minutos",
      subtitle: "Sube tu archivo. Recibe tu certificado .ECO. Listo. La protección forense de documentos nunca fue tan simple ni tan rápida.",
      primaryCTA: "Probar Gratis en 3 Minutos",
      secondaryCTA: "Ver Ejemplo de Certificado",
    },
    value: {
      headline: "¿Por Qué Esperar Semanas Si Puedes Tener Tu Evidencia Hoy?",
      description: "No más trámites interminables. No más papeleos. No más esperas.",
      features: [
        { icon: "⚡", text: "Certificado .ECO en menos de 5 minutos" },
        { icon: "🎯", text: "Sin registro obligatorio para empezar" },
        { icon: "📦", text: "Descarga instantánea de tu evidencia" },
        { icon: "✅", text: "Funciona para contratos, proyectos, NDA y más" },
      ],
      cta: "Empezar Ahora (Sin Tarjeta)",
    },
  },
};

export function getActiveVariant(): string {
  const stored = localStorage.getItem("copy_variant");
  if (stored && copyVariants[stored]) {
    return stored;
  }

  const variants = ["A", "A", "A", "B", "C"];
  const selected = variants[Math.floor(Math.random() * variants.length)];
  localStorage.setItem("copy_variant", selected);

  return selected;
}

export function getCopyVariant(): CopyVariant {
  const variantId = getActiveVariant();
  return copyVariants[variantId];
}
