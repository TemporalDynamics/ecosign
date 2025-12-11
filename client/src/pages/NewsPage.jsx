import React from 'react';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';

const NEWS_ITEMS = [
  {
    title: 'Lanzamos el Centro Legal',
    date: 'Diciembre 2025',
    summary: 'Unificamos certificación, NDA y flujos de firma en un único hub dentro del dashboard.',
  },
  {
    title: 'Videos forenses disponibles',
    date: 'Diciembre 2025',
    summary: 'Explora Anatomía de una Firma, Verdad Verificable y más sin salir de la app.',
  },
  {
    title: 'Mejoras de anclaje',
    date: 'Diciembre 2025',
    summary: 'Confirmación más robusta en Polygon y Bitcoin con notificaciones integradas.',
  },
];

function NewsPage() {
  return (
    <div className="min-h-screen bg-white">
      <HeaderPublic />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-gray-500">Newsroom</p>
          <h1 className="text-4xl font-bold text-gray-900">Novedades EcoSign</h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Actualizaciones breves sobre producto, seguridad y contenido educativo. Todo en un solo lugar.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {NEWS_ITEMS.map((item) => (
            <article key={item.title} className="border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{item.date}</p>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{item.summary}</p>
            </article>
          ))}
        </section>
      </main>
      <FooterPublic />
    </div>
  );
}

export default NewsPage;
