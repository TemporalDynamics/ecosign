import { useLocation } from 'react-router-dom';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import DashboardNav from '../components/DashboardNav';
import FooterInternal from '../components/FooterInternal';
import PageTitle from '../components/PageTitle';

const PrivacyPage = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const Header = isDashboard ? DashboardNav : HeaderPublic;
  const Footer = isDashboard ? FooterInternal : FooterPublic;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Content */}
      <main className="flex-grow pt-16">
        <div className="max-w-4xl mx-auto px-4 pb-24">
          <PageTitle subtitle="En EcoSign tu privacidad es prioritaria. Estas son nuestras prácticas:">
            Privacidad
          </PageTitle>

          <div className="space-y-6 text-base text-gray-700 leading-relaxed mt-8">

            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Información que NO recopilamos
                </h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>No recibimos, subimos ni almacenamos tu archivo.</li>
                  <li>No analizamos, indexamos ni abrimos su contenido.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Información que sí recopilamos
                </h2>
                <p className="mb-3">Para operar el servicio:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Tu email (cuando creás cuenta o firmás)</li>
                  <li>Los eventos del proceso de auditoría (fecha, IP aproximada, tipo de evento)</li>
                  <li>Datos técnicos mínimos de verificación</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Cómo usamos tu información
                </h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>Para emitir certificados y auditar procesos.</li>
                  <li>Para enviar notificaciones relacionadas al documento.</li>
                  <li>Para garantizar seguridad y detectar actividad sospechosa.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  ¿Compartimos tu información?
                </h2>
                <p>
                  No vendemos, alquilamos ni compartimos tus datos con terceros comerciales.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Eliminación de datos
                </h2>
                <p>
                  Podés solicitar la eliminación total de tu perfil enviando un correo a{' '}
                  <a href="mailto:soporte@email.ecosign.app" className="text-black font-semibold hover:underline">
                    soporte@email.ecosign.app
                  </a>
                  .
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Cambios
                </h2>
                <p>
                  Actualizaremos esta política cuando se lancen nuevas funciones.
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

export default PrivacyPage;
