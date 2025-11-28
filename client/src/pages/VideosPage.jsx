import React from "react";
import Play from 'lucide-react/dist/esm/icons/play';
import DashboardNav from "../components/DashboardNav";
import FooterInternal from "../components/FooterInternal";
import { useVideoPlayer } from "../contexts/VideoPlayerContext";

export default function VideosPage() {
  const { openVideo } = useVideoPlayer();

  const videos = [
    {
      title: "Anatomía de una Firma",
      description: "Desglose paso a paso del proceso.",
      filename: "anatomia-de-una-firma.mp4"
    },
    {
      title: "Verdad Verificable",
      description: "Explicación del por qué detrás de EcoSign.",
      filename: "EcoSign__Verdad_Verificable.mp4"
    },
    {
      title: "Conocimiento Cero",
      description: "Cómo funciona el principio Zero-Knowledge.",
      filename: "conocimiento-cero.mp4"
    },
    {
      title: "The True Cost",
      description: "Qué pagás realmente con otros servicios.",
      filename: "the-true-cost.mp4"
    },
    {
      title: "Forensic Integrity",
      description: "Cómo se construye una evidencia irrefutable.",
      filename: "forensic-integrity.mp4"
    },
    {
      title: "You Don't Need to Trust",
      description: "La filosofía general de EcoSign.",
      filename: "you-dont-need-to-trust.mp4"
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <DashboardNav />
      
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-24">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="mt-0 text-4xl font-bold text-black mb-4">
              Biblioteca de Videos EcoSign
            </h1>
            <p className="text-lg text-gray-600">
              Tutoriales rápidos y demostraciones para entender cómo funciona EcoSign en la práctica.
            </p>
          </div>

          {/* Videos Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {videos.map((video, index) => (
              <button
                key={index}
                onClick={() => openVideo(`/${video.filename}`)}
                className="group p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-black transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-black rounded-full flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-black mb-2">
                      {video.title}
                    </h3>
                    <p className="text-gray-600">
                      {video.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-gray-600">
            Todos los videos se pueden reproducir sin abandonar la página.
          </p>
        </div>
      </main>

      <FooterInternal />
    </div>
  );
}
