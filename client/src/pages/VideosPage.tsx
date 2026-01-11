import { Link } from "react-router-dom";
import Header from "../components/Header";
import FooterPublic from "../components/FooterPublic";
import VideoPlayer from "../components/VideoPlayer";
import { videoLibrary } from "../contexts/VideoPlayerContext";

const githubDocsUrl = "https://github.com/TemporalDynamics/ecosign/blob/main/docs/pages/COMO%20LO%20HACEMOS.md";

const videos = [
  {
    id: "you-dont-need-to-trust",
    title: "You Don't Need to Trust",
    intro: "Este video introduce el cambio de paradigma que propone EcoSign: pasar de un modelo basado en confianza a uno basado en evidencia verificable.",
    context: "El enfoque es conceptual y explicativo. No describe flujos completos ni configuraciones específicas.",
    note: "Algunos términos técnicos se utilizan de forma general para facilitar la comprensión del modelo. Las implementaciones concretas pueden variar según jurisdicción y tipo de firma.",
    ctas: [
      { label: "Ver “Verdad verificable”", href: "#verdad-verificable" },
      { label: "Ir a documentación técnica", href: "/documentation" }
    ]
  },
  {
    id: "anatomia-firma",
    title: "Cómo funciona EcoSign (visión general)",
    intro: "Una explicación visual y pausada del flujo completo de EcoSign, desde la carga del documento hasta la generación de evidencia.",
    context: "Muestra el proceso general sin entrar en decisiones legales específicas.",
    ctas: [
      { label: "Probar EcoSign", href: "/login?mode=signup" },
      { label: "Ver verificador", href: "/verify" }
    ]
  },
  {
    id: "conocimiento-cero",
    title: "Conocimiento Cero",
    intro: "Una explicación detallada del principio de conocimiento cero aplicado a la certificación documental.",
    context: "Describe el modelo criptográfico y de privacidad del sistema.",
    note: "Las analogías utilizadas buscan facilitar la comprensión de conceptos criptográficos complejos.",
    ctas: [
      { label: "Documentación técnica", href: "/documentation" },
      { label: "GitHub", href: githubDocsUrl, external: true }
    ]
  },
  {
    id: "verdad-verificable",
    title: "Verdad verificable",
    intro: "Este video explica cómo EcoSign transforma documentos en pruebas verificables mediante huellas digitales, sellos de tiempo y registros públicos.",
    context: "El foco está en la verificación independiente, no en la custodia del documento.",
    note: "Algunos nombres de firma utilizados corresponden a etapas previas del producto.",
    ctas: [
      { label: "Verificador universal", href: "/verify" },
      { label: "Cómo funciona", href: "/how-it-works" }
    ]
  },
  {
    id: "forensic-integrity",
    title: "Arquitectura de prueba / Evidencia forense",
    intro: "Un análisis profundo del costo del mistrust digital y cómo una arquitectura de prueba nativa lo elimina.",
    context: "Orientado a equipos técnicos, legales y de compliance.",
    note: "Algunas referencias a estándares o implementaciones pueden evolucionar con el producto.",
    ctas: [
      { label: "GitHub", href: githubDocsUrl, external: true }
    ]
  },
  {
    id: "the-true-cost",
    title: "Firmar en segundos (velocidad y fricción)",
    intro: "Este video analiza el costo oculto de la burocracia documental y cómo EcoSign reduce fricción operativa.",
    context: "Los ejemplos de costos son ilustrativos y refieren a estimaciones de mercado.",
    note: "Los valores mencionados representan promedios de la industria y pueden variar según región y proceso.",
    ctas: [
      { label: "Ver planes", href: "/pricing" },
      { label: "Casos de uso empresariales", href: "/business" }
    ]
  }
];

export default function VideosPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header variant="public" />
      
      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
          <div className="text-center mb-16">
            <h1 className="mt-0 text-4xl md:text-5xl font-bold text-black mb-4">
              Videos de EcoSign
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Seis piezas clave para entender el modelo, la verificación y la arquitectura de evidencia.
            </p>
          </div>

          <div className="space-y-12">
            {videos.map((video) => {
              const videoSrc = videoLibrary[video.id]?.src;
              return (
                <section
                  key={video.id}
                  id={video.id}
                  className="grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8 items-start border-b border-gray-200 pb-12 scroll-mt-24"
                >
                  <div className="w-full">
                    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                      <VideoPlayer src={videoSrc || ""} className="w-full" />
                    </div>
                  </div>

                  <div className="text-left">
                    <h2 className="text-2xl md:text-3xl font-bold text-black mb-3">
                      {video.title}
                    </h2>
                    <p className="text-gray-700 mb-4">
                      {video.intro}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      <span className="font-semibold text-gray-700">Contexto:</span> {video.context}
                    </p>
                    {video.note && (
                      <p className="text-sm text-gray-500 mb-5">
                        <span className="font-semibold text-gray-600">Nota aclaratoria:</span> {video.note}
                      </p>
                    )}
                    {video.ctas && (
                      <div className="flex flex-wrap gap-3">
                        {video.ctas.map((cta) => (
                          cta.external === true ? (
                            <a
                              key={cta.label}
                              href={cta.href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:border-gray-500 hover:text-black transition"
                            >
                              {cta.label}
                            </a>
                          ) : (
                            <Link
                              key={cta.label}
                              to={cta.href}
                              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:border-gray-500 hover:text-black transition"
                            >
                              {cta.label}
                            </Link>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
}
