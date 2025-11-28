import Shield from 'lucide-react/dist/esm/icons/shield';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Eye from 'lucide-react/dist/esm/icons/eye';
import { useLocation } from 'react-router-dom';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import DashboardNav from '../components/DashboardNav';
import FooterInternal from '../components/FooterInternal';
import PageTitle from '../components/PageTitle';

const SecurityPage = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const Header = isDashboard ? DashboardNav : HeaderPublic;
  const Footer = isDashboard ? FooterInternal : FooterPublic;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Content */}
      <main className="flex-grow pt-20">
        <div className="max-w-4xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Construimos EcoSign sobre estándares internacionales usados por bancos, laboratorios y organismos legales.">
            Seguridad en EcoSign
          </PageTitle>

          <div className="space-y-12 mt-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-6 h-6 text-[#0A66C2]" />
                <h2 className="text-xl font-semibold text-black">
                  Protección del Documento
                </h2>
              </div>
              <div className="text-base text-gray-700 space-y-2 pl-9">
                <p>El archivo nunca se expone ni se sube a ningún servidor.</p>
                <p>Su integridad se representa mediante un hash SHA-256 (huella digital irreversible).</p>
              </div>
            </div>

            <div className="text-center">
              <Clock className="w-10 h-10 text-black mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-black mb-2">
                Prueba de Existencia Legal
              </h2>
              <div className="text-lg text-gray-700 max-w-2xl mx-auto space-y-3">
                <p>Sello de Tiempo Legal RFC 3161, emitido por una Autoridad de Confianza.</p>
                <p className="font-semibold text-black">Registro público en blockchain:</p>
                <ul className="space-y-1">
                  <li>Polygon (rápido, económico)</li>
                  <li>Bitcoin (irreversible, nivel máximo)</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <Shield className="w-10 h-10 text-black mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-black mb-2">
                Trazabilidad Completa
              </h2>
              <div className="text-lg text-gray-700 max-w-2xl mx-auto">
                <p className="mb-3">Cada evento queda registrado:</p>
                <ul className="space-y-1">
                  <li>Creación</li>
                  <li>Apertura</li>
                  <li>Firma</li>
                  <li>Blindaje</li>
                  <li>Verificación</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <Eye className="w-10 h-10 text-black mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-black mb-2">
                Verificación Universal
              </h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Tu archivo .ECO puede verificarse desde cualquier navegador, sin necesidad de cuenta.
              </p>
            </div>
          </div>


        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SecurityPage;
