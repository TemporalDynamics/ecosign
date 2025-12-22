import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import FooterInternal from '../components/FooterInternal';
import PageTitle from '../components/PageTitle';

const TermsPage = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const Footer = isDashboard ? FooterInternal : FooterPublic;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header variant={isDashboard ? 'private' : 'public'} />

      <main className="flex-grow pt-16">
        <div className="max-w-4xl mx-auto px-4 pb-24">
          <PageTitle>
            Términos de Servicio
          </PageTitle>

          <div className="space-y-6 text-base text-gray-700 leading-relaxed mt-8">
            <p>
              EcoSign ofrece herramientas de certificación digital, firma electrónica y verificación de documentos.
              Al utilizar el servicio, aceptás que:
            </p>

            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Privacidad del archivo
                </h2>
                <p>
                  EcoSign no recibe ni almacena tu archivo. La certificación se realiza únicamente con su huella digital (hash SHA-256).
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Uso del servicio
                </h2>
                <p>
                  Sos responsable de asegurarte de que tu uso cumpla con la normativa aplicable en tu país o industria. EcoSign no brinda asesoramiento legal.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Limitaciones del servicio
                </h2>
                <p>
                  El servicio puede actualizarse, modificarse o interrumpirse temporalmente. EcoSign no garantiza disponibilidad ininterrumpida.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Firmas legales de terceros
                </h2>
                <p>
                  Las firmas legales provistas mediante servicios como SignNow están sujetas a los términos y políticas del proveedor externo.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Exclusión de responsabilidad
                </h2>
                <p>
                  EcoSign no se hace responsable por daños derivados del uso del servicio, pérdida de archivos, demoras o decisiones tomadas sobre la base de nuestros certificados.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Cambios en los términos
                </h2>
                <p>
                  EcoSign puede actualizar estos términos. Las nuevas versiones se publicarán en esta misma página.
                </p>
              </div>
            </div>
          </div>


        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
