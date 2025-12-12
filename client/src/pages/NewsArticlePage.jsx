import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import { getArticleBySlug } from '../data/articles';
import ReactMarkdown from 'react-markdown';

function NewsArticlePage() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);

  // Si el artículo no existe, redirigir a /news
  if (!article) {
    return <Navigate to="/news" replace />;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderPublic />
      
      <main className="flex-grow">
        {/* Back Button */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Link 
            to="/news"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a News
          </Link>
        </div>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Featured Image */}
          <div className="relative overflow-hidden rounded-xl mb-8 aspect-[16/9]">
            <img 
              src={article.image} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
            <span>{article.author}</span>
            <span>•</span>
            <time>{formatDate(article.date)}</time>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-gray-600 mb-12 leading-relaxed">
            {article.excerpt}
          </p>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none
            prose-headings:font-bold prose-headings:text-gray-900
            prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
            prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
            prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900 prose-strong:font-semibold
            prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
            prose-li:text-gray-700 prose-li:mb-2
          ">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>

          {/* CTA Section */}
          <div className="mt-16 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              ¿Listo para proteger tus documentos?
            </h3>
            <p className="text-gray-700 mb-6">
              Empezá a usar EcoSign hoy y experimentá la firma digital con privacidad total.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-center"
              >
                Probar Gratis
              </Link>
              <Link
                to="/how-it-works"
                className="inline-block px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition text-center"
              >
                Cómo Funciona
              </Link>
            </div>
          </div>

          {/* Back to News */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link 
              to="/news"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition font-semibold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ver más artículos
            </Link>
          </div>
        </article>
      </main>

      <FooterPublic />
    </div>
  );
}

export default NewsArticlePage;
