import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import DashboardNav from '../components/DashboardNav';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement form submission
    console.log('Form submitted:', formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const Header = isDashboard ? DashboardNav : HeaderPublic;
  const Footer = isDashboard ? FooterInternal : FooterPublic;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-24">
          <PageTitle subtitle="Estamos para ayudarte.">
            Contacto
          </PageTitle>

          <div className="mt-12 space-y-6">
            {/* Contact Info */}
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Email:</strong>{' '}
                <a href="mailto:soporte@ecosign.app" className="text-[#0A66C2] hover:underline">
                  soporte@ecosign.app
                </a>
              </p>
              <p>
                <strong>Horario:</strong> Lunes a viernes, 9:00 a 18:00
              </p>
              <p>
                <strong>Tiempo de respuesta promedio:</strong> 24–48 h
              </p>
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
                  Motivo de contacto
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
                  <option value="soporte">Soporte técnico</option>
                  <option value="facturacion">Facturación</option>
                  <option value="ventas">Ventas</option>
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
                Enviar mensaje
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
