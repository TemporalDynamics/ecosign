// Base de datos de artículos para News
// Actualizar semanalmente agregando nuevos artículos

export const articles = [
  {
    id: 1,
    slug: 'blockchain-evidencia-legal',
    title: 'Por qué Blockchain se está convirtiendo en la nueva norma para evidencia legal',
    excerpt: 'Los tribunales empiezan a reconocer registros en blockchain como prueba válida. Analizamos casos reales y el futuro de la evidencia digital.',
    content: `# Por qué Blockchain se está convirtiendo en la nueva norma para evidencia legal

Los tribunales de varios países están empezando a reconocer los registros almacenados en blockchain como evidencia legal válida. Este cambio marca un punto de inflexión en cómo manejamos la autenticidad de documentos digitales.

## El problema con la evidencia digital tradicional

Tradicionalmente, probar la autenticidad de un documento digital requería confiar en terceros certificadores. Esto genera puntos únicos de falla y costos elevados.

## Cómo blockchain cambia el juego

La tecnología blockchain ofrece:
- **Inmutabilidad**: Una vez registrado, no se puede alterar
- **Transparencia**: Cualquiera puede verificar
- **Descentralización**: No depende de una sola entidad

## Casos reales

En 2024, un tribunal en España aceptó como prueba un timestamp en Bitcoin para resolver una disputa de propiedad intelectual. El caso sentó precedente.

## El futuro

Expertos predicen que para 2026, el 60% de los documentos legales incluirán algún tipo de anclaje blockchain.`,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=800&fit=crop',
    author: 'EcoSign',
    date: '2025-12-10',
    featured: true,
    position: 'center'
  },
  {
    id: 2,
    slug: 'firma-digital-vs-firma-electronica',
    title: 'Firma Digital vs Firma Electrónica: Lo que necesitás saber en 2025',
    excerpt: 'Muchos confunden estos términos. Te explicamos las diferencias técnicas y legales de forma simple.',
    content: `# Firma Digital vs Firma Electrónica: Lo que necesitás saber en 2025

Existe mucha confusión entre estos dos conceptos. Aunque suenan similares, tienen implicaciones legales y técnicas muy diferentes.

## Firma Electrónica

Una firma electrónica es cualquier símbolo o proceso electrónico asociado a un documento. Puede ser:
- Tu nombre escrito con el mouse
- Una imagen escaneada de tu firma
- Un checkbox de "acepto términos"

## Firma Digital

Una firma digital usa criptografía para:
- Verificar la identidad del firmante
- Garantizar que el documento no fue alterado
- Proveer no-repudio (no se puede negar la firma)

## ¿Cuál necesito?

Depende del nivel de seguridad legal que requieras. Para contratos importantes, la firma digital es la opción recomendada.`,
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop',
    author: 'EcoSign',
    date: '2025-12-08',
    featured: true,
    position: 'left'
  },
  {
    id: 3,
    slug: 'privacidad-zero-knowledge',
    title: 'Privacidad total: Cómo funcionan las pruebas de conocimiento cero',
    excerpt: 'La tecnología que permite verificar documentos sin revelar su contenido está revolucionando la privacidad digital.',
    content: `# Privacidad total: Cómo funcionan las pruebas de conocimiento cero

Las pruebas de conocimiento cero (Zero-Knowledge Proofs) permiten demostrar que algo es verdad sin revelar información adicional. Esto está cambiando el juego en privacidad.

## El problema de la verificación tradicional

Cuando verificás un documento, tradicionalmente tenés que mostrarlo completo a quien lo verifica. Esto compromete la privacidad.

## Conocimiento Cero en acción

Con ZK-proofs podés probar:
- Que tenés un contrato firmado
- Sin revelar el contenido del contrato
- Sin exponer datos sensibles

## Aplicaciones reales

Empresas están usando esto para:
- Verificación de identidad sin exponer datos personales
- Auditorías sin revelar información financiera
- Compliance sin comprometer secretos comerciales

## El futuro

Esta tecnología será estándar en los próximos años para cualquier verificación que requiera privacidad.`,
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop',
    author: 'EcoSign',
    date: '2025-12-05',
    featured: true,
    position: 'right'
  },
  {
    id: 4,
    slug: 'nfts-contratos-inteligentes',
    title: 'NFTs y Contratos Inteligentes: Más allá del arte digital',
    excerpt: 'Los NFTs tienen aplicaciones prácticas en documentos legales que van mucho más allá de imágenes.',
    content: `# NFTs y Contratos Inteligentes: Más allá del arte digital

Cuando pensamos en NFTs, generalmente pensamos en arte digital. Pero su aplicación en documentos legales es mucho más interesante.

## NFTs como documentos

Un NFT puede representar:
- Un título de propiedad
- Un diploma universitario
- Un certificado de autenticidad
- Un contrato

## Ventajas sobre documentos tradicionales

Los NFTs ofrecen:
- Propiedad verificable on-chain
- Transferencia instantánea
- Historia completa de ownership
- Imposible de falsificar

## Casos de uso reales

Ya hay proyectos usando NFTs para:
- Escrituras de propiedades
- Certificados académicos
- Contratos laborales

El futuro de la documentación legal está en blockchain.`,
    image: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=500&fit=crop',
    author: 'EcoSign',
    date: '2025-12-03',
    featured: false
  },
  {
    id: 5,
    slug: 'gdpr-blockchain-compliance',
    title: 'GDPR y Blockchain: ¿Son compatibles?',
    excerpt: 'El derecho al olvido vs la inmutabilidad de blockchain. Cómo las empresas están resolviendo este dilema.',
    content: `# GDPR y Blockchain: ¿Son compatibles?

El GDPR establece el "derecho al olvido", pero blockchain es inmutable. ¿Cómo se resuelve esta aparente contradicción?

## El desafío

GDPR requiere que los usuarios puedan:
- Solicitar eliminación de sus datos
- Corregir información errónea

Pero blockchain es:
- Inmutable por diseño
- Imposible de "borrar"

## Soluciones inteligentes

Las empresas están implementando:
- Almacenar solo hashes en blockchain
- Datos personales off-chain
- Encriptación con keys controladas por el usuario

## Marco legal emergente

Reguladores están empezando a entender que:
- Los hashes no son datos personales
- La inmutabilidad ofrece protecciones únicas
- Es posible compliance sin sacrificar beneficios

El debate continúa evolucionando.`,
    image: 'https://images.unsplash.com/photo-1505682634904-d7c8d95cdc50?w=800&h=500&fit=crop',
    author: 'EcoSign',
    date: '2025-11-28',
    featured: false
  },
  {
    id: 6,
    slug: 'timestamp-rfc-3161',
    title: 'RFC 3161: El estándar dorado para timestamps legales',
    excerpt: 'Por qué los timestamps RFC 3161 son considerados prueba legal en tribunales de todo el mundo.',
    content: `# RFC 3161: El estándar dorado para timestamps legales

El protocolo RFC 3161 es el estándar internacional para timestamps con validez legal. Te explicamos por qué es tan importante.

## Qué es RFC 3161

Es un protocolo que permite:
- Probar que un documento existía en un momento específico
- Verificar que no fue alterado después
- Obtener una prueba criptográfica verificable

## Por qué es legalmente válido

Los tribunales lo aceptan porque:
- Usa Autoridades de Tiempo Certificadas
- Es un estándar internacional reconocido
- Ofrece prueba criptográfica inrefutable

## Casos de uso

Se usa para:
- Propiedad intelectual
- Contratos comerciales
- Documentación médica
- Evidencia digital

## Implementación

La mayoría de las plataformas de firma digital serias implementan RFC 3161 como parte de su proceso de certificación.`,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop',
    author: 'EcoSign',
    date: '2025-11-25',
    featured: false
  }
];

// Función helper para obtener artículos destacados
export const getFeaturedArticles = () => {
  return articles.filter(article => article.featured).sort((a, b) => {
    const order = { center: 0, left: 1, right: 2 };
    return order[a.position] - order[b.position];
  });
};

// Función helper para obtener artículos del feed (no destacados)
export const getFeedArticles = () => {
  return articles.filter(article => !article.featured);
};

// Función helper para obtener artículo por slug
export const getArticleBySlug = (slug) => {
  return articles.find(article => article.slug === slug);
};
