import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import { getFeaturedArticles, getFeedArticles } from '../data/articles';

function NewsPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const featuredArticles = getFeaturedArticles();
  const feedArticles = getFeedArticles();

  // Encontrar el artículo principal (center)
  const mainArticle = featuredArticles.find(a => a.position === 'center');
  const sideArticles = featuredArticles.filter(a => a.position !== 'center');

  const handleSubscribe = (e) => {
    e.preventDefault();
    // TODO: Integrar con backend/newsletter service
    console.log('Suscripción:', email);
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderPublic />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-gray-50 to-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              News
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl">
              Insights sobre firma digital, blockchain, privacidad y el futuro de la documentación legal.
            </p>
          </div>
        </div>

        {/* Featured Articles - 3 columnas */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Artículo Izquierdo */}
            {sideArticles[0] && (
              <Link 
                to={`/news/${sideArticles[0].slug}`}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-lg mb-4 aspect-[4/3]">
                  <img 
                    src={sideArticles[0].image} 
                    alt={sideArticles[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm text-gray-500 mb-2">{formatDate(sideArticles[0].date)}</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                  {sideArticles[0].title}
                </h3>
                <p className="text-gray-600 line-clamp-2">
                  {sideArticles[0].excerpt}
                </p>
              </Link>
            )}

            {/* Artículo Principal (Centro) */}
            {mainArticle && (
              <Link 
                to={`/news/${mainArticle.slug}`}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-lg mb-4 aspect-[4/5]">
                  <img 
                    src={mainArticle.image} 
                    alt={mainArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Destacado
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-2">{formatDate(mainArticle.date)}</p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition">
                  {mainArticle.title}
                </h2>
                <p className="text-gray-600 text-lg line-clamp-3">
                  {mainArticle.excerpt}
                </p>
              </Link>
            )}

            {/* Artículo Derecho */}
            {sideArticles[1] && (
              <Link 
                to={`/news/${sideArticles[1].slug}`}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-lg mb-4 aspect-[4/3]">
                  <img 
                    src={sideArticles[1].image} 
                    alt={sideArticles[1].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm text-gray-500 mb-2">{formatDate(sideArticles[1].date)}</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                  {sideArticles[1].title}
                </h3>
                <p className="text-gray-600 line-clamp-2">
                  {sideArticles[1].excerpt}
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* Feed de Artículos */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Más artículos</h2>
          <div className="space-y-8">
            {feedArticles.map((article) => (
              <Link
                key={article.id}
                to={`/news/${article.slug}`}
                className="group flex gap-6 items-start hover:bg-gray-50 p-4 -m-4 rounded-lg transition"
              >
                {/* Imagen izquierda */}
                <div className="flex-shrink-0 w-48 h-32 overflow-hidden rounded-lg">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                {/* Contenido derecha */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 mb-2">{formatDate(article.date)}</p>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="bg-gradient-to-b from-gray-50 to-white py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              📧 Suscribite al Newsletter
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Recibí las últimas noticias sobre firma digital, blockchain y privacidad directamente en tu inbox.
            </p>
            
            {subscribed ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                ✅ ¡Gracias por suscribirte! Revisá tu email para confirmar.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 justify-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="flex-1 max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Suscribirme
                </button>
              </form>
            )}
            
            <p className="text-sm text-gray-500 mt-4">
              Newsletter semanal. Cancelá cuando quieras.
            </p>
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
}

export default NewsPage;
// Force rebuild
