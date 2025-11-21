import HeaderPublic from '../components/HeaderPublic';
import FooterPublic from '../components/FooterPublic';
import PageTitle from '../components/PageTitle';

const ReportPage = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderPublic />

      <main className="flex-grow pt-16">
        <div className="max-w-3xl mx-auto px-4">
          <PageTitle subtitle="¿Encontraste un problema técnico o de seguridad? Ayudanos a mejorar.">
            Reportar un Problema
          </PageTitle>

          <div className="space-y-6 text-base text-gray-700 leading-relaxed mt-8">
            <div className="bg-gray-100 rounded-xl p-8">
              <h2 className="text-xl font-semibold text-black mb-4">
                Cómo reportar
              </h2>
              <p className="mb-4">
                Si encontraste un problema de seguridad, un bug o una inconsistencia en el sistema, 
                podés enviarnos un correo detallado a:
              </p>
              <a
                href="mailto:soporte@ecosign.app"
                className="text-2xl font-semibold text-black hover:underline"
              >
                📧 soporte@ecosign.app
              </a>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-black">
                Información útil para incluir
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Descripción clara del problema</li>
                <li>Pasos para reproducirlo</li>
                <li>Navegador y sistema operativo que estás usando</li>
                <li>Capturas de pantalla (si aplica)</li>
                <li>Mensajes de error (si los hay)</li>
              </ul>
            </div>

            <div className="bg-[#0A66C2] bg-opacity-5 border-l-4 border-[#0A66C2] p-6 rounded">
              <p className="text-gray-800">
                <strong>Problemas de seguridad:</strong> Si encontraste una vulnerabilidad de seguridad, 
                por favor reportala de forma responsable directamente a nuestro equipo. Agradecemos tu colaboración.
              </p>
            </div>
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
};

export default ReportPage;
