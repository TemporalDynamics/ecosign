import { CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';
import InhackeableTooltip from '../components/InhackeableTooltip';

const StatusPage = () => {
  const services = [
    { label: 'Certificación', status: 'operational' },
    { label: 'Verificación', status: 'operational' },
    {
      label: <InhackeableTooltip className="font-semibold" />,
      helper: 'SHA-256 + sello legal + anchoring (Polygon/Bitcoin, más redes en camino)',
      status: 'operational'
    },
    { label: 'Blockchain Polygon', status: 'operational' },
    { label: 'Blockchain Bitcoin', status: 'operational' },
    { label: 'Firmas Legales', status: 'operational' }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header variant="public" />

      {/* Content */}
      <main className="flex-grow pt-16">
        <div className="max-w-3xl mx-auto px-4 pb-24">
          <PageTitle subtitle="Aquí podrás consultar la disponibilidad de nuestros servicios">
            Estado del Servicio
          </PageTitle>

          <div className="space-y-3 mb-8 mt-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex flex-col">
                  <span className="text-base font-medium text-black flex items-center gap-1">
                    {service.label}
                  </span>
                  {service.helper && (
                    <span className="text-xs text-gray-500">{service.helper}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-[#0A66C2]" />
                  <span className="text-gray-700">Operativo</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-100 rounded-xl p-8 text-center">
            <p className="text-gray-700">
              Pronto agregaremos métricas en tiempo real.
            </p>
          </div>


        </div>
      </main>

      <FooterPublic />
    </div>
  );
};

export default StatusPage;
