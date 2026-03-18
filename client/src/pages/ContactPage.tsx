import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import FooterInternal from '../components/FooterInternal';
import PageTitle from '../components/PageTitle';
import SEO from '../components/SEO';

const ContactPage = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const Footer = isDashboard ? FooterInternal : FooterPublic;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SEO
        title="Contacto"
        description="Contactá al equipo de EcoSign. Te respondemos en menos de 24 horas."
        path="/contact"
      />
      <Header variant={isDashboard ? 'private' : 'public'} />

      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-24">
          <PageTitle subtitle="Si tenés dudas sobre protección, evidencia o tu cuenta, escribinos.">
            Contacto
          </PageTitle>

          <div className="mt-12 max-w-xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
              <h3 className="text-xl font-semibold text-black mb-4">Escribinos directamente</h3>
              <a
                href="mailto:soporte@email.ecosign.app"
                className="inline-block text-2xl font-bold text-[#0A66C2] hover:underline"
              >
                soporte@email.ecosign.app
              </a>
              <p className="text-gray-600 mt-4">
                Lunes a viernes, 9:00 a 18:00
              </p>
              <p className="text-green-700 font-medium mt-2">
                Respondemos en menos de 24 horas
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Si es urgente, escribinos igual. Los casos críticos se atienden prioritariamente.
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
