import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Clock, Hash, Globe, Calendar, Download, Users } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function TrackingDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current user
    const getUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        loadLogs(session.user.id);
      } else {
        // Check if user signs in later
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (session) {
              setUser(session.user);
              loadLogs(session.user.id);
            } else {
              setUser(null);
              setLogs([]);
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

  const loadLogs = async (userId) => {
    try {
      // Get verification logs for user's certifications
      const { data, error } = await supabase
        .from('verification_logs')
        .select(`
          *,
          certification:certifications(file_name)
        `)
        .eq('certification.user_id', userId)
        .order('accessed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading verification logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

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
              <Link to="/dashboard" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Dashboard
              </Link>
              <Link to="/tracking" className="text-cyan-600 font-semibold transition duration-200">
                VerifyTracker
              </Link>
              <Link to="/verify" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Verificar
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-cyan-600 transition duration-200 font-medium">
                Precios
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 VerifyTracker</h1>
          <p className="text-gray-600">
            Monitoreo en tiempo real de quién, cuándo y cómo accede a tus documentos certificados
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-cyan-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {logs.length}
                </h3>
                <p className="text-gray-600">Accesos registrados</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {logs.filter(log => log.downloaded).length}
                </h3>
                <p className="text-gray-600">Descargas</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {[...new Set(logs.map(log => log.ip_address))].length}
                </h3>
                <p className="text-gray-600">Usuarios únicos</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-12 text-center">
            <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay accesos registrados</h3>
            <p className="text-gray-600 mb-6">
              Comparte tus documentos certificados y verás aquí quién los accede.
            </p>
            <Link
              to="/dashboard"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition duration-300 shadow-md"
            >
              Crear certificado
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Navegador/Dispositivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duración
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interacción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {log.certification?.file_name || 'Documento desconocido'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {log.document_hash?.substring(0, 16)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(log.accessed_at).toLocaleString()}
                        </div>
                        {log.ip_address && (
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Globe className="w-3 h-3 mr-1" />
                            {log.ip_address}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {log.user_agent?.substring(0, 50)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          Fingerprint: {log.browser_fingerprint?.substring(0, 10)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          {log.viewed_duration_seconds || 0}s
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${log.scroll_percentage || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">
                            {log.scroll_percentage || 0}%
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {log.downloaded ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Download className="w-3 h-3 mr-1" />
                              Descargado
                            </span>
                          ) : (
                            <span className="text-gray-400">Solo visualización</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          to={`/verify/${log.document_hash}`}
                          className="text-cyan-600 hover:text-cyan-900 font-medium"
                        >
                          Verificar →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 text-sm">© 2025 VerifySign por Temporal Dynamics LLC. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default TrackingDashboard;