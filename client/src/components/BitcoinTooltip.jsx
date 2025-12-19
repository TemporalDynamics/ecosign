import Tooltip from './Tooltip';

export default function BitcoinTooltip({ children, className = '' }) {
  return (
    <Tooltip
      term={<span className={`inline-flex items-center gap-1 ${className}`}>{children || 'Bitcoin'}</span>}
      definition={
        <div className="space-y-1">
          <p className="font-semibold text-white">Bitcoin (Tecnología de Registro de Máxima Seguridad):</p>
          <p>EcoSign utiliza la red de Bitcoin solo como un registro público extremadamente seguro para anotar la huella digital de tu documento.</p>
          <p>No implica el uso de Bitcoin como moneda, ni requiere cuentas, billeteras o conocimientos sobre criptomonedas.</p>
          <p>Su papel es exclusivamente aportar seguridad y permanencia, ya que es el registro digital más sólido y resistente del mundo.</p>
          <p>Tu documento no viaja a la red: solo su huella digital, que permite verificarlo para siempre sin exponer su contenido.</p>
        </div>
      }
    />
  );
}
