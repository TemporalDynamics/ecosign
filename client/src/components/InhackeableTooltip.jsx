import Tooltip from './Tooltip';

// Reusable label for the “inhackeable” concept with a concise explainer.
export default function InhackeableTooltip({ className = '' }) {
  return (
    <Tooltip
      term={<span className={`inline-flex items-center gap-1 ${className}`}>Inhackeable</span>}
      definition={
        <div className="space-y-1">
          <p className="font-semibold text-white">Blindaje Inhackeable:</p>
          <p>Es la combinación de:</p>
          <p>• Una Huella Digital (Sello de Integridad) única de tu documento.</p>
          <p>• Un Sello de Tiempo Legal (TSA).</p>
          <p>• Y el Registro Digital Inalterable de estas pruebas en redes públicas como Polygon y Bitcoin.</p>
        </div>
      }
    />
  );
}
