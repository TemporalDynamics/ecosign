import React from "react";
import { useVideoPlayer } from "../contexts/VideoPlayerContext";
import Play from 'lucide-react/dist/esm/icons/play';
import DashboardNav from "../components/DashboardNav";
import PageTitle from "../components/PageTitle";
import FooterInternal from "../components/FooterInternal";

export default function VideoLibraryPage() {
  const { openVideo } = useVideoPlayer();

  const videos = [
    {
      id: "anatomia-firma",
      title: "Anatomía de una Firma",
      description: "Desglose paso a paso del proceso",
      file: "Anatomia_de_una_Firma.mp4",
    },
    {
      id: "verdad-verificable",
      title: "Verdad Verificable",
      description: "Explicación del por qué detrás de EcoSign",
      file: "EcoSign__Verdad_Verificable.mp4",
    },
    {
      id: "conocimiento-cero",
      title: "Conocimiento Cero",
      description: "Cómo funciona el principio Zero-Knowledge",
      file: "Conocimiento_Cero.mp4",
    },
    {
      id: "true-cost",
      title: "The True Cost",
      description: "Qué pagás realmente con otros servicios",
      file: "The_True_Cost.mp4",
    },
    {
      id: "forensic-integrity",
      title: "Forensic Integrity",
      description: "Cómo se construye una evidencia irrefutable",
      file: "Forensic_Integrity.mp4",
    },
    {
      id: "you-dont-need-trust",
      title: "You Don't Need to Trust",
      description: "La filosofía general de EcoSign",
      file: "You_Dont_Need_to_Trust.mp4",
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <DashboardNav />
      
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-24">
          <PageTitle>Biblioteca de Videos EcoSign</PageTitle>
          
          <p className="text-lg text-gray-600 text-center mb-12">
            Tutoriales rápidos y demostraciones para entender cómo funciona EcoSign en la práctica
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => openVideo(video.file)}
                className="group bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-[#0A66C2] transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold text-black mb-2 group-hover:text-[#0A66C2] transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-gray-600">{video.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-12">
            Todos los videos se pueden reproducir sin abandonar la página
          </p>
        </div>
      </main>
      
      <FooterInternal />
    </div>
  );
}
