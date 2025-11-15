// client/src/pages/AccessPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Mail, Building2, Briefcase, Lock, Download, AlertCircle, CheckCircle } from 'lucide-react';

const AccessPage = () => {
  const { token } = useParams();
  const [requireNDA, setRequireNDA] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    position: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');

  // Simular verificación del token al cargar
  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Simular llamada para verificar token
        // En una implementación real, esto verificaría el token en el backend
        const mockResponse = {
          success: true,
          requiresNDA: true, // Simular que requiere NDA
          documentTitle: 'Documento de Ejemplo.pdf'
        };

        if (mockResponse.success) {
          setRequireNDA(mockResponse.requiresNDA);
          setDocumentTitle(mockResponse.documentTitle);
          
          if (mockResponse.requiresNDA) {
            setShowForm(true);
          }
        }
      } catch (err) {
        setError('Token inválido o expirado');
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const validateFormData = () => {
    if (!formData.name.trim()) return 'Nombre es requerido';
    if (!formData.email.trim()) return 'Email es requerido';
    if (!formData.company.trim()) return 'Empresa es requerida';
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Email inválido';
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateFormData();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/access-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          formData: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            company: formData.company.trim(),
            position: formData.position.trim()
          },
          csrfToken: 'mock-csrf-token' // En implementación real, obtener de forma segura
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al acceder al documento');
      }

      setDownloadUrl(data.downloadUrl);
      setDocumentTitle(data.documentTitle);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  if (error && !showForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition duration-200"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Acceso Seguro al Documento</h1>
                <p className="text-cyan-100">Verificación y trazabilidad completa</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {!success ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Accediendo a: {documentTitle || 'Documento protegido'}
                  </h2>
                  <p className="text-gray-600">
                    {requireNDA 
                      ? 'Por favor complete el formulario para aceptar los términos de confidencialidad'
                      : 'Solicitando acceso al documento...'}
                  </p>
                </div>

                {requireNDA && showForm && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Información Requerida
                      </h3>
                      
                      <div className="space-y-4">
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

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Lock className="w-4 h-4" />
                      <span>Al completar este formulario, acepta los términos de confidencialidad y su información será registrada.</span>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Aceptar y Acceder al Documento
                        </>
                      )}
                    </button>
                  </form>
                )}

                {!requireNDA && !showForm && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-6 h-6 text-cyan-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Solicitud de Acceso</h3>
                    <p className="text-gray-600 mb-6">Estamos procesando su solicitud de acceso al documento. Por favor espere...</p>
                    <button 
                      onClick={() => window.history.back()}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Pantalla de éxito y descarga */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Acceso Autorizado!</h2>
                <p className="text-gray-600 mb-6">
                  Su identidad ha sido verificada y el NDA ha sido aceptado. 
                  Ahora puede descargar el documento.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Documento:</h3>
                  <p className="text-gray-700">{documentTitle}</p>
                </div>

                <button
                  onClick={handleDownload}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition duration-300 flex items-center gap-2 mx-auto"
                >
                  <Download className="w-5 h-5" />
                  Descargar Documento
                </button>

                <p className="text-xs text-gray-500 mt-4">
                  El acceso a este documento está registrado con su identidad para fines de trazabilidad.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessPage;