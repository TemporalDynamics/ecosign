import { Link } from 'react-router-dom';

interface LogoProps {
  to: string;
  variant?: 'option-a' | 'option-b' | 'option-c';
}

/**
 * Logo component with three design variants:
 *
 * option-a: Clean E without background box (minimal)
 * option-b: Dominant box with stronger presence (app-like)
 * option-c: E as typographic first letter of EcoSign (system/protocol)
 */
const Logo = ({ to, variant = 'option-a' }: LogoProps) => {
  // OPTION A: Eliminar recuadro - E limpia sin fondo
  // REGLA: E en azul, más grande, renglón por base de la E (no por el punto)
  if (variant === 'option-a') {
    return (
      <Link to={to} className="flex items-end space-x-2">
        <img
          src="/assets/images/logo-clean-padded.png"
          alt="EcoSign Logo"
          className="h-[62px] w-auto mb-[2px]"
          style={{
            filter: 'brightness(0) saturate(100%) invert(17%) sepia(57%) saturate(2394%) hue-rotate(192deg) brightness(95%) contrast(98%)'
          }}
        />
        <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
      </Link>
    );
  }

  // OPTION B: Recuadro protagonista - más grande, color decidido
  // REGLA: Mismo tamaño que opción A, mantener forma, ubicar en margen INFERIOR derecho
  if (variant === 'option-b') {
    return (
      <Link to={to} className="flex items-end space-x-3">
        <div className="bg-[#0E4B8B] rounded-lg p-1.5 flex items-end justify-end w-[50px] h-[50px] mb-[1px] overflow-hidden">
          <img
            src="/assets/images/logo-clean-padded.png"
            alt="EcoSign Logo"
            className="h-[68px] w-auto brightness-0 invert mb-[-2px] mr-[-2px]"
          />
        </div>
        <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
      </Link>
    );
  }

  // OPTION C: E como letra inicial - integración tipográfica
  // REGLA: Logo oficial completo en una sola imagen
  if (variant === 'option-c') {
    return (
      <Link to={to} className="flex items-center">
        <img
          src="/assets/images/ecosign-logo-full-trimmed.png"
          alt="EcoSign"
          className="h-[32px] w-auto"
        />
      </Link>
    );
  }

  return null;
};

export default Logo;
