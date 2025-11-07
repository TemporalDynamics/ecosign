import React from "react";
import { Button } from "./ui";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: "info" | "security" | "sovereignty";
}

export function InfoModal({ isOpen, onClose, title, children, variant = "info" }: InfoModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    info: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
    security: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    sovereignty: "border-purple-500 bg-purple-50 dark:bg-purple-900/20",
  };

  const variantIconColors = {
    info: "text-blue-600 dark:text-blue-400",
    security: "text-emerald-600 dark:text-emerald-400",
    sovereignty: "text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className={`border-t-4 ${variantStyles[variant]} p-6`}>
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full ${variantStyles[variant]} flex items-center justify-center`}
            >
              {variant === "info" && (
                <svg
                  className={`w-6 h-6 ${variantIconColors[variant]}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              {variant === "security" && (
                <svg
                  className={`w-6 h-6 ${variantIconColors[variant]}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              )}
              {variant === "sovereignty" && (
                <svg
                  className={`w-6 h-6 ${variantIconColors[variant]}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="prose dark:prose-invert max-w-none">{children}</div>
        </div>

        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="primary" onClick={onClose} className="w-full">
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EcoExplainerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="¿Qué es un archivo .ECO?" variant="info">
      <div className="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          Un archivo <strong>.ECO</strong> es tu certificado de autenticidad digital. Es tu prueba
          independiente de que un documento existió en un momento específico y no ha sido alterado.
        </p>

        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Contenido del .ECO</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Hash SHA-256 único del documento</li>
            <li>Timestamp criptográfico inmutable</li>
            <li>Metadata del archivo original</li>
            <li>Prueba matemática de no-repudio</li>
            <li>Referencia opcional a blockchain</li>
          </ul>
        </div>

        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Diferencia: .ECO vs .ECOX
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <h5 className="font-semibold text-green-900 dark:text-green-100 mb-1">.ECO (Privado)</h5>
            <p className="text-xs">
              Certificado completo con todos los detalles. Guárdalo de forma segura. Es tu evidencia
              forense personal.
            </p>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded">
            <h5 className="font-semibold text-cyan-900 dark:text-cyan-100 mb-1">.ECOX (Público)</h5>
            <p className="text-xs">
              Versión pública verificable. Contiene solo el hash y timestamp. Compártelo sin revelar
              contenido sensible.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-l-4 border-amber-500">
          <p className="text-xs">
            <strong>Importante:</strong> El .ECO es tu propiedad. No dependes de VerifySign ni de
            ninguna entidad para verificar su autenticidad. La verificación es matemática y puede
            realizarse offline.
          </p>
        </div>
      </div>
    </InfoModal>
  );
}

export function SecurityExplainerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Seguridad y Criptografía"
      variant="security"
    >
      <div className="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          VerifySign implementa estándares criptográficos de nivel militar para garantizar la
          integridad y autenticidad de tus documentos.
        </p>

        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">Capa de Seguridad</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">1</span>
            </div>
            <div>
              <h5 className="font-semibold text-neutral-900 dark:text-neutral-100">Hash SHA-256</h5>
              <p className="text-xs">
                Función hash criptográfica que genera una "huella digital" única de 256 bits.
                Cualquier cambio mínimo en el documento genera un hash completamente diferente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">2</span>
            </div>
            <div>
              <h5 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Timestamp Criptográfico
              </h5>
              <p className="text-xs">
                Sello de tiempo inmutable que prueba que el documento existió en un momento
                específico. No puede ser alterado retroactivamente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">3</span>
            </div>
            <div>
              <h5 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Prueba de No-Repudio
              </h5>
              <p className="text-xs">
                Combinación de hash + timestamp + nonce que genera una prueba matemática única. El
                firmante no puede negar posteriormente su participación.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">4</span>
            </div>
            <div>
              <h5 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Anclaje Blockchain (Opcional)
              </h5>
              <p className="text-xs">
                Registro adicional en blockchain público para prueba de existencia distribuida. Añade
                una capa extra de inmutabilidad.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-lg">
          <h5 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
            Gestión de Claves
          </h5>
          <p className="text-xs mb-2">
            Las claves criptográficas se generan localmente y se almacenan cifradas. Implementamos
            rotación automática de claves cada 90 días.
          </p>
          <ul className="text-xs list-disc list-inside space-y-1">
            <li>Cifrado AES-256 para almacenamiento</li>
            <li>Generación de claves con entropía criptográfica</li>
            <li>Política de retención de claves antiguas</li>
            <li>Backup seguro exportable</li>
          </ul>
        </div>
      </div>
    </InfoModal>
  );
}

export function SovereigntyExplainerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tu Soberanía Digital"
      variant="sovereignty"
    >
      <div className="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
        <p className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          "VerifySign no vende firmas, vende Verdad"
        </p>

        <p>
          En un mundo donde la confianza en instituciones centralizadas es cada vez más cuestionada,
          VerifySign te devuelve el control total sobre tus evidencias digitales.
        </p>

        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Principios Fundamentales
        </h4>

        <div className="space-y-3">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
              1. Transparencia Total
            </h5>
            <p className="text-xs">
              Sabes exactamente qué se hace con tus datos. Cada operación criptográfica es auditable.
              No hay "cajas negras" ni procesos ocultos.
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
              2. Independencia Verificable
            </h5>
            <p className="text-xs">
              Tu certificado .ECO no depende de VerifySign para ser válido. Cualquier persona con
              conocimientos técnicos puede verificar matemáticamente su autenticidad.
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
              3. Propiedad de Datos
            </h5>
            <p className="text-xs">
              Tú eres el propietario absoluto de tus certificados. Puedes exportarlos, almacenarlos
              offline, y usarlos sin conexión a internet o a nuestra plataforma.
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
              4. Sin Dependencias Gubernamentales
            </h5>
            <p className="text-xs">
              No necesitas confiar en autoridades centralizadas. La validez de tu certificado está
              garantizada por matemáticas, no por instituciones.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 p-4 rounded-lg border-l-4 border-purple-500">
          <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Tu Documento, Tu Prueba, Tu Soberanía
          </h5>
          <p className="text-xs">
            VerifySign es solo la herramienta que facilita la creación de evidencia forense. La
            evidencia misma te pertenece completamente y existe independientemente de nuestra
            plataforma. Ese es el verdadero significado de soberanía digital.
          </p>
        </div>

        <div className="text-xs text-neutral-600 dark:text-neutral-400 italic">
          <p>
            En caso de que VerifySign dejara de existir mañana, todos tus certificados .ECO seguirían
            siendo válidos y verificables. Eso es soberanía real.
          </p>
        </div>
      </div>
    </InfoModal>
  );
}
