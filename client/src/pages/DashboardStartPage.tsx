import { Link, useNavigate } from 'react-router-dom';
import { Shield, Pen, Users, FileText } from 'lucide-react';
import Header from '../components/Header';
import FooterInternal from '../components/FooterInternal';
import { useLegalCenter } from '../contexts/LegalCenterContext';

function DashboardStartPage() {
  const navigate = useNavigate();
  const { open: openLegalCenter } = useLegalCenter();
  const handleLogout = () => navigate('/');

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-cyan-50 to-blue-50 flex flex-col">
      <Header variant="private" onLogout={handleLogout} openLegalCenter={openLegalCenter} />
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pb-24 space-y-12">
        <section className="text-center bg-white/80 rounded-3xl p-10 shadow-lg border border-black100">
          <p className="text-black font-semibold tracking-[0.2em] uppercase mb-4">workspace</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Tu centro de firma y protección legal</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Desde acá podés firmar, proteger, compartir bajo NDA y verificar tus documentos de forma segura. Elegí una acción para continuar.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            <button
              onClick={() => openLegalCenter('certify')}
              className="bg-gradient-to-r from-black to-gray-800 text-white font-semibold px-8 py-3 rounded-xl shadow hover:shadow-lg transition text-center"
            >
              Proteger Documento
            </button>
            <button
              onClick={() => openLegalCenter('sign')}
              className="bg-white border-2 border-gray-200 text-gray-700 hover:border-black600 hover:text-black font-semibold px-8 py-3 rounded-xl shadow-sm transition text-center"
            >
              Firmar un Documento
            </button>
            <button
              onClick={() => openLegalCenter('workflow')}
              className="bg-white border-2 border-gray-200 text-gray-700 hover:border-black600 hover:text-black font-semibold px-8 py-3 rounded-xl shadow-sm transition text-center"
            >
              Crear Flujo de Firmas
            </button>
            <button
              onClick={() => openLegalCenter('nda')}
              className="bg-white border-2 border-gray-200 text-gray-700 hover:border-black600 hover:text-black font-semibold px-8 py-3 rounded-xl shadow-sm transition text-center"
            >
              Enviar NDA
            </button>
          </div>
        </section>

        {/* Explicaciones en formato card, con íconos Lucide */}
        <section className="max-w-5xl mx-auto bg-white/60 rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-8">
            ¿No estás seguro por dónde empezar?
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Certificar */}
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-gray-700 flex-shrink-0" strokeWidth={2} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Proteger documento</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Protegé la integridad y trazabilidad técnica de un archivo mediante evidencia verificable, incluso sin firmarlo.
                </p>
              </div>
            </div>

            {/* Firmar */}
            <div className="flex items-start gap-4">
              <Pen className="h-8 w-8 text-gray-700 flex-shrink-0" strokeWidth={2} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Firmar documento</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Firmá un documento y dejá constancia verificable de quién firmó, cuándo y cómo.
                </p>
              </div>
            </div>

            {/* Flujo de firmas */}
            <div className="flex items-start gap-4">
              <Users className="h-8 w-8 text-gray-700 flex-shrink-0" strokeWidth={2} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Crear flujo de firmas</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Enviá un documento a una o más personas y registrá todo el proceso de firma.
                </p>
              </div>
            </div>

            {/* NDA */}
            <div className="flex items-start gap-4">
              <FileText className="h-8 w-8 text-gray-700 flex-shrink-0" strokeWidth={2} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Enviar NDA</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Compartí un documento bajo acuerdo de confidencialidad, con evidencia verificable.
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-gray-200 mt-8 text-center">
            <p className="text-sm text-gray-700">
              <strong className="font-semibold text-gray-900">Recordá:</strong> todas las acciones se pueden combinar en un mismo proceso.
            </p>
          </div>
        </section>
      </main>

      <FooterInternal />
    </div>
  );
}

export default DashboardStartPage;