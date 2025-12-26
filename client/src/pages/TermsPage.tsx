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
              EcoSign proporciona protección y evidencia técnica verificable para documentos digitales.
              Al utilizar el servicio, aceptás que:
            </p>

            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Naturaleza del servicio
                </h2>
                <p>
                  EcoSign no actúa como autoridad certificante ni garantiza validez legal automática. 
                  Proporciona protección y evidencia técnica verificable que puede ser utilizada en contextos legales según corresponda. 
                  La validez legal depende del contexto y la jurisdicción.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Privacidad del archivo
                </h2>
                <p>
                  EcoSign no accede al contenido del documento. La protección se realiza sin leer ni almacenar el contenido.
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
                  Firmas reguladas de terceros
                </h2>
                <p>
                  La firma legal regulada disponible opcionalmente mediante proveedores externos está sujeta a los términos y políticas del proveedor externo correspondiente.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Exclusión de responsabilidad
                </h2>
                <p>
                  EcoSign no se hace responsable por daños derivados del uso del servicio, pérdida de archivos, demoras o decisiones tomadas sobre la base de los contenedores de protección generados.
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
