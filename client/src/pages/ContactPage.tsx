import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import FooterInternal from '../components/FooterInternal';
import PageTitle from '../components/PageTitle';

const ContactPage = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Implement form submission
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const Footer = isDashboard ? FooterInternal : FooterPublic;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header variant={isDashboard ? 'private' : 'public'} />

      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-24">
          <PageTitle subtitle="Tu trabajo sensible merece protección. Si tenés dudas, estamos acá para ayudarte.">
            ¿Necesitás ayuda con tu protección?
          </PageTitle>

          <div className="mt-12 space-y-6">
            {/* Contact Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Te respondemos rápido</h3>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:soporte@email.ecosign.app" className="text-[#0A66C2] hover:underline font-medium">
                    soporte@email.ecosign.app
                  </a>
                </p>
                <p>
                  <strong>Horario:</strong> Lunes a viernes, 9:00 a 18:00
                </p>
                <p className="text-green-700 font-medium">
                  <strong>Tiempo de respuesta:</strong> Generalmente en menos de 24 horas
                </p>
                <p className="text-sm text-gray-600 mt-4">
                  ¿Es urgente? Escribinos igual. Si es crítico, te respondemos prioritariamente.
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-900 mb-2">
                  ¿En qué podemos ayudarte?
                </label>
                <select
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="">Seleccionar...</option>
                  <option value="proteccion">Protección de documentos</option>
                  <option value="evidencia">Evidencia y verificación</option>
                  <option value="facturacion">Planes y facturación</option>
                  <option value="integracion">Integración y API</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                  Mensaje
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Enviar consulta
              </button>
            </form>

            {/* Trust message */}
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-black mb-2">Tu consulta es importante</h4>
              <p className="text-sm text-gray-700">
                Cada consulta nos ayuda a mejorar nuestra protección. Si algo no está claro, 
                querés más información o necesitás ayuda con tu evidencia, escribinos.
              </p>
              <p className="text-sm text-gray-700 mt-2">
                ¿Problema técnico? Te guiamos paso a paso hasta resolverlo.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;