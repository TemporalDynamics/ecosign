import React from "react";
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import DashboardNav from "../components/DashboardNav";
import FooterInternal from "../components/FooterInternal";
import { Link } from "react-router-dom";

export default function HelpCenterPage() {
  const sections = [
    { title: "Primeros pasos", articles: 5 },
    { title: "Cómo firmar un documento", articles: 3 },
    { title: "Cómo funciona el archivo .ECO", articles: 4 },
    { title: "Qué hacer si la verificación falla", articles: 2 },
    { title: "Cómo funcionan las firmas múltiples", articles: 3 },
    { title: "Facturación y planes", articles: 6 }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <DashboardNav />
      
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-24">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="mt-0 text-4xl font-bold text-black mb-4">
              Centro de Ayuda
            </h1>
            <p className="text-lg text-gray-600">
              Guías simples para resolver problemas comunes y aprender a usar EcoSign.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-4 mb-12">
            {sections.map((section, index) => (
              <button
                key={index}
                className="w-full p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-black transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <BookOpen className="w-6 h-6 text-gray-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-black">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {section.articles} artículos
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
              </button>
            ))}
          </div>

          {/* Contact */}
          <div className="text-center p-8 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-700 mb-4">
              ¿No encontrás lo que buscás?
            </p>
            <Link
              to="/contact"
              className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Contactanos
            </Link>
          </div>
        </div>
      </main>

      <FooterInternal />
    </div>
  );
}
