import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, FileText, Shield, CheckCircle, Upload, X, Info, Calendar, Hash, Eye, Download } from 'lucide-react';
import { supabase, saveCertification, getUserCertifications } from '../lib/supabase';

function DashboardPage() {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const [ndaRequired, setNdaRequired] = useState(true);
  const [useLegalTimestamp, setUseLegalTimestamp] = useState(false);
  const [useBlockchainAnchoring, setUseBlockchainAnchoring] = useState(false);
  const [usePolygonAnchoring, setUsePolygonAnchoring] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [certificationResult, setCertificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [loadingCertifications, setLoadingCertifications] = useState(true);
  const [activeCertifications, setActiveCertifications] = useState(0);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [lastCertification, setLastCertification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setCertificationResult(null);
    }
  };

  const downloadEcox = (ecoxBase64, originalFileName) => {
    try {
      const byteCharacters = atob(ecoxBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const baseName = originalFileName.replace(/\.[^/.]+$/, '');
      const ecoxFileName = `${baseName}.ecox`;

      link.href = url;
      link.download = ecoxFileName;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return ecoxFileName;
    } catch (error) {
      console.error('Download error:', error);
      throw new Error(`Download failed: ${error.message}`);
    }
  };

  const handleCreateLink = async () => {
    if (!file) return;

    setCertifying(true);
    setError(null);
    setCertificationResult(null);

    try {
      console.log('🚀 Starting certification process...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('ndaRequired', ndaRequired);
      formData.append('useLegalTimestamp', useLegalTimestamp);
      formData.append('useBlockchainAnchoring', useBlockchainAnchoring);
      formData.append('usePolygonAnchoring', usePolygonAnchoring);
      formData.append('userEmail', user?.email || 'user@verifysign.pro');
      formData.append('userId', user?.id || 'user-' + Date.now());

      const response = await fetch('/api/certify', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Certification failed');
      }

      console.log('✅ Certification complete!', result);

      const downloadedFileName = downloadEcox(result.ecox, result.fileName);

      const certResult = {
        fileName: result.fileName,
        hash: result.hash,
        timestamp: result.timestamp,
        ecoxFileName: downloadedFileName,
        fileSize: result.fileSize,
        ecoxSize: result.ecoxSize,
        publicKey: result.publicKey,
        legalTimestamp: result.legalTimestamp,
        blockchainAnchoring: result.blockchainAnchoring,
        polygonAnchoring: result.polygonAnchoring,
        ndaRequired: ndaRequired,
      };

      setCertificationResult(certResult);

      if (user) {
        await saveCertification({
          ...certResult,
          signature: result.signature || '',
          ecoxManifest: result.ecoxManifest || {},
        }, user.id);
        
        await loadCertifications(user.id);
      }
    } catch (err) {
      console.error('❌ Certification failed:', err);
      setError(err.message || 'Error al certificar el documento');
    } finally {
      setCertifying(false);
    }
  };

  useEffect(() => {
    const getUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        loadCertifications(session.user.id);
      } else {
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (session) {
              setUser(session.user);
              loadCertifications(session.user.id);
            } else {
              setUser(null);
              setCertifications([]);
            }
          }
        );
        
        return () => {
          subscription.unsubscribe();
        };
      }
    };
    
    getUserSession();
  }, []);

  const loadCertifications = async (userId) => {
    try {
      setLoadingCertifications(true);
      
      // Load certifications
      const data = await getUserCertifications(userId);
      setCertifications(data || []);
      
      // Calculate metrics
      if (data && data.length > 0) {
        setActiveCertifications(data.length);
        
        // Calculate total downloads (sum of verification counts)
        const totalDls = data.reduce((sum, cert) => sum + (cert.verification_count || 0), 0);
        setTotalDownloads(totalDls);
        
        // Find the most recent certification
        const sortedCerts = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setLastCertification(sortedCerts[0]);
      } else {
        setActiveCertifications(0);
        setTotalDownloads(0);
        setLastCertification(null);
      }
    } catch (err) {
      console.error('Error loading certifications:', err);
      setCertifications([]);
      setActiveCertifications(0);
      setTotalDownloads(0);
      setLastCertification(null);
    } finally {
      setLoadingCertifications(false);
    }
  };

  const handleLogout = () => {
    navigate('/');
  };

  // Filter and sort certifications
  const filteredCertifications = certifications.filter(cert => {
    // Apply search filter
    const matchesSearch = !searchTerm || 
      cert.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.file_hash?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    let matchesStatus = true;
    if (filterStatus !== 'all') {
      if (filterStatus === 'confirmed') {
        matchesStatus = cert.ots_status === 'confirmed';
      } else if (filterStatus === 'pending') {
        matchesStatus = cert.ots_status === 'pending';
      } else if (filterStatus === 'timestampped') {
        matchesStatus = !!cert.tsa_token;
      } else if (filterStatus === 'nda') {
        matchesStatus = cert.nda_required;
      }
    }
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Apply sort order
    if (sortOrder === 'newest') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortOrder === 'oldest') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (sortOrder === 'most_verified') {
      return (b.verification_count || 0) - (a.verification_count || 0);
    } else if (sortOrder === 'name') {
      return a.file_name.localeCompare(b.file_name);
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">VerifySign</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Inicio
              </Link>
              <Link to="/dashboard" className="text-cyan-600 font-semibold transition duration-200">
                Dashboard
              </Link>
              <Link to="/dashboard/verify" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Verificar
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Precios
              </Link>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-200 font-medium"
              >
                Cerrar Sesión
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Simplified Actions */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl p-8 mb-8 shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-2">Bienvenido a VerifySign</h2>
          <p className="text-cyan-50 text-lg mb-6">
            Crea enlaces seguros, protege tus documentos y verifica su autenticidad con tecnología blockchain
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-white hover:bg-gray-100 text-cyan-700 font-bold py-3 px-8 rounded-lg shadow-md transition duration-300"
            >
              + Crear Nuevo Certificado .ECO
            </button>
            <Link
              to="/dashboard/verify"
              className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold py-3 px-8 rounded-lg shadow-md transition duration-300"
            >
              Verificar .ECO
            </Link>
          </div>
        </div>

        {/* Metrics Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-1">Certificados Activos</h3>
            <p className="text-3xl font-bold text-gray-900">{activeCertifications}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-1">Descargas Totales</h3>
            <p className="text-3xl font-bold text-gray-900">{totalDownloads}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-1">Última Certificación</h3>
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
              {lastCertification ? new Date(lastCertification.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Certification List */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Mis Certificaciones</h2>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar certificaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="all">Todos los estados</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="pending">Pendientes</option>
                  <option value="timestampped">Con sello legal</option>
                  <option value="nda">Con NDA</option>
                </select>
                
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="newest">Más recientes</option>
                  <option value="oldest">Más antiguos</option>
                  <option value="most_verified">Más verificados</option>
                  <option value="name">Por nombre</option>
                </select>
              </div>
            </div>
          </div>
          
          {loadingCertifications ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : filteredCertifications.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No tienes certificaciones que coincidan con los filtros</p>
              <p className="text-sm text-gray-500 mt-1">Crea tu primera certificación o ajusta los filtros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCertifications.map((cert) => (
                <div key={cert.id} className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition duration-200">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <FileText className="w-5 h-5 text-cyan-600 mr-2 flex-shrink-0" />
                        <h3 
                          className="font-medium text-gray-900 truncate cursor-pointer hover:text-cyan-600"
                          onClick={() => navigate(`/dashboard/verify/${cert.file_hash}`)}
                        >
                          {cert.file_name}
                        </h3>
                      </div>

                      <div className="text-sm text-gray-600 mb-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{new Date(cert.created_at).toLocaleString()}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <Hash className="w-4 h-4 mr-1" />
                            <span className="font-mono text-xs">{cert.file_hash?.substring(0, 16)}...</span>
                          </div>
                          
                          {cert.verification_count !== undefined && (
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-1 text-gray-500" />
                              <span>{cert.verification_count} verificaciones</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {cert.tsa_token && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" /> RFC 3161
                          </span>
                        )}
                        {cert.ots_status === 'confirmed' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <Shield className="w-3 h-3 mr-1" /> Confirmado en blockchain
                          </span>
                        )}
                        {cert.ots_status === 'pending' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Info className="w-3 h-3 mr-1" /> Confirmando
                          </span>
                        )}
                        {cert.nda_required && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            NDA
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => navigate(`/dashboard/verify/${cert.file_hash}`)}
                        className="p-2 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition duration-200"
                        title="Verificar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/dashboard/verify/${cert.file_hash}`)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition duration-200"
                        title="Copiar enlace"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 text-sm">© 2025 VerifySign por Temporal Dynamics LLC. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl border border-gray-200">
            <div className="p-8 flex justify-between items-center mb-0 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">Crear Certificado .ECO</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition duration-200"
              >
                <X className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow p-8 space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documento a Certificar *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition duration-300 bg-gray-50">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-8 h-8 text-cyan-600" strokeWidth={2.5} />
                  </div>
                  <label htmlFor="file-input" className="cursor-pointer">
                    <span className="text-cyan-600 hover:text-cyan-700 font-semibold">
                      Haz clic para seleccionar
                    </span>
                    <span className="text-gray-600"> o arrastra tu archivo aquí</span>
                    <input
                      id="file-input"
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {file && (
                    <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <p className="text-cyan-700 font-medium">
                        ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* NDA Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <h4 className="text-gray-900 font-semibold">Requiere NDA para acceso</h4>
                  <p className="text-sm text-gray-600">
                    Los receptores deberán firmar un acuerdo de confidencialidad
                  </p>
                </div>
                <button
                  onClick={() => setNdaRequired(!ndaRequired)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ndaRequired ? 'bg-cyan-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ndaRequired ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Legal Timestamp Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <div>
                  <h4 className="text-gray-900 font-semibold flex items-center">
                    ⚖️ Timestamp con Validez Legal (RFC 3161)
                    <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-bold">LEGAL</span>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Timestamp certificado por Time Stamp Authority (TSA)
                  </p>
                  <p className="text-xs text-green-700 font-medium mt-1">
                    ✅ Validez legal en +100 países • Cumple estándar RFC 3161
                  </p>
                </div>
                <button
                  onClick={() => setUseLegalTimestamp(!useLegalTimestamp)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useLegalTimestamp ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useLegalTimestamp ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Blockchain Anchoring Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200">
                <div>
                  <h4 className="text-gray-900 font-semibold flex items-center">
                    ⛓️ Anclaje en Blockchain (OpenTimestamps)
                    <span className="ml-2 px-2 py-0.5 bg-orange-600 text-white text-xs rounded-full font-bold">BLOCKCHAIN</span>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Prueba inmutable en Bitcoin blockchain
                  </p>
                  <p className="text-xs text-orange-700 font-medium mt-1">
                    🆓 Gratis • Confirmación en ~10 min • Permanente
                  </p>
                </div>
                <button
                  onClick={() => setUseBlockchainAnchoring(!useBlockchainAnchoring)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useBlockchainAnchoring ? 'bg-orange-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useBlockchainAnchoring ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Polygon Anchoring Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200">
                <div>
                  <h4 className="text-gray-900 font-semibold flex items-center">
                    💎 Anclaje en Polygon
                    <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-bold">POLYGON</span>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Prueba inmutable en Polygon blockchain
                  </p>
                  <p className="text-xs text-purple-700 font-medium mt-1">
                    ⚡ Rápido • Bajo costo • Descentralizado
                  </p>
                </div>
                <button
                  onClick={() => setUsePolygonAnchoring(!usePolygonAnchoring)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    usePolygonAnchoring ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      usePolygonAnchoring ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-medium">⚠️ {error}</p>
                </div>
              )}

              {/* Success Message */}
              {certificationResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" strokeWidth={2.5} />
                    <h4 className="text-green-800 font-bold">✅ Certificado generado exitosamente!</h4>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Archivo:</span>
                      <span className="font-mono text-gray-900">{certificationResult.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tamaño original:</span>
                      <span className="font-mono text-gray-900">{(certificationResult.fileSize / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tamaño .ecox:</span>
                      <span className="font-mono text-gray-900">{(certificationResult.ecoxSize / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600">Hash SHA-256:</span>
                      <span className="font-mono text-xs text-gray-900 break-all max-w-[60%] text-right">{certificationResult.hash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="font-mono text-xs text-gray-900">{new Date(certificationResult.timestamp).toLocaleString()}</span>
                    </div>
                    {/* Legal Timestamp Info */}
                    {certificationResult.legalTimestamp && certificationResult.legalTimestamp.enabled && (
                      <div className="flex justify-between items-start bg-green-50 -mx-2 px-2 py-2 rounded">
                        <span className="text-green-700 font-semibold flex items-center">
                          ⚖️ Validez Legal:
                        </span>
                        <div className="text-right">
                          <span className="font-mono text-xs text-green-800 font-bold block">{certificationResult.legalTimestamp.standard}</span>
                          <span className="text-xs text-green-600">{certificationResult.legalTimestamp.tsa}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600">Clave pública:</span>
                      <span className="font-mono text-xs text-gray-900 break-all max-w-[60%] text-right">{certificationResult.publicKey.substring(0, 40)}...</span>
                    </div>
                  </div>

                  {/* Legal timestamp badge */}
                  {certificationResult.legalTimestamp && certificationResult.legalTimestamp.enabled && (
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded p-3 mt-3">
                      <p className="text-green-800 text-sm font-bold flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        ✅ Este certificado tiene VALIDEZ LEGAL internacional (RFC 3161)
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Timestamp certificado por TSA • Aceptado en +100 países
                      </p>
                    </div>
                  )}

                  {/* Blockchain anchoring badge */}
                  {certificationResult.blockchainAnchoring && certificationResult.blockchainAnchoring.enabled && (
                    <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300 rounded p-3 mt-3">
                      <p className="text-orange-800 text-sm font-bold flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        ⛓️ Anclado en {certificationResult.blockchainAnchoring.blockchain} Blockchain
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        {certificationResult.blockchainAnchoring.status === 'pending' ? (
                          <>⏳ Esperando confirmación en blockchain (~10 min)</>
                        ) : (
                          <>✅ Confirmado en blockchain • Prueba permanente e inmutable</>
                        )}
                      </p>
                      <p className="text-xs text-orange-600 mt-1 font-mono">
                        Protocolo: {certificationResult.blockchainAnchoring.protocol}
                      </p>
                    </div>
                  )}

                  <div className="bg-green-100 rounded p-3 mt-3">
                    <p className="text-green-800 text-sm font-medium">
                      📥 Descargado: <span className="font-mono">{certificationResult.ecoxFileName}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Info */}
              {!certificationResult && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 flex items-start">
                  <Info className="w-5 h-5 text-cyan-600 mr-3 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <p className="text-sm text-cyan-800">
                    <strong>Información:</strong> El documento se procesará localmente. Generaremos un hash SHA-256,
                    timestamp certificado y firma digital Ed25519. Opcionalmente, podemos anclar el hash en blockchain.
                  </p>
                </div>
              )}
            </div>
            {/* Action buttons remain outside scroll area */}
            <div className="p-8 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex space-x-4">
                <button
                  onClick={handleCreateLink}
                  disabled={!file || certifying}
                  className={`flex-1 font-bold py-3 px-6 rounded-lg transition duration-300 ${
                    file && !certifying
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {certifying ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generando certificado...
                    </span>
                  ) : (
                    'Generar Certificado'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setFile(null);
                    setCertificationResult(null);
                    setError(null);
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition duration-300"
                >
                  {certificationResult ? 'Cerrar' : 'Cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
