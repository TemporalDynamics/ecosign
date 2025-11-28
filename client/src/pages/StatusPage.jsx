import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';

const StatusPage = () => {
  const services = [
    { name: 'Certificación', status: 'operational' },
    { name: 'Verificación', status: 'operational' },
    { name: 'Timestamps RFC 3161', status: 'operational' },
    { name: 'Blockchain Polygon', status: 'operational' },
    { name: 'Blockchain Bitcoin', status: 'operational' },
    { name: 'Firmas Legales', status: 'operational' }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderPublic />

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
                <span className="text-base font-medium text-black">{service.name}</span>
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
