import React, { useState } from 'react';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Upload from 'lucide-react/dist/esm/icons/upload';
import DashboardNav from '../../components/DashboardNav';
import FooterInternal from '../../components/FooterInternal';
import PageTitle from '../../components/PageTitle';

export default function ReportIssueInternalPage() {
  const [formData, setFormData] = useState({
    email: '',
    issueType: '',
    description: '',
    screenshot: null
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simular envío (aquí conectarías con tu backend)
    setTimeout(() => {
      setSubmitted(true);
      setIsSubmitting(false);
    }, 1000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, screenshot: e.target.files[0] }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <DashboardNav />
        <main className="flex-grow">
          <div className="max-w-3xl mx-auto px-4 pt-24 pb-24">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
              <h1 className="mt-0 text-4xl font-bold text-black mb-4">¡Gracias por tu reporte!</h1>
              <p className="text-lg text-gray-700 mb-8">
                Recibimos tu mensaje y lo revisaremos lo antes posible.
              </p>
              <p className="text-base text-gray-600 mb-8">
                Si es algo crítico relacionado con seguridad o acceso a tu cuenta, 
                escribinos también a <a href="mailto:soporte@ecosign.app" className="text-[#0A66C2] hover:underline">soporte@ecosign.app</a>
              </p>
              <a
                href="/"
                className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Volver al inicio
              </a>
            </div>
          </div>
        </main>
        <FooterInternal />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <DashboardNav />
      <main className="flex-grow">
        <div className="max-w-3xl mx-auto px-4 pt-24 pb-24">
          <PageTitle>Reportar un Problema</PageTitle>
          
          <p className="text-lg text-gray-700 mb-12 text-center">
            Ayudanos a mejorar EcoSign. Contanos qué pasó y vamos a revisarlo lo antes posible.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-black mb-2">
                Tu email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-[#0A66C2]"
                placeholder="tu@email.com"
              />
            </div>

            {/* Tipo de problema */}
            <div>
              <label htmlFor="issueType" className="block text-sm font-semibold text-black mb-2">
                Tipo de problema
              </label>
              <select
                id="issueType"
                name="issueType"
                value={formData.issueType}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-[#0A66C2]"
              >
                <option value="">Seleccioná una opción</option>
                <option value="bug">Bug en la plataforma</option>
                <option value="document">Problema con un documento o firma</option>
                <option value="billing">Error en facturación</option>
                <option value="suggestion">Sugerencia de mejora</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-black mb-2">
                Describí qué pasó
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-[#0A66C2] resize-none"
                placeholder="Contanos con el mayor detalle posible qué pasó, qué esperabas que pasara, y cuándo ocurrió..."
              />
            </div>

            {/* Adjuntar archivo */}
            <div>
              <label htmlFor="screenshot" className="block text-sm font-semibold text-black mb-2">
                Adjuntar captura de pantalla (opcional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="screenshot"
                  name="screenshot"
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  className="hidden"
                />
                <label
                  htmlFor="screenshot"
                  className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#0A66C2] transition-colors"
                >
                  <Upload className="w-5 h-5 mr-2 text-gray-500" />
                  <span className="text-gray-600">
                    {formData.screenshot ? formData.screenshot.name : 'Seleccionar archivo'}
                  </span>
                </label>
              </div>
            </div>

            {/* Botón enviar */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar reporte'}
            </button>

            {/* Mensaje de contacto crítico */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-[#0A66C2] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Si es algo crítico relacionado con seguridad o acceso a tu cuenta, 
                escribinos también directamente a{' '}
                <a href="mailto:soporte@ecosign.app" className="text-[#0A66C2] hover:underline font-semibold">
                  soporte@ecosign.app
                </a>
              </p>
            </div>
          </form>
        </div>
      </main>
      <FooterInternal />
    </div>
  );
}
