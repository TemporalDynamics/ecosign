// client/src/components/LinkGenerator.jsx
import React, { useState, useEffect } from 'react';
import { Lock, Link as LinkIcon, FileText, User, Mail, Building2, Briefcase, CheckCircle, AlertCircle } from 'lucide-react';

const LinkGenerator = ({ documentId, onLinkGenerated }) => {
  const [requireNDA, setRequireNDA] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    position: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // Obtener CSRF token
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    // Simular obtención de CSRF token
    const fetchCsrfToken = async () => {
      // En una implementación real, esto vendría de una función backend
      const token = 'generated-csrf-token'; // Esto debería generarse de forma segura en el backend
      setCsrfToken(token);
    };

    fetchCsrfToken();
  }, []);

  const validateFormData = () => {
    if (requireNDA) {
      if (!formData.name.trim()) return 'Name is required';
      if (!formData.email.trim()) return 'Email is required';
      if (!formData.company.trim()) return 'Company is required';
      
      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) return 'Invalid email format';
    }
    return null;
  };

  const handleGenerateLink = async () => {
    setError('');
    setSuccess(false);

    const validationError = validateFormData();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/.netlify/functions/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          requireNDA,
          formData: requireNDA ? {
            name: formData.name.trim(),
            email: formData.email.trim(),
            company: formData.company.trim(),
            position: formData.position.trim()
          } : null,
          csrfToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate link');
      }

      setGeneratedLink(data.accessUrl);
      setSuccess(true);
      onLinkGenerated && onLinkGenerated(data);
      
      // Limpiar formulario si no se requiere NDA
      if (!requireNDA) {
        setFormData({
          name: '',
          email: '',
          company: '',
          position: ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    // Aquí podrías mostrar una notificación de copiado exitoso
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
          <LinkIcon className="w-5 h-5 text-cyan-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Generar Enlace de Acceso</h3>
      </div>

      <div className="space-y-6">
        {/* Opciones de acceso */}
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requireNDA}
              onChange={(e) => setRequireNDA(e.target.checked)}
              className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
            />
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Requerir aceptación de NDA</span>
            </div>
          </label>
          <p className="text-sm text-gray-600 mt-2 ml-7">
            El receptor deberá completar un formulario con sus datos antes de acceder al documento
          </p>
        </div>

        {/* Formulario de NDA */}
        {requireNDA && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Datos Requeridos
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  Empresa *
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  Puesto
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Cargo en la empresa"
                />
              </div>
            </div>
          </div>
        )}

        {/* Botón de generación */}
        <button
          onClick={handleGenerateLink}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generando...
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4" />
              {requireNDA ? 'Generar Enlace con NDA' : 'Generar Enlace Directo'}
            </>
          )}
        </button>

        {/* Errores */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Éxito */}
        {success && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-sm">¡Enlace generado exitosamente!</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition duration-200 text-sm font-medium"
                >
                  Copiar
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Este enlace {requireNDA ? 'requiere aceptación de NDA' : 'permite acceso directo'} al documento.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkGenerator;