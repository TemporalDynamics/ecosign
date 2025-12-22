import Logo from '../components/Logo';

const LogoTest = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Comparación de Logos - EcoSign
        </h1>
        <p className="text-gray-600 mb-12">
          Tres variantes para evaluar. Mirá cada una en contexto y decidí cuál se siente más "EcoSign".
        </p>

        {/* Grid de comparación */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* OPCIÓN A */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Opción A
              </h2>
              <p className="text-sm text-gray-500">
                Sin recuadro — Limpia y directa
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 mb-6">
              <Logo to="#" variant="option-a" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Más limpia, sin ruido visual</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Se siente infraestructura, no producto</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Rápida de implementar</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">⚠</span>
                <span className="text-gray-700">La E sola puede sentirse débil</span>
              </div>
            </div>
          </div>

          {/* OPCIÓN B */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Opción B
              </h2>
              <p className="text-sm text-gray-500">
                Recuadro dominante — Fuerte y decidido
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 mb-6">
              <Logo to="#" variant="option-b" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Ícono fuerte tipo app/producto</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Color decidido, no ambiguo</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">App-icon ready</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">⚠</span>
                <span className="text-gray-700">Más "marca de consumo" que protocolo</span>
              </div>
            </div>
          </div>

          {/* OPCIÓN C */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 ring-2 ring-[#0E4B8B] ring-opacity-50">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Opción C
              </h2>
              <p className="text-sm text-gray-500">
                E como letra — Sistema tipográfico
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 mb-6">
              <Logo to="#" variant="option-c" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Conceptualmente la más fuerte</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">La E es fundacional, no ornamento</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Protocolo / sistema / infraestructura</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">⚠</span>
                <span className="text-gray-700">Requiere ajuste fino de kerning</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">
                📌 Copilot la marcó como "la más difícil pero la más poderosa"
              </p>
            </div>
          </div>
        </div>

        {/* Prueba en contexto: Header simulado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 text-white px-4 py-2 text-xs font-mono">
            Headers simulados (cómo se ve en uso real)
          </div>

          <div className="divide-y divide-gray-200">
            {/* Header con Opción A */}
            <div className="p-4">
              <div className="flex justify-between items-center">
                <Logo to="#" variant="option-a" />
                <div className="flex items-center space-x-6">
                  <span className="text-gray-600 text-sm">Cómo funciona</span>
                  <span className="text-gray-600 text-sm">Verificador</span>
                  <span className="text-gray-600 text-sm">Precios</span>
                  <button className="bg-black text-white px-4 py-2 rounded-lg text-sm">
                    Comenzar
                  </button>
                </div>
              </div>
            </div>

            {/* Header con Opción B */}
            <div className="p-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <Logo to="#" variant="option-b" />
                <div className="flex items-center space-x-6">
                  <span className="text-gray-600 text-sm">Cómo funciona</span>
                  <span className="text-gray-600 text-sm">Verificador</span>
                  <span className="text-gray-600 text-sm">Precios</span>
                  <button className="bg-black text-white px-4 py-2 rounded-lg text-sm">
                    Comenzar
                  </button>
                </div>
              </div>
            </div>

            {/* Header con Opción C */}
            <div className="p-4">
              <div className="flex justify-between items-center">
                <Logo to="#" variant="option-c" />
                <div className="flex items-center space-x-6">
                  <span className="text-gray-600 text-sm">Cómo funciona</span>
                  <span className="text-gray-600 text-sm">Verificador</span>
                  <span className="text-gray-600 text-sm">Precios</span>
                  <button className="bg-black text-white px-4 py-2 rounded-lg text-sm">
                    Comenzar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notas finales */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            ¿Cómo decidir?
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>Opción A:</strong> Si querés limpieza inmediata y sentir EcoSign como infraestructura técnica.
            </p>
            <p>
              <strong>Opción B:</strong> Si necesitás un ícono fuerte, reconocible como app o marca de producto.
            </p>
            <p>
              <strong>Opción C:</strong> Si querés que la E sea fundacional, no decorativa. La más "protocolo".
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-gray-600">
              💡 <strong>Tip:</strong> No las mires ahora. Dejá la página abierta, volvé en 2 horas, y la que te siga molestando se descarta sola.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoTest;
