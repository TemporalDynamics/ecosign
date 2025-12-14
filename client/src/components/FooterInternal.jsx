import React from "react";
import { Link } from "react-router-dom";

export default function FooterInternal() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-24">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Grid de 4 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Columna 1: Producto */}
          <div>
            <h3 className="text-sm font-bold text-black mb-4 uppercase tracking-wider">
              Producto
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/status"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Estado del Servicio
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 2: Seguridad */}
          <div>
            <h3 className="text-sm font-bold text-black mb-4 uppercase tracking-wider">
              Seguridad
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/security"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Seguridad
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Términos de Servicio
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Recursos */}
          <div>
            <h3 className="text-sm font-bold text-black mb-4 uppercase tracking-wider">
              Recursos
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/documentation"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Documentación Técnica
                </Link>
              </li>
              <li>
                <Link
                  to="/quick-guide"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Guía Rápida
                </Link>
              </li>
              <li>
                <Link
                  to="/videos"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Videos
                </Link>
              </li>
              <li>
                <Link
                  to="/use-cases"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Casos de Uso
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Soporte */}
          <div>
            <h3 className="text-sm font-bold text-black mb-4 uppercase tracking-wider">
              Soporte
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/help"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Centro de Ayuda
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Contacto
                </Link>
              </li>
              <li>
                <Link
                  to="/report-issue"
                  className="text-gray-700 hover:text-black transition-colors text-sm"
                >
                  Reportar un Problema
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Línea divisoria y texto legal centrado */}
        <div className="border-t border-gray-200 pt-8">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              EcoSign es un servicio independiente de certificación y firma digital. 
              El formato .ECO y los procesos asociados están en proceso de registro de propiedad intelectual.
            </p>
            <p className="text-sm text-gray-600">© 2025 EcoSign. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
