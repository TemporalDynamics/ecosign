// client/src/components/DocumentList.jsx
import React, { useState, useEffect } from 'react';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Link as LinkIcon from 'lucide-react/dist/esm/icons/link as -link-icon';
import Download from 'lucide-react/dist/esm/icons/download';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Clock from 'lucide-react/dist/esm/icons/clock';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import LinkGenerator from './LinkGenerator';
import { supabase } from '../lib/supabaseClient';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showLinkGenerator, setShowLinkGenerator] = useState(false);
  const [error, setError] = useState(null);

  // Cargar documentos reales desde Supabase
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setError(null);

        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          setError('Debe iniciar sesión para ver sus documentos');
          return;
        }

        // Obtener documentos del usuario
        const { data: docs, error: docsError } = await supabase
          .from('user_documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (docsError) {
          throw docsError;
        }

        // Transformar datos para la UI
        const transformedDocs = (docs || []).map(doc => ({
          id: doc.id,
          title: doc.document_name || doc.title || 'Sin título',
          fileName: doc.document_name || doc.title || 'Sin título',
          createdAt: new Date(doc.created_at),
          ecoHash: doc.document_hash ? doc.document_hash.substring(0, 12) + '...' : 'N/A',
          status: doc.status || 'verified',
          accessCount: 0, // TODO: Get from relationships when available
          lastAccess: null
        }));

        setDocuments(transformedDocs);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError(err.message || 'Error al cargar documentos');
        setLoading(false);
      }
    };

    fetchDocuments();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('documents_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        () => {
          // Recargar documentos cuando hay cambios
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'verified':
        return 'Verificado';
      case 'pending':
        return 'Pendiente';
      default:
        return 'Error';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-black600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mis Documentos</h2>
        <div className="text-sm text-gray-600">
          {documents.length} documento{documents.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid gap-4">
        {documents.map((document) => (
          <div key={document.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <FileText className="w-6 h-6 text-black flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {document.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{document.fileName}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(document.status)}
                          <span>{getStatusText(document.status)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          <span>{document.accessCount} acceso{document.accessCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Creado: {formatDate(document.createdAt)}</span>
                        </div>
                        {document.lastAccess && (
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>Último: {formatDate(document.lastAccess)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedDocument(document);
                      setShowLinkGenerator(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-cyan-500 transition duration-200 text-sm font-medium"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Generar Enlace
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition duration-200 text-sm font-medium">
                    <Download className="w-4 h-4" />
                    Descargar .ECO
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal del generador de enlaces */}
      {showLinkGenerator && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Generar Enlace para: {selectedDocument.title}
                </h3>
                <button
                  onClick={() => setShowLinkGenerator(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <LinkGenerator 
                documentId={selectedDocument.id} 
                onLinkGenerated={() => {
                  // Actualizar lista de documentos si es necesario
                  setShowLinkGenerator(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {documents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
          <p className="text-gray-600">Comience certificando sus primeros documentos para verlos aquí.</p>
        </div>
      )}
    </div>
  );
};

export default DocumentList;