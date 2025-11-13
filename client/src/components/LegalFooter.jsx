import React from 'react';

/**
 * LegalFooter - Footer with legal links and disclaimer
 * Add to layout components (Landing, Dashboard, etc.)
 */
export default function LegalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 py-8 mt-auto">
      <div className="container mx-auto px-4">
        {/* Legal Notice Banner */}
        <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚖️</span>
            <div>
              <p className="text-sm text-yellow-200 font-medium">
                Aviso Legal: VerifySign NO es una firma digital legalmente vinculante
              </p>
              <p className="text-xs text-yellow-300 mt-1">
                Este servicio proporciona certificación técnica y timestamping, 
                pero no reemplaza firmas oficiales como FIEL o e-firma.{' '}
                <a 
                  href="/docs/legal" 
                  className="underline hover:text-yellow-100"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Leer más
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          {/* About */}
          <div>
            <h3 className="text-white font-semibold mb-3">VerifySign</h3>
            <p className="text-sm text-gray-400">
              Plataforma open-source de certificación digital con anclaje blockchain.
            </p>
            <div className="mt-3 flex gap-3">
              <a 
                href="https://github.com/TemporalDynamics/verifysign" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                </svg>
              </a>
              <a 
                href="https://twitter.com/verifysignhq" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-3">Producto</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/verify" className="hover:text-white transition-colors">
                  Verificar Documento
                </a>
              </li>
              <li>
                <a href="/guest" className="hover:text-white transition-colors">
                  Certificar (Invitado)
                </a>
              </li>
              <li>
                <a href="/pricing" className="hover:text-white transition-colors">
                  Precios
                </a>
              </li>
              <li>
                <a href="/docs" className="hover:text-white transition-colors">
                  Documentación
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="/docs/legal" 
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  ⚖️ Disclaimer
                </a>
              </li>
              <li>
                <a href="/docs/terms" className="hover:text-white transition-colors">
                  Términos de Uso
                </a>
              </li>
              <li>
                <a href="/docs/privacy" className="hover:text-white transition-colors">
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a href="/docs/security" className="hover:text-white transition-colors">
                  Seguridad
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-3">Recursos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/docs/api" className="hover:text-white transition-colors">
                  API Docs
                </a>
              </li>
              <li>
                <a href="https://github.com/TemporalDynamics/verifysign" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="/docs/roadmap" className="hover:text-white transition-colors">
                  Roadmap
                </a>
              </li>
              <li>
                <a href="mailto:contact@temporaldynamics.com" className="hover:text-white transition-colors">
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © {currentYear} Temporal Dynamics LLC. Código bajo licencia MIT.
            </p>
            <div className="flex gap-6 text-xs text-gray-500">
              <a href="/docs/changelog" className="hover:text-gray-300 transition-colors">
                v0.7.0
              </a>
              <span>•</span>
              <a href="https://status.verifysign.com" className="hover:text-gray-300 transition-colors">
                Status
              </a>
              <span>•</span>
              <a href="mailto:security@temporaldynamics.com" className="hover:text-gray-300 transition-colors">
                Report Security Issue
              </a>
            </div>
          </div>

          {/* Open Source Notice */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              🌟 Este proyecto es{' '}
              <a 
                href="https://github.com/TemporalDynamics/verifysign" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                100% open source
              </a>
              {' '}para máxima transparencia y auditabilidad.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
