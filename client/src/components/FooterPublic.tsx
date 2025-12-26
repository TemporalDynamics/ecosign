import { Link } from 'react-router-dom';
import { useVideoPlayer } from '../contexts/VideoPlayerContext';

export default function FooterPublic() {
  const { playVideo } = useVideoPlayer();

  return (
    <footer className="bg-black py-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Grid de columnas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          {/* Columna 1: Producto */}
          <div className="text-left">
            <h4 className="font-semibold text-white mb-3">Producto</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/how-it-works" className="hover:text-[#0E4B8B] hover:underline transition">Cómo funciona</Link></li>
              <li><Link to="/comparison" className="hover:text-[#0E4B8B] hover:underline transition">Firma Legal y Firma Certificada</Link></li>
              <li><Link to="/pricing" className="hover:text-[#0E4B8B] hover:underline transition">Precios</Link></li>
              <li><Link to="/quick-guide" className="hover:text-[#0E4B8B] hover:underline transition">Guía rápida</Link></li>
              <li><Link to="/verify" className="hover:text-[#0E4B8B] hover:underline transition">Verificador</Link></li>
              <li><Link to="/login" className="hover:text-[#0E4B8B] hover:underline transition">Comenzar Gratis</Link></li>
            </ul>
          </div>

          {/* Columna 2: Recursos */}
          <div className="text-left">
            <h4 className="font-semibold text-white mb-3">Recursos</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/realtors" className="hover:text-[#0E4B8B] hover:underline transition">Firma Legal para Inmuebles</Link></li>
              <li><Link to="/abogados" className="hover:text-[#0E4B8B] hover:underline transition">Firma Legal para Abogados</Link></li>
              <li><Link to="/business" className="hover:text-[#0E4B8B] hover:underline transition">Firma Legal para Empresas</Link></li>
              <li><Link to="/documentation" className="hover:text-[#0E4B8B] hover:underline transition">Documentación técnica</Link></li>
              <li><Link to="/faq" className="hover:text-[#0E4B8B] hover:underline transition">Preguntas frecuentes</Link></li>
              <li><Link to="/use-cases" className="hover:text-[#0E4B8B] hover:underline transition">Casos de uso</Link></li>
            </ul>
          </div>

          {/* Columna 3: Videos */}
          <div className="text-left">
            <h4 className="font-semibold text-white mb-3">Videos</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" onClick={(e) => { e.preventDefault(); playVideo('anatomia-firma'); }} className="hover:text-[#0E4B8B] hover:underline transition">Anatomía de una Firma</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); playVideo('verdad-verificable'); }} className="hover:text-[#0E4B8B] hover:underline transition">Verdad Verificable</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); playVideo('conocimiento-cero'); }} className="hover:text-[#0E4B8B] hover:underline transition">Conocimiento Cero</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); playVideo('the-true-cost'); }} className="hover:text-[#0E4B8B] hover:underline transition">The True Cost</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); playVideo('forensic-integrity'); }} className="hover:text-[#0E4B8B] hover:underline transition">Forensic Integrity</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); playVideo('you-dont-need-to-trust'); }} className="hover:text-[#0E4B8B] hover:underline transition">You Don&apos;t Need to Trust</a></li>
            </ul>
          </div>

          {/* Columna 4: Legal */}
          <div className="text-left">
            <h4 className="font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/terms" className="hover:text-[#0E4B8B] hover:underline transition">Términos de servicio</Link></li>
              <li><Link to="/privacy" className="hover:text-[#0E4B8B] hover:underline transition">Política de privacidad</Link></li>
              <li><Link to="/security" className="hover:text-[#0E4B8B] hover:underline transition">Seguridad</Link></li>
            </ul>
          </div>

          {/* Columna 5: Soporte */}
          <div className="text-left">
            <h4 className="font-semibold text-white mb-3">Soporte</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/help" className="hover:text-[#0E4B8B] hover:underline transition">Centro de ayuda</Link></li>
              <li><Link to="/contact" className="hover:text-[#0E4B8B] hover:underline transition">Contacto</Link></li>
              <li><Link to="/status" className="hover:text-[#0E4B8B] hover:underline transition">Estado del servicio</Link></li>
              <li><Link to="/report-issue" className="hover:text-[#0E4B8B] hover:underline transition">Reportar un problema</Link></li>
            </ul>
          </div>
        </div>

        {/* Línea divisoria y texto legal centrado */}
        <div className="pt-8 border-t border-white/10 text-center">
          <p className="text-sm text-gray-400 mb-2">
            EcoSign no actúa como autoridad certificante ni garantiza validez legal automática. 
            Proporciona protección y evidencia técnica verificable que puede ser utilizada en contextos legales según corresponda.
          </p>
          <p className="text-sm text-gray-400 mb-2">
            El formato .ECO y los procesos asociados están en proceso de registro de propiedad intelectual.
          </p>
          <p className="text-sm text-gray-400">© 2025 EcoSign. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
